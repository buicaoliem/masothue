import { prisma } from "@/pipeline/db";
import { provinceFromAddress } from "@/pipeline/province";
import { VietqrSource } from "@/pipeline/sources/vietqr";
import { SourceTransportError } from "@/pipeline/sources/types";

// On-demand enrichment of PENDING rows, shared by the middleware and the detail page.
// Calls to vietqr are paced across all server instances through one IngestCheckpoint row:
//   updatedAt = time of the last granted call slot, cursor = ISO time until which vietqr is on cooldown (after a 429).

const LOCK_SCOPE = "enrich-live:vietqr";
const MIN_GAP_MS = 1_500; // at most one vietqr call per 1.5 s, site-wide
const WAIT_FOR_SLOT_MS = 6_000; // give up (503) rather than hold a request longer
const POLL_MS = 250;
const DEFAULT_COOLDOWN_S = 600; // when a 429 carries no Retry-After

const vietqr = new VietqrSource();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type EnrichOutcome = "ready" | "unavailable";

/** "slot" = go ahead; "cooldown" = vietqr recently blocked us; "busy" = another call just went out. */
async function tryAcquireSlot(): Promise<"slot" | "cooldown" | "busy"> {
  const granted = await prisma.$executeRaw`
    UPDATE "IngestCheckpoint" SET "updatedAt" = now()
    WHERE scope = ${LOCK_SCOPE}
      AND "updatedAt" < now() - make_interval(secs => ${MIN_GAP_MS / 1000})
      AND (cursor IS NULL OR cursor::timestamptz < now())`;
  if (granted === 1) return "slot";
  const rows = await prisma.$queryRaw<{ cooling: boolean }[]>`
    SELECT (cursor IS NOT NULL AND cursor::timestamptz >= now()) AS cooling
    FROM "IngestCheckpoint" WHERE scope = ${LOCK_SCOPE}`;
  if (rows.length === 0) {
    await prisma.ingestCheckpoint.upsert({
      where: { scope: LOCK_SCOPE },
      create: { scope: LOCK_SCOPE, status: "live", updatedAt: new Date(0) },
      update: {},
    });
    return "busy";
  }
  return rows[0].cooling ? "cooldown" : "busy";
}

async function waitForSlot(): Promise<boolean> {
  const deadline = Date.now() + WAIT_FOR_SLOT_MS;
  for (;;) {
    const r = await tryAcquireSlot();
    if (r === "slot") return true;
    if (r === "cooldown" || Date.now() + POLL_MS > deadline) return false;
    await sleep(POLL_MS);
  }
}

async function startCooldown(seconds: number) {
  await prisma.$executeRaw`
    UPDATE "IngestCheckpoint" SET cursor = (now() + make_interval(secs => ${seconds}))::text
    WHERE scope = ${LOCK_SCOPE}`;
}

/**
 * Make sure a row is no longer PENDING before it is rendered.
 * "ready": the row is OK / SOURCE_MISS (or absent) and can be served from the store.
 * "unavailable": vietqr is rate-limited or failed transiently; the row stays PENDING for a later visit.
 * Merge rule: only null columns are filled, existing values are never overwritten.
 */
export async function ensureEnriched(taxCode: string): Promise<EnrichOutcome> {
  const company = await prisma.company.findUnique({
    where: { taxCode },
    select: { enrichStatus: true, name: true, address: true, status: true, provinceSlug: true },
  });
  if (!company || company.enrichStatus !== "PENDING") return "ready";

  if (!(await waitForSlot())) return "unavailable";

  let result;
  try {
    result = await vietqr.fetchByTaxCode(taxCode);
  } catch (err) {
    if (!(err instanceof SourceTransportError)) throw err;
    if (err.httpStatus === 429) await startCooldown(vietqr.lastRetryAfter ?? DEFAULT_COOLDOWN_S);
    return "unavailable";
  }

  const fetched = result.kind === "OK" ? result.data : null;
  const candidate: Record<string, string | null> = {
    name: company.name ?? fetched?.name ?? null,
    address: company.address ?? fetched?.address ?? null,
    status: company.status ?? fetched?.status ?? null,
  };
  if (company.provinceSlug == null) {
    const province = provinceFromAddress(candidate.address);
    candidate.province = province?.displayName ?? null;
    candidate.provinceSlug = province?.slug ?? null;
  }
  const fill = Object.fromEntries(Object.entries(candidate).filter(([, v]) => v !== null));

  // Conditional write: a concurrent request may have enriched the row already.
  await prisma.company.updateMany({
    where: { taxCode, enrichStatus: "PENDING" },
    data: {
      ...fill,
      enrichStatus: candidate.name && candidate.address ? "OK" : "SOURCE_MISS",
      lastEnrichedAt: new Date(),
    },
  });
  return "ready";
}
