import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local; load it for the Prisma CLI too (then .env as fallback).
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (session) connection — Supabase's transaction
    // pooler on port 6543 does not support them. The app itself uses DATABASE_URL.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
