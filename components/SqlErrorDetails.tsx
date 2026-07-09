import React, { useState, useEffect } from 'react';
import { AlertCircle, Sparkles, HelpCircle, ArrowRight, Loader2, Key } from 'lucide-react';
import { repairSqlWithError } from '../services/geminiService.ts';
import { getDatabaseSchema } from '../services/sqliteService.ts';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface SqlErrorDetailsProps {
  error: string;
  badSql: string;
  onRepairSuccess: (repairedSql: string) => void;
}

export const SqlErrorDetails: React.FC<SqlErrorDetailsProps> = ({ 
  error, 
  badSql, 
  onRepairSuccess 
}) => {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [needsKey, setNeedsKey] = useState(false);
  const [inputKey, setInputKey] = useState('');

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || '';
    setApiKey(key);
  }, []);

  // Simple rule-based local quick analyzer
  const getFriendlyExplanation = () => {
    const err = error.toLowerCase();
    
    if (err.includes('no such table')) {
      const match = error.match(/no such table:\s*([\w.]+)/i);
      const tableName = match ? match[1] : '';
      return {
        title: t.friendlyErrorTableNotFoundTitle.replace('{tableName}', tableName),
        desc: t.friendlyErrorTableNotFoundDesc.replace('{tableName}', tableName),
        tip: t.friendlyErrorTableNotFoundTip
      };
    }
    
    if (err.includes('no such column')) {
      const match = error.match(/no such column:\s*([\w.]+)/i);
      const colName = match ? match[1] : '';
      return {
        title: t.friendlyErrorColumnNotFoundTitle.replace('{colName}', colName),
        desc: t.friendlyErrorColumnNotFoundDesc.replace('{colName}', colName),
        tip: t.friendlyErrorColumnNotFoundTip
      };
    }

    if (err.includes('syntax error') || err.includes('near')) {
      return {
        title: t.friendlyErrorSyntaxTitle,
        desc: t.friendlyErrorSyntaxDesc,
        tip: t.friendlyErrorSyntaxTip
      };
    }

    if (err.includes('ambiguous column name')) {
      const match = error.match(/ambiguous column name:\s*([\w.]+)/i);
      const colName = match ? match[1] : '';
      return {
        title: t.friendlyErrorAmbiguousTitle.replace('{colName}', colName),
        desc: t.friendlyErrorAmbiguousDesc.replace('{colName}', colName),
        tip: t.friendlyErrorAmbiguousTip.replace(/{colName}/g, colName)
      };
    }

    return {
      title: t.errorTitle,
      desc: error,
      tip: t.friendlyErrorDefaultTip
    };
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem('gemini_api_key', inputKey.trim());
      setApiKey(inputKey.trim());
      setNeedsKey(false);
      setRepairError(null);
    }
  };

  const handleRepair = async () => {
    const curKey = apiKey || localStorage.getItem('gemini_api_key') || '';
    if (!curKey) {
      setNeedsKey(true);
      return;
    }

    setLoading(true);
    setRepairError(null);

    try {
      const schema = await getDatabaseSchema();
      const repaired = await repairSqlWithError(curKey, schema, badSql, error);
      onRepairSuccess(repaired);
    } catch (err: any) {
      console.error(err);
      setRepairError(err.message || (lang === 'ja' ? 'AIによる修正処理中にエラーが発生しました' : 'An error occurred during the AI repair process'));
    } finally {
      setLoading(false);
    }
  };

  const expl = getFriendlyExplanation();

  return (
    <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 mt-2 animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-950/40 border border-red-800 text-red-400 rounded-lg shrink-0">
          <AlertCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-red-200 mb-1">{expl.title}</h4>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">{expl.desc}</p>
          
          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-3 text-xs mb-3">
            <div className="flex items-center gap-1.5 text-amber-400/90 font-medium mb-1.5">
              <HelpCircle size={14} />
              <span>{t.errorHintTitle}</span>
            </div>
            <p className="text-slate-400 leading-relaxed font-sans">{expl.tip}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRepair}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold shadow transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t.aiRepairing}</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{t.aiRepairBtn}</span>
                </>
              )}
            </button>
            
            <span className="text-[10px] text-slate-500 font-mono">
              {t.errorCode}: {error.split(':')[0]}
            </span>
          </div>

          {needsKey && (
            <form onSubmit={handleSaveKey} className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-lg animate-in slide-in-from-top-2 duration-200">
              <div className="text-xs text-slate-300 mb-2 font-medium">
                {lang === 'ja' ? 'Gemini APIキーを入力してください' : 'Please enter your Gemini API key'}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-slate-950 text-xs text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={!inputKey.trim()}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  {t.saveKeyBtn}
                </button>
              </div>
              <div className="mt-1.5">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                >
                  {lang === 'ja' ? 'APIキーを無料で取得' : 'Get free API Key'}
                </a>
              </div>
            </form>
          )}

          {repairError && (
            <div className="mt-3 text-red-400 text-xs bg-red-950/30 p-2.5 rounded border border-red-900/50">
              {repairError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
