import { expect, test } from "@playwright/test";
import { closeSession, getLayersSelect, launchOptionsPage, openFirstLayoutInEditor } from "./extensionTestUtils";

test.describe("options layout editor", () => {
  test("renders the saved layout list on initial load", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      await expect(session.page.getByRole("heading", { name: "Design once, reuse everywhere" })).toBeVisible();
      await expect(session.page.locator(".layout-list .layout-row")).toHaveCount(1);
      await expect(session.page.locator(".layout-list .layout-name")).toHaveText(["Asset Snapshot"]);
      await expect(session.page.locator(".layout-list .layout-meta")).toHaveText(["Format #1"]);
    } finally {
      await closeSession(session);
    }
  });

  test("opens a blank layout editor from create layout using the first available format", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      await session.page.getByRole("button", { name: "+ Create layout" }).click();

      await expect(session.page.getByRole("heading", { name: "Layout editor" })).toBeVisible();
      await expect(session.page.getByLabel("Layout name")).toHaveValue("New layout");
      await expect(session.page.getByLabel("Format")).toHaveValue("1");
      await expect(session.page.getByLabel("Format")).toContainText("62 x 29 mm");
      await expect(session.page.locator(".layout-editor-variable-row")).toHaveCount(2);
      await expect(getLayersSelect(session.page).locator("option")).toHaveCount(3);
    } finally {
      await closeSession(session);
    }
  });

  test("opens an existing layout in the editor with its saved metadata", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      const layoutName = await openFirstLayoutInEditor(session.page);

      await expect(session.page.getByLabel("Layout name")).toHaveValue(layoutName);
      await expect(session.page.getByLabel("Format")).toHaveValue("1");
      await expect(session.page.locator(".layout-editor-variable-row")).toHaveCount(3);
      await expect(session.page.locator(".layout-canvas-element")).toHaveCount(3);
      await expect(getLayersSelect(session.page).locator("option")).toHaveCount(4);
      await expect(session.page.locator(".variable-label")).toHaveText(["Asset Name", "Asset Key", "Location"]);
    } finally {
      await closeSession(session);
    }
  });

  test("opens a duplicated layout with a copied name and saves it as a second layout", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      const originalName = (await session.page.locator(".layout-list .layout-name").first().textContent())?.trim() ?? "";
      await session.page.locator(".layout-list .layout-row").first().getByRole("button", { name: "Duplicate" }).click();

      await expect(session.page.getByRole("heading", { name: "Layout editor" })).toBeVisible();
      await expect(session.page.getByLabel("Layout name")).toHaveValue(`${originalName} (copy)`);

      await session.page.getByRole("button", { name: "Save layout" }).click();

      await expect(session.page.getByRole("heading", { name: "Design once, reuse everywhere" })).toBeVisible();
      await expect(session.page.locator(".layout-list .layout-name")).toHaveText([originalName, `${originalName} (copy)`]);
    } finally {
      await closeSession(session);
    }
  });

  test("saves an updated layout name back to the layouts list", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      const originalName = await openFirstLayoutInEditor(session.page);
      const renamedLayout = `${originalName} Updated`;

      await session.page.getByLabel("Layout name").fill(renamedLayout);
      await session.page.getByRole("button", { name: "Save layout" }).click();

      await expect(session.page.getByRole("heading", { name: "Design once, reuse everywhere" })).toBeVisible();
      await expect(session.page.locator(".layout-list .layout-name")).toHaveText([renamedLayout]);
    } finally {
      await closeSession(session);
    }
  });

  test("updates the selected format and persists the layout metadata change", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      await openFirstLayoutInEditor(session.page);

      const canvas = session.page.getByLabel("Label canvas");
      const initialCanvasBox = await canvas.boundingBox();

      await session.page.getByLabel("Format").selectOption("2");

      const updatedCanvasBox = await canvas.boundingBox();
      expect(initialCanvasBox).not.toBeNull();
      expect(updatedCanvasBox).not.toBeNull();
      expect(updatedCanvasBox!.width).toBeLessThan(initialCanvasBox!.width);

      await session.page.getByRole("button", { name: "Save layout" }).click();

      await expect(session.page.locator(".layout-list .layout-meta")).toHaveText(["Format #2"]);
    } finally {
      await closeSession(session);
    }
  });

  test("discards unsaved layout metadata changes when leaving the editor", async ({ browserName }) => {
    test.skip(browserName !== "chromium", "Chrome extension tests only run in Chromium.");

    const session = await launchOptionsPage();

    try {
      const originalName = await openFirstLayoutInEditor(session.page);
      await session.page.getByLabel("Layout name").fill(`${originalName} Draft`);

      await session.page.getByRole("button", { name: "← Back" }).click();

      await expect(session.page.getByRole("heading", { name: "Design once, reuse everywhere" })).toBeVisible();
      await expect(session.page.locator(".layout-list .layout-name")).toHaveText([originalName]);
    } finally {
      await closeSession(session);
    }
  });
});
