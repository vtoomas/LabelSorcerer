import { beforeEach, describe, expect, it } from "bun:test";
import { deleteLayout, getLayouts, saveLayout, updateLayoutVariables } from "../layoutService";
import { saveDataSource } from "../dataSourceService";
import { saveLabelFormat } from "../labelFormatService";
import {
  getConfig,
  LEGACY_STORAGE_KEY,
  LAYOUT_STACKS_STORAGE_KEY,
  META_STORAGE_KEY,
  PRINT_BEHAVIOR_STORAGE_KEY,
  WEBHOOK_STORAGE_KEY,
  saveConfig,
  type Config
} from "../storageService";
import { getStoredItems, resetChromeStorage } from "./testUtils";

describe("storageService", () => {
  beforeEach(() => {
    resetChromeStorage();
  });

  it("seeds defaults into v2 storage when storage is empty", async () => {
    const config = await getConfig();
    const stored = getStoredItems();
    const meta = stored[META_STORAGE_KEY] as {
      version: number;
      layoutIds: number[];
      labelFormatIds: number[];
      dataSourceIds: number[];
    };

    expect(config.layouts.length).toBeGreaterThan(0);
    expect(meta.version).toBe(2);
    expect(meta.layoutIds).toEqual(config.layouts.map((layout) => layout.id));
    expect(meta.labelFormatIds).toEqual(config.labelFormats.map((format) => format.id));
    expect(meta.dataSourceIds).toEqual(config.dataSources.map((dataSource) => dataSource.id));
    expect(stored[LEGACY_STORAGE_KEY]).toBeUndefined();
    expect(stored[WEBHOOK_STORAGE_KEY]).toBeNull();
    expect(stored[LAYOUT_STACKS_STORAGE_KEY]).toEqual({});
    expect(stored[PRINT_BEHAVIOR_STORAGE_KEY]).toBe(true);
    expect(config.closePrintWindowAfterPrint).toBe(true);
    expect(config.labelFormats[0]).toMatchObject({
      id: 3,
      name: "120 x 280 px",
      widthPx: 120,
      heightPx: 280
    });
    expect(config.layouts.find((layout) => layout.name === "HN Post")).toMatchObject({
      id: 2,
      labelFormatId: 3
    });
    expect(config.dataSources.find((dataSource) => dataSource.name === "HN")).toMatchObject({
      id: 3,
      defaultLayoutId: 2
    });
  });

  it("migrates the legacy single-key config into split sync keys", async () => {
    const legacy: Config = {
      layouts: [
        {
          id: 40,
          name: "Migrated Layout",
          labelFormatId: 30,
          variables: [{ key: "title", label: "Title", multiple: false }],
          elements: []
        }
      ],
      labelFormats: [
        {
          id: 30,
          name: "Migrated Format",
          widthPx: 100,
          heightPx: 50,
          marginTopPx: 1,
          marginBottomPx: 1,
          marginLeftPx: 1,
          marginRightPx: 1,
          description: "Legacy"
        }
      ],
      dataSources: [
        {
          id: 20,
          name: "Migrated Source",
          urlPattern: "https://example.com/*",
          defaultLayoutId: 40,
          variableMappings: []
        }
      ],
      nextLayoutId: 41,
      nextLabelFormatId: 31,
      nextDataSourceId: 21,
      postPrintWebhook: null,
      layoutStacks: { 20: [40] }
    };

    resetChromeStorage({ [LEGACY_STORAGE_KEY]: legacy });

    const config = await getConfig();
    const stored = getStoredItems();
    const meta = stored[META_STORAGE_KEY] as {
      version: number;
      layoutIds: number[];
      labelFormatIds: number[];
      dataSourceIds: number[];
      nextLayoutId: number;
      nextLabelFormatId: number;
      nextDataSourceId: number;
    };

    expect(config.layouts[0]?.name).toBe("Migrated Layout");
    expect(meta.version).toBe(2);
    expect(meta.layoutIds).toEqual([40]);
    expect(meta.labelFormatIds).toEqual([30]);
    expect(meta.dataSourceIds).toEqual([20]);
    expect(meta.nextLayoutId).toBe(41);
    expect(meta.nextLabelFormatId).toBe(31);
    expect(meta.nextDataSourceId).toBe(21);
    expect(stored[LEGACY_STORAGE_KEY]).toBeUndefined();
    expect(stored["labelsorcerer:layout:40"]).toBeDefined();
    expect(stored["labelsorcerer:format:30"]).toBeDefined();
    expect(stored["labelsorcerer:dataSource:20"]).toBeDefined();
    expect(stored[LAYOUT_STACKS_STORAGE_KEY]).toEqual({ 20: [40] });
    expect(stored[PRINT_BEHAVIOR_STORAGE_KEY]).toBe(true);
    expect(config.closePrintWindowAfterPrint).toBe(true);
  });

  it("persists imported config plus a new layout across rehydration", async () => {
    await getConfig();

    const imported = JSON.parse(await Bun.file("tests/labelsorcerer-export.json").text()) as {
      labelFormats: Parameters<typeof saveLabelFormat>[0][];
      layouts: Parameters<typeof saveLayout>[0][];
      dataSources: Parameters<typeof saveDataSource>[0][];
    };

    for (const format of imported.labelFormats) {
      await saveLabelFormat(format);
    }
    for (const layout of imported.layouts) {
      await saveLayout(layout);
    }
    for (const dataSource of imported.dataSources) {
      await saveDataSource(dataSource);
    }

    await saveLayout({
      id: 0,
      name: "Imported config layout",
      labelFormatId: 1,
      variables: [],
      elements: []
    });

    const stored = getStoredItems();
    resetChromeStorage(stored);

    const layouts = await getLayouts();
    expect(layouts).toHaveLength(7);
    expect(layouts.some((layout) => layout.name === "Imported config layout")).toBe(true);
  });

  it("updates and deletes layouts without leaving stale meta ids", async () => {
    const created = await saveLayout({
      id: 0,
      name: "Meta Target",
      labelFormatId: 1,
      variables: [],
      elements: []
    });

    await updateLayoutVariables(created.id, [{ key: "asset_name", label: "Asset Name", multiple: false }]);

    let stored = getStoredItems();
    let meta = stored[META_STORAGE_KEY] as { layoutIds: number[] };
    expect(meta.layoutIds).toContain(created.id);

    await deleteLayout(created.id);

    stored = getStoredItems();
    meta = stored[META_STORAGE_KEY] as { layoutIds: number[] };
    expect(meta.layoutIds).not.toContain(created.id);
    expect(stored[`labelsorcerer:layout:${created.id}`]).toBeUndefined();
  });

  it("persists the print window close preference across rehydration", async () => {
    const config = await getConfig();
    config.closePrintWindowAfterPrint = false;

    resetChromeStorage();
    await saveConfig(config);

    const stored = getStoredItems();
    expect(stored[PRINT_BEHAVIOR_STORAGE_KEY]).toBe(false);

    resetChromeStorage(stored);
    const rehydrated = await getConfig();
    expect(rehydrated.closePrintWindowAfterPrint).toBe(false);
  });
});
