import type { LayoutElement } from "../domain/models";

export function resolveElementDisplayValue(
  element: LayoutElement,
  resolvedMap: Record<string, string>,
): string {
  if (element.mode !== "dynamic") {
    return element.staticContent ?? element.name;
  }
  return applyDynamicBindingOverrides(element.dynamicBinding, resolvedMap);
}

function applyDynamicBindingOverrides(
  binding: LayoutElement["dynamicBinding"] | undefined,
  resolvedMap: Record<string, string>,
): string {
  if (!binding) return "";
  let baseValue = resolvedMap[binding.variableKey] ?? "";
  if (binding.overrideTrimWhitespace) {
    baseValue = baseValue.trim();
  }
  const prefix = binding.overridePrefix ?? "";
  const suffix = binding.overrideSuffix ?? "";
  return `${prefix}${baseValue}${suffix}`;
}
