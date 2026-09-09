import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/today");
}

test.describe("primary navigation", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — skipping live-account E2E test.",
  );

  test("walks the five primary sections", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);

    const rail = page.getByRole("navigation", { name: "Primary" }).first();

    const destinations = [
      { label: "Rituals", url: "/challenges", heading: /Challenges & Rituals/ },
      {
        label: "Consistency",
        url: "/insights",
        heading: /Consistency & Garden|Insights/,
      },
      { label: "Journal", url: "/journal", heading: /Reflection Journal/ },
      { label: "Settings", url: "/settings", heading: /Settings/ },
    ];

    for (const { label, url, heading } of destinations) {
      await rail.getByRole("link", { name: label }).click();
      await page.waitForURL(url);
      await expect(
        page.getByRole("heading", { name: heading }).first(),
      ).toBeVisible({ timeout: 15_000 });
    }

    // Today is reachable and is the greeting-headed page.
    await rail.getByRole("link", { name: "Today" }).click();
    await page.waitForURL("/today");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("keeps the parent section highlighted on its sub-routes", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await login(page);

    const rail = page.getByRole("navigation", { name: "Primary" }).first();

    // /habits lives inside the Rituals section, /calendar inside Consistency.
    await page.goto("/habits");
    await expect(rail.getByRole("link", { name: "Rituals" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.goto("/calendar");
    await expect(
      rail.getByRole("link", { name: "Consistency" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
