/** Words that carry a question's meaning (« niveau », « allemand », « german »…). */
function meaningfulWords(question: string): Set<string> {
  return new Set(
    question
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3),
  );
}

/**
 * Two questions about the same field: the model rephrases (« What is your
 * level of German? », « Quel est votre niveau d'allemand ? (…) »). `strict`
 * asks half the words of the longer one too: the page script fills without
 * anyone looking, so it must not take « Langues » for « Langue maternelle et
 * niveau d'anglais ».
 */
export function sameQuestion(
  a: string,
  b: string,
  options: { strict?: boolean } = {},
): boolean {
  const left = meaningfulWords(a);
  const right = meaningfulWords(b);
  if (left.size === 0 || right.size === 0) return false;
  const shared = [...left].filter((word) => right.has(word)).length;
  const base = options.strict
    ? Math.max(left.size, right.size)
    : Math.min(left.size, right.size);
  return shared / base >= 0.5;
}
