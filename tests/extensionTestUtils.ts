import { existsSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const extensionPath = path.resolve(currentDirPath, "..", "dist");
const manifestPath = path.join(extensionPath, "manifest.json");

export type ExtensionSession = {
  context: BrowserContext;
  page: Page;
  userDataDir: string;
};

function assertBuiltExtension(): void {
  if (!existsSync(manifestPath)) {
    throw new Error("Built extension not found in dist/. Run `bun run build` before executing Playwright.");
  }
}

export async function launchOptionsPage(): Promise<ExtensionSession> {
  assertBuiltExtension();

  const userDataDir = await mkdtemp(path.join(tmpdir(), "labelsorcerer-playwright-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }

  const extensionId = new URL(serviceWorker.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator(".sidebar-title")).toHaveText("LabelSorcerer");

  return { context, page, userDataDir };
}

export async function closeSession(session: ExtensionSession): Promise<void> {
  await session.context.close();
  await rm(session.userDataDir, { recursive: true, force: true });
}

export async function openFirstLayoutInEditor(page: Page): Promise<string> {
  const firstRow = page.locator(".layout-list .layout-row").first();
  const layoutName = (await firstRow.locator(".layout-name").textContent())?.trim() ?? "";
  await firstRow.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Layout editor" })).toBeVisible();
  return layoutName;
}

export function getLayersSelect(page: Page) {
  return page.locator(".layout-editor-meta-row select").nth(1);
}

export async function openImportExportSection(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Import / Export" }).click();
  await expect(page.getByRole("heading", { name: "Move configs between machines" })).toBeVisible();
}
