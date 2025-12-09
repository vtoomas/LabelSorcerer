import type { LayoutElement, LabelFormat, LabelLayout } from "../domain/models";
import { resolveElementDisplayValue } from "./layoutElementUtils";

export type PrintWebhookMethod = "GET" | "POST";

export interface PostPrintWebhookConfig {
  url: string;
  method: PrintWebhookMethod;
  body?: string;
}

export interface PrintWebhookPayload {
  dataSourceId: number | null;
  dataSourceName: string;
  layout: {
    id: number;
    name: string;
    labelFormatId: number;
  };
  format: LabelFormat | null;
  elements: Array<{
    id: number;
    name: string;
    type: LayoutElement["type"];
    mode: LayoutElement["mode"];
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    value: string;
  }>;
  resolvedVariables: Record<string, string>;
  printedAt: string;
}

export function buildPrintWebhookPayload(
  layout: LabelLayout,
  format: LabelFormat | null,
  resolvedMap: Record<string, string>,
  dataSourceId: number | null,
  dataSourceName: string,
): PrintWebhookPayload {
  return {
    dataSourceId,
    dataSourceName,
    layout: {
      id: layout.id,
      name: layout.name,
      labelFormatId: layout.labelFormatId,
    },
    format,
    elements: layout.elements.map((element) => ({
      id: element.id,
      name: element.name,
      type: element.type,
      mode: element.mode,
      positionX: element.positionX,
      positionY: element.positionY,
      width: element.width,
      height: element.height,
      value: resolveElementDisplayValue(element, resolvedMap),
    })),
    resolvedVariables: { ...resolvedMap },
    printedAt: new Date().toISOString(),
  };
}

export async function sendPrintWebhook(
  payload: PrintWebhookPayload,
  config: PostPrintWebhookConfig | null,
): Promise<Response | undefined> {
  if (!config?.url?.trim()) return;
  const payloadJson = JSON.stringify(payload);
  let requestUrl: string;
  try {
    const urlTemplate = config.url;
    const templateMatch = /{{\s*payload\s*}}/i.test(urlTemplate);
    if (templateMatch) {
      requestUrl = urlTemplate.replace(/{{\s*payload\s*}}/gi, encodeURIComponent(payloadJson));
    } else {
      requestUrl = urlTemplate;
    }
  } catch (error) {
    console.error("Unable to build webhook URL", error);
    return;
  }

  try {
    if (config.method === "GET") {
      return await fetch(requestUrl, { method: "GET" });
    }
    const template = config.body?.trim();
    const bodyContent = template ? interpolateWebhookBody(template, payload, payloadJson) : payloadJson;
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyContent,
    });
    return response;
  } catch (error) {
    console.error("Post-print webhook failed", error);
    return undefined;
  }
}

export function createSamplePrintWebhookPayload(): PrintWebhookPayload {
  const layout: LabelLayout = {
    id: 0,
    name: "Sample layout",
    labelFormatId: 0,
    variables: [{ key: "sample", label: "Sample", multiple: false }],
    elements: [
      {
        id: 1,
        name: "Sample text",
        type: "text",
        positionX: 10,
        positionY: 10,
        width: 200,
        height: 24,
        rotation: 0,
        fontSize: 12,
        mode: "dynamic",
        staticContent: null,
        dynamicBinding: { variableKey: "sample" },
      },
    ],
  };
  const format: LabelFormat = {
    id: 0,
    name: "Sample format",
    widthPx: 300,
    heightPx: 200,
    marginTopPx: 10,
    marginBottomPx: 10,
    marginLeftPx: 10,
    marginRightPx: 10,
    description: "Sample size",
  };
  const resolvedMap = { sample: "Webhook test value" };
  return buildPrintWebhookPayload(layout, format, resolvedMap, null, "Sample data source");
}

function interpolateWebhookBody(template: string, payload: PrintWebhookPayload, payloadJson: string): string {
  const placeholder = /{{\s*([^}]+)\s*}}/g;
  const replaced = template.replace(placeholder, (_, token) => {
    if (!token) return "";
    const trimmed = token.trim();
    if (!trimmed) return "";
    if (trimmed === "payload") {
      return payloadJson;
    }
    const path = trimmed.startsWith("payload.") ? trimmed.slice("payload.".length) : trimmed;
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (current && typeof current === "object" && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, payload as unknown);
    if (value === undefined || value === null) return "";
    return typeof value === "string" ? value : JSON.stringify(value);
  });
  return replaced;
}
