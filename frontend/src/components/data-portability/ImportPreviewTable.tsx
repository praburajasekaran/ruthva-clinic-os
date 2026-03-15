import type { ImportPreviewRow } from "@/lib/types";

type ImportPreviewTableProps = {
  rows: ImportPreviewRow[];
  title: string;
};

export function ImportPreviewTable({ rows, title }: ImportPreviewTableProps) {
  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
        {title}
      </div>
      <div className="max-h-56 overflow-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-white text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-2">Line</th>
              <th scope="col" className="px-4 py-2">Errors</th>
              <th scope="col" className="px-4 py-2">Raw Row</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.line}-${index}`} className="border-t border-gray-100 align-top">
                <td className="px-4 py-2 font-mono text-gray-700">{row.line}</td>
                <td className="px-4 py-2 text-red-700">{row.errors.join(", ") || "-"}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-600">
                  {JSON.stringify(row.raw || {}, null, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
