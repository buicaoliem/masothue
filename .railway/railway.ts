import { defineRailway, preserve, project, service } from "railway/iac";

// Per-repo partial: only the `masothue` web service is managed from this repository.
// The shared Postgres service and the other sites live in their own repositories / the orchestrator.
export const partial = "masothue";

export default defineRailway(() => {
  const web = service("masothue", {
    replicas: { sin: 1 }, // single replica on purpose: ISR / unstable_cache live on the container filesystem
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    deploy: {
      restartPolicyMaxRetries: 5,
      // Heavy ISR + Prisma + bot traffic: 2 GB / 2 vCPU. Node heap is capped at 1.5 GB (Dockerfile NODE_OPTIONS).
      limitOverride: { containers: { cpu: 2, memoryBytes: 2 * 1024 * 1024 * 1024 } },
    },
    env: {
      PORT: preserve(),
      DATABASE_URL: preserve(),
      NEXT_TELEMETRY_DISABLED: preserve(),
    },
  });
  return project("sites", { resources: [web] });
});
