import {
  ActiveTabContext,
  MessageRequest,
  MessageResponse,
  StatusPayload
} from "../shared/messaging";
import type { ResolvedVariable } from "../shared/messaging";
import {
  findMatchingDataSource,
  getDataSources,
  getDataSourceById,
  saveDataSource,
  deleteDataSource
} from "../domain/dataSourceService";
import { deleteLayout, getLayouts, saveLayout } from "../domain/layoutService";

const BUILD_VERSION = "0.1.0";
let lastContentTabId: number | null = null;

function isExtensionTab(tab?: chrome.tabs.Tab): boolean {
  const url = tab?.url;
  return !url || url.startsWith("chrome-extension://");
}

function trackContentTab(tab?: chrome.tabs.Tab) {
  if (tab?.id && !isExtensionTab(tab)) {
    lastContentTabId = tab.id;
  }
}

function getTabById(tabId: number): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
        return;
      }
      resolve(tab);
    });
  });
}

async function queryActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ active: true }, (queryTabs) => resolve(queryTabs));
  });

  const activeContentTab = tabs.find((tab) => !isExtensionTab(tab));
  if (activeContentTab) {
    trackContentTab(activeContentTab);
    return activeContentTab;
  }

  if (lastContentTabId) {
    const fallbackTab = await getTabById(lastContentTabId);
    if (fallbackTab && !isExtensionTab(fallbackTab)) {
      trackContentTab(fallbackTab);
      return fallbackTab;
    }
  }

  return undefined;
}

async function sendMessageToTab<T>(tabId: number, message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(response as T);
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
    case "saveLayout":
      return { type: "layoutSaved", payload: await saveLayout(message.payload) };
    case "deleteLayout":
      await deleteLayout(message.payload.id);
      return { type: "layoutDeleted", payload: { id: message.payload.id } };
    case "saveDataSource":
      return { type: "dataSourceSaved", payload: await saveDataSource(message.payload) };
    case "deleteDataSource":
      await deleteDataSource(message.payload.id);
      return { type: "dataSourceDeleted", payload: { id: message.payload.id } };
    case "evaluateDataSource": {
      const dataSource = await getDataSourceById(message.payload.dataSourceId);
      if (!dataSource) {
        return { type: "error", payload: { message: "Data source not found." } };
      }

      const tab = await queryActiveTab();
      if (!tab?.id) {
        return { type: "error", payload: { message: "No active content tab available." } };
      }

      try {
        const resolved = await sendMessageToTab<ResolvedVariable[]>(tab.id, {
          type: "evaluateMappings",
          payload: dataSource.variableMappings
        });

        return {
          type: "evaluationResult",
          payload: { dataSourceId: dataSource.id, resolved, tabId: tab.id }
        };
      } catch (error) {
        return {
          type: "error",
          payload: {
            message: error instanceof Error ? error.message : "Failed to evaluate mappings."
          }
        };
      }
    }
    case "getActiveTabContext":
      return { type: "activeContext", payload: await buildActiveContext() };
    default:
      return { type: "error", payload: { message: "Unknown message type." } };
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void getTabById(tabId).then(trackContentTab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab && tab.active) {
    trackContentTab(tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === lastContentTabId) {
    lastContentTabId = null;
  }
});

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
