import { describe, expect, it, beforeEach } from "bun:test";
import { buildPreviewContext } from "../evaluationService";
import type { LabelLayout, DataSource } from "../models";

const layout: LabelLayout = {
  id: 1,
  name: "Test Layout",
  labelFormatId: 1,
  variables: [
    { key: "asset_name", label: "Asset Name", multiple: false },
    { key: "asset_key", label: "Asset Key", multiple: false },
    { key: "location", label: "Location", multiple: false }
  ],
  elements: []
};

const dataSource: DataSource = {
  id: 1,
  name: "Test Source",
  urlPattern: "https://example.com/*",
  defaultLayoutId: 1,
  variableMappings: [
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
      trimWhitespace: true
    }
  ]
};

describe("evaluationService", () => {
  it("marks variables without selectors as missing", () => {
    const preview = buildPreviewContext(layout, dataSource);

    expect(preview.find((variable) => variable.key === "location")).toEqual({
      key: "location",
      label: "Location",
      value: "Not mapped",
      selector: undefined,
      multiple: false,
      status: "missing"
    });
  });

  it("uses resolved variable data when available", () => {
    const resolved = {
      asset_name: { value: "Resolved Name", selectorMatches: ["Resolved Name"] }
    };

    const preview = buildPreviewContext(layout, dataSource, resolved);
    const entry = preview.find((variable) => variable.key === "asset_name");
    expect(entry).toMatchObject({
      value: "Resolved Name",
      status: "mapped"
    });
  });
});
