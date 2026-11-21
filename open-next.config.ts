import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

/**
 * Caching on Cloudflare:
 * - R2 stores rendered pages/data (incremental cache).
 * - D1 stores tag revalidation timestamps, so `revalidateTag()` after an admin
 *   edit refreshes public pages immediately.
 * - A Durable Object queue handles background time-based revalidation.
 * Booking, availability and payment routes are never cached.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
