import React from 'react';
import { GitMerge, Database, Link2, ArrowRight } from 'lucide-react';
import { parseSqlJoins } from '../utils/sqlParser.ts';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface JoinVisualizerProps {
  sql: string;
}

export const JoinVisualizer: React.FC<JoinVisualizerProps> = ({ sql }) => {
  const { lang } = useLanguage();
  if (!sql) return null;

  const { tables, joins } = parseSqlJoins(sql);

  // If there's no FROM, no tables, or no actual table joins, do not display the visualizer block
  if (tables.length === 0 || joins.length === 0) return null;

  const isMultiDb = tables.some(t => t.includes('.'));

  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-lg mb-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <GitMerge size={18} className="text-indigo-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-100">
            {lang === 'ja' ? 'テーブル結合 (JOIN) 構造マップ' : 'Table JOIN Map'}
          </h3>
        </div>
        {isMultiDb && (
          <span className="flex items-center gap-1 text-[10px] bg-amber-900/40 border border-amber-700/50 text-amber-300 px-2 py-0.5 rounded-full font-medium">
            <Database size={10} />
            {lang === 'ja' ? '複数DB結合中' : 'Cross-DB Join'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 py-2">
        {/* Detailed JOIN relation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {joins.map((join, idx) => {
            const isLeftAttached = join.leftTable.includes('.');
            const isRightAttached = join.rightTable.includes('.');

            return (
              <div key={idx} className="flex flex-col bg-slate-900/60 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3 transition-colors relative overflow-hidden group">
                {/* Subtle top indicator bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                  join.joinType.includes('LEFT') ? 'from-sky-500 to-indigo-500' :
                  join.joinType.includes('INNER') ? 'from-emerald-500 to-teal-500' :
                  'from-indigo-500 to-purple-500'
                }`} />
                
                <div className="flex items-center justify-between mb-2 mt-1">
                  <span className="text-[10px] font-bold uppercase py-0.5 px-2 rounded font-mono select-none bg-slate-800/80 text-indigo-300 border border-indigo-900/40">
                    {join.joinType}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                </div>

                <div className="flex items-center justify-between gap-2 py-1.5 px-1 bg-slate-950/40 rounded-lg border border-slate-800/80">
                  <div className="flex-1 text-center min-w-0">
                    <div className={`text-xs font-mono font-medium truncate px-1.5 py-0.5 rounded ${
                      isLeftAttached ? 'bg-amber-950/30 text-amber-400 border border-amber-900/40' : 'bg-slate-800 text-slate-200'
                    }`} title={join.leftTable}>
                      {join.leftTable}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center shrink-0">
                    <ArrowRight size={14} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <div className="flex-1 text-center min-w-0">
                    <div className={`text-xs font-mono font-medium truncate px-1.5 py-0.5 rounded ${
                      isRightAttached ? 'bg-amber-950/30 text-amber-400 border border-amber-900/40' : 'bg-slate-800 text-slate-200'
                    }`} title={join.rightTable}>
                      {join.rightTable}
                    </div>
                  </div>
                </div>

                {join.onCondition && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-start gap-1.5">
                    <Link2 size={12} className="text-slate-500 mt-0.5 shrink-0" />
                    <div className="text-[11px] font-mono text-slate-400 break-all select-all leading-relaxed bg-slate-950/20 px-1.5 py-0.5 rounded-md border border-slate-800/50">
                      {join.onCondition}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Simple ASCII / Box Tree Diagram representation */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl font-mono text-xs text-slate-300">
          <div className="text-[10px] text-slate-500 uppercase font-semibold mb-2 select-none tracking-wider">
            {lang === 'ja' ? '結合ツリー図 (Tree View)' : 'JOIN Tree Diagram (Tree View)'}
          </div>
          <div className="overflow-x-auto whitespace-pre py-1 max-w-full">
            {tables.map((t, i) => {
              const stepJoin = joins.find(j => j.rightTable === t);
              const isAttached = t.includes('.');
              const nodeType = isAttached ? '📄 [Attached DB]' : '📁 [Main DB]';
              
              if (i === 0) {
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-indigo-400">●</span>
                    <span className="bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 px-2 py-0.5 rounded text-xs font-semibold">{t}</span>
                    <span className="text-[10px] text-slate-500 italic">
                      {nodeType} {lang === 'ja' ? '(起点となるメインテーブル)' : '(Starting Main Table)'}
                    </span>
                  </div>
                );
              }

              return (
                <div key={i} className="flex flex-col ml-4 border-l border-slate-700 pl-4 py-1.5 relative">
                  {/* Horizontal stem marker */}
                  <div className="absolute top-1/2 left-0 w-4 h-[1px] bg-slate-700 -translate-y-1/2" />
                  
                  <div className="flex flex-wrap items-center gap-1.5 pl-4">
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-bold uppercase">{stepJoin?.joinType || 'JOIN'}</span>
                    <span className="text-slate-500">──►</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      isAttached ? 'bg-amber-950/40 border border-amber-800/40 text-amber-300' : 'bg-slate-800 border border-slate-750 text-slate-200'
                    }`}>{t}</span>
                    {stepJoin?.onCondition && (
                      <span className="text-[10.5px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate">
                        ON {stepJoin.onCondition}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
