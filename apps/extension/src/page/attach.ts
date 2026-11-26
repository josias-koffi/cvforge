/**
 * Puts a document into the recruiter's file field (SPIKE-006). Runs in the
 * page: finds every `<input type="file">` (open shadow roots included), picks
 * the one whose nearest text matches the document, sets the File through a
 * DataTransfer and fires the events frameworks listen to. A drop zone without
 * an input gets a synthetic drop.
 */

export type DocumentKind = "cv" | "letter";

const HINTS: Record<DocumentKind, RegExp> = {
  cv: /\b(cv|resume|résumé|curriculum|c\.v\.)\b/i,
  letter: /(lettre|cover|motivation|covering)/i,
};

const MAX_ANCESTOR_TEXT = 400;
const ANCESTOR_LEVELS = 6;
const SETTLE_MS = 800;

function allRoots(
  root: Document | ShadowRoot = document,
): (Document | ShadowRoot)[] {
  const roots: (Document | ShadowRoot)[] = [root];
  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) roots.push(...allRoots(element.shadowRoot));
  }
  return roots;
}

export function findFileInputs(): HTMLInputElement[] {
  return allRoots().flatMap((root) => [
    ...root.querySelectorAll<HTMLInputElement>('input[type="file"]'),
  ]);
}

/**
 * Text near the field, closest first: its label and attributes, then its
 * ancestors while they stay small (a parent holding the whole form would
 * carry every other field's label).
 */
function contextLevels(input: HTMLInputElement): string[] {
  const own: string[] = [];
  const root = input.getRootNode() as Document | ShadowRoot;
  if (input.id) {
    own.push(
      root.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent ??
        "",
    );
  }
  own.push(input.closest("label")?.textContent ?? "");
  for (const name of [
    "name",
    "id",
    "aria-label",
    "data-testid",
    "data-test",
    "data-qa",
  ]) {
    own.push(input.getAttribute(name) ?? "");
  }
  const levels = [own.join(" ")];
  let parent: Element | null =
    input.parentElement ??
    ((root as ShadowRoot).host as Element | undefined) ??
    null;
  for (let i = 0; i < ANCESTOR_LEVELS && parent; i++) {
    const text = (parent.textContent ?? "").trim();
    if (text.length > MAX_ANCESTOR_TEXT || parent.matches("form, body, main"))
      break;
    levels.push(text);
    parent = parent.parentElement;
  }
  return levels;
}

function firstLevel(levels: string[], pattern: RegExp) {
  const index = levels.findIndex((text) => pattern.test(text));
  return index < 0 ? Infinity : index;
}

function score(
  input: HTMLInputElement,
  kind: DocumentKind,
  fieldHint?: string,
) {
  const levels = contextLevels(input);
  const context = levels.join(" | ");
  const mine = firstLevel(levels, HINTS[kind]);
  const theirs = firstLevel(levels, HINTS[kind === "cv" ? "letter" : "cv"]);
  let points = 0;
  if (mine !== Infinity) points += 10 - 2 * mine;
  if (theirs < mine) points -= 15;
  if (fieldHint && context.toLowerCase().includes(fieldHint.toLowerCase()))
    points += 20;
  if (input.disabled) points -= 100;
  return { context, input, points };
}

function setFiles(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  // React overrides the `files` setter on the element; use the prototype's.
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "files",
  )?.set?.call(input, transfer.files);
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}

function dropOn(target: Element, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  for (const type of ["dragenter", "dragover", "drop"]) {
    target.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        dataTransfer: transfer,
      }),
    );
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The page reacted: the field kept the file, or its name is now shown. */
function pageShows(name: string, input?: HTMLInputElement) {
  if (input?.files?.[0]?.name === name) return true;
  return allRoots().some((root) =>
    ((root as Document).body ?? root).textContent?.includes(name),
  );
}

export type AttachResult =
  | { ok: true; method: "input" | "drop"; field: string }
  | { ok: false; reason: string; fields: string[] };

export async function attachFile(input: {
  kind: DocumentKind;
  bytes: Uint8Array;
  name: string;
  type: string;
  fieldHint?: string;
}): Promise<AttachResult> {
  const file = new File([input.bytes as BlobPart], input.name, {
    type: input.type,
  });
  const inputs = findFileInputs();
  const ranked = inputs
    .map((field) => score(field, input.kind, input.fieldHint))
    .sort((a, b) => b.points - a.points);
  const best = ranked[0];

  if (best && (best.points > 0 || (inputs.length === 1 && best.points > -50))) {
    setFiles(best.input, file);
    await wait(SETTLE_MS);
    // Some fields (SmartRecruiters) empty themselves once read: trust the page.
    return pageShows(input.name, best.input)
      ? { field: best.context.slice(0, 120), method: "input", ok: true }
      : {
          fields: [best.context.slice(0, 80)],
          ok: false,
          reason: "le champ n'a pas gardé le fichier",
        };
  }

  const zone = allRoots()
    .flatMap((root) => [
      ...root.querySelectorAll(
        '[class*="drop" i], [data-testid*="drop" i], [aria-label*="drop" i]',
      ),
    ])
    .find((element) => {
      const text = element.textContent ?? "";
      return (
        HINTS[input.kind].test(text) ||
        Boolean(
          input.fieldHint &&
          text.toLowerCase().includes(input.fieldHint.toLowerCase()),
        )
      );
    });
  if (zone) {
    dropOn(zone, file);
    await wait(SETTLE_MS);
    if (pageShows(input.name)) {
      return {
        field: (zone.textContent ?? "").trim().slice(0, 120),
        method: "drop",
        ok: true,
      };
    }
  }

  return {
    fields: ranked.map((entry) => entry.context.slice(0, 80)),
    ok: false,
    reason: inputs.length
      ? "aucun champ ne correspond à ce document"
      : "aucun champ de fichier sur la page",
  };
}
