import React, { useRef } from 'react';
import { Upload, FilePlus } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 text-center animate-in fade-in duration-500">
      <div className="max-w-2xl w-full flex flex-col items-center">
        
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">ファイルが開かれていません</h2>
        <p className="text-slate-400 mb-10 max-w-md mx-auto text-sm md:text-base leading-relaxed">
          SQLiteファイルを選択して中身を確認・編集するか、<br/>
          新しいデータベースを作成して作業を開始しましょう。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-blue-500 hover:bg-slate-800/80 transition-all duration-300"
          >
            <div className="p-4 rounded-full bg-slate-900 group-hover:bg-blue-900/30 text-blue-400 transition-colors">
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
            className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-green-500 hover:bg-slate-800/80 transition-all duration-300"
          >
             <div className="p-4 rounded-full bg-slate-900 group-hover:bg-green-900/30 text-green-400 transition-colors">
              <FilePlus size={32} />
            </div>
            <div className="text-center">
              <div className="font-semibold text-white mb-1">新規作成</div>
              <div className="text-xs text-slate-500">空のデータベースを作成</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};