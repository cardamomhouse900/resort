# Mountain Nature Resort — Website

Next.js 16 (App Router, TypeScript, Tailwind v4) deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`.
Single codebase: public site, admin dashboard and API route handlers.

> All business details, text and photographs are **placeholders** (see `src/config/site.ts`).
> Placeholder items show a “Sample” tag while `NEXT_PUBLIC_SHOW_SAMPLE_BADGES=true`.
> Unsplash images are development placeholders and are **not** photographs of the resort.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values as each phase needs them
npm run dev                  # http://localhost:3000
```

| Script                       | Purpose                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `npm run dev`                | Next.js dev server (Cloudflare bindings available)              |
| `npm run build`              | Standard Next.js production build                               |
| `npm run preview`            | Build for Workers and run locally in the Workers runtime        |
| `npm run deploy`             | Safe production deploy (see docs/DEPLOYMENT.md)                 |
| `npm run typecheck` / `lint` | TypeScript and ESLint                                           |
| `npm run format`             | Prettier (with Tailwind class sorting)                          |
| `npm run cf-typegen`         | Regenerate `cloudflare-env.d.ts` after editing `wrangler.jsonc` |

### Windows notes

- Open the terminal at `C:\…` with an **uppercase** drive letter. A lowercase `c:\` path makes Next.js load React
  twice and the build fails with `Cannot read properties of null (reading 'useContext')`.
- `npm run cf:build` / `preview` on Windows needs **Developer Mode** (Settings → System → For developers), because OpenNext creates symlinks. Production builds run on Linux.

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: accounts, production database, Cloudflare resources,
secrets, `npm run deploy`, Razorpay webhook, monitoring, backups, the real domain, the go-live checklist and
annual running costs.

Never run `opennextjs-cloudflare deploy` directly: OpenNext bundles values from `.env*` files into the
Worker, and `npm run deploy` is what prevents local secrets from being deployed.

## Testing

| Command                      | What it covers                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                   | Unit + integration tests (pricing, availability, double-booking, payments, emails, SEO)                                          |
| `npm run build; npm run e2e` | Browser tests on desktop and phone: every public page, SEO tags, security headers, booking up to Razorpay Checkout, contact form |
| `npm run e2e:live`           | The same browser tests against the deployed site (no payment, no enquiry sent)                                                   |

GitHub Actions (`.github/workflows/ci.yml`) runs formatting, lint, type checks, all tests, the build and the
browser tests on every push.

## Database

PostgreSQL via Prisma 7 (`prisma/schema.prisma`). Locally, a private PostgreSQL instance runs on port 54329
with its data in `.local/` (git-ignored) — separate from any system PostgreSQL service.

```bash
npm run db:local:init    # first time: create the cluster + resort and resort_test databases
npm run db:local:start   # afterwards (db:local:stop to stop)
npm run db:migrate       # apply migrations to the dev database
npm run db:seed          # load placeholder content (safe to re-run; never overwrites admin edits)
npm test                 # unit + integration tests (integration uses resort_test only)
```

Requires PostgreSQL 15+ binaries (`PG_BIN` env var if not in `C:\Program Files\PostgreSQL\18\bin` or on PATH).

**Inventory model:** guests book a `RoomType`; the server assigns a physical `Room`. Every stay or admin block
is a `Reservation` row, and a PostgreSQL exclusion constraint (`reservations_no_overlap`, in the first
migration) makes overlapping active reservations for the same room impossible — even under concurrent requests.

**Supabase:** every table has Row Level Security enabled with no policies, so Supabase's public REST API
(anon key) can read nothing. The app connects as the database owner through Prisma.

## Replacing placeholder content

Content now lives in the database (edited in the admin dashboard from Phase 4). The placeholder files below
are only the **seed** for a fresh database:

| What                                                         | Seed source                                   |
| ------------------------------------------------------------ | --------------------------------------------- |
| Resort name, contact details, policies, advance %            | `placeholderSettings` in `src/config/site.ts` |
| Rooms, facilities, activities, places, testimonials, gallery | `src/content/placeholder-data.ts`             |
| Placeholder photographs (with photographer credits)          | `src/content/placeholder-images.ts`           |
| Number of physical units per room type                       | `SAMPLE_UNITS` in `prisma/seed.ts`            |

Sample testimonials are never shown when `NEXT_PUBLIC_SHOW_SAMPLE_BADGES` is not `true`.

## Prisma on Cloudflare Workers

Prisma generates two clients from the same schema: `src/generated/prisma` (Node.js — dev server, tests,
scripts) and `src/generated/prisma-workerd` (Workers runtime). App code imports the client as `#prisma`;
`npm run cf:build` sets `PRISMA_RUNTIME=workerd`, and `next.config.ts` aliases `#prisma` to the Workers client.
On Cloudflare, a new client is created per request and connects through the `HYPERDRIVE` binding.

