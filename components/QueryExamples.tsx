
import React, { useState } from 'react';
import { BookOpen, ChevronDown, Terminal, Sparkles } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface QueryExamplesProps {
  onSelectSql: (sql: string) => void;
  activeTable: string | null;
}

export const QueryExamples: React.FC<QueryExamplesProps> = ({ onSelectSql, activeTable }) => {
  const { lang, t } = useLanguage();
  const tableName = activeTable ? `"${activeTable}"` : 'table_name';
  // 開いているアイテムのキーを配列で管理（最大数を制御するため）
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (categoryIdx: number, itemIdx: number) => {
    const key = `${categoryIdx}-${itemIdx}`;
    setOpenItems(prev => {
      if (prev.includes(key)) {
        // 既に開いている場合は閉じる
        return prev.filter(k => k !== key);
      } else {
        // 新しく開く場合
        const newItems = [...prev, key];
        // 最大2つまで保持（古いものから削除）
        if (newItems.length > 2) {
          return newItems.slice(newItems.length - 2);
        }
        return newItems;
      }
    });
  };

  const examples = [
    {
      category: t.basicOps,
      icon: <Terminal size={18} />,
      items: [
        {
          title: t.example1Title,
          desc: t.example1Desc,
          sql: `SELECT * FROM ${tableName} LIMIT 100;`
        },
        {
          title: t.example2Title,
          desc: t.example2Desc,
          sql: `SELECT column1, column2 FROM ${tableName} LIMIT 100;`
        },
        {
          title: t.example3Title,
          desc: t.example3Desc,
          sql: `SELECT * FROM ${tableName} WHERE column_name = 'value';`
        },
        {
          title: t.example4Title,
          desc: t.example4Desc,
          sql: `SELECT * FROM ${tableName} WHERE column_name LIKE '%keyword%';`
        }
      ]
    },
    {
      category: t.aggregations,
      icon: <Sparkles size={18} />,
      items: [
        {
          title: t.example5Title,
          desc: t.example5Desc,
          sql: `SELECT COUNT(*) as count FROM ${tableName};`
        },
        {
          title: t.example6Title,
          desc: t.example6Desc,
          sql: `SELECT * FROM ${tableName} ORDER BY column_name DESC LIMIT 100;`
        },
        {
          title: t.example7Title,
          desc: t.example7Desc,
          sql: `SELECT category_col, COUNT(*) FROM ${tableName} GROUP BY category_col;`
        }
      ]
    },
    {
      category: t.dmlOps,
      icon: <Terminal size={18} />,
      items: [
        {
          title: t.example8Title,
          desc: t.example8Desc,
          sql: `INSERT INTO ${tableName} (column1, column2) VALUES ('value1', 123);`
        },
        {
          title: t.example9Title,
          desc: t.example9Desc,
          sql: `UPDATE ${tableName} SET column1 = 'new_value' WHERE id = 1;`
        },
        {
          title: t.example10Title,
          desc: t.example10Desc,
          sql: `DELETE FROM ${tableName} WHERE id = 1;`
        }
      ]
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full bg-slate-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex items-center gap-3 mb-8 md:mb-10">
          <div className="p-3 bg-cyan-900/30 rounded-full ring-1 ring-cyan-500/50">
            <BookOpen className="text-cyan-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">{t.queryExamples}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {t.examplesSubtitle}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {examples.map((category, catIdx) => (
            <div key={catIdx} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${catIdx * 100}ms` }}>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 px-1">
                <span className="p-1.5 bg-slate-800 rounded-md text-slate-300 border border-slate-700">
                  {category.icon}
                </span>
                {category.category}
              </h3>
              
              <div className="space-y-3">
                {category.items.map((item, itemIdx) => {
                  const key = `${catIdx}-${itemIdx}`;
                  const isOpen = openItems.includes(key);
                  return (
                    <div 
                      key={itemIdx} 
                      className={`group border rounded-xl transition-all duration-300 overflow-hidden ${
                        isOpen 
                          ? 'border-cyan-500/50 bg-slate-800 shadow-lg shadow-black/20' 
                          : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <button 
                        onClick={() => toggleItem(catIdx, itemIdx)} 
                        className="w-full flex items-center justify-between p-4 md:p-5 text-left focus:outline-none"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`font-bold text-base md:text-lg transition-colors leading-snug ${
                            isOpen ? 'text-cyan-400' : 'text-slate-200 group-hover:text-cyan-200'
                          }`}>
                            {item.title}
                          </span>
                        </div>
                        <div className={`text-slate-500 transition-transform duration-300 flex-shrink-0 ${
                          isOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-slate-300'
                        }`}>
                          <ChevronDown size={20} />
                        </div>
                      </button>
                      
                      <div 
                        className={`transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 pb-5 md:px-5 md:pb-6 pt-0">
                          <div className="pl-4 md:pl-0 space-y-4 pt-2 border-t border-slate-700/50 mt-2">
                            <p className="text-slate-300 text-sm leading-relaxed">
                              {item.desc}
                            </p>
                            
                            <div className="bg-slate-950 rounded-lg border border-slate-800 relative group/code mt-3">
                              <div className="p-4 font-mono text-sm text-green-400 overflow-x-auto whitespace-pre">
                                {item.sql}
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => onSelectSql(item.sql)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-cyan-900/20 active:scale-95 w-full sm:w-auto justify-center"
                              >
                                <Terminal size={16} />
                                {lang === 'ja' ? 'エディタで試す' : 'Try in Editor'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
