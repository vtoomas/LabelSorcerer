import type { DataSource, LabelFormat, LabelLayout } from "./models";
import type { PostPrintWebhookConfig } from "../shared/webhook";

export const LEGACY_STORAGE_KEY = "labelsorcerer:config";
export const META_STORAGE_KEY = "labelsorcerer:meta";
export const WEBHOOK_STORAGE_KEY = "labelsorcerer:webhook";
export const LAYOUT_STACKS_STORAGE_KEY = "labelsorcerer:layoutStacks";
const STORAGE_VERSION = 2 as const;

const layoutStorageKey = (id: number) => `labelsorcerer:layout:${id}`;
const labelFormatStorageKey = (id: number) => `labelsorcerer:format:${id}`;
const dataSourceStorageKey = (id: number) => `labelsorcerer:dataSource:${id}`;

type StorageMeta = {
  version: typeof STORAGE_VERSION;
  layoutIds: number[];
  labelFormatIds: number[];
  dataSourceIds: number[];
  nextLayoutId: number;
  nextLabelFormatId: number;
  nextDataSourceId: number;
};

const SAMPLE_FORMATS: LabelFormat[] = [
  {
    id: 1,
    name: "62 x 29 mm",
    widthPx: 620,
    heightPx: 290,
    marginTopPx: 10,
    marginBottomPx: 10,
    marginLeftPx: 10,
    marginRightPx: 10,
    description: "Sample wide label"
  },
  {
    id: 2,
    name: "57 x 32 mm",
    widthPx: 570,
    heightPx: 320,
    marginTopPx: 10,
    marginBottomPx: 10,
    marginLeftPx: 10,
    marginRightPx: 10,
    description: "Compact QR label"
  }
];

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
  labelFormats: LabelFormat[];
  dataSources: DataSource[];
  nextLayoutId: number;
  nextLabelFormatId: number;
  nextDataSourceId: number;
  postPrintWebhook?: PostPrintWebhookConfig | null;
  layoutStacks?: Record<number, number[]>;
}

const DEFAULT_CONFIG: Config = {
  layouts: SAMPLE_LAYOUTS,
  labelFormats: SAMPLE_FORMATS,
  dataSources: SAMPLE_DATA_SOURCES,
  nextLayoutId: SAMPLE_LAYOUTS.length + 1,
  nextLabelFormatId: SAMPLE_FORMATS.length + 1,
  nextDataSourceId: SAMPLE_DATA_SOURCES.length + 1,
  postPrintWebhook: null,
  layoutStacks: {}
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeIds(ids: number[] | undefined): number[] {
  if (!ids) return [];
  return [...new Set(ids)];
}

function normalizeConfig(config: Config): Config {
  const layouts = clone(config.layouts ?? []);
  const labelFormats = clone(config.labelFormats ?? []);
  const dataSources = clone(config.dataSources ?? []);
  return {
    layouts,
    labelFormats,
    dataSources,
    nextLayoutId: config.nextLayoutId ?? layouts.length + 1,
    nextLabelFormatId: config.nextLabelFormatId ?? labelFormats.length + 1,
    nextDataSourceId: config.nextDataSourceId ?? dataSources.length + 1,
    postPrintWebhook: config.postPrintWebhook ?? null,
    layoutStacks: clone(config.layoutStacks ?? {})
  };
}

function applyLegacyDefaults(raw?: Partial<Config>): Config {
  const base = raw ?? {};
  const labelFormats = clone(base.labelFormats ?? SAMPLE_FORMATS);
  const layouts = clone(base.layouts ?? SAMPLE_LAYOUTS);
  const dataSources = clone(base.dataSources ?? SAMPLE_DATA_SOURCES);
  return {
    layouts,
    labelFormats,
    dataSources,
    nextLayoutId: base.nextLayoutId ?? layouts.length + 1,
    nextLabelFormatId: base.nextLabelFormatId ?? labelFormats.length + 1,
    nextDataSourceId: base.nextDataSourceId ?? dataSources.length + 1,
    postPrintWebhook: base.postPrintWebhook ?? null,
    layoutStacks: clone(base.layoutStacks ?? {})
  };
}

function buildStorageMeta(config: Config): StorageMeta {
  return {
    version: STORAGE_VERSION,
    layoutIds: config.layouts.map((layout) => layout.id),
    labelFormatIds: config.labelFormats.map((format) => format.id),
    dataSourceIds: config.dataSources.map((dataSource) => dataSource.id),
    nextLayoutId: config.nextLayoutId,
    nextLabelFormatId: config.nextLabelFormatId,
    nextDataSourceId: config.nextDataSourceId
  };
}

function buildV2Items(config: Config): Record<string, unknown> {
  const items: Record<string, unknown> = {
    [META_STORAGE_KEY]: buildStorageMeta(config),
    [WEBHOOK_STORAGE_KEY]: clone(config.postPrintWebhook ?? null),
    [LAYOUT_STACKS_STORAGE_KEY]: clone(config.layoutStacks ?? {})
  };

  for (const layout of config.layouts) {
    items[layoutStorageKey(layout.id)] = clone(layout);
  }
  for (const format of config.labelFormats) {
    items[labelFormatStorageKey(format.id)] = clone(format);
  }
  for (const dataSource of config.dataSources) {
    items[dataSourceStorageKey(dataSource.id)] = clone(dataSource);
  }

  return items;
}

function hydrateV2Config(items: Record<string, unknown>, meta: Partial<StorageMeta>): Config {
  const layoutIds = normalizeIds(meta.layoutIds);
  const labelFormatIds = normalizeIds(meta.labelFormatIds);
  const dataSourceIds = normalizeIds(meta.dataSourceIds);

  return normalizeConfig({
    layouts: layoutIds
      .map((id) => items[layoutStorageKey(id)] as LabelLayout | undefined)
      .filter((value): value is LabelLayout => Boolean(value))
      .map((value) => clone(value)),
    labelFormats: labelFormatIds
      .map((id) => items[labelFormatStorageKey(id)] as LabelFormat | undefined)
      .filter((value): value is LabelFormat => Boolean(value))
      .map((value) => clone(value)),
    dataSources: dataSourceIds
      .map((id) => items[dataSourceStorageKey(id)] as DataSource | undefined)
      .filter((value): value is DataSource => Boolean(value))
      .map((value) => clone(value)),
    nextLayoutId: meta.nextLayoutId ?? layoutIds.length + 1,
    nextLabelFormatId: meta.nextLabelFormatId ?? labelFormatIds.length + 1,
    nextDataSourceId: meta.nextDataSourceId ?? dataSourceIds.length + 1,
    postPrintWebhook: (items[WEBHOOK_STORAGE_KEY] as PostPrintWebhookConfig | null | undefined) ?? null,
    layoutStacks: (items[LAYOUT_STACKS_STORAGE_KEY] as Record<number, number[]> | undefined) ?? {}
  });
}

async function readStorage(keys?: string | string[] | null): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys ?? null, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(items);
    });
  });
}

