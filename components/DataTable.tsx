import React from 'react';
import { QueryResult } from '../types';

interface DataTableProps {
  data: QueryResult | null;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, className = "" }) => {
  if (!data || data.columns.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-slate-500 italic ${className}`}>
        データがありません
      </div>
    );
  }

  return (
    <div className={`overflow-auto border border-slate-700 rounded-lg bg-slate-900 ${className}`}>
      <table className="min-w-full text-left text-sm whitespace-nowrap">
        <thead className="uppercase tracking-wider border-b border-slate-700 bg-slate-800 sticky top-0 z-10 shadow-sm">
          <tr>
            {data.columns.map((col, idx) => (
              <th key={idx} scope="col" className="px-4 py-2 md:px-6 md:py-3 font-medium text-slate-300">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {data.values.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-800/50 transition-colors">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-2 md:px-6 md:py-3 text-slate-400">
                  {cell === null ? <span className="text-slate-600 italic">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};