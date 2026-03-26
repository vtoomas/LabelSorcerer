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
});
