import { getConfig, saveConfig } from "./storageService";

export interface PrintBehaviorSettings {
  closePrintWindowAfterPrint: boolean;
}

export async function getPrintBehaviorSettings(): Promise<PrintBehaviorSettings> {
  const config = await getConfig();
  return {
    closePrintWindowAfterPrint: config.closePrintWindowAfterPrint ?? true,
  };
}

export async function savePrintBehaviorSettings(payload: PrintBehaviorSettings): Promise<void> {
  const config = await getConfig();
  config.closePrintWindowAfterPrint = payload.closePrintWindowAfterPrint;
  await saveConfig(config);
}