## Payments (Razorpay)

Flow: `/api/bookings` holds a room and creates a Razorpay order for the advance → Razorpay Checkout →
`/api/payments/verify` checks the signature, re-fetches the payment from Razorpay and confirms the booking.
The **webhook** confirms it too (for guests who close the browser); confirmation is idempotent and locked, so
both can arrive in any order. Payments arriving after the hold expired are re-allocated to a free room or
refunded automatically. Admins can refund fully or partially from a booking's page.

**Webhook setup** (Razorpay Dashboard → Account & Settings → Webhooks), once the site has a public URL:

- URL: `https://<your-domain>/api/webhooks/razorpay`
- Secret: the value of `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`, `refund.created`,
  `refund.processed`, `refund.failed`

**Secrets on Cloudflare** (`npx wrangler secret put NAME`): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, `CRON_SECRET`. Locally, `npm run preview` reads them from `.dev.vars` (git-ignored).

Expired holds are released every 5 minutes by a Cloudflare Cron Trigger (`worker.ts` →
`POST /api/cron/release-holds`, protected by `CRON_SECRET`), and also whenever a new booking is attempted.

Test mode: use Razorpay's test cards, the UPI ID `success@razorpay`, or any net-banking bank (a demo page lets
you choose success or failure). Switch to live keys only after the full checklist in Phase 8.

## Emails (Resend)

| Email                                    | To                                  | When                                             |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| Booking confirmed (with payment receipt) | Guest                               | Payment verified (checkout callback or webhook)  |
| New booking — advance received           | Resort (`ADMIN_NOTIFICATION_EMAIL`) | Same moment                                      |
| Refund issued — paid too late            | Guest                               | Late payment could not be honoured               |
| Booking cancelled (with refund info)     | Guest                               | Admin cancels ("Email the guest" ticked)         |
| Refund issued                            | Guest                               | Admin issues a refund ("Email the guest" ticked) |
| New enquiry (reply-to = guest)           | Resort                              | Contact form submitted                           |

Each email has an idempotency key, so repeats are never sent twice. Email failures never block a booking or
payment; unsent confirmations are retried by the 5-minute cron. Without `RESEND_API_KEY` emails are only logged.

Setup: create a Resend account, **verify your domain** (DNS records in Cloudflare), then set `RESEND_API_KEY`,
`EMAIL_FROM` (e.g. `Greenridge Bookings <bookings@yourdomain.com>`) and `ADMIN_NOTIFICATION_EMAIL`
(comma-separated). On Cloudflare: `npx wrangler secret put RESEND_API_KEY` (the other two can be plain vars).

## SEO

- **Indexing is off until real content is in.** While Settings → "Placeholder content" is ticked, every page
  sends `noindex, nofollow`, so sample text and stock photos are never indexed as the real resort. Untick it
  (after replacing the placeholders) to open the site to search engines.
- `robots.txt` and `sitemap.xml` are generated (`src/app/robots.ts`, `src/app/sitemap.ts`) and use
  `NEXT_PUBLIC_SITE_URL`, which **must be the final https domain** in the production build.
- Every public page has a unique title and description, a canonical URL, Open Graph and Twitter tags with a
  1200×630 preview image (`src/lib/seo.ts`). The homepage title becomes "… | Mountain Resort in
  <Location>" once the location is set in Settings and placeholder mode is off.
