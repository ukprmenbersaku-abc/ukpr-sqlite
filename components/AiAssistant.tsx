import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { generateSqlFromPrompt } from '../services/geminiService';
import { getDatabaseSchema } from '../services/sqliteService';

interface AiAssistantProps {
  onSqlGenerated: (sql: string) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ onSqlGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const schema = getDatabaseSchema();
      const sql = await generateSqlFromPrompt(schema, prompt);
      onSqlGenerated(sql);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col items-center justify-center bg-slate-900 overflow-y-auto">
      <div className="max-w-2xl w-full py-4">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-purple-900/30 rounded-full mb-4 ring-1 ring-purple-500/50">
            <Sparkles className="text-purple-400" size={24} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">AI SQL アシスタント</h2>
          <p className="text-slate-400 text-sm md:text-base">
            知りたいデータを日本語で質問してください。<br className="hidden md:inline"/> GeminiがDB構造を解析してSQLを作成します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative group mb-6">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 売上が一番高い商品は？"
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
          <div className="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-800">
            <h3 className="font-semibold text-slate-300 mb-2">こんな質問ができます</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-1">
              <li>登録日が昨日のユーザー一覧を表示</li>
              <li>商品カテゴリごとの平均価格は？</li>
              <li>在庫が10個以下のアイテムを探して</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-800">
            <h3 className="font-semibold text-slate-300 mb-2">Tips</h3>
            <p className="text-slate-400 leading-relaxed">
              複雑な集計や結合も任せてください。<br/>
              生成されたSQLは実行前にエディタで確認・編集できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};