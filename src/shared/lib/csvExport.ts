/**
 * Utilidades CSV compartidas (exportaciones de gestión).
 */

function escCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** CSV con BOM UTF-8 para Excel. */
export function buildCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const lines = [headers.map(escCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escCell).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  downloadTextFile(filename, buildCsv(headers, rows));
}
