import type { DataSourceVariableMapping } from "../domain/models";
import { evaluateMapping } from "../shared/mappingEvaluator";
import type { ResolvedVariable } from "../shared/messaging";

export function evaluateMappings(mappings: DataSourceVariableMapping[]): ResolvedVariable[] {
  return mappings.map((mapping) => {
    let matches: string[] = [];

    if (mapping.cssSelector) {
      const nodes = Array.from(document.querySelectorAll(mapping.cssSelector));
      if (mapping.attributeName) {
        matches = nodes.map((node) => node.getAttribute(mapping.attributeName!) ?? "");
      } else {
        matches = nodes.map((node) => node.textContent ?? "");
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
