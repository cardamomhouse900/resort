import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "src"),
  // "server-only" throws outside a React Server Component bundle; tests run in plain Node.
  "server-only": path.resolve(__dirname, "tests/support/empty.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    // Integration tests share one database; run test files one at a time.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/global-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
