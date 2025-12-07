import type { LabelFormat } from "./models";
import { getConfig, saveConfig, type Config } from "./storageService";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function mutateConfig<T>(mutator: (config: Config) => T): Promise<T> {
  const config = await getConfig();
  const result = mutator(config);
  await saveConfig(config);
  return result;
}

export async function getLabelFormats(): Promise<LabelFormat[]> {
  const config = await getConfig();
  return config.labelFormats.map((format) => clone(format));
}

export async function saveLabelFormat(labelFormat: LabelFormat): Promise<LabelFormat> {
  return mutateConfig((config) => {
    const normalized = clone(labelFormat);
    if (!normalized.id || normalized.id <= 0) {
      normalized.id = config.nextLabelFormatId++;
    }

    const existingIndex = config.labelFormats.findIndex((entry) => entry.id === normalized.id);
    if (existingIndex >= 0) {
      config.labelFormats[existingIndex] = normalized;
    } else {
      config.labelFormats.push(normalized);
    }

    config.nextLabelFormatId = Math.max(config.nextLabelFormatId, normalized.id + 1);
    return clone(normalized);
  });
}

export async function deleteLabelFormat(id: number): Promise<void> {
  await mutateConfig((config) => {
    config.labelFormats = config.labelFormats.filter((entry) => entry.id !== id);
    return null;
  });
}
