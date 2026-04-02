import { expect, test } from "@playwright/test";
import { closeSession, launchOptionsPage } from "./extensionTestUtils";

test.describe("options shell", () => {
  test("loads the extension options page and shows the sidebar title", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      await expect(session.page.locator(".sidebar-title")).toHaveText("LabelSorcerer");
    } finally {
      await closeSession(session);
    }
  });

  test("shows the print window auto-close setting in Settings", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      await session.page.getByRole("button", { name: "Settings" }).click();
      await expect(session.page.getByRole("heading", { name: "Print settings" })).toBeVisible();
      await expect(session.page.getByLabel("Close print window after printing")).toBeChecked();
      await expect(session.page.getByLabel("Keep print window open after printing")).not.toBeChecked();
    } finally {
      await closeSession(session);
    }
  });
});
