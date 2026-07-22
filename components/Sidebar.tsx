
import React, { useRef } from 'react';
import { TableInfo, ViewMode } from '../types.ts';
import { Database, Terminal, Sparkles, Table as TableIcon, X, Trash2, FolderOpen, FilePlus, LogOut, Download, BookOpen, Folders } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface SidebarProps {
  tables: TableInfo[];
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onSelectTable: (tableName: string) => void;
  onDeleteTable: (tableName: string) => void;
  fileName: string | null;
  isOpen: boolean;
  onClose: () => void;
  activeTable: string | null;
  isFileLoaded: boolean;
  onFileOpen: (file: File) => void;
  onFolderOpen: (files: File[]) => void;
  onCreateNew: () => void;
  onCloseFile: () => void;
  onDownloadFile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  tables, 
  currentView, 
  onViewChange, 
  onSelectTable,
  onDeleteTable,
  fileName,
  isOpen,
  onClose,
  activeTable,
  isFileLoaded,
  onFileOpen,
  onFolderOpen,
  onCreateNew,
  onCloseFile,
  onDownloadFile
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileOpen(file);
      // Reset input so same file can be selected again if needed
      event.target.value = '';
    }
  };

  const handleDirectoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFolderOpen(files);
      event.target.value = '';
    }
  };

  const handleMultiFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFolderOpen(files);
      event.target.value = '';
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with Gradient Icon */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between h-16 min-h-[4rem]">
          <div 
            className={`flex items-center gap-3 overflow-hidden ${isFileLoaded ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={() => {
              if (isFileLoaded) {
                onCloseFile();
              }
            }}
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Database className="text-white drop-shadow-md" size={18} />
            </div>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 truncate text-lg tracking-tight select-none">
              SQLite on Web
            </span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
          
          {/* File Operations */}
          <div className="px-2">
            <div className="mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.fileOperations}
            </div>
            <div className="space-y-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors text-left"
              >
                <FolderOpen size={18} className="text-blue-400" />
                <span>{t.openFileBtn}</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                accept=".sqlite,.db,.sqlite3" 
                className="hidden" 
              />

              <button
                onClick={() => directoryInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors text-left"
                title={t.folderSelectTip}
              >
                <Folders size={18} className="text-amber-400" />
                <span>{t.openFolderBtn}</span>
              </button>
              <input 
                type="file" 
                ref={directoryInputRef} 
                onChange={handleDirectoryChange} 
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                className="hidden" 
                {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
              />

              {/* Sidebar Multi-File load Fallback */}
              <button
                onClick={() => multiFileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-1 text-xs font-medium text-amber-500 hover:bg-slate-800 hover:text-amber-400 rounded-md transition-colors text-left pl-10 -mt-1"
                title={t.folderSelectFallbackTip}
              >
                <span>{t.selectMultiFallback}</span>
              </button>
              <input 
                type="file" 
                ref={multiFileInputRef} 
                onChange={handleMultiFileChange} 
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                multiple 
                accept=".sqlite,.db,.sqlite3"
                className="hidden" 
              />

              <button
                onClick={onCreateNew}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors text-left"
              >
                <FilePlus size={18} className="text-green-400" />
                <span>{t.createNew}</span>
              </button>

              {isFileLoaded && (
                <>
                  <button
                    onClick={onDownloadFile}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors text-left"
                  >
                    <Download size={18} className="text-purple-400" />
                    <span>{t.downloadFile}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCloseFile}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-red-900/20 hover:text-red-400 rounded-md transition-colors text-left"
                  >
                    <LogOut size={18} />
                    <span>{t.closeConnection}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Navigation (Only visible when file is loaded) */}
          {isFileLoaded && (
            <>
              <div className="px-2">
                <div className="mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t.viewMode}
                </div>
                <nav className="space-y-1">
                  <button
                    onClick={() => onViewChange('SQL')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentView === 'SQL' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Terminal size={18} />
                    {t.sqlEditor}
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
                    {t.aiAssistant}
                  </button>
                  <button
                    onClick={() => onViewChange('EXAMPLES')}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentView === 'EXAMPLES' 
                        ? 'bg-cyan-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <BookOpen size={18} />
                    {t.queryExamples}
                  </button>
                </nav>
              </div>

              <div className="px-2 pb-20 md:pb-0">
                <div className="mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                  <span>{t.tables} ({tables.length})</span>
                </div>
                <nav className="space-y-1">
                  {tables.map((table) => (
                    <div key={table.name} className="flex items-center gap-1 group">
                      <button
                        onClick={() => {
                          onSelectTable(table.name);
                        }}
                        className={`flex-1 flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                          currentView === 'BROWSE' && activeTable === table.name
                            ? 'bg-slate-800 text-white' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <TableIcon size={16} />
                        <span className="truncate">{table.name}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTable(table.name);
                        }}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                        title={t.deleteTable}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {tables.length === 0 && (
                    <div className="px-3 text-sm text-slate-600 italic">{t.noTables}</div>
                  )}
                </nav>
              </div>
            </>
          )}
        </div>
        
        {/* Footer info */}
        {isFileLoaded && fileName && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t.currentFile}</div>
            <div className="text-sm text-slate-300 font-medium truncate" title={fileName}>
              {fileName}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
