
import React, { useState } from 'react';
import { BookOpen, ChevronDown, Terminal } from 'lucide-react';

interface QueryExamplesProps {
  onSelectSql: (sql: string) => void;
  activeTable: string | null;
}

export const QueryExamples: React.FC<QueryExamplesProps> = ({ onSelectSql, activeTable }) => {
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
      category: "基本操作",
      items: [
        {
          title: "全件取得 (制限付き)",
          desc: "テーブルのデータを最初の100件だけ取得します。データの中身をとりあえず確認したい時に使います。",
          sql: `SELECT * FROM ${tableName} LIMIT 100;`
        },
        {
          title: "特定の列のみ取得",
          desc: "必要な列だけを指定してデータを取得します。余計なデータを省くことで見やすくなります。",
          sql: `SELECT column1, column2 FROM ${tableName} LIMIT 100;`
        },
        {
          title: "条件付き検索 (完全一致)",
          desc: "特定の条件にピタリと一致する行を探します。",
          sql: `SELECT * FROM ${tableName} WHERE column_name = 'value';`
        },
        {
          title: "あいまい検索",
          desc: "キーワードを含むデータを検索します。「%」は任意の文字を表すワイルドカードです。",
          sql: `SELECT * FROM ${tableName} WHERE column_name LIKE '%keyword%';`
        }
      ]
    },
    {
      category: "集計・並び替え",
      items: [
        {
          title: "行数をカウント",
          desc: "テーブルにデータが何件あるか数えます。",
          sql: `SELECT COUNT(*) as count FROM ${tableName};`
        },
        {
          title: "並び替え (降順)",
          desc: "数字の大きい順、または日付の新しい順などでデータを並び替えます。",
          sql: `SELECT * FROM ${tableName} ORDER BY column_name DESC LIMIT 100;`
        },
        {
          title: "グループ化して集計",
          desc: "カテゴリや種類ごとに、それぞれ何件あるかを集計します。",
          sql: `SELECT category_col, COUNT(*) FROM ${tableName} GROUP BY category_col;`
        }
      ]
    },
    {
      category: "データ操作 (DML)",
      items: [
        {
          title: "データの挿入",
          desc: "新しいデータをテーブルに追加します。カラムの順番通りに値を指定します。",
          sql: `INSERT INTO ${tableName} (column1, column2) VALUES ('value1', 123);`
        },
        {
          title: "データの更新",
          desc: "条件に一致するデータを新しい値に書き換えます。WHERE句を忘れると全件更新されるので注意！",
          sql: `UPDATE ${tableName} SET column1 = 'new_value' WHERE id = 1;`
        },
        {
          title: "データの削除",
          desc: "条件に一致するデータを削除します。これもWHERE句を忘れると大変なことになります。",
          sql: `DELETE FROM ${tableName} WHERE id = 1;`
        }
      ]
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full bg-slate-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex items-center gap-3 mb-8 md:mb-10">
          <div className="p-3 bg-blue-900/30 rounded-full ring-1 ring-blue-500/50">
            <BookOpen className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">SQL Query 例</h2>
            <p className="text-slate-400 text-sm mt-1">
              よく使われるSQLパターン集です。クリックして使い方を確認し、そのままエディタで試せます。
            </p>
          </div>
        </div>

        <div className="space-y-10">
          {examples.map((category, catIdx) => (
            <div key={catIdx}>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                {category.category}
              </h3>
              
              <div className="space-y-3">
                {category.items.map((item, itemIdx) => {
                  const key = `${catIdx}-${itemIdx}`;
                  const isOpen = openItems.includes(key);
                  return (
                    <div 
                      key={itemIdx} 
                      className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                        isOpen 
                          ? 'border-blue-500/30 bg-slate-800 shadow-lg shadow-black/20' 
                          : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <button 
                        onClick={() => toggleItem(catIdx, itemIdx)} 
                        className="w-full flex items-center justify-between p-4 md:p-5 text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`font-bold text-base md:text-lg transition-colors leading-snug ${isOpen ? 'text-white' : 'text-slate-300 group-hover:text-blue-200'}`}>
                            {item.title}
                          </span>
                        </div>
                        <div className={`text-slate-500 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-blue-400' : ''}`}>
                          <ChevronDown size={20} />
                        </div>
                      </button>
                      
                      <div 
                        className={`transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 pb-5 md:px-5 md:pb-6">
                          <div className="pl-4 md:pl-5 ml-1 border-l-2 border-slate-700/50 space-y-4">
                            <p className="text-slate-400 text-sm leading-relaxed">
                              {item.desc}
                            </p>
                            
                            <div className="bg-slate-950 rounded-lg border border-slate-800 relative group/code">
                              <div className="p-3 md:p-4 font-mono text-sm text-green-300 overflow-x-auto whitespace-pre">
                                {item.sql}
                              </div>
                            </div>

                            <button
                              onClick={() => onSelectSql(item.sql)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-blue-900/20 active:scale-95 w-full sm:w-auto justify-center sm:justify-start"
                            >
                              <Terminal size={16} />
                              エディタで試す
                            </button>
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
