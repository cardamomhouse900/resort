import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { signParams } from "@/lib/cloudinary";
import { safeAdminRedirect } from "@/lib/safe-redirect";

const ADMIN_DIR = path.resolve(__dirname, "../../src/app/admin");

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? filesIn(p) : [p];
  });
}

/** Splits a "use server" module into its exported async functions' bodies. */
function exportedFunctions(source: string): { name: string; body: string }[] {
  const re = /export async function (\w+)\s*\(/g;
  const starts = [...source.matchAll(re)];
  return starts.map((m, i) => ({
    name: m[1],
    body: source.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : undefined),
  }));
}

describe("admin Server Actions", () => {
  const actionFiles = filesIn(ADMIN_DIR).filter(
    (f) => /\.(ts|tsx)$/.test(f) && /^["']use server["']/.test(readFileSync(f, "utf8").trim()),
  );

  it("finds the admin action modules", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(7);
  });

  it("every exported action checks admin access (except sign-in/sign-out)", () => {
    const unguarded: string[] = [];
    for (const file of actionFiles) {
      for (const fn of exportedFunctions(readFileSync(file, "utf8"))) {
        if (["signIn", "signOut"].includes(fn.name)) continue;
        const guarded = /requireAdmin\(/.test(fn.body) || /\b(saveContent|deleteContent)\(/.test(fn.body);
        if (!guarded) unguarded.push(`${path.relative(ADMIN_DIR, file)} → ${fn.name}`);
      }
    }
    expect(unguarded).toEqual([]);
  });

  it("content helpers themselves check admin access", () => {
    const helpers = readFileSync(path.join(ADMIN_DIR, "(panel)/content-helpers.ts"), "utf8");
    for (const fn of ["saveContent", "deleteContent"]) {
      const body = helpers.slice(helpers.indexOf(`export async function ${fn}`));
      expect(body.slice(0, 200)).toMatch(/await requireAdmin\(/);
    }
  });

  it("settings are owner-only", () => {
    const settings = readFileSync(path.join(ADMIN_DIR, "(panel)/settings/actions.ts"), "utf8");
    expect(settings).toMatch(/requireAdmin\(\{ role: "OWNER" \}\)/);
  });
});

describe("post-login redirect", () => {
  it.each([
    ["/admin/bookings", "/admin/bookings"],
    ["/admin/rooms/3f1c-abc", "/admin/rooms/3f1c-abc"],
    [undefined, "/admin"],
    ["https://evil.example/admin", "/admin"],
    ["//evil.example", "/admin"],
    ["/admin//evil.example", "/admin"],
    ["/admin/login", "/admin"],
    ["/rooms", "/admin"],
    ["/admin/../rooms", "/admin"],
    ["/admin?next=x", "/admin"],
  ])("%s → %s", (input, expected) => {
    expect(safeAdminRedirect(input)).toBe(expected);
  });
});

describe("Cloudinary upload signature", () => {
  it("matches Cloudinary's documented example", async () => {
    // https://cloudinary.com/documentation/authentication_signatures
    const sig = await signParams(
      { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
      "abcd",
    );
    expect(sig).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
});
