import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Loader2, Key, Settings } from 'lucide-react';
import { generateSqlFromPrompt } from '../services/geminiService.ts';
import { getDatabaseSchema } from '../services/sqliteService.ts';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface AiAssistantProps {
  onSqlGenerated: (sql: string) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ onSqlGenerated }) => {
  const { lang, t } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowKeyInput(true);
    }
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setShowKeyInput(false);
      setError(null);
    }
  };

  const handleClearKey = () => {
    if(window.confirm(t.aiConfirmApiKeyDelete)) {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
      setShowKeyInput(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const schema = await getDatabaseSchema();
      const sql = await generateSqlFromPrompt(apiKey, schema, prompt);
      onSqlGenerated(sql);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.aiErrorOccurred);
    } finally {
      setLoading(false);
    }
  };

  if (showKeyInput) {
    return (
      <div className="p-4 md:p-6 h-full flex flex-col items-center justify-center bg-slate-900 animate-in fade-in zoom-in duration-300">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-purple-900/30 rounded-full ring-1 ring-purple-500/50">
              <Key className="text-purple-400" size={32} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-2">{t.aiSetApiKeyTitle}</h2>
          <p className="text-slate-400 text-sm text-center mb-6">
            {t.aiSetApiKeyDesc}
          </p>
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {t.aiSaveKeyAndStartBtn}
            </button>
            <div className="text-center mt-4">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 underline"
              >
                {t.aiGetKeyBtn}
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col items-center justify-center bg-slate-900 overflow-y-auto relative">
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={handleClearKey}
          className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          title={lang === 'ja' ? 'APIキーを変更' : 'Change API Key'}
        >
          <Settings size={20} />
        </button>
      </div>

      <div className="max-w-2xl w-full py-4">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-purple-900/30 rounded-full mb-4 ring-1 ring-purple-500/50">
            <Sparkles className="text-purple-400" size={24} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t.aiAssistantTitle}</h2>
          <p className="text-slate-400 text-sm md:text-base">
            {t.aiAssistantDesc}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative group mb-6">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t.aiPromptPlaceholder}
            className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-xl px-4 py-3 md:px-6 md:py-4 pr-14 md:pr-16 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-lg transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
          </button>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-300 text-sm text-center flex flex-col items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h3 className="font-semibold text-slate-300 mb-2">{t.aiQuestionsHeader}</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-1 font-sans">
              <li>{t.aiQuestionExample1}</li>
              <li>{t.aiQuestionExample2}</li>
              <li>{t.aiQuestionExample3}</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h3 className="font-semibold text-slate-300 mb-2">{t.aiTipsHeader}</h3>
            <p className="text-slate-400 leading-relaxed font-sans">
              {t.aiTipsBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};