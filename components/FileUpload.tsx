import React, { useRef, useState } from 'react';
import { Upload, FilePlus, ChevronDown, ChevronUp, Shield, Zap, Globe, Folders, HelpCircle, FileCheck2, RefreshCw, Scale, ExternalLink, Layers, Sparkles } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
  onCreateNew: () => void;
  onFolderLoaded: (files: File[]) => void;
  onLoadSampleMultiDb?: () => void;
  onOpenLicense?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, onCreateNew, onFolderLoaded, onLoadSampleMultiDb, onOpenLicense }) => {
  const { lang, t, currentHostname } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileLoaded(file);
      event.target.value = '';
    }
  };

  const handleDirectoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFolderLoaded(files);
      event.target.value = '';
    }
  };

  const handleMultiFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFolderLoaded(files);
      event.target.value = '';
    }
  };

  // Helper to recursively traverse Directory Entries under Drag and Drop
  const traverseFileTree = async (item: any): Promise<File[]> => {
    return new Promise((resolve) => {
      const files: File[] = [];
      if (item.isFile) {
        item.file((file: File) => {
          files.push(file);
          resolve(files);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const readAllEntries = (): Promise<any[]> => {
          return new Promise((resolveEntries) => {
            const allEntries: any[] = [];
            const readEntries = () => {
              dirReader.readEntries((entries: any[]) => {
                if (entries.length === 0) {
                  resolveEntries(allEntries);
                } else {
                  allEntries.push(...entries);
                  readEntries();
                }
              }, () => {
                resolveEntries(allEntries); // fallback on error
              });
            };
            readEntries();
          });
        };

        readAllEntries().then(async (entries) => {
          const promises = entries.map(entry => traverseFileTree(entry));
          const subFilesResults = await Promise.all(promises);
          subFilesResults.forEach(subFiles => {
            files.push(...subFiles);
          });
          resolve(files);
        });
      } else {
        resolve(files);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const fileTasks: Promise<File[]>[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          // Check for folder dropped in Chrome/Webpack
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            fileTasks.push(traverseFileTree(entry));
          } else {
            const file = item.getAsFile();
            if (file) fileTasks.push(Promise.resolve([file]));
          }
        }
      }

      const results = await Promise.all(fileTasks);
      const allFiles = results.flat();
      if (allFiles.length > 0) {
        // If single file with .sqlite/.db loading, let's load it as single db or folders
        const sqliteFiles = allFiles.filter(f => f.name.match(/\.(sqlite|db|sqlite3)$/i));
        if (sqliteFiles.length === 1 && allFiles.length === 1) {
          onFileLoaded(sqliteFiles[0]);
        } else {
          onFolderLoaded(allFiles);
        }
      }
    } else {
      // Fallback
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        if (files.length === 1) {
          onFileLoaded(files[0]);
        } else {
          onFolderLoaded(files);
        }
      }
    }
  };

  return (
    <div 
      className={`flex flex-col items-center w-full h-full p-4 md:p-8 text-center animate-in fade-in duration-500 overflow-y-auto transition-colors ${
        isDragging ? 'bg-indigo-950/20 border-2 border-dashed border-indigo-500' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl w-full flex flex-col items-center py-10 my-auto">
        {isDragging ? (
          <div className="flex flex-col items-center justify-center p-12 pointer-events-none">
            <div className="p-6 rounded-full bg-indigo-500/15 text-indigo-400 mb-4 animate-bounce">
              <Upload size={48} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {lang === 'ja' ? 'ここにファイルをドロップして読み込み' : 'Drop files here to load'}
            </h3>
            <p className="text-slate-400 text-sm">
              {lang === 'ja' ? '複数ファイルやフォルダごと投げ込めます（自動結合）' : 'Supports folders & multiple files (auto-merge)'}
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-white tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              {t.uploadTitle}
            </h1>
            <p className="text-indigo-400 font-medium text-xs md:text-sm mb-3">
              {lang === 'ja'
                ? 'ブラウザで動く高速SQLiteエディタ・ビューア / オンライン SQLite Studio'
                : 'Online SQLite Studio & In-Browser Database Editor (WASM)'}
            </p>
            <p className="text-slate-400 mb-5 max-w-xl mx-auto text-xs md:text-sm leading-relaxed">
              {t.uploadSubtitle}
            </p>

            {/* Keyword intent tags (SEO & user clarity) */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-2xl mb-6 text-[10px] sm:text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                sqlite on web
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                sqlite studio
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                sqlite web editor
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                sqlite online
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                multi-database (ATTACH)
              </span>
            </div>

            {/* Instant Demo Banner */}
            {onLoadSampleMultiDb && (
              <div className="w-full max-w-3xl mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-xl hover:border-indigo-400/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                    <Layers size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{t.trySampleMultiDb}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {lang === 'ja' ? '即時体験' : 'Instant Demo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {t.trySampleMultiDbSub}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onLoadSampleMultiDb}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/30 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>{lang === 'ja' ? 'サンプルDBを開く' : 'Open Sample DBs'}</span>
                </button>
              </div>
            )}

            {/* Drag & Drop Hint Overlay banner */}
            <div className="mb-6 px-4 py-2 border border-slate-700 bg-slate-800/40 rounded-full text-xs text-slate-300 flex items-center gap-2 max-w-md pointer-events-none">
              <FileCheck2 size={14} className="text-indigo-400" />
              <span>{t.dragDropSupport}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-8">
              {/* File Open */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-blue-500 hover:bg-slate-800/80 transition-all duration-300 shadow-xl"
              >
                <div className="p-4 rounded-full bg-slate-900 group-hover:bg-blue-900/30 text-blue-400 transition-colors shadow-inner">
                  <Upload size={28} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white mb-1">{t.openFileBtn}</div>
                  <div className="text-xs text-slate-500">.sqlite, .db, .sqlite3</div>
                </div>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                accept=".sqlite,.db,.sqlite3" 
                className="hidden" 
              />

              {/* Folder Open */}
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => directoryInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-amber-500 hover:bg-slate-800/80 transition-all duration-300 shadow-xl flex-1"
                >
                  <div className="p-4 rounded-full bg-slate-900 group-hover:bg-amber-900/30 text-amber-500 transition-colors shadow-inner">
                    <Folders size={28} />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-white mb-1">{t.openFolderBtn}</div>
                    <div className="text-xs text-slate-500">{t.batchLoadLabel}</div>
                  </div>
                </button>
                <input 
                  type="file" 
                  ref={directoryInputRef} 
                  onChange={handleDirectoryChange} 
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  className="hidden" 
                  {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                />
                
                {/* Fallback button to choose multiple files manually */}
                <button
                  onClick={() => multiFileInputRef.current?.click()}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline bg-slate-800/40 border border-slate-700 py-1 px-2.5 rounded-lg font-medium transition-colors"
                >
                  {t.selectMultiFallback}
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
              </div>

              {/* Create New */}
              <button 
                onClick={onCreateNew}
                className="group flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-green-500 hover:bg-slate-800/80 transition-all duration-300 shadow-xl"
              >
                <div className="p-4 rounded-full bg-slate-900 group-hover:bg-green-900/30 text-green-400 transition-colors shadow-inner">
                  <FilePlus size={28} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white mb-1">{t.createNewBtn}</div>
                  <div className="text-xs text-slate-500">{t.createEmptyDb}</div>
                </div>
              </button>
            </div>

            {/* Help & Troubleshooting */}
            <div className="w-full max-w-lg mb-4">
              <button 
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-300 py-1.5 px-3 rounded-lg mx-auto bg-slate-800/20 hover:bg-slate-800/40 transition-colors"
              >
                <HelpCircle size={14} className="text-amber-400" />
                <span>{t.troubleshootingTitle}</span>
              </button>
              
              {showTroubleshoot && (
                <div className="mt-2.5 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs text-slate-400 leading-relaxed shadow-lg">
                  <ul className="list-disc list-inside space-y-2 font-sans">
                    <li>
                      <strong className="text-slate-200">{t.method1Title}</strong>
                      <div className="pl-4 mt-0.5">
                        {t.method1Desc}
                      </div>
                    </li>
                    <li>
                      <strong className="text-slate-200">{t.method2Title}</strong>
                      <div className="pl-4 mt-0.5">
                        {t.method2Desc}
                      </div>
                    </li>
                    <li>
                      <strong className="text-slate-200">{t.method3Title}</strong>
                      <div className="pl-4 mt-0.5">
                        {t.method3Desc}
                      </div>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="max-w-lg w-full mt-2">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors group"
              >
                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Globe size={16} className="text-blue-400" />
                  {t.aboutTitle}
                </span>
                {isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
              </button>

              {isExpanded && (
                <div className="mt-2 p-6 rounded-xl bg-slate-800/20 border border-slate-700/30 text-left animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="mt-1 text-blue-400"><Globe size={18} /></div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">{t.feature1Title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.feature1Desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 text-green-400"><Shield size={18} /></div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">{t.feature2Title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.feature2Desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 text-purple-400"><Zap size={18} /></div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">{t.feature3Title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.feature3Desc}
                        </p>
                      </div>
                    </div>

                    {/* Terms & License Section in About */}
                    <div className="flex gap-3 pt-3 border-t border-slate-700/40">
                      <div className="mt-1 text-indigo-400"><Scale size={18} /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white">{t.licenseAndTerms}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-medium">
                            UKPR-S &amp; Ys-tecks
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-2">
                          {lang === 'ja'
                            ? '個人利用・商用利用無料。生成物の権利は利用者に帰属します。使用ライブラリ（React, SQL.js, Lucide等）はすべて寛容なパーミッシブライセンス（MIT/ISC/Apache 2.0）です。'
                            : 'Free for personal and commercial use. Generated output belongs to the user. All dependencies use permissive open-source licenses (MIT/ISC/Apache 2.0).'}
                        </p>
                        {onOpenLicense && (
                          <button
                            type="button"
                            onClick={onOpenLicense}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                          >
                            <span>{t.openLicenses}</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEO FAQ Section */}
            <div className="w-full max-w-lg mt-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5 px-1">
                <HelpCircle size={14} className="text-indigo-400" />
                <span>{t.faqTitle}</span>
              </h3>
              <div className="space-y-1.5">
                <details className="group rounded-xl bg-slate-800/30 border border-slate-700/40 p-3 text-xs text-slate-300 transition-colors">
                  <summary className="font-semibold text-slate-200 cursor-pointer list-none flex items-center justify-between gap-2">
                    <span>{t.faq1Q}</span>
                    <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                  </summary>
                  <p className="mt-2 text-slate-400 leading-relaxed text-[11px]">
                    {t.faq1A}
                  </p>
                </details>
                <details className="group rounded-xl bg-slate-800/30 border border-slate-700/40 p-3 text-xs text-slate-300 transition-colors">
                  <summary className="font-semibold text-slate-200 cursor-pointer list-none flex items-center justify-between gap-2">
                    <span>{t.faq2Q}</span>
                    <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                  </summary>
                  <p className="mt-2 text-slate-400 leading-relaxed text-[11px]">
                    {t.faq2A}
                  </p>
                </details>
                <details className="group rounded-xl bg-slate-800/30 border border-slate-700/40 p-3 text-xs text-slate-300 transition-colors">
                  <summary className="font-semibold text-slate-200 cursor-pointer list-none flex items-center justify-between gap-2">
                    <span>{t.faq3Q}</span>
                    <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                  </summary>
                  <p className="mt-2 text-slate-400 leading-relaxed text-[11px]">
                    {t.faq3A}
                  </p>
                </details>
                <details className="group rounded-xl bg-slate-800/30 border border-slate-700/40 p-3 text-xs text-slate-300 transition-colors">
                  <summary className="font-semibold text-slate-200 cursor-pointer list-none flex items-center justify-between gap-2">
                    <span>{t.faq4Q}</span>
                    <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                  </summary>
                  <p className="mt-2 text-slate-400 leading-relaxed text-[11px]">
                    {t.faq4A}
                  </p>
                </details>
              </div>
            </div>

            {/* Home Screen Footer: Licenses & Multi-domain links */}
            <div className="w-full max-w-lg mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>&copy; UKPR-S &amp; Ys-tecks</span>
                <span>•</span>
                {onOpenLicense && (
                  <button 
                    onClick={onOpenLicense} 
                    className="hover:text-indigo-400 underline underline-offset-2 transition-colors flex items-center gap-1"
                  >
                    <Scale size={12} />
                    <span>{t.licenseAndTerms}</span>
                  </button>
                )}
              </div>

              {/* Language Domain Switchers */}
              <div className="flex items-center gap-3 text-[11px]">
                <a
                  href="https://sqlite-ja.y-s.dev"
                  target="_top"
                  rel="alternate"
                  hrefLang="ja"
                  className={`hover:text-slate-300 transition-colors flex items-center gap-1 ${
                    currentHostname === 'sqlite-ja.y-s.dev' || (lang === 'ja' && !currentHostname.includes('sqlite.y-s.dev'))
                      ? 'text-indigo-400 font-semibold'
                      : 'text-slate-400'
                  }`}
                  title={lang === 'ja' ? '日本語専用ドメイン (sqlite-ja.y-s.dev) へ移動' : 'Navigate to Japanese site (sqlite-ja.y-s.dev)'}
                >
                  <Globe size={11} />
                  <span>sqlite-ja.y-s.dev (JA)</span>
                </a>
                <span>|</span>
                <a
                  href="https://sqlite.y-s.dev"
                  target="_top"
                  rel="alternate"
                  hrefLang="en"
                  className={`hover:text-slate-300 transition-colors flex items-center gap-1 ${
                    currentHostname === 'sqlite.y-s.dev' || (lang === 'en' && !currentHostname.includes('sqlite-ja.y-s.dev'))
                      ? 'text-indigo-400 font-semibold'
                      : 'text-slate-400'
                  }`}
                  title={lang === 'ja' ? '英語版グローバルドメイン (sqlite.y-s.dev) へ移動' : 'Navigate to English / Global site (sqlite.y-s.dev)'}
                >
                  <Globe size={11} />
                  <span>sqlite.y-s.dev (EN)</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};