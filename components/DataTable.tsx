import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QueryResult } from '../types.ts';
import { Edit2, Trash2, Check, X, Plus, Save, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';

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
  const { lang, t } = useLanguage();

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Virtual Scrolling States
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(450);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // New row state
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  
  // Inline edit state
  const [editingCell, setEditingCell] = useState<{rowId: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Reset pagination/scroll on table or dataset changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
    setIsAdding(false);
    setEditingCell(null);
    setScrollTop(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [tableName, data]);

  // Reset scroll on page/filter changes
  useEffect(() => {
    setScrollTop(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentPage, pageSize, searchQuery]);

  // Capture actual container height on paginated data load or mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      setContainerHeight(scrollContainerRef.current.clientHeight || 450);
    }
  }, [data, currentPage, pageSize]);

  if (!data || data.columns.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-slate-500 italic ${className}`}>
        {lang === 'ja' ? 'データがありません' : 'No data available'}
      </div>
    );
  }

  const hasRowId = data.columns[0] === 'rowid';
  const displayColumns = hasRowId ? data.columns.slice(1) : data.columns;

  // 1. Client-side Search Filtering
  const filteredValues = useMemo(() => {
    if (!searchQuery) return data.values;
    const lowerQuery = searchQuery.toLowerCase();
    
    return data.values.filter(row => {
      const cellsToSearch = hasRowId ? row.slice(1) : row;
      return cellsToSearch.some(cell => {
        if (cell === null) return false;
        return String(cell).toLowerCase().includes(lowerQuery);
      });
    });
  }, [data.values, searchQuery, hasRowId]);

  // 2. Pagination Calculations
  const totalRows = filteredValues.length;
  const maxPage = Math.ceil(totalRows / pageSize);
  const activePage = Math.min(currentPage, maxPage || 1);

  const paginatedValues = useMemo(() => {
    const startIdx = (activePage - 1) * pageSize;
    return filteredValues.slice(startIdx, startIdx + pageSize);
  }, [filteredValues, activePage, pageSize]);

  // 3. Virtual Scroll calculations
  const rowHeight = 38; // px per row (exact text height + padding)
  const totalItems = paginatedValues.length;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 8);
  const endIndex = Math.min(totalItems, Math.floor((scrollTop + containerHeight) / rowHeight) + 12);

  const visibleValues = useMemo(() => {
    return paginatedValues.slice(startIndex, endIndex);
  }, [paginatedValues, startIndex, endIndex]);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalItems - endIndex) * rowHeight);

  // Handle scroll trigger to update top offset & measurements
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setContainerHeight(target.clientHeight);
  };

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
    <div id="data-table-container" className={`flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden ${className}`}>
      {/* Top Filter and Info Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-800 border-b border-slate-700 text-xs shrink-0">
        <div className="flex items-center gap-2 w-full sm:w-auto relative">
          <Search size={14} className="absolute left-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t.searchPlaceholder || "Search in table..."}
            className="w-full sm:w-72 bg-slate-950 border border-slate-700 rounded pl-8 pr-8 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-sans"
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-0.5"
              title="Clear search"
            >
              <X size={10} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-slate-400 font-sans">
          <div>
            {lang === 'ja' ? (
              <span>全 <strong className="text-slate-200 font-mono text-sm font-semibold">{totalRows}</strong> 件を表示中 {searchQuery && `(元のデータ: ${data.values.length}件)`}</span>
            ) : (
              <span>Showing <strong className="text-slate-200 font-mono text-sm font-semibold">{totalRows}</strong> matching rows {searchQuery && `(total: ${data.values.length})`}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Scroll Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-slate-950"
      >
        <table className="min-w-full text-left text-xs whitespace-nowrap border-collapse relative">
          <thead className="uppercase tracking-wider border-b border-slate-700 bg-slate-800 sticky top-0 z-10 shadow-sm font-sans">
            <tr>
              {isEditable && hasRowId && (
                <th className="w-10 px-4 py-2.5 bg-slate-800 sticky left-0 z-20 border-r border-slate-700"></th>
              )}
              {displayColumns.map((col, idx) => (
                <th key={idx} scope="col" className="px-4 py-2.5 md:px-5 md:py-3 font-medium text-slate-300 border-r border-slate-700/50 last:border-r-0">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {/* Top Virtual Spacer */}
            {topSpacerHeight > 0 && (
              <tr>
                <td 
                  colSpan={displayColumns.length + (isEditable && hasRowId ? 1 : 0)} 
                  style={{ height: `${topSpacerHeight}px`, padding: 0, border: 0 }} 
                />
              </tr>
            )}

            {visibleValues.map((row, rowIdx) => {
              const absoluteIdx = startIndex + rowIdx;
              const rowId = hasRowId ? (row[0] as number) : -1;
              const displayValues = hasRowId ? row.slice(1) : row;

              return (
                <tr 
                  key={absoluteIdx} 
                  style={{ height: `${rowHeight}px` }}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {isEditable && hasRowId && (
                    <td className="w-10 px-2 py-2 text-center bg-slate-950 sticky left-0 z-10 border-r border-slate-800">
                      <button 
                        onClick={() => onDeleteRow && onDeleteRow(rowId)}
                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title={t.deleteRowConfirm || "Delete row"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                  {displayValues.map((cell, cellIdx) => {
                    const columnName = displayColumns[cellIdx];
                    const isEditing = editingCell?.rowId === rowId && editingCell?.col === columnName;

                    return (
                      <td 
                        key={cellIdx} 
                        className={`px-4 py-2 md:px-5 md:py-2.5 border-r border-slate-800/60 last:border-r-0 relative group-hover:bg-slate-800/10 ${
                          isEditable ? 'cursor-text hover:bg-slate-700/20' : ''
                        }`}
                        onDoubleClick={() => handleEditClick(rowId, columnName, cell)}
                      >
                        {isEditing ? (
                          <div className="absolute inset-0 flex items-center bg-slate-800 z-10 px-1">
                            <input
                              autoFocus
                              className="w-full bg-slate-900 text-white px-2 py-1 rounded border border-blue-500 outline-none text-xs"
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
                          <span className="block min-h-[1.25rem] truncate max-w-xs md:max-w-md lg:max-w-lg" title={cell === null ? 'NULL' : String(cell)}>
                            {cell === null ? <span className="text-slate-600 italic">NULL</span> : String(cell)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            
            {/* Bottom Virtual Spacer */}
            {bottomSpacerHeight > 0 && (
              <tr>
                <td 
                  colSpan={displayColumns.length + (isEditable && hasRowId ? 1 : 0)} 
                  style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: 0 }} 
                />
              </tr>
            )}

            {/* Empty Search Result State */}
            {totalRows === 0 && (
              <tr>
                <td colSpan={displayColumns.length + (isEditable && hasRowId ? 1 : 0)} className="py-10 text-center text-slate-500 italic bg-slate-950 font-sans">
                  {t.noDataAvailable || "No data available."}
                </td>
              </tr>
            )}
            
            {/* Add New Row Section */}
            {isEditable && tableName && (
              <tr className="bg-slate-900/60 border-t border-slate-700">
                <td colSpan={displayColumns.length + (hasRowId ? 1 : 0)} className="p-0 font-sans">
                  {!isAdding ? (
                    <button 
                      onClick={() => setIsAdding(true)}
                      className="w-full py-2.5 flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 transition-colors"
                    >
                      <Plus size={14} />
                      <span>{t.addRecord || "Add Row"}</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-900 border-t border-slate-700/80">
                      <div className="flex items-center justify-between mb-3">
                         <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                           {lang === 'ja' ? '新規データ入力' : 'Insert New Record'}
                         </span>
                         <button onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"><X size={14}/></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-60 overflow-y-auto p-1">
                        {displayColumns.map((col) => (
                          <div key={col} className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">{col}</label>
                            <input
                              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
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
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
                        >
                          <Save size={14} />
                          {lang === 'ja' ? '保存' : 'Save'}
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

      {/* Bottom Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-800 border-t border-slate-700 text-xs shrink-0 select-none font-sans">
        {/* Page Size Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{t.rowsPerPage || "Rows per page:"}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={5000}>5000</option>
            <option value={1000000}>{lang === 'ja' ? 'すべて (自動分割ロード)' : 'All (Auto chunks)'}</option>
          </select>
        </div>

        {/* Dynamic Page Controllers */}
        {pageSize < 1000000 && (
          <div className="flex items-center gap-1">
            <button
              disabled={activePage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-950 transition-colors text-slate-300"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              disabled={activePage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-950 transition-colors text-slate-300"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            
            <span className="text-slate-300 px-3 font-medium bg-slate-950/60 border border-slate-800 py-1 rounded font-mono">
              {lang === 'ja' ? (
                <span>ページ <strong>{activePage}</strong> / {maxPage || 1}</span>
              ) : (
                <span>Page <strong>{activePage}</strong> of {maxPage || 1}</span>
              )}
            </span>

            <button
              disabled={activePage >= maxPage}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, maxPage))}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-950 transition-colors text-slate-300"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              disabled={activePage >= maxPage}
              onClick={() => setCurrentPage(maxPage)}
              className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-950 transition-colors text-slate-300"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        )}

        {/* Info label */}
        <div className="text-slate-400 font-mono text-[11px]">
          {totalRows > 0 ? (
            lang === 'ja' ? (
              <span>{totalRows}件中 {Math.min((activePage - 1) * pageSize + 1, totalRows)}〜{Math.min(activePage * pageSize, totalRows)}件を表示</span>
            ) : (
              <span>Showing {Math.min((activePage - 1) * pageSize + 1, totalRows)} - {Math.min(activePage * pageSize, totalRows)} of {totalRows}</span>
            )
          ) : (
            <span>0 rows</span>
          )}
        </div>
      </div>
    </div>
  );
};
