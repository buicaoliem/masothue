import type { Prisma, PrismaClient } from "@prisma/client";

// The directory runs plain SQL through this small interface, so tests can run the same queries
// against an in-memory Postgres (PGlite) with the real migrations applied.

export interface Sql {
  /** Positional parameters: $1, $2, … */
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
}

type RawClient = Pick<PrismaClient, "$queryRawUnsafe"> | Prisma.TransactionClient;

export function prismaSql(client: PrismaClient): Sql {
  const wrap = (c: RawClient): Sql => ({
    query: <T>(text: string, params: unknown[] = []) => c.$queryRawUnsafe<T[]>(text, ...params),
    transaction: (fn) => fn(wrap(c)), // already inside one
  });
  return {
    ...wrap(client),
    transaction: (fn) => client.$transaction((tx) => fn(wrap(tx))),
  };
}
