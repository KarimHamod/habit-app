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

/** Deletes every habit (active or archived) on the account so each run starts from a clean slate. */
async function deleteAllHabits(page: Page) {
  await page.goto("/habits");

  for (const tabName of ["Active", "Archived"]) {
    await page.getByRole("tab", { name: tabName }).click();

    while (true) {
      const menuButton = page
        .getByRole("button", { name: /^Actions for /i })
        .first();
      if (!(await menuButton.isVisible().catch(() => false))) break;

      await menuButton.click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(menuButton).toBeHidden();
    }
  }
}

test("critical path: create a habit, complete it, and see the streak", async ({
  page,
}) => {
  test.setTimeout(60_000);

  await login(page);
  await deleteAllHabits(page);

  const habitName = `E2E Meditate ${Date.now()}`;

  try {
    // Create a daily, yes/no habit through the full wizard.
    await page.goto("/habits/new");
    await page.getByLabel("Habit name").fill(habitName);
    await page.getByRole("button", { name: "Next", exact: true }).click(); // basics -> frequency
    await page.getByRole("button", { name: "Next", exact: true }).click(); // frequency (Daily, default) -> type
    await page.getByRole("button", { name: "Next", exact: true }).click(); // type (Yes/No, default) -> schedule
    await page.getByRole("button", { name: "Next", exact: true }).click(); // schedule (today, default) -> review
    await page.getByRole("button", { name: "Create Habit" }).click();
    await page.waitForURL("/today");

    // The new habit appears on Today, not yet completed.
    await expect(page.getByText(habitName)).toBeVisible();
    const toggle = page.getByRole("button", {
      name: `Mark ${habitName} as done`,
    });
    await expect(toggle).toBeVisible();

    // Complete it — this is the account's only habit, so the Today page
    // swaps the list for the "all done" celebration rather than leaving the
    // toggle in place with a flipped label. Assert on that celebration
    // instead of expecting the (intentionally hidden) toggle to reappear.
    await toggle.click();
    await expect(
      page.getByRole("status").filter({ hasText: "All habits completed!" }),
    ).toBeVisible();

    // Reload — the completion must persist server-side, not just optimistically.
    await page.reload();
    await expect(
      page.getByRole("status").filter({ hasText: "All habits completed!" }),
    ).toBeVisible();

    // The habit detail page reflects a 1-day streak from that single completion.
    await page.goto("/habits");
    await page.getByText(habitName).click();
    const currentStreakCard = page
      .locator("div.rounded-xl.border.p-4.text-center")
      .filter({ hasText: "Current streak" });
    // A first visit to this route can trigger on-demand dev-server
    // compilation, which is slower than the default assertion timeout.
    await expect(currentStreakCard).toContainText("1", { timeout: 15_000 });
  } finally {
    await deleteAllHabits(page);
  }
});
