import React, { useState, useEffect } from 'react';
import { QueryResult } from '../types.ts';
import { Edit2, Trash2, Check, X, Plus, Save } from 'lucide-react';

interface DataTableProps {
  data: QueryResult | null;
  tableName?: string | null;
  isEditable?: boolean;
  onUpdateCell?: (rowId: number, column: string, value: any) => void;
  onDeleteRow?: (rowId: number) => void;
  onAddRow?: (data: Record<string, any>) => void;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  tableName,
  isEditable = false,
  onUpdateCell,
  onDeleteRow,
  onAddRow,
  className = "" 
}) => {
  // New row state
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  
  // Inline edit state
  const [editingCell, setEditingCell] = useState<{rowId: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  if (!data || data.columns.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-slate-500 italic ${className}`}>
        データがありません
      </div>
    );
  }

  // Handle rowid logic (assumes rowid is the first column if fetched via getTableData)
  const hasRowId = data.columns[0] === 'rowid';
  const displayColumns = hasRowId ? data.columns.slice(1) : data.columns;
  
  const handleEditClick = (rowId: number, col: string, currentValue: any) => {
    if (!isEditable || !onUpdateCell) return;
    setEditingCell({ rowId, col });
    setEditValue(currentValue === null ? '' : String(currentValue));
  };

  const handleSaveEdit = () => {
    if (editingCell && onUpdateCell) {
      onUpdateCell(editingCell.rowId, editingCell.col, editValue);
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleAddRow = () => {
    if (onAddRow) {
      onAddRow(newRowData);
      setNewRowData({});
      setIsAdding(false);
    }
  };

  return (
    <div className={`overflow-auto border border-slate-700 rounded-lg bg-slate-900 ${className}`}>
      <table className="min-w-full text-left text-sm whitespace-nowrap border-collapse">
        <thead className="uppercase tracking-wider border-b border-slate-700 bg-slate-800 sticky top-0 z-10 shadow-sm">
          <tr>
            {isEditable && hasRowId && (
              <th className="w-10 px-4 py-2 bg-slate-800 sticky left-0 z-20 border-r border-slate-700"></th>
            )}
            {displayColumns.map((col, idx) => (
              <th key={idx} scope="col" className="px-4 py-2 md:px-6 md:py-3 font-medium text-slate-300 border-r border-slate-700/50 last:border-r-0">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {data.values.map((row, rowIdx) => {
            const rowId = hasRowId ? (row[0] as number) : -1;
            const displayValues = hasRowId ? row.slice(1) : row;

            return (
              <tr key={rowIdx} className="hover:bg-slate-800/50 transition-colors group">
                {isEditable && hasRowId && (
                  <td className="w-10 px-2 py-2 text-center bg-slate-900/50 sticky left-0 z-10 border-r border-slate-800">
                    <button 
                      onClick={() => onDeleteRow && onDeleteRow(rowId)}
                      className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="行を削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
                {displayValues.map((cell, cellIdx) => {
                  const columnName = displayColumns[cellIdx];
                  const isEditing = editingCell?.rowId === rowId && editingCell?.col === columnName;

                  return (
                    <td 
                      key={cellIdx} 
                      className={`px-4 py-2 md:px-6 md:py-3 border-r border-slate-800 last:border-r-0 relative ${
                        isEditable ? 'cursor-text hover:bg-slate-700/30' : ''
                      }`}
                      onDoubleClick={() => handleEditClick(rowId, columnName, cell)}
                    >
                      {isEditing ? (
                        <div className="absolute inset-0 flex items-center bg-slate-800 z-10 px-1">
                          <input
                            autoFocus
                            className="w-full bg-slate-900 text-white px-2 py-1 rounded border border-blue-500 outline-none text-sm"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                          />
                        </div>
                      ) : (
                        <span className="block min-h-[1.25rem]">
                          {cell === null ? <span className="text-slate-600 italic">NULL</span> : String(cell)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          
          {/* Add New Row Section */}
          {isEditable && tableName && (
            <tr className="bg-slate-800/30 border-t-2 border-slate-700">
              <td colSpan={displayColumns.length + 1} className="p-0">
                {!isAdding ? (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={16} />
                    <span>新しい行を追加</span>
                  </button>
                ) : (
                  <div className="p-4 bg-slate-800 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-semibold text-blue-400 uppercase">新規データ入力</span>
                       <div className="flex gap-2">
                         <button onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:text-white"><X size={16}/></button>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {displayColumns.map((col) => (
                        <div key={col} className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase text-slate-500 font-semibold">{col}</label>
                          <input
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                            placeholder="NULL"
                            value={newRowData[col] || ''}
                            onChange={(e) => setNewRowData({...newRowData, [col]: e.target.value})}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button 
                        onClick={handleAddRow}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
                      >
                        <Save size={16} />
                        保存
                      </button>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};