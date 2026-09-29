/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  onRowClick,
}) => {
  if (data.length === 0) {
    return null; // Let parent handle empty state
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice().reverse().map((row, index) => (
                  <tr
                    key={row._id || row.id || index}
                    onClick={() => onRowClick?.(row)}
                    className={`${
                      onRowClick ? "hover:bg-blue-50 cursor-pointer" : "hover:bg-gray-50"
                    } transition-colors duration-150`}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-4 sm:px-6 py-4 text-sm text-gray-900 whitespace-normal"
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
