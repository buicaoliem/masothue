// Storage + query benchmark: compact CompanyIndustrySet (text[] + GIN) vs the CompanyIndustry join table,
// measured by PostgreSQL itself (pg_relation_size / pg_indexes_size / EXPLAIN ANALYZE) on a real sample of
// the HCM file. Everything happens in TEMP tables inside a transaction that is ALWAYS rolled back:
// nothing persistent is created or changed. Usage: npm run data:industry-benchmark -- [--sample 10000]
import type { Sql } from "@/lib/directory/sql";
import { classifyIndustries } from "@/lib/industry/normalize";
import { normalizeCodeSet } from "@/lib/industry/normalize";
import { prisma } from "../db";
import { openSourceRows } from "../files";
import { makeIndustryMapper } from "../industry-source";

const ROLLBACK = new Error("benchmark rollback");
const FULL_HCM_COMPANIES = 189_356; // from the full dry run

const mb = (b: number) => +(b / 1e6).toFixed(2);

async function sizes(tx: Sql, table: string) {
  const [r] = await tx.query<{ heap: string; idx: string; total: string }>(
    `SELECT pg_relation_size('${table}') AS heap, pg_indexes_size('${table}') AS idx, pg_total_relation_size('${table}') AS total FROM (SELECT 1) x`,
  );
  return { heap: Number(r.heap), index: Number(r.idx), total: Number(r.total) };
}

async function explainMs(tx: Sql, sql: string, params: unknown[] = []): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const rows = await tx.query<{ "QUERY PLAN": string }>(`EXPLAIN (ANALYZE, TIMING OFF, COSTS OFF) ${sql}`, params);
    const line = rows.map((r) => r["QUERY PLAN"]).find((l) => l.startsWith("Execution Time"));
    times.push(Number(/([\d.]+) ms/.exec(line ?? "")?.[1] ?? NaN));
  }
  times.sort((a, b) => a - b);
  return times[2]; // median of 5
}

