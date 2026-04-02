import { describe, expect, it } from "bun:test";
import { registerPrintWindowAfterPrint, type PrintWindowLike } from "../printWindowBehavior";

describe("registerPrintWindowAfterPrint", () => {
  it("closes the print window after running the callback when auto-close is enabled", async () => {
    let listener: (() => void | Promise<void>) | null = null;
    const events: string[] = [];
    const printWindow: PrintWindowLike = {
      addEventListener(type, callback) {
        events.push(type);
        listener = callback;
      },
      close() {
        events.push("close");
      },
    };

    registerPrintWindowAfterPrint(printWindow, {
      closePrintWindowAfterPrint: true,
      onAfterPrint: async () => {
        events.push("webhook");
      },
    });

    expect(events).toEqual(["afterprint"]);
    await listener?.();

    expect(events).toEqual(["afterprint", "webhook", "close"]);
  });

  it("keeps the print window open after running the callback when auto-close is disabled", async () => {
    let listener: (() => void | Promise<void>) | null = null;
    const events: string[] = [];
    const printWindow: PrintWindowLike = {
      addEventListener(_type, callback) {
        listener = callback;
      },
      close() {
        events.push("close");
      },
    };

    registerPrintWindowAfterPrint(printWindow, {
      closePrintWindowAfterPrint: false,
      onAfterPrint: () => {
        events.push("webhook");
      },
    });

    await listener?.();

    expect(events).toEqual(["webhook"]);
  });
});
