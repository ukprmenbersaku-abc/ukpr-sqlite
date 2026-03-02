import React, { useRef, useState } from 'react';
import { Upload, FilePlus, ChevronDown, ChevronUp, Shield, Zap, Globe } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
  onCreateNew: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, onCreateNew }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileLoaded(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 text-center animate-in fade-in duration-500 overflow-y-auto">
      <div className="max-w-2xl w-full flex flex-col items-center py-10">
        
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white tracking-tight">
          Web SQLite Studio
        </h2>
        <p className="text-slate-400 mb-10 max-w-md mx-auto text-sm md:text-base leading-relaxed">
          SQLiteファイルを選択して中身を確認・編集するか、<br/>
          新しいデータベースを作成して作業を開始しましょう。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg mb-12">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-blue-500 hover:bg-slate-800/80 transition-all duration-300 shadow-xl"
          >
            <div className="p-4 rounded-full bg-slate-900 group-hover:bg-blue-900/30 text-blue-400 transition-colors shadow-inner">
              <Upload size={32} />
            </div>
            <div className="text-center">
              <div className="font-semibold text-white mb-1">ファイルを開く</div>
              <div className="text-xs text-slate-500">.sqlite, .db, .sqlite3</div>
            </div>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".sqlite,.db,.sqlite3" 
            className="hidden" 
          />

          <button 
            onClick={onCreateNew}
            className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-green-500 hover:bg-slate-800/80 transition-all duration-300 shadow-xl"
          >
             <div className="p-4 rounded-full bg-slate-900 group-hover:bg-green-900/30 text-green-400 transition-colors shadow-inner">
              <FilePlus size={32} />
            </div>
            <div className="text-center">
              <div className="font-semibold text-white mb-1">新規作成</div>
              <div className="text-xs text-slate-500">空のデータベースを作成</div>
            </div>
          </button>
        </div>

        <div className="max-w-lg w-full">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors group"
          >
            <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Globe size={16} className="text-blue-400" />
              Web SQLite Studio について
            </span>
            {isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
          </button>

          {isExpanded && (
            <div className="mt-2 p-6 rounded-xl bg-slate-800/20 border border-slate-700/30 text-left animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-1 text-blue-400"><Globe size={18} /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">インストール不要</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      ブラウザだけで動作するため、ソフトウェアのインストールは一切不要です。どこからでもすぐにSQLiteファイルを操作できます。
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 text-green-400"><Shield size={18} /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">高い安全性</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      読み込んだデータはサーバーに送信されず、すべてお使いのブラウザ内でローカルに処理されます。プライバシーとセキュリティを確保します。
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 text-purple-400"><Zap size={18} /></div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">AI アシスタント</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Gemini AIを活用し、自然言語でやりたいことを伝えるだけでSQLを自動生成。複雑なクエリも簡単に行えます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};