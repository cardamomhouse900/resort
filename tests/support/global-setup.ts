import { execSync } from "node:child_process";
import { config } from "dotenv";

/**
 * Integration tests run against a SEPARATE database (TEST_DATABASE_URL),
 * never the development or production database.
 */
export default function setup() {
  config({ path: ".env.local", quiet: true });
  config({ quiet: true });
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:54329/resort_test";
  if (!/test/i.test(url)) throw new Error(`Refusing to run tests against a non-test database: ${url}`);
  process.env.TEST_DATABASE_URL = url;

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
