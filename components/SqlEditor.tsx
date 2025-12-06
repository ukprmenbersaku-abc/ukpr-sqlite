import React, { useState } from 'react';
import { Play, AlertCircle } from 'lucide-react';

interface SqlEditorProps {
  initialSql?: string;
  onExecute: (sql: string) => void;
  error?: string | null;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({ initialSql = '', onExecute, error }) => {
  const [sql, setSql] = useState(initialSql);

  // Update local state if initialSql changes (e.g. from AI)
  React.useEffect(() => {
    setSql(initialSql);
  }, [initialSql]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-b border-slate-700">
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400 ml-2">SQL Query</span>
        <button
          onClick={() => onExecute(sql)}
          className="flex items-center gap-2 px-3 md:px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded shadow-sm transition-colors"
        >
          <Play size={16} />
          <span className="hidden xs:inline">実行</span>
        </button>
      </div>
      <div className="flex-1 relative min-h-[150px]">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="w-full h-full p-3 md:p-4 bg-slate-900 text-slate-200 font-mono text-sm resize-none focus:outline-none"
          placeholder="SELECT * FROM table_name..."
          spellCheck={false}
        />
      </div>
      {error && (
        <div className="p-3 bg-red-900/30 border-t border-red-900 text-red-200 text-xs md:text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="font-mono break-all">{error}</span>
        </div>
      )}
    </div>
  );
};