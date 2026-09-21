// Data quality report. Exit code 1 only for integrity failures (malformed/duplicate keys, duplicate
// primary industries, orphan industry codes, stale mainIndustry cache); missing nullable fields are reported, never fatal.
// Usage: npm run data:quality
import { prismaSql } from "@/lib/directory/sql";
import { integrityProblems, measureCoverage, pct } from "@/lib/industry/coverage";
import { prisma } from "../db";

async function main() {
  const c = await measureCoverage(prismaSql(prisma));
  const L = c.listable;
  const line = (label: string, v: number, of?: number) => console.log(`${label.padEnd(44)} ${String(v).padStart(9)}${of ? `  ${pct(v, of).padStart(6)}` : ""}`);

  console.log("== Companies");
  line("Total companies", c.totalCompanies);
  line("Listable (public rule, row-level)", L, c.totalCompanies);
  line("Valid MST", c.validMst, c.totalCompanies);
  line("Invalid MST", c.invalidMst);
  line("Duplicate MST", c.duplicateMst);
  console.log("== Listable companies missing (nullable, informational)");
  line("Missing name", c.missingName, L);
  line("Missing province", c.missingProvince, L);
  line("Missing status", c.missingStatus, L);
  line("Missing legal type", c.missingLegalType, L);
  line("Missing tax office", c.missingTaxOffice, L);
  line("Missing primary industry", c.missingPrimaryIndustry, L);
  console.log("== Industries");
  line("With primary industry", c.withPrimaryIndustry, L);
  line("With any industry", c.withAnyIndustry, L);
  line("Has secondary industries", c.withSecondaryIndustries, L);
  line("Registered industries but no primary (expected)", c.registeredWithoutPrimary, L);
  line("Unique industry codes", c.uniqueIndustries);
  line("Industry catalog size", c.catalogSize);
  console.log("== Compact registered-industry sets (HCM)");
  line("Companies with compact industry set", c.companiesWithCompactSet, L);
  line("Compact memberships", c.compactMemberships);
  console.log(`${"Average industries/company".padEnd(44)} ${String(c.avgIndustriesPerCompany).padStart(9)}`);
  line("Max industries/company", c.maxIndustriesPerCompany);
  console.log("== Integrity");
  line("Unknown industry codes (sets)", c.unknownIndustryCodes);
  line("Duplicate codes inside arrays", c.duplicateCodesInArrays);
  line("Malformed codes inside arrays", c.malformedCodesInArrays);
  line("Industry orphan codes", c.orphanIndustryCodes);
  line("Malformed industry codes", c.invalidIndustryCodes);
  line("Companies with >1 primary industry", c.companiesWithMultiplePrimary);
  line("mainIndustry cache != primary industry", c.mainIndustryCacheMismatch);

  const problems = integrityProblems(c);
  if (problems.length) {
    console.error(`\nINTEGRITY FAILURES:\n${problems.map((p) => ` - ${p}`).join("\n")}`);
    process.exitCode = 1;
  } else console.log("\nIntegrity OK");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : "quality check failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
