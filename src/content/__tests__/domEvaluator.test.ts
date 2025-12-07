import { describe, expect, it, beforeEach } from "bun:test";
import { parseHTML } from "linkedom";
import { evaluateMappings } from "../domEvaluator";
import type { DataSourceVariableMapping } from "../../domain/models";

const mappings: DataSourceVariableMapping[] = [
  {
    key: "asset_name",
    cssSelector: ".asset-name",
    multiple: false,
    trimWhitespace: true,
    prefix: "Name: ",
    suffix: "!"
  },
  {
    key: "asset_key",
    cssSelector: ".asset-key",
    multiple: false,
    trimWhitespace: true,
    regexPattern: "KEY-(\\d+)",
    regexMatchIndex: 1
  },
  {
    key: "missing_field",
    cssSelector: ".does-not-exist",
    multiple: false,
    trimWhitespace: true
  }
] as const;

describe("domEvaluator", () => {
  beforeEach(() => {
    const dom = parseHTML(`
      <div class="asset">
        <span class="asset-name">  Example Asset  </span>
        <span class="asset-key">KEY-12345</span>
      </div>
    `);
    (globalThis as any).document = dom.document;
    (globalThis as any).window = dom.window;
  });

  it("applies trims, prefix/suffix, and regex to selector matches", () => {
    const results = evaluateMappings(mappings as any);
    const nameResult = results.find((result) => result.key === "asset_name");
    expect(nameResult).toMatchObject({
      value: "Name: Example Asset!",
      status: "mapped"
    });

    const keyResult = results.find((result) => result.key === "asset_key");
    expect(keyResult).toMatchObject({
      value: "12345",
      status: "mapped"
    });
  });

  it("returns missing status when selectors are absent", () => {
    const results = evaluateMappings(mappings as any);
    const missing = results.find((result) => result.key === "missing_field");
    expect(missing).toMatchObject({
      value: "",
      status: "missing",
      selectorMatches: []
    });
  });
});