- **Structured data** (`src/lib/structured-data.ts`): `Resort` + `WebSite` on the homepage, `HotelRoom` with
  nightly price on room pages, `TouristAttraction` lists on Nearby Places / Attractions, `BreadcrumbList`
  everywhere. Anything still marked as a placeholder — and every stock photo — is left out. Optional map
  coordinates (Settings → Latitude/Longitude) add `GeoCoordinates`.
- After launch: verify the domain in **Google Search Console** (DNS TXT record in Cloudflare) and submit
  `https://<domain>/sitemap.xml`. Validate pages with Google's Rich Results Test.

## Performance

Measured with Lighthouse 12 (mobile = simulated slow 4G + 4× CPU slowdown) against the production build:

| Page        | Mobile perf | Desktop perf | Accessibility / Best practices / SEO |
| ----------- | ----------- | ------------ | ------------------------------------ |
| Homepage    | 88–91       | 98           | 100 / 100 / 100                      |
| Room detail | 88–91       | 97           | 100 / 100 / 100                      |
| Other pages | 86–97       | 95–100       | 100 / 100 / 100                      |

What keeps it fast: static pages served from cache; self-hosted fonts; the hero image is the only
high-priority image; all others are lazy; no slider library (the gallery is CSS scroll-snap); CLS is 0.
The remaining mobile LCP cost (simulated 2.6–3.8 s) is mostly photo weight — the Unsplash placeholders are
large; real photos uploaded to Cloudinary are compressed automatically (`q_auto`, AVIF/WebP).

**Image delivery** (`NEXT_PUBLIC_IMAGE_DELIVERY`, build time):

- `direct` (default): browsers fetch resized images straight from Cloudinary/Unsplash.
- `cloudflare`: images are served from the site's own domain via Cloudflare Image Transformations
  (`/cdn-cgi/image/…`), cached at the edge. Enable _Images → Transformations_ on the zone, allow the source
  origins (`res.cloudinary.com`, plus `images.unsplash.com` while placeholders remain), then rebuild. Free
  tier: 5,000 unique transformations/month — far more than this site needs. This could not be measured
  locally; compare both modes on the live site with PageSpeed Insights and keep the faster one.

`experimental.inlineCss` was tested and rejected: Next.js embeds the CSS twice (+26 KB gzipped per page),
which made mobile LCP worse.

## Security headers

Every response carries a Content-Security-Policy (`next.config.ts`) that allows only this site plus Razorpay
Checkout, Cloudinary and Unsplash; no plugins, no framing (`frame-ancestors 'none'`), forms post only to this
site. `script-src` includes `'unsafe-inline'` because Next.js page data is streamed in inline scripts; the
nonce-based alternative would make every page render per request instead of from cache. Verified: no CSP
violations on any page, including the Razorpay Checkout flow. Adding a new third-party service (e.g. Sentry,
analytics) requires adding its origin to the policy.

Also sent: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`.

## Caching model

`cacheComponents` is **off** because OpenNext on Cloudflare does not fully support it yet. Public content is
statically rendered and cached (R2 incremental cache + D1 tag cache); admin edits call `revalidateTag()`.
Availability, booking and payment endpoints are never cached.

## Structure

```
src/
  app/
    (website)/        public pages
    admin/            admin dashboard (Phase 4)
    api/              availability, bookings, contact, rooms (+ payments/webhooks in Phase 5)
  components/         ui/ layout/ homepage/ rooms/ booking/ contact/ places/ admin/
  config/             site URL, navigation, seed values
  generated/prisma/   generated Prisma client (git-ignored; `npm install` regenerates it)
  lib/                db, api helpers, validation, errors, rate limiting, crypto, env
  services/           business logic: pricing (pure), availability, booking, content, settings, contact
  types/ utils/       shared types; dates (IST-safe) and money (integer paise) helpers
prisma/               schema, migrations, seed
tests/                unit/ and integration/ (Vitest)
scripts/local-db.mjs  local PostgreSQL helper
```
