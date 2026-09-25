/**
 * Turns the raw `page` / `pageSize` query strings into a window the store can
 * read. Anything that is not a whole number of one or more falls back to the
 * default, and the page size is capped so a client cannot ask for everything.
 */
export function resolvePageWindow(input: {
  page?: string;
  pageSize?: string;
  defaultPageSize: number;
  maxPageSize: number;
}) {
  const page = parsePositiveInt(input.page, 1);
  const pageSize = Math.min(
    parsePositiveInt(input.pageSize, input.defaultPageSize),
    input.maxPageSize,
  );

  return { limit: pageSize, offset: (page - 1) * pageSize, page, pageSize };
}

/** An empty list still has one page, so "page 1 of 1" never reads "of 0". */
export function countPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function parsePositiveInt(raw: string | undefined, fallback: number) {
  const value = Number(raw);

  return raw && Number.isInteger(value) && value > 0 ? value : fallback;
}
