# Deployment guide

The site runs on **Cloudflare Workers** with the **Supabase** PostgreSQL database (the same Supabase
project that provides admin login). The first deployment uses a free `*.workers.dev` address; the real
domain is attached later (section 7) without rebuilding anything else.

All commands are run from the project folder in PowerShell (uppercase `C:\…` path — see README).

---

## 1. One-time accounts

| Service    | What to do                                                                                               | Cost            |
| ---------- | -------------------------------------------------------------------------------------------------------- | --------------- |
| Cloudflare | Create an account. Workers & Pages → Plans → **Workers Paid** (the Worker bundle is 4.5 MB; free = 3 MB) | US$5/month      |
| Supabase   | Already created (admin login). The same project's database becomes the production database.              | Free tier       |
| Razorpay   | Already created (test mode). Live mode needs KYC — see the go-live checklist.                            | ~2% per payment |
| Resend     | Optional until emails are wanted. Free: 3,000 emails/month.                                              | Free            |

Then log in once from this computer (opens the browser):

```powershell
npx wrangler login
npx wrangler whoami          # note your workers.dev subdomain: Workers & Pages → Overview (right side)
```

## 2. Production database (Supabase)

In Supabase → **Connect** (top bar) copy two connection strings, with your database password filled in:

- **Session pooler** (port 5432, works over IPv4) — used from this computer for migrations and builds.
- **Direct connection** (`db.<ref>.supabase.co:5432`) — used by Cloudflare Hyperdrive.

Create `.env.deploy` from the template and fill it in (it is git-ignored):

```powershell
Copy-Item .env.deploy.example .env.deploy
notepad .env.deploy        # NEXT_PUBLIC_SITE_URL=https://mountain-resort.<subdomain>.workers.dev, DATABASE_URL=<session pooler>
```

Create the tables, load the placeholder content, and give yourself admin access. Your Supabase login
already exists, so use the same UID you used locally (Supabase → Authentication → Users):

```powershell
npm run prod:db -- migrate
npm run prod:db -- seed
npm run prod:db -- add-admin --email you@example.com --name "Your Name" --role OWNER --uid <UID>
```

Each command asks you to type `yes` before touching production.

## 3. Cloudflare resources (once)

```powershell
npx wrangler r2 bucket create mountain-resort-cache
npx wrangler d1 create mountain-resort-tag-cache
npx wrangler hyperdrive create mountain-resort-db --connection-string="<DIRECT connection string>"
```

Paste the D1 `database_id` and the Hyperdrive `id` into `wrangler.jsonc` (replacing the zeros).

If Hyperdrive cannot reach the direct connection (it is IPv6-only on Supabase's free tier), create it with
the **Session pooler** string instead — it works the same for this site.

## 4. Secrets (once, and whenever a key changes)

Each command prompts for the value — it is never stored in a file:

```powershell
npx wrangler secret put RAZORPAY_KEY_ID          # rzp_test_… (same as NEXT_PUBLIC_RAZORPAY_KEY_ID)
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET  # any long random string; the same goes into Razorpay (step 6)
npx wrangler secret put CRON_SECRET              # any long random string
# Emails (optional until Resend is set up):
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM               # e.g. Greenridge Bookings <bookings@yourdomain.com>
npx wrangler secret put ADMIN_NOTIFICATION_EMAIL
```

Generate a random secret: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.
**Use new secrets for production** — never reuse the values from `.env.local`.

## 5. Deploy

```powershell
npm run deploy
```

`scripts/deploy.mjs` checks the configuration and secrets, builds with production content, **refuses to
deploy if any secret would be bundled into the Worker** (see the comment at the top of the script),
deploys, and restores your local files. `npm run deploy:check` does everything except the upload.

Then run the browser tests against the live site (they never pay or send the contact form):

```powershell
npm run e2e:live
```

Every later change: `npm run deploy` again. Database changes: `npm run prod:db -- migrate` first.

## 6. Razorpay webhook

Razorpay Dashboard (test mode) → Account & Settings → Webhooks → Add:

- URL: `https://mountain-resort.<subdomain>.workers.dev/api/webhooks/razorpay`
- Secret: the `RAZORPAY_WEBHOOK_SECRET` value
- Events: `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`, `refund.created`,
  `refund.processed`, `refund.failed`

Make one test booking (UPI `success@razorpay`) and check it appears as **Confirmed** in the admin dashboard.

## 7. Monitoring and backups

- **Uptime:** add `https://<site>/api/health` to a free monitor (e.g. UptimeRobot, 5-minute interval).
  It returns 200 when the site can reach the database and alerts you by email otherwise.
- **Logs:** Cloudflare → Workers & Pages → mountain-resort → Logs (observability is enabled). Payment
  problems are logged with `[webhook]` / `[payment]` prefixes.
- **Backups:** Supabase's free tier keeps no downloadable backups. Take one regularly (monthly, and before
  every migration) and store it somewhere private — it contains guest data:

  ```powershell
  npm run prod:db -- backup        # → backups/resort-<date>.dump
  ```

  Restore with `pg_restore --clean --no-owner -d "<connection string>" backups/<file>.dump`.
  Supabase Pro (US$25/month) adds daily automatic backups if wanted later.