async function main() {
  const argv = process.argv.slice(2);
  const si = argv.indexOf("--sample");
  const sample = si >= 0 ? Number(argv[si + 1]) : 10_000;
  const { header, rows } = await openSourceRows("hcm");
  const map = makeIndustryMapper("hcm", header);

  const items: { taxCode: string; entries: { code: string; name: string }[] }[] = [];
  for await (const cells of rows) {
    const rec = map(cells);
    if (rec) items.push({ taxCode: rec.taxCode, entries: [...(rec.primary ? [rec.primary] : []), ...rec.others] });
    if (items.length >= sample * 1.3) break; // some rows will not match a listable company
  }

  const out: Record<string, unknown> = {};
  try {
    await prisma.$transaction(async (client) => {
      const tx: Sql = {
        query: <T>(text: string, params: unknown[] = []) => client.$queryRawUnsafe<T[]>(text, ...params),
        transaction: (fn) => fn(tx),
      };
      const companies = await tx.query<{ id: string; taxCode: string }>(
        `SELECT id, "taxCode" FROM "Company" WHERE "taxCode" = ANY($1::text[]) AND "enrichStatus" = 'OK' AND "isHidden" = false`,
        [items.map((i) => i.taxCode)],
      );
      const idBy = new Map(companies.map((c) => [c.taxCode, c.id]));
      const used = items.filter((i) => idBy.has(i.taxCode)).slice(0, sample);

      await tx.query(`CREATE TEMP TABLE bench_set (LIKE "CompanyIndustrySet" INCLUDING ALL)`);
      await tx.query(`CREATE TEMP TABLE bench_join (LIKE "CompanyIndustry" INCLUDING ALL)`);

      let memberships = 0;
      for (let i = 0; i < used.length; i += 500) {
        const chunk = used.slice(i, i + 500);
        const setRows = chunk.map((c) => ({ id: idBy.get(c.taxCode)!, codes: normalizeCodeSet(c.entries.map((e) => e.code)) }));
        await tx.query(
          `INSERT INTO bench_set ("companyId", source, codes, "sourceUpdatedAt", "createdAt", "updatedAt")
           SELECT v.cid, 'opendata-hcm', string_to_array(v.codes, ','), '2025-11-14', now(), now() FROM unnest($1::text[], $2::text[]) AS v(cid, codes)`,
          [setRows.map((r) => r.id), setRows.map((r) => r.codes.join(","))],
        );
        const j: { cid: string; code: string; name: string }[] = [];
        for (const c of chunk) {
          const { others } = classifyIndustries(null, c.entries);
          for (const e of others) j.push({ cid: idBy.get(c.taxCode)!, code: e.code, name: e.name });
        }
        memberships += j.length;
        // id mimics a 25-char cuid; name is stored per row exactly as the join-table design would.
        await tx.query(
          `INSERT INTO bench_join (id, "companyId", code, name, "isPrimary", source, "sourceUpdatedAt", "createdAt", "updatedAt")
           SELECT left(md5(random()::text || clock_timestamp()::text), 25), v.cid, v.code, v.name, false, 'opendata-hcm', '2025-11-14', now(), now()
           FROM unnest($1::text[], $2::text[], $3::text[]) AS v(cid, code, name) ON CONFLICT DO NOTHING`,
          [j.map((r) => r.cid), j.map((r) => r.code), j.map((r) => r.name)],
        );
      }
      await tx.query(`ANALYZE bench_set`);
      await tx.query(`ANALYZE bench_join`);

      const set = await sizes(tx, "bench_set");
      const join = await sizes(tx, "bench_join");
      const scale = FULL_HCM_COMPANIES / used.length;
      out.sample = { companies: used.length, memberships, avgIndustries: +(memberships / used.length).toFixed(1) };
      out.measuredMB = {
        compact: { heap: mb(set.heap), indexes: mb(set.index), total: mb(set.total), bytesPerCompany: Math.round(set.total / used.length) },
        joinTable: { heap: mb(join.heap), indexes: mb(join.index), total: mb(join.total), bytesPerCompany: Math.round(join.total / used.length) },
      };
      out.extrapolatedToFullHcmMB = {
        compact: mb(set.total * scale),
        joinTable: mb(join.total * scale),
        saving: `${(100 - (set.total / join.total) * 100).toFixed(1)}%`,
      };

      // Query latency on the sample (median of 5, ms). Full-scale latency is measured again after the real import.
      const cid = used[0] ? idBy.get(used[0].taxCode)! : "";
      const code = "4669";
      const rare = used.flatMap((u) => u.entries.map((e) => e.code)).reduce<Map<string, number>>((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map());
      const rareCode = [...rare.entries()].filter(([, n]) => n >= 5).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "4669";
      out.queryMs = {
        companyDetail: {
          compact: await explainMs(tx, `SELECT codes FROM bench_set WHERE "companyId" = $1`, [cid]),
          joinTable: await explainMs(tx, `SELECT code FROM bench_join WHERE "companyId" = $1`, [cid]),
        },
        countCode4669: {
          compact: await explainMs(tx, `SELECT count(*) FROM bench_set WHERE codes @> ARRAY[$1]::text[]`, [code]),
          joinTable: await explainMs(tx, `SELECT count(*) FROM bench_join WHERE code = $1`, [code]),
        },
        hcm4669List50: {
          compact: await explainMs(tx, `SELECT c."taxCode" FROM "Company" c JOIN bench_set s ON s."companyId" = c.id WHERE s.codes @> ARRAY[$1]::text[] AND c."provinceSlug" = 'ho-chi-minh' ORDER BY c."taxCode" LIMIT 50`, [code]),
          joinTable: await explainMs(tx, `SELECT c."taxCode" FROM "Company" c JOIN bench_join s ON s."companyId" = c.id WHERE s.code = $1 AND c."provinceSlug" = 'ho-chi-minh' ORDER BY c."taxCode" LIMIT 50`, [code]),
        },
        [`rareCode${rareCode}Count`]: {
          compact: await explainMs(tx, `SELECT count(*) FROM bench_set WHERE codes @> ARRAY[$1]::text[]`, [rareCode]),
          joinTable: await explainMs(tx, `SELECT count(*) FROM bench_join WHERE code = $1`, [rareCode]),
        },
      };
      throw ROLLBACK;
    }, { timeout: 600_000, maxWait: 30_000 });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  console.log(JSON.stringify(out, null, 2));
  console.log("(temp tables rolled back; nothing persisted)");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
