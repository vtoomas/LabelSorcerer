import { describe, expect, it } from "bun:test";
import type { DataSourceVariableMapping } from "../../domain/models";
import { evaluateMapping } from "../mappingEvaluator";

const mapping: DataSourceVariableMapping = {
  key: "asset_name",
  cssSelector: ".asset-name",
  multiple: false,
  trimWhitespace: true,
  prefix: "Name: ",
  suffix: "!",
  regexPattern: "NAME-(\\w+)",
  regexMatchIndex: 1
};

describe("mappingEvaluator", () => {
  it("returns missing status when selector matches are absent even if prefix/suffix are configured", () => {
    const result = evaluateMapping(["", null as unknown as string, undefined as unknown as string], mapping);
    expect(result).toEqual({
      value: "",
      selectorMatches: [],
      status: "missing"
    });
  });

  it("applies regex, trim, and prefix/suffix only when matches are present", () => {
    const result = evaluateMapping([" NAME-LabelSorcerer "], mapping);
    expect(result).toMatchObject({
      value: "Name: LabelSorcerer!",
      status: "mapped"
    });
    expect(result.selectorMatches).toEqual([" NAME-LabelSorcerer "]);
  });
});
