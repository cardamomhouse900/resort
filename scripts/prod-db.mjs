#!/usr/bin/env node
/**
 * Runs a database task against the PRODUCTION database (DATABASE_URL in .env.deploy).
 *
 *   npm run prod:db -- migrate                     apply pending migrations
 *   npm run prod:db -- seed                        load placeholder content (first time only)
 *   npm run prod:db -- add-admin --email … --name … --role OWNER --uid <Supabase user id>
 *   npm run prod:db -- status                      show migration status
 *   npm run prod:db -- backup                      download a full backup to backups/ (git-ignored)
 *
 * The URL is passed through the process environment, which takes precedence over
 * .env.local, so nothing has to be edited by hand.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { parse } from "dotenv";

const root = path.resolve(import.meta.dirname, "..");
const [task, ...rest] = process.argv.slice(2);
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
// Tools are started directly (no shell), so names with spaces and passwords with special
// characters are passed through untouched.
const node = process.execPath;
const prisma = path.join(root, "node_modules", "prisma", "build", "index.js");
const tsx = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const TASKS = {
  migrate: [node, prisma, "migrate", "deploy"],
  status: [node, prisma, "migrate", "status"],
  seed: [node, tsx, "prisma/seed.ts"],
  "add-admin": [node, tsx, "scripts/add-admin.ts"],
  // pg_dump from the local PostgreSQL install (PG_BIN, or on PATH). Contains guest data: keep it private.
  backup: [
    "pg_dump",
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    `backups/resort-${stamp}.dump`,
  ],
};
if (!TASKS[task]) {
  console.error(`Usage: npm run prod:db -- <${Object.keys(TASKS).join("|")}> [args]`);
  process.exit(1);
}

const file = path.join(root, ".env.deploy");
if (!fs.existsSync(file)) {
  console.error("Missing .env.deploy (see .env.deploy.example).");
  process.exit(1);
}
const url = parse(fs.readFileSync(file)).DATABASE_URL;
if (!url || /localhost|127\.0\.0\.1/.test(url)) {
  console.error(".env.deploy has no production DATABASE_URL.");
  process.exit(1);
}

const host = new URL(url).host;
if (task === "backup") fs.mkdirSync(path.join(root, "backups"), { recursive: true });
if (task !== "status" && task !== "backup") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Run "${task}" on the PRODUCTION database at ${host}? Type yes: `);
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") process.exit(1);
}

const [cmd, ...args] = task === "backup" ? [...TASKS.backup, url] : [...TASKS[task], ...rest];
const pgBin = process.env.PG_BIN ?? String.raw`C:\Program Files\PostgreSQL\18\bin`;
const r = spawnSync(cmd, args, {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: url,
    PATH: `${pgBin}${path.delimiter}${process.env.PATH}`,
  },
});
if (r.error) console.error(r.error.message);
if (task === "backup" && r.status === 0) console.log(`✓ Saved backups/resort-${stamp}.dump`);
process.exit(r.status ?? 1);
