import {
  ActiveTabContext,
  MessageRequest,
  MessageResponse,
  StatusPayload
} from "../shared/messaging";
import { findMatchingDataSource, getDataSources } from "../domain/dataSourceService";
import { getLayouts } from "../domain/layoutService";

const BUILD_VERSION = "0.1.0";

async function queryActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

async function buildStatus(): Promise<StatusPayload> {
  const [layouts, dataSources] = await Promise.all([getLayouts(), getDataSources()]);

  return {
    ready: true,
    version: BUILD_VERSION,
    timestamp: new Date().toISOString(),
    layoutCount: layouts.length,
    dataSourceCount: dataSources.length,
    message: "Background is ready to serve UI requests."
  };
}

async function buildActiveContext(): Promise<ActiveTabContext> {
  const tab = await queryActiveTab();
  const url = tab?.url;
  const dataSource = await findMatchingDataSource(url ?? "");

  return {
    tabId: tab?.id,
    url,
    dataSourceId: dataSource?.id ?? null,
    dataSourceName: dataSource?.name ?? null,
    defaultLayoutId: dataSource?.defaultLayoutId ?? null,
    resolvedAt: new Date().toISOString()
  };
}

async function handleMessage(message: MessageRequest): Promise<MessageResponse> {
  switch (message.type) {
    case "getStatus":
      return { type: "status", payload: await buildStatus() };
    case "getLayouts":
      return { type: "layouts", payload: await getLayouts() };
    case "getDataSources":
      return { type: "dataSources", payload: await getDataSources() };
    case "getActiveTabContext":
      return { type: "activeContext", payload: await buildActiveContext() };
    default:
      return { type: "error", payload: { message: "Unknown message type." } };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("LabelSorcerer background initialized");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void handleMessage(message as MessageRequest)
    .then((response) => sendResponse(response))
    .catch((error) =>
      sendResponse({
        type: "error",
        payload: { message: error instanceof Error ? error.message : String(error) }
      })
    );

  return true;
});
