import { getConfig, saveConfig } from "./storageService";
import type { PostPrintWebhookConfig } from "../shared/webhook";

export async function getPrintWebhookConfig(): Promise<PostPrintWebhookConfig | null> {
  const config = await getConfig();
  return config.postPrintWebhook ?? null;
}

export async function savePrintWebhookConfig(payload: PostPrintWebhookConfig | null): Promise<void> {
  const config = await getConfig();
  config.postPrintWebhook = payload;
  await saveConfig(config);
}
