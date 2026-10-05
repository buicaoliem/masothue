# Railway build for masothue: plain `next build` + `next start` on a long-lived Node server (single replica).
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && apt-get clean

# Build-time public vars (Railway passes service variables as build args).
# DATABASE_URL is deliberately NOT a build arg: the build must not read the production DB.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ARG NEXT_PUBLIC_SALES_ZALO=""
ARG NEXT_PUBLIC_OPERATOR_NAME=""
ARG NEXT_PUBLIC_CONTACT_EMAIL=""
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_SALES_ZALO=$NEXT_PUBLIC_SALES_ZALO \
    NEXT_PUBLIC_OPERATOR_NAME=$NEXT_PUBLIC_OPERATOR_NAME \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_TELEMETRY_DISABLED=1

# postinstall runs `prisma generate`, which needs the schema before the rest of the source.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
# Compile only: static generation would query the database at build time (unreachable from the Railway build
# network, and an empty/failed prerender must not be baked in). Pages render on first request and are then ISR-cached.
RUN npx next build --experimental-build-mode compile

FROM node:22-bookworm-slim AS run
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && apt-get clean
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=1536
COPY --from=build /app ./
EXPOSE 3000
# Start: (1) "generate" prerenders the static/ISR pages against the real database (the build above is compile-only and
# had no database); a failure is logged and the server still starts, serving pages on demand. (2) railway-guard.cjs
# runs `next start` internally and adds noindex on *.up.railway.app.
CMD ["sh", "-c", "node node_modules/next/dist/bin/next build --experimental-build-mode generate || echo 'WARN: next generate failed; serving on demand'; exec node railway-guard.cjs"]
