
import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from './components/FileUpload.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DataTable } from './components/DataTable.tsx';
import { SqlEditor } from './components/SqlEditor.tsx';
import { AiAssistant } from './components/AiAssistant.tsx';
import { QueryExamples } from './components/QueryExamples.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
import { JoinVisualizer } from './components/JoinVisualizer.tsx';
import { LicenseModal } from './components/LicenseModal.tsx';
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
  detachDatabase,
  cancelCurrentQuery,
  initSqlJs,
  createAttachedEmptyDatabase,
  copyTableAcrossDatabases,
  getDatabaseStats,
  loadSampleMultiDatabase
} from './services/sqliteService.ts';
import { TableInfo, QueryResult, ViewMode, DatabaseStats } from './types.ts';
import { Menu, Sun, Moon, Scale, CheckCircle2, AlertTriangle, Info, XCircle, X, Copy } from 'lucide-react';
import { useLanguage } from './utils/LanguageContext.tsx';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

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
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);

  // Multi-database management state
  const [attachedDatabases, setAttachedDatabases] = useState<{ name: string; alias: string }[]>([]);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats[]>([]);

  // Copy table across databases modal state
  const [copyTableConfig, setCopyTableConfig] = useState<{
    isOpen: boolean;
    sourceTable: string;
    targetDb: string;
    newTableName: string;
  }>({
    isOpen: false,
    sourceTable: '',
    targetDb: '',
    newTableName: ''
  });

  // Toast Notifications (smooth, non-intrusive in-app notifications)
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(item => item.id !== id));
    }, 4500);
  };

  const globalFolderInputRef = useRef<HTMLInputElement>(null);

  const openFolderPicker = () => {
    globalFolderInputRef.current?.click();
  };

  const onFolderLoaded = async (files: File[]) => {
    try {
      const dbFiles = files.filter(f => f.name.match(/\.(sqlite|db|sqlite3)$/i));
      if (dbFiles.length === 0) {
        const isIframe = window.self !== window.top;
        const msg = lang === 'ja'
          ? (isIframe 
              ? "選択されたフォルダ内にSQLiteファイル（.db, .sqlite, .sqlite3）が見つかりませんでした。プレビュー枠外の新窓で開くか、複数ファイル選択をお試しください。"
              : "選択されたフォルダ内にSQLiteファイル（.db, .sqlite, .sqlite3）が見つかりませんでした。フォルダ内の構成を確認してください。")
          : (isIframe
              ? "No SQLite files (.db, .sqlite, .sqlite3) found in folder. If blocked by preview sandbox, try opening in a new tab or selecting multiple files."
              : "No SQLite files (.db, .sqlite, .sqlite3) found in folder. Please check the folder contents.");
        showToast(msg, 'warning');
        return;
      }

      setError(null);
      // Load first file as primary database
      const firstFile = dbFiles[0];
      const firstBuffer = await firstFile.arrayBuffer();
      await loadDatabase(firstBuffer);
      setFileName(firstFile.name);

      // Attach remaining databases
      const attachedInfo: { name: string; alias: string }[] = [];
      for (let i = 1; i < dbFiles.length; i++) {
        const file = dbFiles[i];
        const buffer = await file.arrayBuffer();
        try {
          const alias = await attachDatabase(file.name, buffer);
          attachedInfo.push({ name: file.name, alias });
        } catch (attachErr: any) {
          console.error(`Error attaching ${file.name}:`, attachErr);
        }
      }
      setAttachedDatabases(attachedInfo);

      await refreshTables();
      setIsFileLoaded(true);
      setCurrentView('BROWSE');
      setIsSidebarOpen(false);

      if (attachedInfo.length > 0) {
        showToast(
          lang === 'ja'
            ? `${firstFile.name} をメインDBとして読み込み、他 ${attachedInfo.length} 件のDBをマウントしました！VS Code風サイドバーで相互確認できます。`
            : `Loaded ${firstFile.name} as primary DB, attached ${attachedInfo.length} databases! You can now manage them in the Explorer.`,
          'success'
        );
      } else {
        showToast(
          lang === 'ja' ? `${firstFile.name} を読み込みました。` : `Loaded ${firstFile.name}.`,
          'success'
        );
      }
    } catch (e: any) {
      console.error(e);
      showToast(
        lang === 'ja' ? `フォルダの展開エラー: ${e.message}` : `Error loading folder: ${e.message}`,
        'error'
      );
    }
  };

  // Pre-initialize SQLite background worker and compile WASM
  useEffect(() => {
    initSqlJs().catch(err => {
      console.warn("Pre-initialization of SQLite WASM failed:", err);
    });
  }, []);

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
          showToast(t.noDatabaseLoadedWarning, 'warning');
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

  // Global drag-and-drop handler for attaching databases anytime while workspace is active
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (isFileLoaded) {
        e.preventDefault();
      }
    };

    const handleWindowDrop = async (e: DragEvent) => {
      if (!isFileLoaded) return;
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files || []);
      const dbFiles = files.filter(f => f.name.match(/\.(sqlite|db|sqlite3)$/i));
      if (dbFiles.length > 0) {
        for (const file of dbFiles) {
          await onAttachFile(file);
        }
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [isFileLoaded, attachedDatabases]);

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

  // Handle primary file loading
  const onFileLoaded = async (file: File) => {
    try {
      // Clear previous state completely first
      setActiveTable(null);
      setQueryResult(null);
      setEditorSql('');
      setError(null);
      setExecutionTime(null);
      setAttachedDatabases([]);

      const buffer = await file.arrayBuffer();
      await loadDatabase(buffer);
      setFileName(file.name);
      await refreshTables();
      setIsFileLoaded(true);
      setCurrentView('BROWSE');
      setIsSidebarOpen(false);
      showToast(lang === 'ja' ? `${file.name} を開きました` : `Opened ${file.name}`, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(t.loadFileFailed + (e?.message ? `: ${e.message}` : ''), 'error');
    }
  };

  const onCreateNew = async () => {
    try {
      // Clear previous state completely first
      setActiveTable(null);
      setQueryResult(null);
      setEditorSql('');
      setError(null);
      setExecutionTime(null);
      setAttachedDatabases([]);

      await createNewDatabase();
      setFileName('new_database.sqlite');
      await refreshTables();
      setIsFileLoaded(true);
      setCurrentView('SQL');
      setIsSidebarOpen(false);
      showToast(lang === 'ja' ? '新しい空のデータベースを作成しました' : 'Created a new in-memory SQLite database', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(lang === 'ja' ? `新規DB作成エラー: ${e.message}` : `Failed to create DB: ${e.message}`, 'error');
    }
  };

  // Attach additional database file dynamically
  const onAttachFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const alias = await attachDatabase(file.name, buffer);
      setAttachedDatabases(prev => [...prev.filter(d => d.alias !== alias), { name: file.name, alias }]);
      await refreshTables();
      showToast(
        lang === 'ja' 
          ? `${file.name} を '${alias}' としてマウントしました！` 
          : `Attached ${file.name} as '${alias}'!`,
        'success'
      );
    } catch (e: any) {
      console.error(e);
      showToast(lang === 'ja' ? `DBマウントエラー: ${e.message}` : `Attach error: ${e.message}`, 'error');
    }
  };

  // Detach database file
  const handleDetachDatabaseRequest = (alias: string) => {
    setModalConfig({
      isOpen: true,
      title: t.detachConfirmTitle,
      message: t.detachConfirmMessage.replace('{alias}', alias),
      isDestructive: true,
      confirmText: t.detachConfirmText,
      onConfirm: async () => {
        try {
          await detachDatabase(alias);
          setAttachedDatabases(prev => prev.filter(d => d.alias !== alias));
          await refreshTables();
          closeModal();
          showToast(
            lang === 'ja' ? `データベース '${alias}' を解除しました` : `Detached database '${alias}'`,
            'info'
          );
        } catch (e: any) {
          closeModal();
          showToast(
            lang === 'ja' ? `解除に失敗しました: ${e.message}` : `Failed to detach: ${e.message}`,
            'error'
          );
        }
      }
    });
  };

  const handleRunQuickSql = (sql: string) => {
    setEditorSql(sql);
    setCurrentView('SQL');
    handleExecuteSql(sql);
  };

  const onExportDatabase = async (alias?: string) => {
    try {
      const isMain = !alias || alias === 'main';
      const data = await exportDatabase(alias);
      if (!data) return;
      const blob = new Blob([data as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const targetName = isMain 
        ? (fileName || 'database.sqlite')
        : (attachedDatabases.find(d => d.alias === alias)?.name || `${alias}.sqlite`);
      a.download = targetName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(
        lang === 'ja' ? `${targetName} のダウンロードを開始しました` : `Started download for ${targetName}`,
        'success'
      );
    } catch (e) {
      console.error(e);
      showToast(t.saveFileFailed, 'error');
    }
  };

  const onDownloadFile = async () => {
    await onExportDatabase('main');
  };

  const onMakePrimary = async (targetAlias: string) => {
    try {
      const targetDbInfo = attachedDatabases.find(d => d.alias === targetAlias);
      const targetDbName = targetDbInfo ? targetDbInfo.name : `${targetAlias}.sqlite`;
      const oldMainName = fileName || 'main.sqlite';

      // 1. Export main and target databases
      const mainData = await exportDatabase('main');
      const targetData = await exportDatabase(targetAlias);

      if (!mainData || !targetData) {
        throw new Error("Could not export database state for switching");
      }

      // Also preserve any OTHER attached databases
      const otherAttached = attachedDatabases.filter(d => d.alias !== targetAlias);
      const otherBuffers: { name: string; alias: string; buffer: ArrayBuffer }[] = [];
      for (const other of otherAttached) {
        const otherData = await exportDatabase(other.alias);
        if (otherData) {
          otherBuffers.push({
            name: other.name,
            alias: other.alias,
            buffer: (otherData.buffer as ArrayBuffer).slice(otherData.byteOffset, otherData.byteOffset + otherData.byteLength) as ArrayBuffer
          });
        }
      }

      const targetBuffer = (targetData.buffer as ArrayBuffer).slice(targetData.byteOffset, targetData.byteOffset + targetData.byteLength) as ArrayBuffer;
      const mainBuffer = (mainData.buffer as ArrayBuffer).slice(mainData.byteOffset, mainData.byteOffset + mainData.byteLength) as ArrayBuffer;

      // 2. Load target data as primary
      await loadDatabase(targetBuffer);
      setFileName(targetDbName);

      // 3. Attach previous main
      const oldMainAlias = await attachDatabase(oldMainName, mainBuffer);

      // 4. Re-attach all other preserved databases
      const reattachedList: { name: string; alias: string }[] = [
        { name: oldMainName, alias: oldMainAlias }
      ];
      for (const other of otherBuffers) {
        try {
          const alias = await attachDatabase(other.name, other.buffer);
          reattachedList.push({ name: other.name, alias });
        } catch (reErr) {
          console.warn(`Could not re-attach ${other.name}:`, reErr);
        }
      }

      setAttachedDatabases(reattachedList);

      // 5. Refresh tables and explorer
      await refreshTables();
      showToast(
        lang === 'ja' 
          ? `メインDBを「${targetDbName}」に切り替えました！元のメインDBは「${oldMainAlias}」としてマウントされています。`
          : `Switched main database to "${targetDbName}"! Previous main is now attached as "${oldMainAlias}".`,
        'success'
      );
    } catch (e: any) {
      console.error("Make primary error:", e);
      showToast(
        lang === 'ja' ? `メインDB切り替えエラー: ${e.message}` : `Failed to switch main DB: ${e.message}`,
        'error'
      );
    }
  };

  const onCreateEmptyAttachedDb = async () => {
    const defaultName = `db_${attachedDatabases.length + 2}`;
    const name = prompt(t.newEmptyAttachedDbPrompt, defaultName);
    if (!name || !name.trim()) return;
    try {
      const cleanName = name.trim();
      const alias = await createAttachedEmptyDatabase(cleanName);
      setAttachedDatabases(prev => [...prev.filter(d => d.alias !== alias), { name: `${cleanName}.sqlite`, alias }]);
      await refreshTables();
      showToast(
        lang === 'ja'
          ? `空のデータベース「${alias}」をマウントしました！`
          : `Created and attached empty database "${alias}"!`,
        'success'
      );
    } catch (e: any) {
      console.error("Create attached error:", e);
      showToast(
        lang === 'ja' ? `DB作成エラー: ${e.message}` : `Error creating attached DB: ${e.message}`,
        'error'
      );
    }
  };

  const onLoadSampleMultiDb = async () => {
    try {
      setActiveTable(null);
      setQueryResult(null);
      setEditorSql('');
      setError(null);
      setExecutionTime(null);
      setAttachedDatabases([]);

      await loadSampleMultiDatabase();
      setFileName('store_main.sqlite');
      setAttachedDatabases([{ name: 'analytics.sqlite', alias: 'analytics' }]);
      await refreshTables();
      setIsFileLoaded(true);
      setCurrentView('BROWSE');
      setIsSidebarOpen(false);
      showToast(
        lang === 'ja'
          ? 'サンプルストアDB (main) と分析DB (analytics) をマウントしました！エクスプローラーからテーブル間JOINやコピーを試せます。'
          : 'Loaded sample Store DB (main) & Analytics DB (analytics)! Explore cross-database querying in the editor.',
        'success'
      );
    } catch (e: any) {
      console.error("Load sample error:", e);
      showToast(
        lang === 'ja' ? `サンプル読込エラー: ${e.message}` : `Error loading sample: ${e.message}`,
        'error'
      );
    }
  };

  const handleOpenCopyTableModal = (sourceTable: string) => {
    const isSourceInAttached = sourceTable.includes('.');
    let defaultTarget = 'main';
    if (!isSourceInAttached && attachedDatabases.length > 0) {
      defaultTarget = attachedDatabases[0].alias;
    }
    const pureTableName = sourceTable.replace(/^.*?\./, '');

    setCopyTableConfig({
      isOpen: true,
      sourceTable,
      targetDb: defaultTarget,
      newTableName: `${pureTableName}_copy`
    });
  };

  const performCopyTable = async () => {
    if (!copyTableConfig.sourceTable || !copyTableConfig.targetDb || !copyTableConfig.newTableName) return;
    try {
      await copyTableAcrossDatabases(
        copyTableConfig.sourceTable,
        copyTableConfig.targetDb,
        copyTableConfig.newTableName
      );
      await refreshTables();
      setCopyTableConfig(prev => ({ ...prev, isOpen: false }));
      showToast(
        t.copySuccess
          .replace('{table}', copyTableConfig.sourceTable)
          .replace('{target}', `${copyTableConfig.targetDb}.${copyTableConfig.newTableName}`),
        'success'
      );
    } catch (e: any) {
      showToast(
        lang === 'ja' ? `テーブルコピー失敗: ${e.message}` : `Copy table failed: ${e.message}`,
        'error'
      );
    }
  };

  const onCloseFileRequest = () => {
    setModalConfig({
      isOpen: true,
      title: t.closeFileTitle,
      message: t.closeFileMessage,
      isDestructive: true,
      confirmText: t.closeFileConfirmText,
      onConfirm: performCloseFile
    });
  };

  const performCloseFile = async () => {
    try {
      await closeDatabase();
    } catch (e) {
      console.warn("Database close error:", e);
    }
    
    // Reset all states to initial values completely
    setIsFileLoaded(false);
    setFileName(null);
    setAttachedDatabases([]);
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

      // Query database sizes and table statistics
      try {
        const stats = await getDatabaseStats();
        setDatabaseStats(stats);
      } catch (e) {}

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
      setError(lang === 'ja' ? `テーブル一覧の更新に失敗しました: ${err.message}` : `Failed to refresh tables: ${err.message}`);
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
      title: t.deleteTableTitle,
      message: t.deleteTableMessage.replace('{tableName}', tableName),
      isDestructive: true,
      confirmText: t.deleteTableConfirmText,
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
      setError(`${t.tableDeleteError}: ${e.message}`);
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
      setError(`${t.updateError}: ${e.message}`);
    }
  };

  const handleDeleteRow = async (rowId: number) => {
    if (!activeTable) return;
    if (!window.confirm(t.deleteRowPrompt)) return;
    try {
      await deleteRow(activeTable, rowId);
      const data = await getTableData(activeTable);
      setQueryResult(data);
    } catch (e: any) {
      setError(`${t.deleteError}: ${e.message}`);
    }
  };

  const handleAddRow = async (data: Record<string, any>) => {
    if (!activeTable) return;
    try {
      await insertRow(activeTable, data);
      const res = await getTableData(activeTable);
      setQueryResult(res);
    } catch (e: any) {
      setError(`${t.insertError}: ${e.message}`);
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

      {/* Sidebar is always rendered (VS Code Activity Bar + Explorer Sidebar) */}
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
        onOpenLicense={() => setIsLicenseOpen(true)}
        attachedFiles={attachedDatabases}
        onAttachFile={onAttachFile}
        onDetachDatabase={handleDetachDatabaseRequest}
        onRefreshTables={refreshTables}
        onRunQuickSql={handleRunQuickSql}
        onExportDatabase={onExportDatabase}
        onMakePrimary={onMakePrimary}
        onCreateEmptyAttachedDb={onCreateEmptyAttachedDb}
        onOpenCopyTableModal={handleOpenCopyTableModal}
        databaseStats={databaseStats}
        theme={theme}
        onToggleTheme={toggleTheme}
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
          
          {/* Header Theme Switcher Switch & Language Switcher & License Button */}
          <div className="flex items-center gap-2 select-none">
            {/* License & Terms Button */}
            <button
              onClick={() => setIsLicenseOpen(true)}
              className="p-1.5 md:p-2 rounded-lg bg-slate-900/40 border border-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold shadow-inner"
              title={t.licenseAndTerms}
            >
              <Scale size={15} className="text-indigo-400" />
              <span className="hidden xl:inline">{t.licenseAndTerms}</span>
            </button>

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
              onLoadSampleMultiDb={onLoadSampleMultiDb}
              onOpenLicense={() => setIsLicenseOpen(true)}
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
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        className="hidden" 
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
      />

      {/* Copy Table to Another Database Modal */}
      {copyTableConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-indigo-900/30 text-indigo-400">
                  <Copy size={18} />
                </div>
                <h3 className="font-bold text-white text-base">{t.copyTableTitle}</h3>
              </div>
              <button 
                onClick={() => setCopyTableConfig(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                {t.copyTableDesc}
              </p>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {lang === 'ja' ? 'コピー元テーブル:' : 'Source Table:'}
                </label>
                <div className="p-2 rounded bg-slate-900 border border-slate-700 font-mono text-indigo-300">
                  {copyTableConfig.sourceTable}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {t.selectTargetDb}
                </label>
                <select
                  value={copyTableConfig.targetDb}
                  onChange={(e) => setCopyTableConfig(prev => ({ ...prev, targetDb: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="main">{t.mainDatabase} ({fileName || 'main.sqlite'})</option>
                  {attachedDatabases.map(att => (
                    <option key={att.alias} value={att.alias}>
                      {att.name} ({att.alias})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {t.newTableNameLabel}
                </label>
                <input
                  type="text"
                  value={copyTableConfig.newTableName}
                  onChange={(e) => setCopyTableConfig(prev => ({ ...prev, newTableName: e.target.value }))}
                  placeholder="new_table_name"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 flex justify-end gap-2.5">
              <button
                onClick={() => setCopyTableConfig(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {t.cancelText}
              </button>
              <button
                onClick={performCopyTable}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} />
                <span>{t.copyTableBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Open-Source Licenses Modal */}
      <LicenseModal 
        isOpen={isLicenseOpen} 
        onClose={() => setIsLicenseOpen(false)} 
      />

      {/* Floating Toast Notifications (VS Code aesthetic, zero blocking alerts) */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map(toast => (
            <div 
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg shadow-xl border text-xs backdrop-blur-md transition-all ${
                toast.type === 'success' 
                  ? 'bg-slate-900/95 border-emerald-500/60 text-emerald-200' 
                  : toast.type === 'error'
                  ? 'bg-slate-900/95 border-rose-500/60 text-rose-200'
                  : toast.type === 'warning'
                  ? 'bg-slate-900/95 border-amber-500/60 text-amber-200'
                  : 'bg-slate-900/95 border-indigo-500/60 text-indigo-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400" />}
                {toast.type === 'error' && <XCircle size={16} className="text-rose-400" />}
                {toast.type === 'warning' && <AlertTriangle size={16} className="text-amber-400" />}
                {toast.type === 'info' && <Info size={16} className="text-indigo-400" />}
              </div>
              <div className="flex-1 font-medium leading-relaxed whitespace-pre-wrap">
                {toast.message}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;