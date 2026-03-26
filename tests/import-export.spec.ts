import path from "path";
import { fileURLToPath } from "url";
import { expect, test } from "@playwright/test";
import { closeSession, launchOptionsPage, openImportExportSection } from "./extensionTestUtils";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const importFixturePath = path.join(currentDirPath, "labelsorcerer-export.json");

test.describe("options import/export", () => {
  test("imports exported settings, creates a new layout, and persists the merged layout count after refresh", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();
    const createdLayoutName = "Imported config layout";

    try {
      await openImportExportSection(session.page);
      await session.page.locator('input[type="file"]').setInputFiles(importFixturePath);

      await expect(session.page.getByText("Imported formats, layouts, and data sources.", { exact: true })).toBeVisible();

      await session.page.getByRole("button", { name: "Layouts" }).click();
      await expect(session.page.locator(".layout-list .layout-row")).toHaveCount(5);
      await expect(session.page.locator(".layout-list .layout-name")).toContainText([
        "Asset Snapshot",
        "Asset QR + Name",
        "TLL IT kontakt",
        "Asset QR",
        "Asset small Name",
      ]);

      await session.page.getByRole("button", { name: "+ Create layout" }).click();

      await expect(session.page.getByRole("heading", { name: "Layout editor" })).toBeVisible();
      await expect(session.page.getByLabel("Layout name")).toHaveValue("New layout");
      await expect(session.page.getByLabel("Format")).toHaveValue("1");

      await session.page.getByLabel("Layout name").fill(createdLayoutName);
      await session.page.getByRole("button", { name: "Save layout" }).click();

      await expect(session.page.getByRole("heading", { name: "Design once, reuse everywhere" })).toBeVisible();
      await session.page.reload();

      await expect(session.page.getByRole("heading", { name: "Design once, reuse everywhere" })).toBeVisible();
      await expect(session.page.locator(".layout-list .layout-row")).toHaveCount(6);
      await expect(session.page.locator(".layout-list .layout-name")).toContainText([
        "Asset Snapshot",
        "Asset QR + Name",
        "TLL IT kontakt",
        "Asset QR",
        "Asset small Name",
        createdLayoutName,
      ]);
    } finally {
      await closeSession(session);
    }
  });
});
