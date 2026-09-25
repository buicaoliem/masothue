# Data operations

Industry data flow: **import -> rebuild stats -> quality checks**. Taxonomy pages, sitemaps and indexability read the derived
stats tables, so they stay stale until the rebuild runs. There is no cron for this; imports are run by hand.

After every industry import (`data:import-industries`, `data:backfill-industries`):

```bash
npm run data:rebuild-industry-stats     # idempotent; ~1 min on the full data
npm run data:quality                    # exits non-zero only on integrity failures
npm run seo:industry-quality-report     # distribution + what the current thresholds index
```

After adding a new source or province: re-run the distribution report and re-evaluate the saturation thresholds in
`lib/seo/config.ts` (see `docs/seo-industry-quality.md`). Do not keep the old thresholds if the distribution changed clearly.

Migrations on production: `npx prisma migrate deploy` only. Never `migrate dev` / `migrate reset`. Migrations here are additive;
to roll back the application, redeploy the previous commit, do not drop `CompanyIndustrySet`, `IndustryStat`, `ProvinceIndustryStat`.

Post-deploy checks against a live host (scripts take `BASE_URL`):

```bash
BASE_URL=https://masothuedn.com npm run seo:smoke
BASE_URL=https://masothuedn.com npm run seo:sitemap-check
```

See also `docs/data-sources.md` (what each source provides) and `docs/seo-industry-quality.md` (the quality model).
