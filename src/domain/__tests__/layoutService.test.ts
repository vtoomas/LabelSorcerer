import { beforeEach, describe, expect, it } from "bun:test";
import { resetChromeStorage } from "./testUtils";
import {
  deleteLayout,
  getLayoutById,
  getLayouts,
  saveLayout,
  updateLayoutVariables
} from "../layoutService";
import { getConfig } from "../storageService";

describe("layoutService", () => {
  beforeEach(() => {
    resetChromeStorage();
  });

  it("returns the seeded layout catalog", async () => {
    const layouts = await getLayouts();
    expect(layouts.length).toBeGreaterThan(0);
    expect(layouts[0].name).toBe("Asset Snapshot");
  });

  it("persists a new layout and bumps the next id", async () => {
    const layout = await saveLayout({
      id: 0,
      name: "Custom Layout",
      labelFormatId: 2,
      variables: [],
      elements: []
    });

    expect(layout.id).toBeGreaterThan(1);

    const config = await getConfig();
    expect(config.layouts.some((entry) => entry.id === layout.id)).toBe(true);
    expect(config.nextLayoutId).toBe(layout.id + 1);
  });

  it("updates variables without disrupting other fields", async () => {
    const [base] = await getLayouts();
    const newVariables = [
      { key: "asset_name", label: "Asset Name", multiple: false }
    ];

    await updateLayoutVariables(base.id, newVariables);

    const updated = await getLayoutById(base.id);
    expect(updated?.variables).toEqual(newVariables);
  });

  it("deletes a layout", async () => {
    const layouts = await getLayouts();
    await deleteLayout(layouts[0].id);
    const remaining = await getLayouts();
    expect(remaining.length).toBe(layouts.length - 1);
  });
});
