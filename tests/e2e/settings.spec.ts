import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test.skip(
  !EMAIL || !PASSWORD,
  "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — skipping live-account E2E test.",
);

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/today");
}

test("settings: edit and persist the display name", async ({ page }) => {
  test.setTimeout(60_000);

  await login(page);

  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForURL("/settings");

  const nameInput = page.getByLabel("Your name");
  const originalName = await nameInput.inputValue();
  const newName = `E2E Settings ${Date.now()}`;

  try {
    await nameInput.fill(newName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Settings saved.");

    // Reload — the update must persist server-side, not just optimistically.
    await page.reload();
    await expect(page.getByLabel("Your name")).toHaveValue(newName);
  } finally {
    await page.getByLabel("Your name").fill(originalName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Settings saved.");
  }
});
