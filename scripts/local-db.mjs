#!/usr/bin/env node
/**
 * Local development/test PostgreSQL instance — separate from any system
 * PostgreSQL service. Data lives in ./.local/pgdata (git-ignored).
 *
 *   node scripts/local-db.mjs init     # first time: create cluster + databases
 *   node scripts/local-db.mjs start
 *   node scripts/local-db.mjs stop
 *   node scripts/local-db.mjs status
 *
 * Requires PostgreSQL 15+ binaries. Set PG_BIN if they are not in the default
 * Windows location or on PATH.
 *
 * Connection: postgresql://postgres@localhost:54329/resort  (trust auth, local only)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const PORT = process.env.LOCAL_PG_PORT ?? "54329";
const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, ".local", "pgdata");
const logFile = path.join(root, ".local", "postgres.log");

const defaultWinBin = "C:\\Program Files\\PostgreSQL\\18\\bin";
const binDir =
  process.env.PG_BIN ?? (process.platform === "win32" && existsSync(defaultWinBin) ? defaultWinBin : "");
const bin = (name) =>
  binDir ? path.join(binDir, process.platform === "win32" ? `${name}.exe` : name) : name;
const run = (name, args, opts = {}) => execFileSync(bin(name), args, { stdio: "inherit", ...opts });
// The server process inherits pg_ctl's handles, so starting must not share our stdio
// (otherwise the calling shell waits forever). Output goes to the log file instead.
const startServer = () =>
  run(
    "pg_ctl",
    ["-D", dataDir, "-l", logFile, "-o", `-p ${PORT} -c listen_addresses=localhost`, "-w", "start"],
    {
      stdio: "ignore",
    },
  );

const cmd = process.argv[2];

function isRunning() {
  try {
    execFileSync(bin("pg_isready"), ["-h", "localhost", "-p", PORT], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

switch (cmd) {
  case "init": {
    if (existsSync(path.join(dataDir, "PG_VERSION"))) {
      console.log("Cluster already exists at", dataDir);
    } else {
      mkdirSync(dataDir, { recursive: true });
      // trust auth on localhost only — this instance is for development and tests.
      run("initdb", ["-D", dataDir, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--no-locale"]);
    }
    if (!isRunning()) startServer();
    for (const db of ["resort", "resort_test"]) {
      try {
        run("createdb", ["-h", "localhost", "-p", PORT, "-U", "postgres", db], { stdio: "ignore" });
        console.log("Created database", db);
      } catch {
        console.log("Database", db, "already exists");
      }
    }
    break;
  }
  case "start":
    if (isRunning()) console.log(`Already running on port ${PORT}`);
    else startServer();
    break;
  case "stop":
    run("pg_ctl", ["-D", dataDir, "-m", "fast", "stop"]);
    break;
  case "status":
    console.log(isRunning() ? `Running on port ${PORT}` : "Not running");
    break;
  default:
    console.log("Usage: node scripts/local-db.mjs <init|start|stop|status>");
    process.exit(1);
}
