#!/usr/bin/env node
// Runs the browser tests against the deployed site (NEXT_PUBLIC_SITE_URL from .env.deploy,
// or E2E_BASE_URL if set). Extra arguments are passed to Playwright.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { parse } from "dotenv";

const cfg = fs.existsSync(".env.deploy") ? parse(fs.readFileSync(".env.deploy")) : {};
const base = process.env.E2E_BASE_URL ?? cfg.NEXT_PUBLIC_SITE_URL;
if (!base?.startsWith("https://")) {
  console.error("Set NEXT_PUBLIC_SITE_URL in .env.deploy (or E2E_BASE_URL) to the deployed https URL.");
  process.exit(1);
}
console.log(`→ Testing ${base}`);
const r = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, E2E_BASE_URL: base },
});
process.exit(r.status ?? 1);
