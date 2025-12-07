import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DataTable } from './components/DataTable.tsx';
import { SqlEditor } from './components/SqlEditor.tsx';
import { AiAssistant } from './components/AiAssistant.tsx';
import { 
  loadDatabase, 
  createNewDatabase, 
  closeDatabase,
  exportDatabase,
  getTables, 
  getTableData, 
  executeQuery, 
  updateCellValue,
  deleteRow,
  insertRow,
  dropTable
} from './services/sqliteService.ts';
import { TableInfo, QueryResult, ViewMode } from './types.ts';
import { Menu } from 'lucide-react';

function App() {
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('BROWSE');
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [editorSql, setEditorSql] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle file loading
  const onFileLoaded = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await loadDatabase(buffer);
      setFileName(file.name);
      refreshTables();
      setIsFileLoaded(true);
      setCurrentView('BROWSE');
      setError(null);
      setIsSidebarOpen(false);
    } catch (e) {
      console.error(e);
      alert("ファイルの読み込みに失敗しました。");
    }
  };

  const onCreateNew = async () => {
    try {
      await createNewDatabase();
      setFileName('new_database.sqlite');
      refreshTables();
      setIsFileLoaded(true);
      setCurrentView('SQL');
      setError(null);
      setIsSidebarOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const onDownloadFile = () => {
    try {
      const data = exportDatabase();
      if (!data) return;
      // Fix: Cast data to any to resolve TS mismatch between Uint8Array<ArrayBufferLike> and BlobPart
      const blob = new Blob([data as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'database.sqlite';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('ファイルの保存に失敗しました');
    }
  };

  const onCloseFile = () => {
    if (window.confirm('ファイルを閉じますか？\n保存されていない変更は失われます。')) {
      try {
        closeDatabase(); // Explicitly close db
      } catch (e) {
        console.warn("Database close error:", e);
      }
      
      // Reset all states to initial values
      setIsFileLoaded(false);
      setFileName(null);
      setTables([]);
      setQueryResult(null);
      setActiveTable(null);
      setEditorSql('');
      setError(null);
      setIsSidebarOpen(false);
      setCurrentView('BROWSE'); // Reset view mode
    }
  };

  const refreshTables = () => {
    const t = getTables();
    setTables(t);
    // If we have active table, refresh its data, otherwise maybe select first?
    if (activeTable && t.find(tab => tab.name === activeTable)) {
       handleSelectTable(activeTable);
    } else if (t.length > 0 && !activeTable) {
      handleSelectTable(t[0].name);
    } else if (t.length === 0) {
      setQueryResult(null);
      setActiveTable(null);
    }
  };

  const handleSelectTable = (tableName: string) => {
    setActiveTable(tableName);
    setCurrentView('BROWSE');
    setError(null);
    setIsSidebarOpen(false);
    try {
      const data = getTableData(tableName);
      setQueryResult(data);
    } catch (e: any) {
      setError(e.message);
      setQueryResult(null);
    }
  };

  const handleDeleteTable = (tableName: string) => {
    try {
      dropTable(tableName);
      if (activeTable === tableName) {
        setActiveTable(null);
        setQueryResult(null);
      }
      refreshTables();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUpdateCell = (rowId: number, column: string, value: any) => {
    if (!activeTable) return;
    try {
      updateCellValue(activeTable, rowId, column, value);
      // Refresh data (lightweight refresh)
      const data = getTableData(activeTable);
      setQueryResult(data);
    } catch (e: any) {
      setError(`更新エラー: ${e.message}`);
    }
  };

  const handleDeleteRow = (rowId: number) => {
    if (!activeTable) return;
    if (!window.confirm("この行を削除しますか？")) return;
    try {
      deleteRow(activeTable, rowId);
      const data = getTableData(activeTable);
      setQueryResult(data);
    } catch (e: any) {
      setError(`削除エラー: ${e.message}`);
    }
  };

  const handleAddRow = (data: Record<string, any>) => {
    if (!activeTable) return;
    try {
      insertRow(activeTable, data);
      const res = getTableData(activeTable);
      setQueryResult(res);
    } catch (e: any) {
      setError(`追加エラー: ${e.message}`);
    }
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  }

  const handleExecuteSql = (sql: string) => {
    setError(null);
    try {
      const res = executeQuery(sql);
      setQueryResult(res);
      // If it was a modification query, refresh tables list
      if (sql.trim().toUpperCase().match(/^(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE)/)) {
        const t = getTables();
        setTables(t);
      }
    } catch (e: any) {
      setError(e.message);
      setQueryResult(null);
    }
  };

  const handleAiGeneratedSql = (sql: string) => {
    setEditorSql(sql);
    setCurrentView('SQL');
    handleExecuteSql(sql);
  };

  return (
    <div className="flex h-dvh bg-slate-900 text-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar is always rendered now */}
      <Sidebar 
        tables={tables}
        currentView={currentView}
        onViewChange={handleViewChange}
        onSelectTable={handleSelectTable}
        onDeleteTable={handleDeleteTable}
        fileName={fileName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTable={activeTable}
        isFileLoaded={isFileLoaded}
        onFileOpen={onFileLoaded}
        onCreateNew={onCreateNew}
        onCloseFile={onCloseFile}
        onDownloadFile={onDownloadFile}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {/* Header Area */}
        <header className="h-14 min-h-[3.5rem] bg-slate-800 border-b border-slate-700 flex items-center px-4 justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-base md:text-lg font-semibold text-slate-200 truncate">
              {!isFileLoaded ? 'ホーム' : 
                currentView === 'BROWSE' && activeTable ? `${activeTable}` : 
                currentView === 'SQL' ? 'SQL Editor' : 'AI Assistant'}
            </h1>
          </div>
          {isFileLoaded && currentView === 'BROWSE' && (
             <span className="text-[10px] md:text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 whitespace-nowrap ml-2">
               ダブルクリックで編集
             </span>
          )}
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {!isFileLoaded ? (
            // No File Loaded State
            <FileUpload onFileLoaded={onFileLoaded} onCreateNew={onCreateNew} />
          ) : (
            // File Loaded State
            <>
              {/* BROWSE MODE */}
              {currentView === 'BROWSE' && (
                <div className="flex-1 p-2 md:p-4 overflow-hidden flex flex-col">
                  <DataTable 
                    data={queryResult} 
                    className="h-full" 
                    isEditable={!!activeTable}
                    tableName={activeTable}
                    onUpdateCell={handleUpdateCell}
                    onDeleteRow={handleDeleteRow}
                    onAddRow={handleAddRow}
                  />
                  {error && <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 border border-red-700 p-4 rounded text-white text-sm shadow-lg z-20">{error}</div>}
                </div>
              )}

              {/* SQL MODE */}
              {currentView === 'SQL' && (
                <div className="flex flex-col h-full">
                  <div className="h-1/3 min-h-[200px] shrink-0">
                    <SqlEditor 
                      initialSql={editorSql} 
                      onExecute={handleExecuteSql} 
                      error={error}
                    />
                  </div>
                  <div className="flex-1 p-2 md:p-4 bg-slate-900 overflow-hidden border-t border-slate-800 flex flex-col">
                     <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold px-1">Results</div>
                     <DataTable data={queryResult} className="flex-1" />
                  </div>
                </div>
              )}

              {/* AI MODE */}
              {currentView === 'AI' && (
                <AiAssistant onSqlGenerated={handleAiGeneratedSql} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;