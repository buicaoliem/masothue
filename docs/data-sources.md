# Data sources and coverage (audited 2026-09-21)

What each source actually provides. Nothing is inferred; a field a source lacks stays NULL.

| Field | vietqr (live enrich) | esgoo (probe) | opendata-hcm | opendata-sonla | opendata-quangngai |
|---|---|---|---|---|---|
| name / address / status | yes | yes | yes | yes | yes |
| representative | no | yes | no | yes | yes |
| legal type, registration date | no | date only | yes | yes | yes |
| primary industry | no | no | **no marker** (`NganhNghe` is an unordered list) | `Ngành nghề KD chính` | `Ngành nghề KD chính` |
| all registered industries | no | ignored by design | `NganhNghe` (~20 per company) | no | `Ngành nghề KD` |
| tax office (`taxOffice`) | no | no | no | no | no |
| parent / branch / HQ relation | no | no | no | no | no |

Consequences:

- **taxOffice** has no upstream source today. The column and the company-page row exist and light up as soon as a source
  supplies it; nothing derives it from the address.
- **HCM industries** are stored as non-primary rows only (the source does not say which one is primary). Loading them
  (`npm run data:import-industries -- --source hcm --apply`) adds ~3.8M CompanyIndustry rows (~1.5 GB with indexes on
  the current row width) for ~189k companies. Not applied: storage budget and hub quality (catch-all codes such as
  4669 are held by most companies) need a decision first; see the report of this phase.
- **Source of truth for industries** is `CompanyIndustry`; `Company.mainIndustry` is a display cache of the primary row
  (`reconcileMainIndustry`). `IndustryCatalog` is derived from observed source data (no bundled VSIC file). Its codes follow VSIC 2018 as published by the sources (measured, not declared); see `docs/vsic-2025-audit.md`.
- **Freshness**: `dataAsOf` = source dataset date, `lastEnrichedAt` = last sync, `dataUpdatedAt` = last real content
  change (set by importers only when they change a field). Sitemap `lastmod` = `dataUpdatedAt ?? dataAsOf ?? lastEnrichedAt`,
  omitted when none exists. Prisma `updatedAt` is not used for user-facing dates.

Commands: `data:backfill-industries` (DB only, idempotent, `--apply`), `data:import-industries --source X` (files in
`tmp/opendata`, `--apply`), `data:quality` (coverage + integrity, non-zero exit on integrity failures only).
