import type { DataSource, DataSourceVariableMapping, LabelFormat, LabelLayout } from "../domain/models";
import type { MappingEvaluationResult } from "./mappingEvaluator";

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

export interface ResolvedVariable extends MappingEvaluationResult {
  key: string;
}

export type MessageRequest =
  | { type: "getStatus" }
  | { type: "getLayouts" }
  | { type: "getLabelFormats" }
  | { type: "getDataSources" }
  | { type: "getActiveTabContext" }
  | { type: "evaluateDataSource"; payload: { dataSourceId: number } }
  | { type: "testMappings"; payload: { mappings: DataSourceVariableMapping[] } }
  | { type: "saveLayout"; payload: LabelLayout }
  | { type: "deleteLayout"; payload: { id: number } }
  | { type: "saveLabelFormat"; payload: LabelFormat }
  | { type: "deleteLabelFormat"; payload: { id: number } }
  | { type: "saveDataSource"; payload: DataSource }
  | { type: "deleteDataSource"; payload: { id: number } };

export type MessageResponse =
  | { type: "status"; payload: StatusPayload }
  | { type: "layouts"; payload: LabelLayout[] }
  | { type: "labelFormats"; payload: LabelFormat[] }
  | { type: "dataSources"; payload: DataSource[] }
  | { type: "activeContext"; payload: ActiveTabContext }
  | { type: "layoutSaved"; payload: LabelLayout }
  | { type: "layoutDeleted"; payload: { id: number } }
  | { type: "labelFormatSaved"; payload: LabelFormat }
  | { type: "labelFormatDeleted"; payload: { id: number } }
  | { type: "dataSourceSaved"; payload: DataSource }
  | { type: "dataSourceDeleted"; payload: { id: number } }
  | {
      type: "evaluationResult";
      payload: { dataSourceId?: number | null; resolved: ResolvedVariable[]; tabId?: number };
    }
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
