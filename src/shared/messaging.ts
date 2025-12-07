import type { DataSource, LabelLayout } from "../domain/models";

export interface StatusPayload {
  ready: boolean;
  version: string;
  timestamp: string;
  layoutCount: number;
  dataSourceCount: number;
  message?: string;
}

export interface ActiveTabContext {
  tabId?: number;
  url?: string;
  dataSourceId?: number | null;
  dataSourceName?: string | null;
  defaultLayoutId?: number | null;
  resolvedAt: string;
}

export type MessageRequest =
  | { type: "getStatus" }
  | { type: "getLayouts" }
  | { type: "getDataSources" }
  | { type: "getActiveTabContext" };

export type MessageResponse =
  | { type: "status"; payload: StatusPayload }
  | { type: "layouts"; payload: LabelLayout[] }
  | { type: "dataSources"; payload: DataSource[] }
  | { type: "activeContext"; payload: ActiveTabContext }
  | { type: "error"; payload: { message: string } };

export function sendMessage(message: MessageRequest): Promise<MessageResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response as MessageResponse);
    });
  });
}
