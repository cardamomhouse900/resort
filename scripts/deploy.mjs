#!/usr/bin/env node
/**
 * Safe production deploy to Cloudflare Workers.
 *
 *   npm run deploy               build + checks + deploy
 *   npm run deploy -- --build    build + checks only (no upload)
 *
 * Why a script: OpenNext copies every value from .env, .env.local and .env.production(.local)
 * into the Worker bundle as fallbacks for process.env. Building from a developer machine would
 * therefore embed local secrets (local DATABASE_URL, Razorpay test secret, CRON_SECRET, …) in the
 * deployed code. This script:
 *
 *  1. reads build values from `.env.deploy` (git-ignored; template: .env.deploy.example),
 *  2. moves every .env* file aside so none of them can be bundled, and writes a temporary
 *     .env.production.local containing ONLY public NEXT_PUBLIC_* values (needed at runtime),
 *  3. passes build-only values (the production DATABASE_URL used to prerender pages) through the
 *     process environment, which OpenNext does not bundle,
 *  4. clears Next's data cache so locally cached sample data cannot end up in production pages,
 *  5. verifies the bundle contains nothing but NEXT_PUBLIC_* values, then restores your files,
 *  6. checks the Worker's secrets are set, then deploys.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

const root = path.resolve(import.meta.dirname, "..");
const buildOnly = process.argv.includes("--build");
const skipSecretCheck = process.argv.includes("--skip-secret-check");
const backupDir = path.join(root, ".local", "deploy-env-backup");
const ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local"];

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
];
const REQUIRED_SECRETS = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "CRON_SECRET"];
const OPTIONAL_SECRETS = ["RESEND_API_KEY", "EMAIL_FROM", "ADMIN_NOTIFICATION_EMAIL"];

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};
const run = (cmd, args, env = process.env) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env, shell: process.platform === "win32" });
  return r.status === 0;
};

/* ------------------------------------------------------------ 0. recover */
// A previous run that was killed mid-build leaves the user's env files in the backup folder.
function restoreEnvFiles() {
  if (!fs.existsSync(backupDir)) return;
  const generated = path.join(root, ".env.production.local");
  if (fs.existsSync(path.join(backupDir, ".generated"))) fs.rmSync(generated, { force: true });
  for (const f of ENV_FILES) {
    const b = path.join(backupDir, f);
    if (fs.existsSync(b)) fs.renameSync(b, path.join(root, f));
  }
  fs.rmSync(backupDir, { recursive: true, force: true });
}
restoreEnvFiles();

/* ------------------------------------------------------- 1. read config */
const deployFile = path.join(root, ".env.deploy");
if (!fs.existsSync(deployFile)) fail("Missing .env.deploy — copy .env.deploy.example and fill it in.");
const cfg = parse(fs.readFileSync(deployFile));

const publicVars = Object.fromEntries(Object.entries(cfg).filter(([k]) => k.startsWith("NEXT_PUBLIC_")));
const buildVars = Object.fromEntries(Object.entries(cfg).filter(([k]) => !k.startsWith("NEXT_PUBLIC_")));

const missing = REQUIRED_PUBLIC.filter((k) => !publicVars[k]);
if (!buildVars.DATABASE_URL) missing.push("DATABASE_URL");
if (missing.length) fail(`.env.deploy is missing: ${missing.join(", ")}`);
if (!publicVars.NEXT_PUBLIC_SITE_URL.startsWith("https://")) fail("NEXT_PUBLIC_SITE_URL must be https://…");
if (/localhost|127\.0\.0\.1/.test(buildVars.DATABASE_URL)) fail("DATABASE_URL points at a local database.");
const unknown = Object.keys(buildVars).filter((k) => k !== "DATABASE_URL");
if (unknown.length) {
  fail(
    `.env.deploy may only hold NEXT_PUBLIC_* values and DATABASE_URL. Set ${unknown.join(", ")} as Worker ` +
      "secrets instead: npx wrangler secret put NAME",
  );
}
const liveKey = publicVars.NEXT_PUBLIC_RAZORPAY_KEY_ID.startsWith("rzp_live_");
console.log(`→ Deploying ${publicVars.NEXT_PUBLIC_SITE_URL} (Razorpay ${liveKey ? "LIVE" : "test"} mode)`);

/* ----------------------------------------------------- 2. check secrets */
if (!buildOnly && !skipSecretCheck) {
  const r = spawnSync("npx", ["wrangler", "secret", "list", "--format", "json"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  let names = [];
  try {
    names = JSON.parse(r.stdout).map((s) => s.name);
  } catch {
    fail(
      "Could not list Worker secrets (not logged in? run `npx wrangler login`). " +
        "Use --skip-secret-check only if you are sure they are set.",
    );
  }
  const absent = REQUIRED_SECRETS.filter((k) => !names.includes(k));
  if (absent.length) fail(`Worker secrets not set: ${absent.join(", ")} — npx wrangler secret put NAME`);
  const optionalAbsent = OPTIONAL_SECRETS.filter((k) => !names.includes(k));
  if (optionalAbsent.length)
    console.warn(`! Not set (emails will only be logged): ${optionalAbsent.join(", ")}`);
}

/* ------------------------------------------------------------ 3. build */
fs.mkdirSync(backupDir, { recursive: true });
let ok = false;
try {
  for (const f of ENV_FILES) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) fs.renameSync(p, path.join(backupDir, f));
  }
  fs.writeFileSync(path.join(backupDir, ".generated"), "");
  fs.writeFileSync(
    path.join(root, ".env.production.local"),
    "# Generated by scripts/deploy.mjs — public values only. Deleted after the build.\n" +
      Object.entries(publicVars)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join("\n") +
      "\n",
  );
  // Locally cached (sample) content must not be baked into production pages.
  fs.rmSync(path.join(root, ".next", "cache", "fetch-cache"), { recursive: true, force: true });

  const env = {
    ...process.env,
    ...publicVars,
    ...buildVars,
    PRISMA_RUNTIME: "workerd",
    NODE_ENV: "production",
  };
  if (!run("npx", ["opennextjs-cloudflare", "build"], env)) fail("Build failed.");

  /* ---------------------------------------------------- 4. verify bundle */
  const envModule = path.join(root, ".open-next", "cloudflare", "next-env.mjs");
  const text = fs.readFileSync(envModule, "utf8");
  const leaked = [...text.matchAll(/"([A-Z0-9_]+)":/g)]
    .map((m) => m[1])
    .filter((k) => !k.startsWith("NEXT_PUBLIC_"));
  if (leaked.length)
    fail(`Refusing to deploy: non-public values in the bundle: ${[...new Set(leaked)].join(", ")}`);
  if (text.includes(buildVars.DATABASE_URL)) fail("Refusing to deploy: DATABASE_URL found in the bundle.");
  console.log("✓ Bundle contains only public NEXT_PUBLIC_* values.");
  ok = true;
} finally {
  restoreEnvFiles();
  // The data cache now holds production content; drop it so local builds read the local database again.
  fs.rmSync(path.join(root, ".next", "cache", "fetch-cache"), { recursive: true, force: true });
}

/* ----------------------------------------------------------- 5. deploy */
if (ok && !buildOnly) {
  if (!run("npx", ["opennextjs-cloudflare", "deploy"])) fail("Deploy failed.");
  console.log(`\n✓ Deployed: ${publicVars.NEXT_PUBLIC_SITE_URL}`);
  console.log("  Next: npm run e2e:live   (smoke tests against the live site)\n");
} else if (ok) {
  console.log("\n✓ Build verified (not deployed).\n");
}
