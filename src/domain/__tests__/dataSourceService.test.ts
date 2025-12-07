import { beforeEach, describe, expect, it } from "bun:test";
import { resetChromeStorage } from "./testUtils";
import {
  deleteDataSource,
  findMatchingDataSource,
  getDataSources,
  saveDataSource
} from "../dataSourceService";
import { getConfig } from "../storageService";

describe("dataSourceService", () => {
  beforeEach(() => {
    resetChromeStorage();
  });

  it("resolves a matching data source for known URLs", async () => {
    const matching = await findMatchingDataSource("https://jira.example.com/assets/123");
    expect(matching?.name).toBe("Jira Asset List");
  });

  it("persists a new data source and increments ids", async () => {
    const dataSource = await saveDataSource({
      id: 0,
      name: "Custom View",
      urlPattern: "https://app.example.com/*",
      defaultLayoutId: 1,
      variableMappings: [
        {
          key: "asset_name",
          cssSelector: ".asset",
          multiple: false,
          trimWhitespace: true
        }
      ]
    });

    const config = await getConfig();
    expect(config.dataSources.some((entry) => entry.name === "Custom View")).toBe(true);
    expect(config.nextDataSourceId).toBe(dataSource.id + 1);
  });

  it("deletes an existing data source", async () => {
    const sources = await getDataSources();
    await deleteDataSource(sources[0].id);
    const remaining = await getDataSources();
    expect(remaining.length).toBe(sources.length - 1);
  });
});
