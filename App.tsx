import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Sidebar } from './components/Sidebar';
import { DataTable } from './components/DataTable';
import { SqlEditor } from './components/SqlEditor';
import { AiAssistant } from './components/AiAssistant';
import { loadDatabase, createNewDatabase, getTables, getTableData, executeQuery } from './services/sqliteService';
import { TableInfo, QueryResult, ViewMode } from './types';
import { Menu } from 'lucide-react';

function App() {
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [fileName, setFileName] = useState<string>('database.sqlite');
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
    } catch (e) {
      console.error(e);
      alert("ファイルの読み込みに失敗しました。");
    }
  };

  const onCreateNew = async () => {
    try {
      await createNewDatabase();
      setFileName('new_database.db');
      refreshTables();
      setIsFileLoaded(true);
      setCurrentView('SQL');
    } catch (e) {
      console.error(e);
    }
  };

  const refreshTables = () => {
    const t = getTables();
    setTables(t);
    // If we have tables, select the first one by default
    if (t.length > 0 && !activeTable) {
      handleSelectTable(t[0].name);
    } else if (t.length === 0) {
      setQueryResult(null);
    }
  };

  const handleSelectTable = (tableName: string) => {
    setActiveTable(tableName);
    setCurrentView('BROWSE');
    setError(null);
    setIsSidebarOpen(false); // Close sidebar on mobile selection
    try {
      const data = getTableData(tableName);
      setQueryResult(data);
    } catch (e: any) {
      setError(e.message);
      setQueryResult(null);
    }
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    setIsSidebarOpen(false); // Close sidebar on mobile selection
  }

  const handleExecuteSql = (sql: string) => {
    setError(null);
    try {
      const res = executeQuery(sql);
      setQueryResult(res);
      // If it was a modification query (INSERT/UPDATE/CREATE), refresh tables
      if (sql.trim().toUpperCase().match(/^(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE)/)) {
        refreshTables();
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

  if (!isFileLoaded) {
    return <FileUpload onFileLoaded={onFileLoaded} onCreateNew={onCreateNew} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        tables={tables}
        currentView={currentView}
        onViewChange={handleViewChange}
        onSelectTable={handleSelectTable}
        fileName={fileName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Header Area */}
        <header className="h-14 min-h-[3.5rem] bg-slate-800 border-b border-slate-700 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-base md:text-lg font-semibold text-slate-200 truncate">
              {currentView === 'BROWSE' && activeTable ? `${activeTable}` : 
               currentView === 'SQL' ? 'SQL Editor' : 'AI Assistant'}
            </h1>
          </div>
          {currentView === 'BROWSE' && (
             <span className="text-[10px] md:text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 whitespace-nowrap ml-2">Limit 100</span>
          )}
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* BROWSE MODE */}
          {currentView === 'BROWSE' && (
            <div className="flex-1 p-2 md:p-4 overflow-hidden flex flex-col">
              <DataTable data={queryResult} className="h-full" />
              {error && <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 border border-red-700 p-4 rounded text-white text-sm shadow-lg">{error}</div>}
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
        </div>
      </main>
    </div>
  );
}

export default App;