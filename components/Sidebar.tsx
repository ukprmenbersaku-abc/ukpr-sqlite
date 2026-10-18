import React, { useRef, useState, useMemo } from 'react';
import { TableInfo, ViewMode } from '../types.ts';
import { 
  Database, 
  Terminal, 
  Sparkles, 
  Table as TableIcon, 
  X, 
  Trash2, 
  FolderOpen, 
  FilePlus, 
  LogOut, 
  Download, 
  BookOpen, 
  Folders, 
  Scale,
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  RefreshCw,
  FileCode,
  Layers,
  HardDrive,
  Unplug,
  Sun,
  Moon,
  FolderTree,
  ChevronUp,
  Copy,
  ArrowUpCircle,
  FilePlus2
} from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';
import { DatabaseStats } from '../types.ts';

export interface AttachedDbInfo {
  name: string;
  alias: string;
}

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
  onOpenLicense?: () => void;
  attachedFiles?: AttachedDbInfo[];
  onAttachFile?: (file: File) => void;
  onDetachDatabase?: (alias: string) => void;
  onRefreshTables?: () => void;
  onRunQuickSql?: (sql: string) => void;
  onExportDatabase?: (alias?: string) => void;
  onMakePrimary?: (alias: string) => void;
  onCreateEmptyAttachedDb?: () => void;
  onOpenCopyTableModal?: (tableName: string) => void;
  databaseStats?: DatabaseStats[];
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
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
  onDownloadFile,
  onOpenLicense,
  attachedFiles = [],
  onAttachFile,
  onDetachDatabase,
  onRefreshTables,
  onRunQuickSql,
  onExportDatabase,
  onMakePrimary,
  onCreateEmptyAttachedDb,
  onOpenCopyTableModal,
  databaseStats = [],
  theme = 'dark',
  onToggleTheme
}) => {
  const { lang, setLang, t } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachFileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Filter query in VS Code explorer
  const [filterQuery, setFilterQuery] = useState('');

  // Accordion section states
  const [isDatabasesOpen, setIsDatabasesOpen] = useState(true);
  const [isAllTablesOpen, setIsAllTablesOpen] = useState(true);
  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);

  // Collapsed states for individual database trees
  const [collapsedDbs, setCollapsedDbs] = useState<Record<string, boolean>>({});

  const toggleDbCollapse = (key: string) => {
    setCollapsedDbs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileOpen(file);
      event.target.value = '';
    }
  };

  const handleAttachFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAttachFile) {
      onAttachFile(file);
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

  // Group tables by database (main vs attached)
  const groupedDatabases = useMemo(() => {
    // 1. Main database tables (no dot in table name)
    const mainTables = tables.filter(t => !t.name.includes('.'));
    
    // 2. Discover all attached aliases from attachedFiles + any table with dot
    const aliasMap = new Map<string, { alias: string; name: string; tables: TableInfo[] }>();
    
    // Seed from attachedFiles
    attachedFiles.forEach(af => {
      aliasMap.set(af.alias, { alias: af.alias, name: af.name, tables: [] });
    });

    // Populate tables
    tables.forEach(t => {
      if (t.name.includes('.')) {
        const [alias, ...rest] = t.name.split('.');
        const tableName = rest.join('.');
        if (!aliasMap.has(alias)) {
          aliasMap.set(alias, { alias, name: `${alias}.sqlite`, tables: [] });
        }
        aliasMap.get(alias)!.tables.push(t);
      }
    });

    return {
      main: {
        alias: 'main',
        name: fileName || 'database.sqlite',
        tables: mainTables
      },
      attached: Array.from(aliasMap.values())
    };
  }, [tables, attachedFiles, fileName]);

  // Filtered tables
  const matchesFilter = (name: string) => {
    if (!filterQuery.trim()) return true;
    return name.toLowerCase().includes(filterQuery.toLowerCase().trim());
  };

  const filteredMainTables = useMemo(() => {
    return groupedDatabases.main.tables.filter(t => matchesFilter(t.name));
  }, [groupedDatabases.main.tables, filterQuery]);

  const filteredAttachedDbs = useMemo(() => {
    return groupedDatabases.attached.map(db => ({
      ...db,
      filteredTables: db.tables.filter(t => matchesFilter(t.name) || matchesFilter(db.alias) || matchesFilter(db.name))
    })).filter(db => db.filteredTables.length > 0 || matchesFilter(db.alias) || matchesFilter(db.name));
  }, [groupedDatabases.attached, filterQuery]);

  const totalFilteredTablesCount = filteredMainTables.length + 
    filteredAttachedDbs.reduce((acc, db) => acc + db.filteredTables.length, 0);

  // Quick SQL templates
  const quickSqlList = useMemo(() => {
    const list: { label: string; sql: string }[] = [];
    if (activeTable) {
      list.push({
        label: `SELECT * FROM ${activeTable} LIMIT 50`,
        sql: `SELECT * FROM "${activeTable}" LIMIT 50;`
      });
      list.push({
        label: `COUNT(*) IN ${activeTable}`,
        sql: `SELECT count(*) AS total_rows FROM "${activeTable}";`
      });
    } else if (tables.length > 0) {
      const firstTab = tables[0].name;
      list.push({
        label: `SELECT * FROM ${firstTab} LIMIT 50`,
        sql: `SELECT * FROM "${firstTab}" LIMIT 50;`
      });
    }

    if (groupedDatabases.attached.length > 0 && groupedDatabases.main.tables.length > 0) {
      const mainT = groupedDatabases.main.tables[0]?.name;
      const attDb = groupedDatabases.attached[0];
      const attT = attDb.tables[0]?.name;
      if (mainT && attT) {
        list.push({
          label: `CROSS JOIN ${mainT} & ${attT}`,
          sql: `-- Cross-database join query example\nSELECT * FROM "${mainT}"\nJOIN "${attT}"\nLIMIT 20;`
        });
      }
    }

    list.push({
      label: 'PRAGMA database_list',
      sql: 'PRAGMA database_list;'
    });

    return list;
  }, [activeTable, tables, groupedDatabases]);

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDbSize = (alias: string) => {
    const stat = databaseStats.find(s => s.alias === alias);
    return stat && stat.sizeBytes > 0 ? formatBytes(stat.sizeBytes) : '';
  };

  return (
    <>
      {/* Hidden file pickers */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        accept=".sqlite,.db,.sqlite3" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={attachFileInputRef} 
        onChange={handleAttachFileChange} 
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        accept=".sqlite,.db,.sqlite3" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={directoryInputRef} 
        onChange={handleDirectoryChange} 
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        className="hidden" 
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
      />
      <input 
        type="file" 
        ref={multiFileInputRef} 
        onChange={handleMultiFileChange} 
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        multiple 
        accept=".sqlite,.db,.sqlite3"
        className="hidden" 
      />

      {/* Main Container: Activity Bar (Left 48px) + Primary Explorer Sidebar (260-280px) */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* ============================================================== */}
        {/* VS CODE ACTIVITY BAR (Thin icon dock, width 48px)              */}
        {/* ============================================================== */}
        <aside className="w-12 bg-slate-950 border-r border-slate-800 flex flex-col justify-between items-center py-3 select-none shrink-0 z-10">
          {/* Top Activity Icons */}
          <div className="flex flex-col items-center gap-2 w-full">
            {/* Logo / Brand Icon */}
            <button 
              onClick={() => {
                if (isFileLoaded) onCloseFile();
              }}
              title={isFileLoaded ? t.closeConnection : t.home}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20 mb-2 hover:scale-105 active:scale-95 transition-transform"
            >
              <Database size={18} className="text-white drop-shadow" />
            </button>

            {/* Explorer (Files & Tables tree) */}
            <button
              onClick={() => onViewChange('BROWSE')}
              title={t.explorer}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors group ${
                currentView === 'BROWSE'
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {currentView === 'BROWSE' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-500 rounded-r" />
              )}
              <FolderTree size={20} />
            </button>

            {/* SQL Editor / Terminal */}
            <button
              onClick={() => onViewChange('SQL')}
              title={t.sqlEditor}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors group ${
                currentView === 'SQL'
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {currentView === 'SQL' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-500 rounded-r" />
              )}
              <Terminal size={20} />
            </button>

            {/* AI Assistant */}
            <button
              onClick={() => onViewChange('AI')}
              title={t.aiAssistant}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors group ${
                currentView === 'AI'
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {currentView === 'AI' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-purple-500 rounded-r" />
              )}
              <Sparkles size={20} />
            </button>

            {/* Query Examples */}
            <button
              onClick={() => onViewChange('EXAMPLES')}
              title={t.queryExamples}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors group ${
                currentView === 'EXAMPLES'
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {currentView === 'EXAMPLES' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-cyan-500 rounded-r" />
              )}
              <BookOpen size={20} />
            </button>
          </div>

          {/* Bottom Activity Icons */}
          <div className="flex flex-col items-center gap-2 w-full pt-2 border-t border-slate-800/60">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
              title={lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors text-[11px] font-bold"
            >
              {lang === 'ja' ? 'JP' : 'EN'}
            </button>

            {/* Theme Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={theme === 'dark' ? t.switchLight : t.switchDark}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
              >
                {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
              </button>
            )}

            {/* License & Terms */}
            {onOpenLicense && (
              <button
                onClick={onOpenLicense}
                title={t.licenseAndTerms}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-900 transition-colors"
              >
                <Scale size={18} />
              </button>
            )}
          </div>
        </aside>

        {/* ============================================================== */}
        {/* VS CODE PRIMARY SIDEBAR (Explorer Panel, width 270px)         */}
        {/* ============================================================== */}
        <section className="w-64 sm:w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden text-slate-300 font-sans select-none">
          {/* Panel Header */}
          <div className="h-11 px-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <span>{t.explorer}</span>
              {isFileLoaded && (
                <span className="text-[10px] font-normal px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full border border-slate-700/60">
                  {1 + attachedFiles.length} DB
                </span>
              )}
            </span>

            {/* Header Action Toolbar (VS Code Style Icons) */}
            <div className="flex items-center gap-0.5 text-slate-400">
              {/* Attach Database (+) */}
              {isFileLoaded && onAttachFile && (
                <button
                  onClick={() => attachFileInputRef.current?.click()}
                  title={t.addDatabase}
                  className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
                >
                  <Plus size={16} />
                </button>
              )}

              {/* Open Folder */}
              <button
                onClick={() => directoryInputRef.current?.click()}
                title={t.openFolder}
                className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <FolderOpen size={15} />
              </button>

              {/* New In-Memory Database */}
              <button
                onClick={onCreateNew}
                title={t.createNew}
                className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <FilePlus size={15} />
              </button>

              {/* Refresh Tables */}
              {isFileLoaded && onRefreshTables && (
                <button
                  onClick={onRefreshTables}
                  title="Refresh"
                  className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              )}

              {/* Close Sidebar (Mobile only) */}
              <button
                onClick={onClose}
                className="md:hidden p-1 hover:text-white hover:bg-slate-800 rounded transition-colors ml-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Search Filter Box (VS Code Explorer filter) */}
          {isFileLoaded && tables.length > 0 && (
            <div className="p-2 border-b border-slate-800/80 bg-slate-950/30">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder={t.filterTablesPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    className="absolute right-2 text-slate-500 hover:text-slate-300"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Tree Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 py-1 text-xs">
            
            {/* If no file is loaded: Empty / Quick Action State */}
            {!isFileLoaded && (
              <div className="p-4 space-y-3 text-slate-400">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t.fileOperations}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium bg-slate-800/60 hover:bg-slate-800 hover:text-white rounded border border-slate-700/50 text-slate-300 transition-colors text-left"
                >
                  <FolderOpen size={15} className="text-blue-400 shrink-0" />
                  <span>{t.openFileBtn}</span>
                </button>

                <button
                  onClick={() => directoryInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium bg-slate-800/60 hover:bg-slate-800 hover:text-white rounded border border-slate-700/50 text-slate-300 transition-colors text-left"
                >
                  <Folders size={15} className="text-amber-400 shrink-0" />
                  <span>{t.openFolderBtn}</span>
                </button>

                <button
                  onClick={() => multiFileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-amber-500/90 hover:text-amber-400 hover:bg-slate-800/40 rounded transition-colors text-left pl-7"
                >
                  <span>{t.selectMultiFallback}</span>
                </button>

                <button
                  onClick={onCreateNew}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium bg-slate-800/60 hover:bg-slate-800 hover:text-white rounded border border-slate-700/50 text-slate-300 transition-colors text-left"
                >
                  <FilePlus size={15} className="text-emerald-400 shrink-0" />
                  <span>{t.createNew}</span>
                </button>
              </div>
            )}

            {/* When File is Loaded: Section 1: OPEN DATABASES TREE */}
            {isFileLoaded && (
              <div>
                {/* Section Accordion Header */}
                <div 
                  onClick={() => setIsDatabasesOpen(!isDatabasesOpen)}
                  className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/40 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {isDatabasesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{t.openDatabases}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {1 + attachedFiles.length}
                  </span>
                </div>

                {isDatabasesOpen && (
                  <div className="pb-1">
                    {/* ----------------- PRIMARY / MAIN DATABASE ----------------- */}
                    <div className="border-l-2 border-transparent">
                      {/* Database Folder Item */}
                      <div 
                        onClick={() => toggleDbCollapse('main')}
                        className="group flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-800/60 cursor-pointer text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {collapsedDbs['main'] ? (
                            <ChevronRight size={13} className="text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown size={13} className="text-slate-500 shrink-0" />
                          )}
                          <div className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <Database size={11} />
                          </div>
                          <span className="font-semibold text-xs truncate" title={groupedDatabases.main.name}>
                            {groupedDatabases.main.name}
                          </span>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/40 uppercase">
                            main
                          </span>
                        </div>

                        {/* Database Actions on Hover */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {getDbSize('main') && (
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                              {getDbSize('main')}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {filteredMainTables.length}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onExportDatabase) {
                                onExportDatabase('main');
                              } else {
                                onDownloadFile();
                              }
                            }}
                            title={t.downloadFile}
                            className="p-1 text-slate-400 hover:text-purple-300 hover:bg-slate-700/60 rounded"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Tables inside Main DB */}
                      {!collapsedDbs['main'] && (
                        <div className="pl-6 pr-1 space-y-0.5 py-0.5">
                          {filteredMainTables.map((table) => {
                            const isSelected = currentView === 'BROWSE' && activeTable === table.name;
                            return (
                              <div
                                key={table.name}
                                className={`group flex items-center justify-between px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600/25 text-indigo-200 font-medium border-l-2 border-indigo-500'
                                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                }`}
                                onClick={() => onSelectTable(table.name)}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <TableIcon size={13} className={isSelected ? 'text-indigo-400 shrink-0' : 'text-slate-500 shrink-0'} />
                                  <span className="truncate">{table.name}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {onOpenCopyTableModal && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenCopyTableModal(table.name);
                                      }}
                                      title={t.copyTable}
                                      className="p-1 text-slate-500 hover:text-indigo-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteTable(table.name);
                                    }}
                                    title={t.deleteTable}
                                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {filteredMainTables.length === 0 && (
                            <div className="px-2 py-1 text-[11px] text-slate-500 italic">
                              {filterQuery ? t.noTables : t.noTables}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ----------------- ATTACHED DATABASES ----------------- */}
                    {filteredAttachedDbs.map((attDb) => {
                      const isCollapsed = collapsedDbs[attDb.alias];
                      return (
                        <div key={attDb.alias} className="border-l-2 border-transparent mt-0.5">
                          <div
                            onClick={() => toggleDbCollapse(attDb.alias)}
                            className="group flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-800/60 cursor-pointer text-slate-200 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {isCollapsed ? (
                                <ChevronRight size={13} className="text-slate-500 shrink-0" />
                              ) : (
                                <ChevronDown size={13} className="text-slate-500 shrink-0" />
                              )}
                              <div className="w-4 h-4 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                <Database size={11} />
                              </div>
                              <span className="font-semibold text-xs truncate" title={attDb.name}>
                                {attDb.alias}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-900/50 text-purple-300 border border-purple-700/40">
                                {attDb.name !== attDb.alias ? attDb.name : t.attachedDatabase}
                              </span>
                            </div>

                            {/* Actions on Attached DB */}
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              {getDbSize(attDb.alias) && (
                                <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                                  {getDbSize(attDb.alias)}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500">
                                {attDb.filteredTables.length}
                              </span>
                              {onExportDatabase && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onExportDatabase(attDb.alias);
                                  }}
                                  title={`${t.exportThisDb} (${attDb.alias})`}
                                  className="p-1 text-slate-400 hover:text-purple-300 hover:bg-slate-700/60 rounded"
                                >
                                  <Download size={12} />
                                </button>
                              )}
                              {onMakePrimary && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMakePrimary(attDb.alias);
                                  }}
                                  title={`${t.makePrimary} (${attDb.alias})`}
                                  className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-700/60 rounded"
                                >
                                  <ArrowUpCircle size={12} />
                                </button>
                              )}
                              {onDetachDatabase && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDetachDatabase(attDb.alias);
                                  }}
                                  title={`${t.detachDatabase} (${attDb.alias})`}
                                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700/60 rounded"
                                >
                                  <Unplug size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Tables in Attached DB */}
                          {!isCollapsed && (
                            <div className="pl-6 pr-1 space-y-0.5 py-0.5">
                              {attDb.filteredTables.map((table) => {
                                const isSelected = currentView === 'BROWSE' && activeTable === table.name;
                                const shortName = table.name.startsWith(`${attDb.alias}.`) 
                                  ? table.name.slice(attDb.alias.length + 1)
                                  : table.name;

                                return (
                                  <div
                                    key={table.name}
                                    className={`group flex items-center justify-between px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-600/25 text-purple-200 font-medium border-l-2 border-purple-500'
                                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                                    }`}
                                    onClick={() => onSelectTable(table.name)}
                                    title={table.name}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <TableIcon size={13} className={isSelected ? 'text-purple-400 shrink-0' : 'text-slate-500 shrink-0'} />
                                      <span className="truncate">{shortName}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      {onOpenCopyTableModal && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenCopyTableModal(table.name);
                                          }}
                                          title={t.copyTable}
                                          className="p-1 text-slate-500 hover:text-indigo-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteTable(table.name);
                                        }}
                                        title={t.deleteTable}
                                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {attDb.filteredTables.length === 0 && (
                                <div className="px-2 py-1 text-[11px] text-slate-500 italic">
                                  {t.noTables}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Button to attach another database directly */}
                    <div className="px-3 pt-2 flex flex-col gap-1.5">
                      {onAttachFile && (
                        <button
                          onClick={() => attachFileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded border border-dashed border-slate-700/60 transition-colors"
                        >
                          <Plus size={13} />
                          <span>{t.addDatabase}</span>
                        </button>
                      )}
                      {onCreateEmptyAttachedDb && (
                        <button
                          onClick={onCreateEmptyAttachedDb}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded border border-dashed border-slate-700/40 transition-colors"
                        >
                          <FilePlus2 size={12} className="text-emerald-400" />
                          <span>{t.newEmptyAttachedDb}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* When File is Loaded: Section 2: ALL TABLES FLAT LIST */}
            {isFileLoaded && (
              <div>
                <div 
                  onClick={() => setIsAllTablesOpen(!isAllTablesOpen)}
                  className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/40 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {isAllTablesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{t.allTables}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {totalFilteredTablesCount}
                  </span>
                </div>

                {isAllTablesOpen && (
                  <div className="px-1 py-1 space-y-0.5">
                    {tables
                      .filter(t => matchesFilter(t.name))
                      .map((table) => {
                        const isSelected = currentView === 'BROWSE' && activeTable === table.name;
                        const isAttached = table.name.includes('.');
                        return (
                          <div
                            key={table.name}
                            className={`group flex items-center justify-between px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600/25 text-indigo-200 font-medium border-l-2 border-indigo-500'
                                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                            }`}
                            onClick={() => onSelectTable(table.name)}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <TableIcon size={13} className={isSelected ? 'text-indigo-400 shrink-0' : 'text-slate-500 shrink-0'} />
                              <span className="truncate">{table.name}</span>
                            </div>
                            {isAttached && (
                              <span className="text-[9px] font-mono px-1 text-slate-500">
                                {table.name.split('.')[0]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    {tables.length === 0 && (
                      <div className="px-3 py-1 text-xs text-slate-500 italic">{t.noTables}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* When File is Loaded: Section 3: QUICK SQL SNIPPETS */}
            {isFileLoaded && onRunQuickSql && (
              <div>
                <div 
                  onClick={() => setIsSnippetsOpen(!isSnippetsOpen)}
                  className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/40 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {isSnippetsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{t.quickSnippets}</span>
                  </div>
                  <FileCode size={13} className="text-slate-500" />
                </div>

                {isSnippetsOpen && (
                  <div className="px-2 py-1 space-y-1">
                    {quickSqlList.map((snip, idx) => (
                      <button
                        key={idx}
                        onClick={() => onRunQuickSql(snip.sql)}
                        className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-mono text-left bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 rounded border border-slate-800 transition-colors group"
                      >
                        <span className="truncate">{snip.label}</span>
                        <Terminal size={12} className="text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel Footer: VS Code Status Bar info */}
          <div className="h-10 px-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            {isFileLoaded ? (
              <>
                <div className="flex items-center gap-2 truncate">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="truncate text-slate-400 font-medium" title={fileName || 'SQLite'}>
                    {fileName}
                  </span>
                </div>
                <button
                  onClick={onCloseFile}
                  title={t.closeConnection}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors shrink-0"
                >
                  <LogOut size={13} />
                </button>
              </>
            ) : (
              <span className="italic">{t.appName}</span>
            )}
          </div>
        </section>
      </div>
    </>
  );
};
