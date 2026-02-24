"use client";
import { cn } from "@/shared/utils/utils";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function Table<T>({ columns, data, keyExtractor, onRowClick, className }: TableProps<T>) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-xl", className)}
      style={{ border: "1px solid var(--border)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn("px-4 py-3 text-left text-xs font-semibold", col.className)}
                style={{ color: "var(--text-muted)" }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={keyExtractor(row, i)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-[var(--bg-subtle)]"
              )}
              style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border)" : undefined }}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn("px-4 py-3", col.className)}
                  style={{ color: "var(--text)" }}
                >
                  {col.render
                    ? col.render(row, i)
                    : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
