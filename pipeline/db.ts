import { PrismaClient } from "@prisma/client";

// One client per server instance (Next.js dev hot reload keeps it on globalThis; in production the module is evaluated once).
const g = globalThis as unknown as { prisma?: PrismaClient };

// PERF_TRACE=1 logs every query's duration and SQL shape (never parameter values) to stdout, for profiling only.
function create(): PrismaClient {
  if (process.env.PERF_TRACE !== "1") return new PrismaClient();
  const client = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  (client as unknown as { $on: (e: "query", cb: (q: { duration: number; query: string }) => void) => void }).$on("query", (q) => {
    console.log(`[q] ${String(q.duration).padStart(4)}ms ${q.query.replace(/\s+/g, " ").slice(0, 110)}`);
  });
  return client;
}

export const prisma = g.prisma ?? create();

if (process.env.NODE_ENV !== "production") g.prisma = prisma;
