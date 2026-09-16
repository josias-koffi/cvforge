// Tool names whose meaning lives in punctuation the tokenizer would otherwise
// strip, turning "C#" and "C++" into the same bare "c".
const SYMBOL_MAP: Array<[RegExp, string]> = [
  [/c\+\+/g, "cplusplus"],
  [/c#/g, "csharp"],
  [/f#/g, "fsharp"],
  [/\.net/g, "dotnet"],
  [/node\.js/g, "nodejs"],
  [/next\.js/g, "nextjs"],
  [/nest\.js/g, "nestjs"],
  [/vue\.js/g, "vuejs"],
];

/** Lowercases, strips diacritics and punctuation, and collapses whitespace. */
export function normalizeText(value: string): string {
  let text = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  for (const [pattern, replacement] of SYMBOL_MAP) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}

/**
 * True when `needle` appears in `haystack` as a contiguous token run.
 *
 * Deliberately not a substring test: "Java" must not match "JavaScript", and a
 * profile listing "React" must not vouch for a generated "React Native".
 */
export function containsTokenSequence(
  haystack: string[],
  needle: string[],
): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;

  for (let start = 0; start <= haystack.length - needle.length; start++) {
    if (needle.every((token, offset) => haystack[start + offset] === token)) {
      return true;
    }
  }

  return false;
}

/** Share of `left` tokens also present in `right`, used to score name matches. */
export function tokenOverlap(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.max(left.length, right.length);
}

export function extractYears(value: string): string[] {
  return value.match(/\b(?:19|20)\d{2}\b/g) ?? [];
}

export function extractNumbers(value: string): string[] {
  return (value.match(/\d+(?:[.,]\d+)?/g) ?? []).map((number) =>
    number.replace(",", "."),
  );
}
