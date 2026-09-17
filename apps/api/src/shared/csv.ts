/** Quotes a cell only when it would otherwise break the row. */
export function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

/**
 * Renders rows in the order of `headers`, which doubles as the header line.
 * Every value is already a string: formatting belongs to the caller, so a
 * number never picks up a locale separator that would shift a CSV column.
 */
export function toCsv<Row extends Record<string, string>>(
  headers: Array<keyof Row & string>,
  rows: Row[],
) {
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvCell(row[header])).join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}
