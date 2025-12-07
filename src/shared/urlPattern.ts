export function patternToRegExp(pattern: string): RegExp {
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fragments = pattern.split("*").map((segment) => escapeRegExp(segment));
  return new RegExp(`^${fragments.join(".*")}$`);
}

export function matchesUrlPattern(url: string, pattern: string): boolean {
  return patternToRegExp(pattern).test(url);
}
