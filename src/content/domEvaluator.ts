import type { DataSourceVariableMapping } from "../domain/models";
import { evaluateMapping } from "../shared/mappingEvaluator";
import type { ResolvedVariable } from "../shared/messaging";

function readAttribute(node: Element, attributeName: string): string {
  if (attributeName === "href" && node.tagName.toLowerCase() === "a") {
    const rawHref = node.getAttribute("href") ?? "";
    if (!rawHref) return "";

    try {
      return new URL(rawHref, document.baseURI || window.location.href).href;
    } catch {
      return rawHref;
    }
  }

  return node.getAttribute(attributeName) ?? "";
}

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
        matches = nodes.map((node) => readAttribute(node, attr!));
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
