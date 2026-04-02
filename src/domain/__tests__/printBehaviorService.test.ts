import { beforeEach, describe, expect, it } from "bun:test";
import { getPrintBehaviorSettings, savePrintBehaviorSettings } from "../printBehaviorService";
import { resetChromeStorage } from "./testUtils";

describe("printBehaviorService", () => {
  beforeEach(() => {
    resetChromeStorage();
  });

  it("returns the default auto-close setting from seeded config", async () => {
    const settings = await getPrintBehaviorSettings();
    expect(settings).toEqual({ closePrintWindowAfterPrint: true });
  });

  it("persists the print window close preference", async () => {
    await savePrintBehaviorSettings({ closePrintWindowAfterPrint: false });
    const settings = await getPrintBehaviorSettings();
    expect(settings).toEqual({ closePrintWindowAfterPrint: false });
  });
});
