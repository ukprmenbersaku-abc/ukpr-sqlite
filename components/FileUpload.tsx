import React, { useRef } from 'react';
import { Upload, Database } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
  onCreateNew: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, onCreateNew }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileLoaded(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 text-center bg-slate-900">
      <div className="bg-slate-800 p-6 md:p-10 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full">
        <div className="mb-6 flex justify-center text-blue-400">
          <Database size={48} className="md:w-16 md:h-16" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Smart SQLite Studio</h1>
        <p className="text-slate-400 mb-6 md:mb-8 text-sm md:text-base">
          SQLiteファイルをドラッグ＆ドロップ、または選択してください。
          <br />サーバーには送信されません。
        </p>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 hover:border-blue-500 hover:bg-slate-700/50 transition-all rounded-xl p-6 md:p-8 cursor-pointer group"
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className="text-slate-500 group-hover:text-blue-400 transition-colors" size={32} />
            <span className="text-sm font-medium text-slate-300">ファイルを選択 (.sqlite, .db)</span>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".sqlite,.db,.sqlite3" 
            className="hidden" 
          />
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <button 
            onClick={onCreateNew}
            className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-4"
          >
            または空のデータベースを作成
          </button>
        </div>
      </div>
    </div>
  );
};