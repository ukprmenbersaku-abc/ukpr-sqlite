import React, { useRef, useState } from 'react';
import { Upload, FilePlus, ChevronDown, ChevronUp, Shield, Zap, Globe, Folders, HelpCircle, FileCheck2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
  onCreateNew: () => void;
  onFolderLoaded: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, onCreateNew, onFolderLoaded }) => {
  const { lang, t } = useLanguage();
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
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white tracking-tight">
              {t.uploadTitle}
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              {t.uploadSubtitle}
            </p>

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
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};