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
| `npm run deploy`             | Build and deploy to Cloudflare                                  |
| `npm run typecheck` / `lint` | TypeScript and ESLint                                           |
| `npm run format`             | Prettier (with Tailwind class sorting)                          |
| `npm run cf-typegen`         | Regenerate `cloudflare-env.d.ts` after editing `wrangler.jsonc` |

### Windows notes

- Open the terminal at `C:\…` with an **uppercase** drive letter. A lowercase `c:\` path makes Next.js load React
  twice and the build fails with `Cannot read properties of null (reading 'useContext')`.
- OpenNext recommends building on Linux/WSL. Production deploys run on Linux (GitHub Actions or Cloudflare Workers
  Builds), so this only affects local `preview`.

## One-time Cloudflare setup (before first deploy)

```bash
npx wrangler login
npx wrangler r2 bucket create mountain-resort-cache
npx wrangler d1 create mountain-resort-tag-cache   # paste database_id into wrangler.jsonc
```

Secrets are set with `npx wrangler secret put NAME` (never committed).

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
    api/              route handlers (Phase 3+)
  components/         ui/ layout/ homepage/ rooms/ booking/ admin/
  config/site.ts      placeholder business details (moves to DB in Phase 3)
  lib/                env.ts, image-loader.ts, later prisma/supabase/razorpay/cloudinary/email
  services/           business logic (pricing, availability, bookings, payments)
  hooks/ types/ utils/
prisma/               schema and migrations (Phase 3)
```
