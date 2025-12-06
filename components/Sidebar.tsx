import React from 'react';
import { TableInfo, ViewMode } from '../types';
import { Database, Search, Terminal, Sparkles, Table as TableIcon, X } from 'lucide-react';

interface SidebarProps {
  tables: TableInfo[];
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onSelectTable: (tableName: string) => void;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  tables, 
  currentView, 
  onViewChange, 
  onSelectTable,
  fileName,
  isOpen,
  onClose
}) => {
  return (
    <>
      {/* Mobile Overlay is handled in App.tsx to cover the whole screen, 
          but Sidebar itself handles its positioning */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <Database className="text-blue-500 shrink-0" size={20} />
            <span className="font-semibold text-slate-100 truncate text-sm" title={fileName}>{fileName}</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            メニュー
          </div>
          <nav className="space-y-1 px-2 mb-6">
            <button
              onClick={() => onViewChange('SQL')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'SQL' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Terminal size={18} />
              SQLエディタ
            </button>
            <button
              onClick={() => onViewChange('AI')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'AI' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sparkles size={18} />
              AIアシスタント
            </button>
          </nav>

          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            テーブル一覧 ({tables.length})
          </div>
          <nav className="space-y-1 px-2 pb-20 md:pb-0">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => {
                  onSelectTable(table.name);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                   false 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <TableIcon size={16} />
                <span className="truncate">{table.name}</span>
              </button>
            ))}
            {tables.length === 0 && (
              <div className="px-3 text-sm text-slate-600 italic">テーブルがありません</div>
            )}
          </nav>
        </div>
      </div>
    </>
  );
};