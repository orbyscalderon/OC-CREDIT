import { InboxIcon } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function Table<T>({
  columns,
  data,
  keyField,
  loading,
  emptyMessage = 'Sin resultados',
  emptyIcon,
}: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            /* S1-5: Skeleton shimmer rows */
            Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div
                      className="skeleton h-4 rounded"
                      style={{ width: colIdx === 0 ? '60%' : colIdx === columns.length - 1 ? '40%' : '75%' }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            /* S1-7: Empty state con ícono */
            <tr>
              <td colSpan={columns.length} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2">
                  {emptyIcon ?? <InboxIcon size={32} className="text-gray-200" />}
                  <p className="text-sm text-gray-400 font-medium">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                className="hover:bg-gray-50/70 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5 text-gray-700">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
