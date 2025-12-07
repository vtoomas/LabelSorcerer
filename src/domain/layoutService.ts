import type { LabelLayout, LayoutVariable, LayoutElement } from "./models";
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

export async function getLayouts(): Promise<LabelLayout[]> {
  const config = await getConfig();
  return config.layouts.map((layout) => clone(layout));
}

export async function getLayoutById(id: number): Promise<LabelLayout | undefined> {
  const config = await getConfig();
  const layout = config.layouts.find((l) => l.id === id);
  return layout ? clone(layout) : undefined;
}

export async function saveLayout(layout: LabelLayout): Promise<LabelLayout> {
  return mutateConfig((config) => {
    const normalized = clone(layout);
    if (!normalized.id || normalized.id <= 0) {
      normalized.id = config.nextLayoutId++;
    }

    const existingIndex = config.layouts.findIndex((l) => l.id === normalized.id);
    if (existingIndex >= 0) {
      config.layouts[existingIndex] = normalized;
    } else {
      config.layouts.push(normalized);
    }

    config.nextLayoutId = Math.max(config.nextLayoutId, normalized.id + 1);
    return clone(normalized);
  });
}

export async function deleteLayout(id: number): Promise<void> {
  await mutateConfig((config) => {
    config.layouts = config.layouts.filter((l) => l.id !== id);
    return null;
  });
}

export async function updateLayoutVariables(
  layoutId: number,
  variables: LayoutVariable[]
): Promise<LabelLayout> {
  return mutateConfig((config) => {
    const layout = config.layouts.find((l) => l.id === layoutId);
    if (!layout) {
      throw new Error(`Layout ${layoutId} not found`);
    }

    layout.variables = variables.map((variable) => clone(variable));
    return clone(layout);
  });
}

export async function updateLayoutElements(
  layoutId: number,
  elements: LayoutElement[]
): Promise<LabelLayout> {
  return mutateConfig((config) => {
    const layout = config.layouts.find((l) => l.id === layoutId);
    if (!layout) {
      throw new Error(`Layout ${layoutId} not found`);
    }

    layout.elements = elements.map((element) => clone(element));
    return clone(layout);
  });
}
