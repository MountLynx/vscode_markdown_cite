/**
 * Pandoc citation syntax: bracketed `[@key]` / `[@a; @b]` / `[@key, p. 12]` /
 * `[-@key]`, plus bare `@key` / `-@key`.
 */
export const CITATION_PATTERN =
  /\[-?@[A-Za-z][\w:.\-+]*(?:\s*;\s*-?@[A-Za-z][\w:.\-+]*)*[^\]]*\]|-?@[A-Za-z][\w:.\-+]*/g;

function parseCitekeysFromMatch(matchText: string): string[] {
  const inner = matchText.startsWith("[") ? matchText.slice(1, -1) : matchText;
  const keys: string[] = [];
  for (const part of inner.split(";")) {
    const m = part.match(/@([A-Za-z][\w:.\-+]*)/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

/** Extract all unique citation keys from a text string. */
export function extractCitekeys(text: string): string[] {
  const keys = new Set<string>();
  const pattern = new RegExp(CITATION_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    for (const key of parseCitekeysFromMatch(match[0])) {
      keys.add(key);
    }
  }
  return [...keys];
}

/** Build a map of citekeys that appear in the given text. */
export function buildCitekeySet(text: string): Set<string> {
  return new Set(extractCitekeys(text));
}
