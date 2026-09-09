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

/**
 * Self-healing: this runs against a shared live account, so an interrupted
 * previous run can leave today's reflection behind. Clear it before writing.
 */
async function clearTodaysReflection(page: Page) {
  await page.goto("/journal");
  // Wait for the editor before probing for Remove: isVisible() is an
  // immediate check with no auto-waiting, so on a still-loading page it
  // reports false and the cleanup is silently skipped.
  await expect(page.getByLabel("Your reflection")).toBeVisible();
  const remove = page.getByRole("button", { name: "Remove" });
  if (await remove.isVisible().catch(() => false)) {
    await remove.click();
    await expect(remove).toBeHidden();
  }
}

test("journal: write, persist, surface on Today, and remove a reflection", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await login(page);
  await clearTodaysReflection(page);

  const body = `E2E reflection ${Date.now()}`;

  try {
    // Empty state: no entries on the account yet for today.
    await expect(
      page.getByRole("heading", { name: "Reflection Journal" }),
    ).toBeVisible();

    // Write and save today's reflection.
    await page.getByLabel("Your reflection").fill(body);
    await page.getByRole("button", { name: "Save reflection" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Reflection saved." }),
    ).toBeVisible();

    // Reload — it must have persisted server-side, not just optimistically.
    await page.reload();
    await expect(page.getByLabel("Your reflection")).toHaveValue(body);

    // It also appears in the Today side rail, with an edit link back here.
    await page.goto("/today");
    await expect(page.getByText(body)).toBeVisible();
    await page.getByRole("link", { name: "Edit today's reflection" }).click();
    await page.waitForURL("/journal");
    await expect(page.getByLabel("Your reflection")).toHaveValue(body);
  } finally {
    await clearTodaysReflection(page);
  }

  // After removal the Today rail falls back to the quiet invitation.
  await page.goto("/today");
  await expect(
    page.getByRole("link", { name: "Add a reflection" }),
  ).toBeVisible();
});
