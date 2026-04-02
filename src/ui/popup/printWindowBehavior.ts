export interface PrintWindowLike {
  addEventListener(
    type: "afterprint",
    listener: () => void | Promise<void>,
    options?: AddEventListenerOptions,
  ): void;
  close(): void;
}

export interface RegisterPrintWindowAfterPrintOptions {
  closePrintWindowAfterPrint: boolean;
  onAfterPrint: () => void | Promise<void>;
}

export function registerPrintWindowAfterPrint(
  printWindow: PrintWindowLike,
  options: RegisterPrintWindowAfterPrintOptions,
): void {
  printWindow.addEventListener("afterprint", () => {
    try {
      void options.onAfterPrint();
    } finally {
      if (options.closePrintWindowAfterPrint) {
        printWindow.close();
      }
    }
  }, { once: true });
}
