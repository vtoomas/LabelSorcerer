import type { DataSource, LabelLayout } from "./models";
import type { MappingEvaluationResult } from "../shared/mappingEvaluator";
import { evaluateMapping } from "../shared/mappingEvaluator";

export interface PreviewVariable {
  key: string;
  label: string;
  value: string;
  selector?: string;
  multiple: boolean;
  status: "mapped" | "missing";
}

export function buildPreviewContext(
  layout: LabelLayout,
  dataSource: DataSource,
  resolvedValues?: Record<string, { value: string; selectorMatches: string[] }>
): PreviewVariable[] {
  const mappingByKey = new Map(dataSource.variableMappings.map((mapping) => [mapping.key, mapping]));

  return layout.variables.map((variable) => {
    const mapping = mappingByKey.get(variable.key);
    const resolved = resolvedValues?.[variable.key];

    if (resolved) {
      return {
        key: variable.key,
        label: variable.label,
        value: resolved.value,
        selector: mapping?.cssSelector,
        multiple: mapping?.multiple ?? variable.multiple,
        status: resolved.selectorMatches.length > 0 ? "mapped" : "missing"
      };
    }

    if (!mapping) {
      return {
        key: variable.key,
        label: variable.label,
        value: "Not mapped",
        selector: undefined,
        multiple: variable.multiple,
        status: "missing"
      };
    }

    const fallbackMatches = mapping.cssSelector ? [mapping.cssSelector] : [variable.key];
    const result = evaluateMapping(fallbackMatches, mapping);

    return {
      key: variable.key,
      label: variable.label,
      value: result.value,
      selector: mapping.cssSelector,
      multiple: mapping.multiple,
      status: result.status
    };
  });
}
