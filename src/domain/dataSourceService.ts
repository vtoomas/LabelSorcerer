import type { DataSource } from "./models";
import { getConfig, saveConfig, type Config } from "./storageService";
import { matchesUrlPattern } from "../shared/urlPattern";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function mutateConfig<T>(mutator: (config: Config) => T): Promise<T> {
  const config = await getConfig();
  const result = mutator(config);
  await saveConfig(config);
  return result;
}

export async function getDataSources(): Promise<DataSource[]> {
  const config = await getConfig();
  return config.dataSources.map((ds) => clone(ds));
}

export async function getDataSourceById(id: number): Promise<DataSource | undefined> {
  const config = await getConfig();
  const ds = config.dataSources.find((entry) => entry.id === id);
  return ds ? clone(ds) : undefined;
}

export async function saveDataSource(dataSource: DataSource): Promise<DataSource> {
  return mutateConfig((config) => {
    const normalized = clone(dataSource);
    if (!normalized.id || normalized.id <= 0) {
      normalized.id = config.nextDataSourceId++;
    }

    const existingIndex = config.dataSources.findIndex((entry) => entry.id === normalized.id);
    if (existingIndex >= 0) {
      config.dataSources[existingIndex] = normalized;
    } else {
      config.dataSources.push(normalized);
    }

    config.nextDataSourceId = Math.max(config.nextDataSourceId, normalized.id + 1);
    return clone(normalized);
  });
}

export async function deleteDataSource(id: number): Promise<void> {
  await mutateConfig((config) => {
    config.dataSources = config.dataSources.filter((entry) => entry.id !== id);
    return null;
  });
}

export async function findMatchingDataSource(url: string): Promise<DataSource | undefined> {
  if (!url) {
    return undefined;
  }

  const dataSources = await getDataSources();
  const match = dataSources.find((ds) => matchesUrlPattern(url, ds.urlPattern));
  return match;
}
