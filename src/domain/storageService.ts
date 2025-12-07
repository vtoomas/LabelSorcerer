import type { DataSource, LabelLayout } from "./models";

const STORAGE_KEY = "labelsorcerer:config";

const SAMPLE_LAYOUTS: LabelLayout[] = [
  {
    id: 1,
    name: "Asset Snapshot",
    labelFormatId: 1,
    variables: [
      { key: "asset_name", label: "Asset Name", multiple: false },
      { key: "asset_key", label: "Asset Key", multiple: false },
      { key: "location", label: "Location", multiple: false }
    ],
    elements: [
      {
        id: 1,
        name: "Asset Name",
        type: "text",
        positionX: 12,
        positionY: 12,
        width: 220,
        height: 32,
        rotation: null,
        fontSize: 18,
        mode: "dynamic",
        dynamicBinding: { variableKey: "asset_name" }
      },
      {
        id: 2,
        name: "Asset Key",
        type: "text",
        positionX: 12,
        positionY: 52,
        width: 200,
        height: 26,
        rotation: null,
        fontSize: 14,
        mode: "dynamic",
        dynamicBinding: { variableKey: "asset_key" }
      },
      {
        id: 3,
        name: "Location",
        type: "text",
        positionX: 12,
        positionY: 84,
        width: 200,
        height: 24,
        rotation: null,
        fontSize: 12,
        mode: "dynamic",
        dynamicBinding: { variableKey: "location" }
      }
    ]
  }
];

const SAMPLE_DATA_SOURCES: DataSource[] = [
  {
    id: 1,
    name: "Jira Asset List",
    urlPattern: "https://jira.example.com/assets/*",
    defaultLayoutId: 1,
    variableMappings: [
      {
        key: "asset_name",
        cssSelector: ".asset-row .asset-name",
        multiple: false,
        trimWhitespace: true
      },
      {
        key: "asset_key",
        cssSelector: ".asset-row .asset-key",
        multiple: false,
        trimWhitespace: true
      },
      {
        key: "location",
        cssSelector: ".asset-row .asset-location",
        multiple: false,
        trimWhitespace: true
      }
    ]
  },
  {
    id: 2,
    name: "Jira Asset Detail",
    urlPattern: "https://jira.example.com/asset/*",
    defaultLayoutId: 1,
    variableMappings: [
      {
        key: "asset_name",
        cssSelector: "h1.asset-title",
        multiple: false,
        trimWhitespace: true
      },
      {
        key: "asset_key",
        cssSelector: "[data-asset-key]",
        multiple: false,
        trimWhitespace: true
      },
      {
        key: "location",
        cssSelector: ".asset-location-detail",
        multiple: false,
        trimWhitespace: true
      }
    ]
  }
];

export interface Config {
  layouts: LabelLayout[];
  dataSources: DataSource[];
  nextLayoutId: number;
  nextDataSourceId: number;
}

const DEFAULT_CONFIG: Config = {
  layouts: SAMPLE_LAYOUTS,
  dataSources: SAMPLE_DATA_SOURCES,
  nextLayoutId: SAMPLE_LAYOUTS.length + 1,
  nextDataSourceId: SAMPLE_DATA_SOURCES.length + 1
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function readStorage(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(STORAGE_KEY, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(items);
    });
  });
}

export async function getConfig(): Promise<Config> {
  const stored = await readStorage();
  const raw = stored[STORAGE_KEY] as Config | undefined;
  if (!raw) {
    return clone(DEFAULT_CONFIG);
  }
  return clone(raw);
}

export async function saveConfig(config: Config): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: clone(config) }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}
