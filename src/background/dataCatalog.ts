import type { DataSource, LabelLayout } from "../domain/models";

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
    elements: []
  }
];

const SAMPLE_DATA_SOURCES: DataSource[] = [
  {
    id: 1,
    name: "Jira Asset List",
    urlPattern: "https://jira.example.com/assets/*",
    defaultLayoutId: 1,
    variableMappings: [
      { key: "asset_name", cssSelector: ".asset-row .asset-name", multiple: false, trimWhitespace: true },
      { key: "asset_key", cssSelector: ".asset-row .asset-key", multiple: false, trimWhitespace: true },
      { key: "location", cssSelector: ".asset-row .asset-location", multiple: false, trimWhitespace: true }
    ]
  },
  {
    id: 2,
    name: "Jira Asset Detail",
    urlPattern: "https://jira.example.com/asset/*",
    defaultLayoutId: 1,
    variableMappings: [
      { key: "asset_name", cssSelector: "h1.asset-title", multiple: false, trimWhitespace: true },
      { key: "asset_key", cssSelector: "[data-asset-key]", multiple: false, trimWhitespace: true },
      { key: "location", cssSelector: ".asset-location-detail", multiple: false, trimWhitespace: true }
    ]
  }
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegExp(pattern: string) {
  const fragments = pattern.split("*").map((segment) => escapeRegExp(segment));
  return new RegExp(`^${fragments.join(".*")}$`);
}

export function getLayouts() {
  return SAMPLE_LAYOUTS;
}

export function getDataSources() {
  return SAMPLE_DATA_SOURCES;
}

export function resolveDataSourceForUrl(url: string | undefined): DataSource | undefined {
  if (!url) {
    return undefined;
  }

  return SAMPLE_DATA_SOURCES.find((ds) => patternToRegExp(ds.urlPattern).test(url));
}
