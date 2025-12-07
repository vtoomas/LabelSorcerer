import type { DataSourceVariableMapping } from "../domain/models";

export interface MappingEvaluationResult {
  value: string;
  selectorMatches: string[];
  status: "mapped" | "missing";
}

export function evaluateMapping(matches: string[], mapping: DataSourceVariableMapping): MappingEvaluationResult {
  const selectorMatches = matches.filter((value): value is string => Boolean(value));
  let base = selectorMatches[0] ?? "";
  const hasMatches = selectorMatches.length > 0;

  if (mapping.multiple && selectorMatches.length > 1) {
    base = selectorMatches.join(" | ");
  }

  if (mapping.regexPattern && base) {
    try {
      const regex = new RegExp(mapping.regexPattern);
      const matched = regex.exec(base);
      if (matched) {
        const index = mapping.regexMatchIndex ?? 0;
        base = matched[index] ?? matched[0] ?? "";
      } else {
        base = "";
      }
    } catch {
      // Invalid regex, skip
    }
  }

  const trimmed = mapping.trimWhitespace ? base.trim() : base;
  const value = hasMatches ? `${mapping.prefix ?? ""}${trimmed}${mapping.suffix ?? ""}` : "";
  const status: MappingEvaluationResult["status"] = hasMatches ? "mapped" : "missing";
  return { value, selectorMatches, status };
}
