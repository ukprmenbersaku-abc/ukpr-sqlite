import React, { useState, useRef, useEffect } from 'react';
import { Play, AlertCircle, ChevronDown, ChevronUp, Shield, Zap, Globe } from 'lucide-react';
import { SqlErrorDetails } from './SqlErrorDetails.tsx';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface SqlEditorProps {
  initialSql?: string;
  onExecute: (sql: string) => void;
  error?: string | null;
  getSuggestions: () => { tables: string[]; columns: string[] };
}

export const SqlEditor: React.FC<SqlEditorProps> = ({ 
  initialSql = '', 
  onExecute, 
  error,
  getSuggestions
}) => {
  const { t } = useLanguage();
  const [sql, setSql] = useState(initialSql);
  const [suggestions, setSuggestions] = useState<{ value: string; type: 'table' | 'column' | 'keyword' }[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [caretCoords, setCaretCoords] = useState({ top: 0, left: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update local state if initialSql changes (e.g. from AI)
  useEffect(() => {
    setSql(initialSql);
  }, [initialSql]);

  // Sync scroll positions
  const syncScroll = () => {
    if (textareaRef.current && preContainerRef.current) {
      preContainerRef.current.scrollTop = textareaRef.current.scrollTop;
      preContainerRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const getActiveWord = (text: string, caretPos: number) => {
    const textBeforeCaret = text.slice(0, caretPos);
    // Find last word composed of alphanumeric characters plus underscores
    const match = textBeforeCaret.match(/[\w_]+$/);
    return match ? match[0] : '';
  };

  const getFilteredSuggestions = (activeWord: string) => {
    if (!activeWord) return [];
    
    const keywordList = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON', 
      'GROUP BY', 'ORDER BY', 'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 
      'DELETE', 'CREATE TABLE', 'DROP TABLE', 'AND', 'OR', 'COUNT', 'SUM', 'AVG'
    ];

    const { tables, columns } = getSuggestions();
    
    const allSuggestions = [
      ...tables.map(t => ({ value: t, type: 'table' as const })),
      ...columns.map(c => ({ value: c, type: 'column' as const })),
      ...keywordList.map(k => ({ value: k, type: 'keyword' as const }))
    ];

    return allSuggestions.filter(item => 
      item.value.toLowerCase().startsWith(activeWord.toLowerCase()) &&
      item.value.toLowerCase() !== activeWord.toLowerCase()
    );
  };

  const getCaretCoordinates = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    const caretPos = textareaRef.current.selectionStart;
    const textBeforeCaret = sql.slice(0, caretPos);

    const lines = textBeforeCaret.split('\n');
    const currentLineIdx = lines.length - 1;
    const currentLineText = lines[currentLineIdx] || '';
    const currentColIdx = currentLineText.length;

    // Estimate monospace font coordinates: character row indices and columns
    const charWidth = 8.1;
    const lineHeight = 21;
    
    // Padding offsets
    const top = 16 + (currentLineIdx * lineHeight) - (textareaRef.current.scrollTop || 0);
    const left = 16 + (currentColIdx * charWidth) - (textareaRef.current.scrollLeft || 0);

    const containerWidth = containerRef.current?.clientWidth || 500;
    const containerHeight = containerRef.current?.clientHeight || 200;

    // Safe bounds
    const boundedLeft = Math.max(16, Math.min(left, containerWidth - 210));
    const boundedTop = Math.max(16, Math.min(top + 20, containerHeight - 150));

    return { top: boundedTop, left: boundedLeft };
  };

  const handleTextAndCursorUpdate = (currentVal: string, curCaret: number) => {
    const activeWord = getActiveWord(currentVal, curCaret);
    
    if (activeWord.length >= 1) {
      const filtered = getFilteredSuggestions(activeWord);
      if (filtered.length > 0) {
        setSuggestions(filtered);
        setShowSuggestions(true);
        setSelectedIdx(0);
        
        // Update coordinates
        const coords = getCaretCoordinates();
        setCaretCoords(coords);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleTextChange = (text: string) => {
    setSql(text);
    setTimeout(() => {
      syncScroll();
      if (textareaRef.current) {
        handleTextAndCursorUpdate(text, textareaRef.current.selectionStart);
      }
    }, 0);
  };

  const applySuggestion = (suggestionValue: string) => {
    if (!textareaRef.current) return;
    const caretPos = textareaRef.current.selectionStart;
    const textBeforeCaret = sql.slice(0, caretPos);
    const textAfterCaret = sql.slice(caretPos);

    const match = textBeforeCaret.match(/[\w_]+$/);
    const wordLength = match ? match[0].length : 0;

    const startPart = textBeforeCaret.slice(0, caretPos - wordLength);
    const newSql = startPart + suggestionValue + ' ' + textAfterCaret;

    setSql(newSql);
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCaretPos = startPart.length + suggestionValue.length + 1;
        textareaRef.current.setSelectionRange(newCaretPos, newCaretPos);
        syncScroll();
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[selectedIdx].value);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Support indent with Tab if autocomplete is closed
    if (e.key === 'Tab' && !showSuggestions) {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = sql.substring(0, start) + "  " + sql.substring(end);
      setSql(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
          syncScroll();
        }
      }, 0);
      return;
    }
  };

  const handleKeyUpOrClick = () => {
    setTimeout(() => {
      syncScroll();
      if (textareaRef.current) {
        handleTextAndCursorUpdate(sql, textareaRef.current.selectionStart);
      }
    }, 0);
  };

  const highlightSql = (text: string) => {
    const placeholders: { [key: string]: string } = {};
    let placeholderId = 0;

    // Helper to generate a purely alphabetical base26 ID (e.g. A, B, ..., AA, AB)
    // This completely prevents placeholder IDs from containing digits, ensuring
    // they are never matched by the number styling regex.
    const getAlphaId = (num: number): string => {
      let result = '';
      let n = num;
      do {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return result;
    };

    // Escape HTML (Using standard text escaping)
    let processed = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Strings (double quotes)
    processed = processed.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
      const id = `___STR_DBL_${getAlphaId(placeholderId++)}___`;
      placeholders[id] = `<span class="text-emerald-400">${match}</span>`;
      return id;
    });

    // Strings (single quotes)
    processed = processed.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match) => {
      const id = `___STR_SGL_${getAlphaId(placeholderId++)}___`;
      placeholders[id] = `<span class="text-emerald-400">${match}</span>`;
      return id;
    });

    // Comments (inline --)
    processed = processed.replace(/(--.*)/g, (match) => {
      const id = `___COMM_INL_${getAlphaId(placeholderId++)}___`;
      placeholders[id] = `<span class="text-slate-500 italic font-light">${match}</span>`;
      return id;
    });

    // Keywords
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON', 
      'GROUP BY', 'ORDER BY', 'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 
      'DELETE', 'CREATE TABLE', 'DROP TABLE', 'AND', 'OR', 'IN', 'LIKE', 'IS', 'AS', 
      'INDEX', 'VIEW', 'HAVING', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'INTEGER', 'TEXT', 
      'REAL', 'BLOB', 'NOT NULL', 'PRIMARY KEY'
    ];

    // Sort keywords by length descending so composite phrases get replaced first
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    sortedKeywords.forEach(kw => {
      const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedKw})\\b`, 'gi');
      processed = processed.replace(regex, (match) => {
        const id = `___KEYWORD_${getAlphaId(placeholderId++)}___`;
        placeholders[id] = `<span class="text-indigo-400 font-semibold">${match}</span>`;
        return id;
      });
    });

    // Style numbers (Using word boundaries; safe because our placeholder IDs are purely alphabetical)
    processed = processed.replace(/\b(\d+)\b/g, (match) => {
      const id = `___NUM_${getAlphaId(placeholderId++)}___`;
      placeholders[id] = `<span class="text-amber-400">${match}</span>`;
      return id;
    });

    // Put placeholders back (Sort keys by length descending to prevent substring collisions)
    Object.keys(placeholders)
      .sort((a, b) => b.length - a.length)
      .forEach(id => {
        processed = processed.replace(id, () => placeholders[id]);
      });

    return processed;
  };

  const commonStyles = "absolute inset-0 p-4 font-mono text-sm leading-relaxed whitespace-pre overflow-auto border-0 focus:ring-0 focus:outline-none resize-none bg-transparent m-0";

  return (
    <div className="flex flex-col h-full bg-slate-900 border-b border-slate-700">
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700 select-none">
        <span className="text-xs font-mono text-slate-400 ml-2">SQL Editor</span>
        <button
          onClick={() => onExecute(sql)}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded shadow-sm transition-colors"
        >
          <Play size={16} />
          <span>{t.runSql || 'Run Query'}</span>
        </button>
      </div>

      <div ref={containerRef} className="flex-1 relative min-h-[150px] overflow-hidden">
        {/* Underlay Highlighted Container */}
        <div 
          ref={preContainerRef}
          className={`${commonStyles} text-slate-200 pointer-events-none`}
          style={{ whiteSpace: 'pre', wordBreak: 'keep-all' }}
          dangerouslySetInnerHTML={{ __html: highlightSql(sql) + '\n' }}
        />

        {/* Overlay Interactive Textarea */}
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => handleTextChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUpOrClick}
          onMouseUp={handleKeyUpOrClick}
          className={`${commonStyles} text-transparent caret-white z-10 selection:bg-slate-700/50`}
          style={{ whiteSpace: 'pre', wordBreak: 'keep-all' }}
          placeholder="SELECT * FROM table_name..."
          spellCheck={false}
        />

        {/* Autocomplete suggestions box */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            style={{ top: caretCoords.top, left: caretCoords.left }}
            className="absolute z-30 w-52 max-h-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-y-auto"
          >
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => applySuggestion(item.value)}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs font-mono transition-colors border-b border-slate-700/40 last:border-b-0 ${
                  idx === selectedIdx ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-700/60'
                }`}
              >
                <span className="truncate">{item.value}</span>
                <span className={`text-[9px] scale-95 font-semibold px-1 py-0.5 rounded shrink-0 ${
                  item.type === 'table' ? 'bg-blue-900/40 text-blue-300 border border-blue-700/30' :
                  item.type === 'column' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/30' :
                  'bg-slate-900/50 text-slate-400 border border-slate-700/30'
                }`}>
                  {item.type === 'table' ? 'T' :
                   item.type === 'column' ? 'C' :
                   'K'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-red-955 max-h-56 overflow-y-auto bg-slate-950/40 p-1">
          <SqlErrorDetails 
            error={error} 
            badSql={sql} 
            onRepairSuccess={(repairedSql) => {
              setSql(repairedSql);
              onExecute(repairedSql);
            }} 
          />
        </div>
      )}
    </div>
  );
};
