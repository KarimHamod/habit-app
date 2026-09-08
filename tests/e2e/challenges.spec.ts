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

/** Creates a minimal daily, yes/no habit through the full wizard, same steps as critical-path.spec.ts. */
async function createHabit(page: Page, name: string) {
  await page.goto("/habits/new");
  await page.getByLabel("Habit name").fill(name);
  await page.getByRole("button", { name: "Next", exact: true }).click(); // basics -> frequency
  await page.getByRole("button", { name: "Next", exact: true }).click(); // frequency (Daily, default) -> type
  await page.getByRole("button", { name: "Next", exact: true }).click(); // type (Yes/No, default) -> schedule
  await page.getByRole("button", { name: "Next", exact: true }).click(); // schedule (today, default) -> review
  await page.getByRole("button", { name: "Create Habit" }).click();
  await page.waitForURL("/today");
}

/**
 * Deletes a single habit by name via its row's actions menu on /habits.
 * Only call this when the habit is known to exist — it waits (rather than
 * a one-shot visibility check) so it isn't skipped by a render race right
 * after `page.goto`. Reloads afterward and re-asserts, since the row's
 * removal from the list is an optimistic client-side update — this confirms
 * the delete actually persisted server-side before trusting the account is
 * clean, the same discipline critical-path.spec.ts and settings.spec.ts use
 * for their own mutations.
 */
async function deleteHabit(page: Page, name: string) {
  await page.goto("/habits");
  const menuButton = page.getByRole("button", { name: `Actions for ${name}` });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(menuButton).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await expect(menuButton).toBeHidden();
}

test("challenges: create, see on Today, then cancel", async ({ page }) => {
  // Slightly longer than the other specs' 60s: this test touches more
  // routes in one run (habit wizard, challenges/new, challenge detail,
  // today, habits list/menu), each a possible first-visit dev-server compile.
  test.setTimeout(90_000);

  await login(page);

  // This test needs at least one active habit to link a challenge to.
  // Other e2e specs (critical-path.spec.ts) delete every habit they create
  // before and after each run, so the shared account may have zero habits
  // when this test starts — create a throwaway one in that case, and
  // remove it again below so this test leaves no extra residue either.
  const habitName = `E2E Challenge Habit ${Date.now()}`;
  let createdHabit = false;

  await page.goto("/challenges/new");
  const hasHabit = await page
    .getByRole("checkbox")
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasHabit) {
    await createHabit(page, habitName);
    createdHabit = true;
    await page.goto("/challenges/new");
  }

  try {
    await page.getByLabel("Name").fill(`E2E Challenge ${Date.now()}`);
    await page.getByLabel("Duration (days)").fill("7");
    const firstHabitCheckbox = page.getByRole("checkbox").first();
    await expect(firstHabitCheckbox).toBeVisible();
    await firstHabitCheckbox.check();
    await page.getByRole("button", { name: "Start challenge" }).click();

    // Match only a real challenge id, not the literal "/challenges/new" we
    // start from — a bare `[^/]+$` pattern matches "new" too, so it can
    // resolve immediately against the pre-redirect URL instead of waiting
    // for the actual navigation.
    await page.waitForURL(/\/challenges\/[0-9a-f-]{36}$/);
    const challengeUrl = page.url();

    try {
      // Challenge detail page shows day/rate progress for the new challenge.
      await expect(page.getByText(/Day 1 of 7/)).toBeVisible();

      // The Today page banner links to the same challenge and shows progress.
      await page.goto("/today");
      await expect(page.getByText(/Day 1 of 7/)).toBeVisible();
    } finally {
      // Cancel from the detail page (the only place the cancel control
      // renders) regardless of whether the assertions above passed, so a
      // failed assertion mid-test doesn't leave a live challenge on the
      // shared E2E account.
      await page.goto(challengeUrl);
      const cancelTrigger = page.getByRole("button", {
        name: "Cancel challenge",
      });
      await cancelTrigger.click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Cancel challenge" })
        .click();
      await page.waitForURL("/challenges");
    }
  } finally {
    if (createdHabit) {
      await deleteHabit(page, habitName);
    }
  }
});
