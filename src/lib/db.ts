import "server-only";
import { cache } from "react";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "#prisma";

export type Db = PrismaClient;
/** The client passed to `db.$transaction(async (tx) => …)` callbacks. */
export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * On Cloudflare the Hyperdrive binding provides a pooled connection string;
 * elsewhere (local dev, tests, scripts) DATABASE_URL is used directly.
 */
async function connectionString(): Promise<string> {
  if (isWorkers) {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = getCloudflareContext().env as { HYPERDRIVE?: { connectionString: string } };
    if (env.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function createDb(url: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: isWorkers ? 3 : 10 }) });
}

const globalForDb = globalThis as unknown as { __resortDb?: Db };

/**
 * Returns a database client.
 *
 * - Node (dev server, scripts): one shared client per process.
 * - Cloudflare Workers: a new client per request, because Workers forbid
 *   reusing a socket opened by a different request. Hyperdrive makes these
 *   connections cheap. `cache` shares the client within one render.
 *
 * Route handlers should call this once and pass the client to services.
 */
export const getDb = cache(async (): Promise<Db> => {
  const url = await connectionString();
  if (isWorkers) return createDb(url);
  globalForDb.__resortDb ??= createDb(url);
  return globalForDb.__resortDb;
});
