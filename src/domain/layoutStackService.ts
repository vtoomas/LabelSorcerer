import { getConfig, saveConfig, type Config } from "./storageService";

export async function getLayoutStack(dataSourceId: number): Promise<number[]> {
  const config = await getConfig();
  return config.layoutStacks?.[dataSourceId] ?? [];
}

export async function saveLayoutStack(dataSourceId: number, layoutIds: number[]): Promise<void> {
  const config = await getConfig();
  const layoutStacks = { ...(config.layoutStacks ?? {}) };
  layoutStacks[dataSourceId] = layoutIds;
  await saveConfig({ ...config, layoutStacks });
}