## 8. Attaching the real domain (later)

1. Add the domain to Cloudflare (free plan) and change its nameservers at the registrar.
2. Workers & Pages → mountain-resort → Settings → Domains & Routes → **Add custom domain**.
3. Set `NEXT_PUBLIC_SITE_URL=https://<domain>` in `.env.deploy` and `npm run deploy`.
4. Update the Razorpay webhook URL. Optional: set `"workers_dev": false` in `wrangler.jsonc` so only the
   real domain serves the site.
5. Optional: enable Images → Transformations on the zone and compare `NEXT_PUBLIC_IMAGE_DELIVERY=cloudflare`
   with PageSpeed Insights (README → Performance).

## 9. Go-live checklist

Content

- [ ] All placeholder rooms, prices, facilities, activities, places, photos and policies replaced in the
      admin dashboard (each item's "Placeholder" box unticked).
- [ ] Settings: real name, address, phone, WhatsApp, email, location, map link (and coordinates),
      check-in/out times, booking and cancellation policies, advance %.
- [ ] Inner-page banner photos replaced (they are set in code: `img.*` in `src/app/(website)/*/page.tsx`).
- [ ] Settings → "Placeholder content" **unticked** — this is what allows search engines to index the site.
- [ ] `NEXT_PUBLIC_SHOW_SAMPLE_BADGES=false` in `.env.deploy`.

Payments

- [ ] Razorpay KYC approved; **live** keys generated (Dashboard → Live mode → API Keys).
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_…` in `.env.deploy`; `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
      secrets updated; a **live-mode** webhook created with a new `RAZORPAY_WEBHOOK_SECRET`.
- [ ] The test secret that was shared during development has been regenerated.
- [ ] One real booking paid with live keys (e.g. a cheap room for one night), confirmed in the admin
      dashboard, then cancelled and refunded from there.

Email, search, operations

- [ ] Resend: domain verified (DNS records in Cloudflare), `EMAIL_FROM` uses that domain; booking and
      enquiry emails received.
- [ ] Google Search Console: domain verified (DNS), `https://<domain>/sitemap.xml` submitted; spot-check
      pages with the Rich Results Test.
- [ ] Uptime monitor on `/api/health`; first production backup taken.
- [ ] PageSpeed Insights run on the homepage and a room page (mobile).

## Annual running cost (estimate, at ₹85 = US$1)

| Item                                      | Per year                                                |
| ----------------------------------------- | ------------------------------------------------------- |
| Cloudflare Workers Paid (US$5/month)      | ≈ ₹5,100                                                |
| Domain (.com or .in)                      | ≈ ₹800 – ₹1,500                                         |
| Supabase, Resend, Cloudinary (free tiers) | ₹0                                                      |
| **Total fixed**                           | **≈ ₹6,000 – ₹6,600**                                   |
| Razorpay                                  | ~2% (+18% GST on the fee) of each advance, no fixed fee |
| Optional: Supabase Pro for daily backups  | + ≈ ₹25,500                                             |

The free tiers cover a resort of this size comfortably (Supabase 500 MB database, Resend 3,000 emails per
month, Cloudinary 25 GB of images and bandwidth). Supabase may pause a free project after about a week of
inactivity; the site's own traffic and its 5-minute cron job should keep it active, and the uptime monitor
will alert you if it ever pauses (restore it from the Supabase dashboard).