async function writeStorage(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

async function removeStorage(keys: string | string[]): Promise<void> {
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length === 0) return;

  return new Promise((resolve, reject) => {
    chrome.storage.sync.remove(list, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

async function persistV2Config(config: Config, existingItems?: Record<string, unknown>): Promise<void> {
  const normalized = normalizeConfig(config);
  const items = existingItems ?? await readStorage(null);
  const currentMeta = items[META_STORAGE_KEY] as Partial<StorageMeta> | undefined;
  const nextItems = buildV2Items(normalized);

  await writeStorage(nextItems);

  if (currentMeta?.version === STORAGE_VERSION) {
    const staleKeys = [
      ...normalizeIds(currentMeta.layoutIds)
        .filter((id) => !normalized.layouts.some((layout) => layout.id === id))
        .map(layoutStorageKey),
      ...normalizeIds(currentMeta.labelFormatIds)
        .filter((id) => !normalized.labelFormats.some((format) => format.id === id))
        .map(labelFormatStorageKey),
      ...normalizeIds(currentMeta.dataSourceIds)
        .filter((id) => !normalized.dataSources.some((dataSource) => dataSource.id === id))
        .map(dataSourceStorageKey),
      LEGACY_STORAGE_KEY
    ];

    await removeStorage(staleKeys);
    return;
  }

  if (LEGACY_STORAGE_KEY in items) {
    await removeStorage(LEGACY_STORAGE_KEY);
  }
}

export async function getConfig(): Promise<Config> {
  const stored = await readStorage(null);
  const meta = stored[META_STORAGE_KEY] as Partial<StorageMeta> | undefined;

  if (meta?.version === STORAGE_VERSION) {
    return hydrateV2Config(stored, meta);
  }

  const legacyConfig = stored[LEGACY_STORAGE_KEY] as Partial<Config> | undefined;
  if (legacyConfig) {
    const migrated = applyLegacyDefaults(legacyConfig);
    await persistV2Config(migrated, stored);
    return clone(migrated);
  }

  const seeded = clone(DEFAULT_CONFIG);
  await persistV2Config(seeded, stored);
  return clone(seeded);
}

export async function saveConfig(config: Config): Promise<void> {
  await persistV2Config(config);
}
