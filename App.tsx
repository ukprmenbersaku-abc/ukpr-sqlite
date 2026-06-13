
import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from './components/FileUpload.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DataTable } from './components/DataTable.tsx';
import { SqlEditor } from './components/SqlEditor.tsx';
import { AiAssistant } from './components/AiAssistant.tsx';
import { QueryExamples } from './components/QueryExamples.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
import { JoinVisualizer } from './components/JoinVisualizer.tsx';
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
  dropTable,
  getTableColumns,
  attachDatabase
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
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const globalFolderInputRef = useRef<HTMLInputElement>(null);

  const openFolderPicker = () => {
    globalFolderInputRef.current?.click();
  };

  const onFolderLoaded = async (files: File[]) => {
    try {
      const dbFiles = files.filter(f => f.name.match(/\.(sqlite|db|sqlite3)$/i));
      if (dbFiles.length === 0) {
        alert("選択されたフォルダ内にSQLiteファイル（.db, .sqlite, .sqlite3）が見つかりませんでした。");
        return;
      }

      setError(null);
      // Load first file as primary database
      const firstFile = dbFiles[0];
      const firstBuffer = await firstFile.arrayBuffer();
      await loadDatabase(firstBuffer);
      setFileName(firstFile.name);

      // Attach remaining databases
      const attachedList: string[] = [];
      for (let i = 1; i < dbFiles.length; i++) {
        const file = dbFiles[i];
        const buffer = await file.arrayBuffer();
        try {
          const alias = await attachDatabase(file.name, buffer);
          attachedList.push(`${file.name} (as '${alias}')`);
        } catch (attachErr: any) {
          console.error(`Error attaching ${file.name}:`, attachErr);
        }
      }

      refreshTables();
      setIsFileLoaded(true);
      setCurrentView('BROWSE');
      setIsSidebarOpen(false);

      if (attachedList.length > 0) {
        alert(
          `${firstFile.name} をメインデータベースとして読み込み、以下の ${attachedList.length} 件のデータベースファイルを正常にマウント（ATTACH）しました！\n\n` +
          attachedList.join('\n') +
          `\n\n各テーブルはデータベース名を付与して相互に結合（JOIN）検索できます。（例: SELECT * FROM main_table JOIN ${attachedList[0].split(' ')[1]} ...）`
        );
      } else {
        alert(`${firstFile.name} を正常に読み込みました。`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`フォルダの展開中にエラーが発生しました: ${e.message}`);
    }
  };

  // Register Keyboard Shortcuts
  useEffect(() => {
    let ctrlKActive = false;
    let ctrlKTimeout: any = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + S: Save / Download the database
      if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isFileLoaded) {
          onDownloadFile();
        } else {
          alert("保存・保存用ダウンロードを実行するデータベースが読み込まれていません。");
        }
        return;
      }

      // Ctrl + W: Close current database / workspace
      if (isCtrl && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (isFileLoaded) {
          onCloseFileRequest();
        }
        return;
      }

      // Ctrl + K chord start prefix
      if (isCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ctrlKActive = true;
        if (ctrlKTimeout) clearTimeout(ctrlKTimeout);
        ctrlKTimeout = setTimeout(() => {
          ctrlKActive = false;
        }, 1500);
        return;
      }

      // Ctrl + K followed by O: Open Folder picker
      if (ctrlKActive && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        ctrlKActive = false;
        if (ctrlKTimeout) clearTimeout(ctrlKTimeout);
        openFolderPicker();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (ctrlKTimeout) clearTimeout(ctrlKTimeout);
    };
  }, [isFileLoaded, fileName]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

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

  const onCloseFileRequest = () => {
    setModalConfig({
      isOpen: true,
      title: 'ファイルを閉じますか？',
      message: '保存されていない変更は失われる可能性があります。\n現在の作業を終了してホーム画面に戻りますか？',
      isDestructive: true,
      confirmText: '閉じる',
      onConfirm: performCloseFile
    });
  };

  const performCloseFile = () => {
    try {
      closeDatabase();
    } catch (e) {
      console.warn("Database close error:", e);
    }
    
    // Reset all states to initial values completely
    setIsFileLoaded(false);
    setFileName(null);
    setTables([]);
    setQueryResult(null);
    setActiveTable(null);
    setEditorSql('');
    setError(null);
    setIsSidebarOpen(false);
    setCurrentView('BROWSE');
    closeModal();
  };

  const refreshTables = () => {
    const t = getTables();
    setTables(t);
    // If we have active table, refresh its data, otherwise maybe select first?
    if (activeTable) {
      // Check if active table still exists
      if (t.find(tab => tab.name === activeTable)) {
         handleSelectTable(activeTable);
      } else {
         setActiveTable(null);
         setQueryResult(null);
      }
    } else if (t.length > 0) {
      handleSelectTable(t[0].name);
    } else {
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
      const startTime = performance.now();
      const data = getTableData(tableName);
      const endTime = performance.now();
      setQueryResult(data);
      setExecutionTime(endTime - startTime);
    } catch (e: any) {
      setError(e.message);
      setQueryResult(null);
      setExecutionTime(null);
    }
  };

  const handleDeleteTableRequest = (tableName: string) => {
    setModalConfig({
      isOpen: true,
      title: 'テーブルの削除',
      message: `テーブル "${tableName}" を削除してもよろしいですか？\nこの操作は取り消せません。`,
      isDestructive: true,
      confirmText: '削除する',
      onConfirm: () => performDeleteTable(tableName)
    });
  };

  const performDeleteTable = (tableName: string) => {
    try {
      dropTable(tableName);
      // Explicitly reset active table if we deleted it
      if (activeTable === tableName) {
        setActiveTable(null);
        setQueryResult(null);
      }
      refreshTables();
      closeModal();
    } catch (e: any) {
      setError(`テーブル削除エラー: ${e.message}`);
      closeModal();
    }
  };

  const handleUpdateCell = (rowId: number, column: string, value: any) => {
    if (!activeTable) return;
    try {
      updateCellValue(activeTable, rowId, column, value);
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
    setEditorSql(sql);
    try {
      const startTime = performance.now();
      const res = executeQuery(sql);
      const endTime = performance.now();
      setQueryResult(res);
      setExecutionTime(endTime - startTime);
      // If it was a modification query, refresh tables list
      if (sql.trim().toUpperCase().match(/^(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE)/)) {
        const t = getTables();
        setTables(t);
      }
    } catch (e: any) {
      setError(e.message);
      setQueryResult(null);
      setExecutionTime(null);
    }
  };

  const handleGetSuggestions = () => {
    const tableNames = tables.map(t => t.name);
    const columnNames: string[] = [];
    tableNames.forEach(tName => {
      try {
        const cols = getTableColumns(tName);
        columnNames.push(...cols);
      } catch (e) {
        // ignore
      }
    });
    // Remove duplicates
    const uniqueColumns = Array.from(new Set(columnNames));
    return {
      tables: tableNames,
      columns: uniqueColumns
    };
  };

  const handleAiGeneratedSql = (sql: string) => {
    setEditorSql(sql);
    setCurrentView('SQL');
    handleExecuteSql(sql);
  };
  
  const handleSelectExampleSql = (sql: string) => {
    setEditorSql(sql);
    setCurrentView('SQL');
  };

  return (
    <div className="flex h-dvh bg-slate-900 text-slate-100 overflow-hidden">
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={closeModal}
        isDestructive={modalConfig.isDestructive}
        confirmText={modalConfig.confirmText}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar is always rendered */}
      <Sidebar 
        tables={tables}
        currentView={currentView}
        onViewChange={handleViewChange}
        onSelectTable={handleSelectTable}
        onDeleteTable={handleDeleteTableRequest}
        fileName={fileName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTable={activeTable}
        isFileLoaded={isFileLoaded}
        onFileOpen={onFileLoaded}
        onFolderOpen={onFolderLoaded}
        onCreateNew={onCreateNew}
        onCloseFile={onCloseFileRequest}
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
                currentView === 'SQL' ? 'SQL Editor' : 
                currentView === 'AI' ? 'AI Assistant' : 'SQL Query 例'}
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
            // No File Loaded State (Home Screen)
            <FileUpload 
              onFileLoaded={onFileLoaded} 
              onCreateNew={onCreateNew} 
              onFolderLoaded={onFolderLoaded} 
            />
          ) : (
            // File Loaded State
            <>
              {/* BROWSE MODE */}
              {currentView === 'BROWSE' && (
                <div className="flex-1 p-2 md:p-4 overflow-hidden flex flex-col">
                  {executionTime !== null && (
                    <div className="flex justify-end mb-2 px-1">
                      <span className="text-xs text-slate-400 font-mono">
                        実行時間: {executionTime.toFixed(1)}ms
                      </span>
                    </div>
                  )}
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
                      getSuggestions={handleGetSuggestions}
                    />
                  </div>
                  <div className="flex-1 p-2 md:p-4 bg-slate-900 overflow-hidden border-t border-slate-800 flex flex-col">
                     <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Results</div>
                        {executionTime !== null && (
                          <div className="text-xs text-slate-400 font-mono">
                            実行時間: {executionTime.toFixed(1)}ms
                          </div>
                        )}
                     </div>
                     {editorSql && (
                       <div className="shrink-0 max-h-56 overflow-y-auto mb-3">
                         <JoinVisualizer sql={editorSql} />
                       </div>
                     )}
                     <DataTable data={queryResult} className="flex-1" />
                  </div>
                </div>
              )}

              {/* AI MODE */}
              {currentView === 'AI' && (
                <AiAssistant onSqlGenerated={handleAiGeneratedSql} />
              )}
              
              {/* EXAMPLES MODE */}
              {currentView === 'EXAMPLES' && (
                <QueryExamples 
                  onSelectSql={handleSelectExampleSql} 
                  activeTable={activeTable} 
                />
              )}
            </>
          )}
        </div>
      </main>

      <input 
        type="file" 
        ref={globalFolderInputRef} 
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            onFolderLoaded(files);
          }
          e.target.value = '';
        }} 
        className="hidden" 
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
      />
    </div>
  );
}

export default App;