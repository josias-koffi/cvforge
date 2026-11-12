/**
 * A legal document is text written in the back-office, in the markdown the
 * editor already knows, and it is rendered as React elements — never as HTML.
 * That is the point of parsing it ourselves rather than pulling in a markdown
 * engine: a document edited from the back-office can never put markup on the
 * page, and a link can only lead to a web page, an address or a phone number.
 *
 * Blocks, separated by blank lines:
 * - "# ", "## " open a heading, "### " (and deeper) a sub-heading;
 * - "- ", "* ", "+ " a bulleted list item, "1. " or "1) " a numbered one;
 * - "> " a quotation;
 * - "---" (or "***", "___") a separator;
 * - anything else is a paragraph, its wrapped lines joined.
 *
 * Inside a block (see `parseLegalInline`): [text](url), bare web addresses
 * and e-mail addresses as links, **bold** and *italics*.
 */
export type LegalBlock =
  | { type: "heading"; text: string; level?: 3 }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: true }
  | { type: "quote"; text: string }
  | { type: "rule" };

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^[-*+]\s+(.*)$/;
const NUMBERED = /^\d{1,3}[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;

export function parseLegalBody(body: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: { items: string[]; ordered: boolean } | null = null;

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (quote.length > 0) {
      blocks.push({ type: "quote", text: quote.join(" ") });
      quote = [];
    }
    if (list && list.items.length > 0) {
      blocks.push(
        list.ordered
          ? { type: "list", items: list.items, ordered: true }
          : { type: "list", items: list.items },
      );
    }
    list = null;
  };

  const addItem = (text: string, ordered: boolean) => {
    if (paragraph.length > 0 || quote.length > 0 || list?.ordered !== ordered) {
      flush();
    }
    list ??= { items: [], ordered };
    if (text) list.items.push(text);
  };

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    // Before the bullet: "---" and "***" are separators, not empty items.
    if (RULE.test(line)) {
      flush();
      blocks.push({ type: "rule" });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const text = heading[2]?.trim() ?? "";
      if (text) {
        blocks.push(
          (heading[1]?.length ?? 0) >= 3
            ? { type: "heading", text, level: 3 }
            : { type: "heading", text },
        );
      }
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      addItem(bullet[1]?.trim() ?? "", false);
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      addItem(numbered[1]?.trim() ?? "", true);
      continue;
    }

    const quoted = QUOTE.exec(line);
    if (quoted) {
      if (paragraph.length > 0 || list) flush();
      quote.push(quoted[1]?.trim() ?? "");
      continue;
    }

    if (list || quote.length > 0) flush();
    paragraph.push(line);
  }

  flush();

  return blocks;
}

/** A run of text inside a block, as React will render it. */
export type LegalInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: LegalInline[] }
  | { type: "emphasis"; children: LegalInline[] }
  | { type: "link"; href: string; children: LegalInline[] };

/**
 * Where a link may lead: a web page, an e-mail address, a phone number, or a
 * page of the site. Anything else — `javascript:`, `data:` — stays text.
 */
export function safeLegalHref(href: string): string | null {
  const value = href.trim();

  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  // A page of the site or an anchor; "//host" would leave it.
  if (/^\/(?!\/)/.test(value) || value.startsWith("#")) return value;

  return null;
}

const INLINE = new RegExp(
  [
    // [text](url) or [text](url "title"); one level of parentheses in the
    // address, as Wikipedia writes them.
    String.raw`\[(?<label>[^\]]+)\]\((?<href>(?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"]*")?\)`,
    // <https://…> or <someone@example.com>
    String.raw`<(?<auto>(?:https?:\/\/|mailto:)[^>\s]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)>`,
    String.raw`(?<url>https?:\/\/[^\s<>()]+)`,
    String.raw`(?<email>[\w.+-]+@[\w-]+(?:\.[\w-]+)+)`,
    String.raw`\*\*(?<strong>(?!\s)[^*]+?)\*\*`,
    String.raw`__(?<strong2>(?!\s)[^_]+?)__`,
    String.raw`\*(?<em>(?![\s*])[^*]+?)\*`,
    // _italics_ only between non-word characters: snake_case is not italic.
    String.raw`(?<![\w])_(?<em2>(?![\s_])[^_]+?)_(?![\w])`,
  ].join("|"),
  "gu",
);

/** What closes a sentence, not an address: "voir https://cnil.fr." */
const TRAILING_PUNCTUATION = /[.,;:!?'"»]+$/;

export function parseLegalInline(text: string): LegalInline[] {
  const nodes: LegalInline[] = [];
  let cursor = 0;

  const pushText = (value: string) => {
    if (!value) return;
    const last = nodes.at(-1);
    if (last?.type === "text") last.text += value;
    else nodes.push({ type: "text", text: value });
  };

  for (const match of text.matchAll(INLINE)) {
    const groups = match.groups ?? {};
    const index = match.index ?? 0;
    let consumed = match[0];
    let node: LegalInline | null = null;

    if (groups.label !== undefined && groups.href !== undefined) {
      const href = safeLegalHref(groups.href);
      // An unsafe target keeps its label, without the link.
      node = href
        ? { type: "link", href, children: parseLegalInline(groups.label) }
        : { type: "text", text: groups.label };
    } else if (groups.auto !== undefined) {
      const href =
        groups.auto.includes("://") || groups.auto.startsWith("mailto:")
          ? groups.auto
          : `mailto:${groups.auto}`;
      node = {
        type: "link",
        href,
        children: [{ type: "text", text: groups.auto.replace(/^mailto:/, "") }],
      };
    } else if (groups.url !== undefined) {
      const url = groups.url.replace(TRAILING_PUNCTUATION, "");
      consumed = url;
      node = {
        type: "link",
        href: url,
        children: [{ type: "text", text: url }],
      };
    } else if (groups.email !== undefined) {
      const email = groups.email.replace(TRAILING_PUNCTUATION, "");
      consumed = email;
      node = {
        type: "link",
        href: `mailto:${email}`,
        children: [{ type: "text", text: email }],
      };
    } else if (groups.strong !== undefined || groups.strong2 !== undefined) {
      node = {
        type: "strong",
        children: parseLegalInline(groups.strong ?? groups.strong2 ?? ""),
      };
    } else if (groups.em !== undefined || groups.em2 !== undefined) {
      node = {
        type: "emphasis",
        children: parseLegalInline(groups.em ?? groups.em2 ?? ""),
      };
    }

    if (!node) continue;

    pushText(text.slice(cursor, index));
    if (node.type === "text") pushText(node.text);
    else nodes.push(node);
    // A shortened match leaves its trailing punctuation to the next text.
    cursor = index + consumed.length;
  }

  pushText(text.slice(cursor));

  return nodes;
}
