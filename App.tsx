
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
  attachDatabase,
  cancelCurrentQuery
} from './services/sqliteService.ts';
import { TableInfo, QueryResult, ViewMode } from './types.ts';
import { Menu, Sun, Moon } from 'lucide-react';
import { useLanguage } from './utils/LanguageContext.tsx';

function App() {
  const { lang, setLang, t } = useLanguage();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

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
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [columnCache, setColumnCache] = useState<Record<string, string[]>>({});

  const globalFolderInputRef = useRef<HTMLInputElement>(null);

  const openFolderPicker = () => {
    globalFolderInputRef.current?.click();
  };

  const onFolderLoaded = async (files: File[]) => {
    try {
      const dbFiles = files.filter(f => f.name.match(/\.(sqlite|db|sqlite3)$/i));
      if (dbFiles.length === 0) {
        const isIframe = window.self !== window.top;
        if (lang === 'ja') {
          if (isIframe) {
            alert(
              "選択されたフォルダ内にSQLiteファイル（.db, .sqlite, .sqlite3）が見つかりませんでした。\n\n" +
              "【お知らせ】\n" +
              "現在、プレビュー枠内(iFrame)のセキュリティ制限により、ブラウザがフォルダ内のファイルを正常に取得できていない可能性があります。\n" +
              "お手数ですが、以下のいずれかをお試しください：\n" +
              "1. 画面右上の「新窓（Open in New Tab）」ボタンから本アプリを開いて再度試す\n" +
              "2. 「フォルダを開く」ボタンのすぐ下にある「※代わりに複数ファイルを選択」ボタンを使用する\n" +
              "3. 複数のファイルを直接本画面にドラッグ＆ドロップする"
            );
          } else {
            alert("選択されたフォルダ内にSQLiteファイル（.db, .sqlite, .sqlite3）が見つかりませんでした。フォルダ内の構成を確認してください。");
          }
        } else {
          if (isIframe) {
            alert(
              "No SQLite files (.db, .sqlite, .sqlite3) were found in the selected folder.\n\n" +
              "【Notice】\n" +
              "The preview iframe's security sandbox might be blocking folder access.\n" +
              "Please try one of the following:\n" +
              "1. Click the 'Open in New Tab' button in the top right to run the app in a dedicated window.\n" +
              "2. Click the 'Select multiple files instead' button just below the Folder button.\n" +
              "3. Select and drag & drop multiple database files directly onto this screen."
            );
          } else {
            alert("No SQLite files (.db, .sqlite, .sqlite3) were found in the selected folder. Please check the folder contents.");
          }
        }
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
        if (lang === 'ja') {
          alert(
            `${firstFile.name} をメインデータベースとして読み込み、以下の ${attachedList.length} 件のデータベースファイルを正常にマウント（ATTACH）しました！\n\n` +
            attachedList.join('\n') +
            `\n\n各テーブルはデータベース名を付与して相互に結合（JOIN）検索できます。（例: SELECT * FROM main_table JOIN ${attachedList[0].split(' ')[1]} ...）`
          );
        } else {
          alert(
            `Loaded ${firstFile.name} as primary database, and successfully attached ${attachedList.length} database files!\n\n` +
            attachedList.join('\n') +
            `\n\nYou can perform cross-joins by specifying database alias prefixes. (e.g., SELECT * FROM main_table JOIN ${attachedList[0].split(' ')[1]} ...)`
          );
        }
      } else {
        if (lang === 'ja') {
          alert(`${firstFile.name} を正常に読み込みました。`);
        } else {
          alert(`Successfully loaded ${firstFile.name}.`);
        }
      }
    } catch (e: any) {
      console.error(e);
      if (lang === 'ja') {
        alert(`フォルダの展開中にエラーが発生しました: ${e.message}`);
      } else {
        alert(`An error occurred while loading the folder: ${e.message}`);
      }
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
      await refreshTables();
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
      await refreshTables();
      setIsFileLoaded(true);
      setCurrentView('SQL');
      setError(null);
      setIsSidebarOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const onDownloadFile = async () => {
    try {
      const data = await exportDatabase();
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

  const refreshTables = async () => {
    try {
      const t = await getTables();
      setTables(t);

      // Warm up columnCache for IntelliSense/suggestions
      const cache: Record<string, string[]> = {};
      await Promise.all(t.map(async (table) => {
        try {
          const cols = await getTableColumns(table.name);
          cache[table.name] = cols;
        } catch (e) {
          // Silent fallback for empty or error tables
        }
      }));
      setColumnCache(cache);

      // If we have active table, refresh its data, otherwise maybe select first?
      if (activeTable) {
        // Check if active table still exists
        if (t.find(tab => tab.name === activeTable)) {
           await handleSelectTable(activeTable);
        } else {
           setActiveTable(null);
           setQueryResult(null);
        }
      } else if (t.length > 0) {
        await handleSelectTable(t[0].name);
      } else {
        setQueryResult(null);
        setActiveTable(null);
      }
    } catch (err: any) {
      setError(`テーブル一覧の更新に失敗しました: ${err.message}`);
    }
  };

  const handleSelectTable = async (tableName: string) => {
    setActiveTable(tableName);
    setCurrentView('BROWSE');
    setError(null);
    setIsSidebarOpen(false);
    try {
      const startTime = performance.now();
      const data = await getTableData(tableName);
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

  const performDeleteTable = async (tableName: string) => {
    try {
      await dropTable(tableName);
      // Explicitly reset active table if we deleted it
      if (activeTable === tableName) {
        setActiveTable(null);
        setQueryResult(null);
      }
      await refreshTables();
      closeModal();
    } catch (e: any) {
      setError(`テーブル削除エラー: ${e.message}`);
      closeModal();
    }
  };

  const handleUpdateCell = async (rowId: number, column: string, value: any) => {
    if (!activeTable) return;
    try {
      await updateCellValue(activeTable, rowId, column, value);
      const data = await getTableData(activeTable);
      setQueryResult(data);
    } catch (e: any) {
      setError(`更新エラー: ${e.message}`);
    }
  };

  const handleDeleteRow = async (rowId: number) => {
    if (!activeTable) return;
    if (!window.confirm("この行を削除しますか？")) return;
    try {
      await deleteRow(activeTable, rowId);
      const data = await getTableData(activeTable);
      setQueryResult(data);
    } catch (e: any) {
      setError(`削除エラー: ${e.message}`);
    }
  };

  const handleAddRow = async (data: Record<string, any>) => {
    if (!activeTable) return;
    try {
      await insertRow(activeTable, data);
      const res = await getTableData(activeTable);
      setQueryResult(res);
    } catch (e: any) {
      setError(`追加エラー: ${e.message}`);
    }
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  }

  const handleExecuteSql = async (sql: string) => {
    setError(null);
    setEditorSql(sql);
    setIsQueryRunning(true);
    try {
      const startTime = performance.now();
      const res = await executeQuery(sql);
      const endTime = performance.now();
      setQueryResult(res);
      setExecutionTime(endTime - startTime);
      // If it was a modification query, refresh tables list
      if (sql.trim().toUpperCase().match(/^(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE)/)) {
        await refreshTables();
      }
    } catch (e: any) {
      setError(e.message);
      setQueryResult(null);
      setExecutionTime(null);
    } finally {
      setIsQueryRunning(false);
    }
  };

  const handleCancelSql = async () => {
    try {
      setError(lang === 'ja' ? 'ユーザーによってクエリの実行が停止されました。' : 'Query execution stopped by user.');
      await cancelCurrentQuery();
      setQueryResult(null);
      setExecutionTime(null);
      await refreshTables();
    } catch (e: any) {
      console.error("Disaster recovery failed during cancellation:", e);
    } finally {
      setIsQueryRunning(false);
    }
  };

  const handleGetSuggestions = () => {
    const tableNames = tables.map(t => t.name);
    const columnNames: string[] = [];
    Object.values(columnCache).forEach(cols => {
      columnNames.push(...cols);
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
    <div className={`flex h-dvh bg-slate-900 text-slate-100 overflow-hidden ${theme === 'light' ? 'theme-light' : ''}`}>
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
               {!isFileLoaded ? t.home : 
                currentView === 'BROWSE' && activeTable ? `${activeTable}` : 
                currentView === 'SQL' ? t.sqlEditor : 
                currentView === 'AI' ? t.aiAssistant : t.queryExamples}
            </h1>
            {isFileLoaded && currentView === 'BROWSE' && (
               <span className="text-[10px] md:text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 whitespace-nowrap ml-2">
                 {t.doubleClickToEdit}
               </span>
            )}
          </div>
          
          {/* Header Theme Switcher Switch & Language Switcher */}
          <div className="flex items-center gap-2 select-none">
            {/* Language Segmented Control */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900/50 border border-slate-700/60 shadow-inner theme-lang-pill">
              <button
                onClick={() => setLang('ja')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  lang === 'ja'
                    ? 'bg-slate-700 text-white shadow-sm theme-lang-active'
                    : 'text-slate-400 hover:text-slate-200 theme-lang-inactive'
                }`}
              >
                JP
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  lang === 'en'
                    ? 'bg-slate-700 text-white shadow-sm theme-lang-active'
                    : 'text-slate-400 hover:text-slate-200 theme-lang-inactive'
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 md:p-2 rounded-lg bg-slate-900/40 border border-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold shadow-inner"
              title={theme === 'dark' ? t.switchLight : t.switchDark}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={15} className="text-amber-400" />
                  <span className="hidden sm:inline">{t.lightMode}</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="text-indigo-400" />
                  <span className="hidden sm:inline">{t.darkMode}</span>
                </>
              )}
            </button>
          </div>
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
                        {t.executionTime}: {executionTime.toFixed(1)}ms
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
                      isExecuting={isQueryRunning}
                      onCancel={handleCancelSql}
                    />
                  </div>
                  <div className="flex-1 p-2 md:p-4 bg-slate-900 overflow-hidden border-t border-slate-800 flex flex-col">
                     <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t.resultsTitle}</div>
                        {executionTime !== null && (
                          <div className="text-xs text-slate-400 font-mono">
                            {t.executionTime}: {executionTime.toFixed(1)}ms
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