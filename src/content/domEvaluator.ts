import type { DataSourceVariableMapping } from "../domain/models";
import { evaluateMapping } from "../shared/mappingEvaluator";
import type { ResolvedVariable } from "../shared/messaging";

export function evaluateMappings(mappings: DataSourceVariableMapping[]): ResolvedVariable[] {
  return mappings.map((mapping) => {
    let matches: string[] = [];

    if (mapping.cssSelector) {
      const nodes = Array.from(document.querySelectorAll(mapping.cssSelector));
      const attr = mapping.attributeName;
      const useTextContent = !attr || attr === "textContent";
      if (useTextContent) {
        matches = nodes.map((node) => node.textContent ?? "");
      } else {
        matches = nodes.map((node) => node.getAttribute(attr!) ?? "");
      }
    }

    const result = evaluateMapping(matches, mapping);

    return {
      key: mapping.key,
      value: result.value,
      selectorMatches: result.selectorMatches,
      status: result.status
    };
  });
}
