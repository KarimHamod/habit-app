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

test("todos: add, complete, park, and delete a to-do", async ({ page }) => {
  test.setTimeout(90_000);

  await login(page);
  await page.goto("/todos");

  const title = `E2E todo ${Date.now()}`;

  // Add via quick-add.
  await page.getByLabel("Add a to-do").fill(title);
  await page.getByRole("button", { name: "Add to-do" }).click();
  const row = page.getByText(title, { exact: true });
  await expect(row).toBeVisible();

  // Persisted server-side, not just optimistic.
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  // Complete it — strikethrough is the visible signal.
  await page
    .getByRole("button", { name: `Mark "${title}" as done` })
    .click();
  await expect(
    page.getByRole("button", { name: `Mark "${title}" as not done` }),
  ).toBeVisible();

  // Park it into "Later", then unpark it.
  await page.getByRole("button", { name: `Move "${title}" to Later` }).click();
  await page.getByRole("button", { name: /Later \(\d+\)/ }).click();
  await expect(
    page.getByRole("button", { name: `Move "${title}" to To do` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Move "${title}" to To do` }).click();

  // Delete it.
  await page.getByRole("button", { name: `Delete "${title}"` }).click();
  await expect(page.getByText(title, { exact: true })).toBeHidden();

  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeHidden();
});

test("todos: set a due date via quick-add and edit it afterward", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await login(page);
  await page.goto("/todos");

  const title = `E2E due-date todo ${Date.now()}`;

  // Add with a due date set to "Today" via the quick-add picker. Scoped to
  // the quick-add form, since other rows may already show a "Today" badge.
  const quickAdd = page.locator("form").filter({ has: page.getByLabel("Add a to-do") });
  await quickAdd.getByLabel("Add a to-do").fill(title);
  await quickAdd.getByRole("button", { name: "Add a due date" }).click();
  await quickAdd.getByRole("button", { name: "Today", exact: true }).click();
  await quickAdd.getByRole("button", { name: "Add to-do" }).click();

  const row = page
    .getByText(title, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'rounded-xl')][1]");
  await expect(row.getByText("Today", { exact: true })).toBeVisible();

  // Persisted server-side, not just optimistic.
  await page.reload();
  await expect(row.getByText("Today", { exact: true })).toBeVisible();

  // Edit the due date on the existing todo, then clear it.
  await row.getByText("Today", { exact: true }).click();
  await row.getByLabel("Due date", { exact: true }).fill("");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Add due date", { exact: true })).toBeVisible();

  // Clean up.
  await page.getByRole("button", { name: `Delete "${title}"` }).click();
});
