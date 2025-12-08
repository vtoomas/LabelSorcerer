export type PrintWebhookMethod = "GET" | "POST";

export interface PostPrintWebhookConfig {
  url: string;
  method: PrintWebhookMethod;
  body?: string;
}
