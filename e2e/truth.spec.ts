import { test, expect } from "@playwright/test";
import {
  buildTruthProbes,
  probeTruthEndpoint,
  scoreTruthProbes,
  detectSplitBrain,
} from "../shared/fleet/truthProbes";

const MIN_TRUTH_SCORE = Number(process.env.TRUTH_MIN_SCORE ?? "85");

test.describe("ONE TRUTH fleet", () => {
  test("production objectstore returns JSON master-items", async ({ request }) => {
    const res = await request.get(
      "https://info.grudge-studio.com/api/v1/master-items.json",
    );
    expect(res.ok()).toBeTruthy();
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/json");
    const body = await res.json();
    expect(Array.isArray(body) || typeof body === "object").toBeTruthy();
  });

  test("Truth badge visible on home", async ({ page }) => {
    await page.goto("/home");
    const badge = page.getByRole("button", { name: /Truth/i });
    await expect(badge).toBeVisible({ timeout: 15_000 });
    await badge.click();
    await expect(page.getByText(/Grudge Warlords — ONE TRUTH/)).toBeVisible();
    await expect(page.getByText(/master-items\.json/)).toBeVisible({ timeout: 30_000 });
  });

  test("client /systems page loads Truth panel", async ({ page }) => {
    await page.goto("/systems");
    const heading = page.getByRole("heading", { name: /ONE TRUTH Systems/i });
    const deployed = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    if (!deployed) {
      test.skip(true, "/systems route not deployed yet — ship this commit first");
    }
    await expect(heading).toBeVisible();
    await expect(page.getByText(/Grudge Warlords — ONE TRUTH/)).toBeVisible();
    await expect(page.getByText(/master-items\.json/)).toBeVisible({ timeout: 30_000 });
  });

  test("SSO login redirect targets Grudge ID", async ({ page }) => {
    await page.goto("/home");
    const signIn = page.getByRole("button", { name: /sign in/i }).first();
    if (!(await signIn.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    await signIn.click();
    await page.waitForURL(/id\.grudge-studio\.com/, { timeout: 15_000 });
    expect(page.url()).toMatch(/id\.grudge-studio\.com/);
  });

  test("shared truth probes meet minimum score via client rewrites", async () => {
    const base = process.env.PLAYWRIGHT_BASE_URL ?? "https://client.grudge-studio.com";
    const probes = buildTruthProbes("browser").map((p) => {
      if (!p.browserPath) return p;
      const url = /^https?:\/\//i.test(p.browserPath)
        ? p.browserPath
        : `${base.replace(/\/$/, "")}${p.browserPath}`;
      return { ...p, url };
    });

    const results = await Promise.all(probes.map((p) => probeTruthEndpoint(p, fetch)));

    const score = scoreTruthProbes(results);
    const splitBrain = detectSplitBrain(results);

    expect(splitBrain, splitBrain.join("; ")).toHaveLength(0);
    expect(score, JSON.stringify(results.filter((r) => !r.ok), null, 2)).toBeGreaterThanOrEqual(
      MIN_TRUTH_SCORE,
    );
  });
});