import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, ExternalLink, Scale, CheckCircle2, Globe } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  const { lang: appLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'app' | 'thirdParty'>('app');
  // Terms view language inside modal: defaults to the current app language, but can be switched
  const [termsLang, setTermsLang] = useState<'en' | 'ja'>(appLang);

  // Sync modal language whenever appLang changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTermsLang(appLang);
    }
  }, [isOpen, appLang]);

  if (!isOpen) return null;

  const isEnglish = termsLang === 'en';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isEnglish ? 'Terms of Use & Licenses' : '利用規約・ライセンス情報'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEnglish 
                  ? 'App proprietary terms of use and third-party open-source software notices'
                  : '本ツールの独自利用規約および使用OSSライブラリのライセンス表記'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={isEnglish ? 'Close' : '閉じる'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs & Language Toggle bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 pt-2 shrink-0 gap-2">
          {/* Main Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('app')}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'app'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck size={16} />
              <span>{isEnglish ? 'App Terms & License' : '本ツールの利用許諾・規約'}</span>
            </button>
            <button
              onClick={() => setActiveTab('thirdParty')}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'thirdParty'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={16} />
              <span>{isEnglish ? 'Third-Party OSS Notices' : '使用ライブラリのライセンス (OSS)'}</span>
            </button>
          </div>

          {/* In-Modal Language Switcher for Terms */}
          <div className="flex items-center gap-1 mb-2 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <Globe size={13} className="text-slate-400 ml-1.5 mr-0.5" />
            <button
              onClick={() => setTermsLang('en')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                termsLang === 'en'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English (EN)
            </button>
            <button
              onClick={() => setTermsLang('ja')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                termsLang === 'ja'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              日本語 (JA)
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          {activeTab === 'app' ? (
            <div className="space-y-6">
              {/* Contagious license explanation badge */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/50 flex items-start gap-3 text-xs text-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-300 mb-0.5">
                    {isEnglish 
                      ? 'Verified: No Contagious / Copyleft Licenses Used' 
                      : '伝染性ライセンス（GPL等）の不使用確認済み'}
                  </div>
                  <div>
                    {isEnglish
                      ? 'All open-source libraries used by this tool (React, SQL.js, Lucide, @google/genai, Vite, Tailwind CSS) are licensed under permissive licenses (MIT, ISC, Apache 2.0, or Public Domain). No copyleft or viral licenses (such as GPL/AGPL) are involved. The proprietary terms and license conditions of this tool fully and lawfully apply.'
                      : '本ツールで使用しているすべてのOSSライブラリ（React, SQL.js, Lucide, @google/genai 等）は MIT / ISC / Apache 2.0 / Public Domain などの寛容なパーミッシブライセンスであり、GPL/AGPLなどの伝染性（コピーレフト）ライセンスは一切含まれていません。そのため、本ツールの独自規約・ライセンスが有効に適用されます。'}
                  </div>
                </div>
              </div>

              {/* Main Terms Box - Pure English when isEnglish is true, Pure Japanese when false */}
              {isEnglish ? (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                    <h3 className="font-bold text-white text-base">
                      SQLite on Web - Terms of Use &amp; License
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      Developers: UKPR-S &amp; Ys-tecks
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">1</span>
                        Grant of License
                      </h4>
                      <p className="text-slate-300 text-xs sm:text-sm pl-6 leading-relaxed">
                        This tool is free to use for both personal and commercial purposes by anyone.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">2</span>
                        Ownership of Generated Output
                      </h4>
                      <p className="text-slate-300 text-xs sm:text-sm pl-6 leading-relaxed">
                        All rights to artifacts generated using this tool (created, edited, or exported SQLite database files, executed SQL queries, CSV export data, etc.) belong entirely to the user. Providing attribution or license credits on generated artifacts is completely optional and left to the user&apos;s discretion.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">3</span>
                        Redistribution Restrictions
                      </h4>
                      <div className="text-slate-300 text-xs sm:text-sm pl-6 leading-relaxed space-y-1">
                        <p>
                          Redistributing this tool itself (including any modified or derivative versions) requires prior written permission from the developers (UKPR-S &amp; Ys-tecks).
                        </p>
                        <p className="text-amber-300 font-medium">
                          Redistribution of this tool itself for commercial purposes is strictly prohibited under all circumstances.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                    <h3 className="font-bold text-white text-base">
                      SQLite on Web 利用規約・ライセンス
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      開発者: UKPR-S &amp; Ys-tecks
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">1</span>
                        利用許諾
                      </h4>
                      <p className="text-slate-300 text-xs sm:text-sm pl-6 leading-relaxed">
                        本ツールは、個人利用・商用利用を問わず、どなたでも無料で自由にご利用いただけます。
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">2</span>
                        生成物の扱い
                      </h4>
                      <p className="text-slate-300 text-xs sm:text-sm pl-6 leading-relaxed">
                        本ツールを使用して生成された成果物（作成・編集・エクスポートしたデータベースファイル、実行したSQLクエリ、CSV出力データなど）の権利は利用者に帰属します。成果物にクレジットやライセンス表記を記載するかどうかは任意（自由）です。
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">3</span>
                        再配布の制限
                      </h4>
                      <div className="text-slate-300 text-xs sm:text-sm pl-6 leading-relaxed space-y-1">
                        <p>
                          本ツール自体（改変されたものを含む）を再配布する場合は、事前に開発者（UKPR-S &amp; Ys-tecks）の許可が必要です。
                        </p>
                        <p className="text-amber-300 font-medium">
                          本ツール自体の商用目的での再配布は、いかなる場合も禁止します。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-xs text-slate-400 leading-relaxed">
                {isEnglish
                  ? 'This software uses the following open-source libraries. In compliance with each library\'s license terms (MIT, ISC, Apache 2.0), the respective copyright and permission notices are reproduced below.'
                  : '本ソフトウェアは、以下のオープンソースライブラリを使用しています。各ライブラリのライセンス条件（MIT / ISC / Apache 2.0）に基づき、各著作権および許諾表示を以下に掲示します。'}
              </div>

              {/* sql.js & SQLite */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">sql.js (SQLite WebAssembly)</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono border border-blue-700/50">MIT License</span>
                </div>
                <div className="text-xs text-slate-400">
                  Copyright (c) 2014-2023 sql.js contributors (kripken et al.)
                </div>
                <div className="text-xs text-slate-400">
                  {isEnglish 
                    ? 'Note: The underlying SQLite core library is dedicated to the Public Domain (by D. Richard Hipp).'
                    : '補足: コアとなるSQLiteデータベースライブラリ自体はパブリックドメイン（Public Domain）です。'}
                </div>
                <pre className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap leading-normal">
{`Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`}
                </pre>
              </div>

              {/* React & React-DOM */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">React &amp; React-DOM</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono border border-blue-700/50">MIT License</span>
                </div>
                <div className="text-xs text-slate-400">
                  Copyright (c) Meta Platforms, Inc. and affiliates.
                </div>
                <pre className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap leading-normal">
{`Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`}
                </pre>
              </div>

              {/* Lucide Icons */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">Lucide Icons (lucide-react)</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono border border-emerald-700/50">ISC License</span>
                </div>
                <div className="text-xs text-slate-400">
                  Copyright (c) Lucide Contributors (Cole Bemis et al.)
                </div>
                <pre className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap leading-normal">
{`Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS.`}
                </pre>
              </div>

              {/* @google/genai */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">@google/genai (Google Gen AI SDK)</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-mono border border-amber-700/50">Apache License 2.0</span>
                </div>
                <div className="text-xs text-slate-400">
                  Copyright (c) 2024-2025 Google LLC.
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;); you may not use this file except in compliance with the License. You may obtain a copy of the License at <a href="http://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline inline-flex items-center gap-0.5">http://www.apache.org/licenses/LICENSE-2.0 <ExternalLink size={10} /></a>.
                </p>
              </div>

              {/* Vite & Tailwind CSS */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">Vite &amp; Tailwind CSS</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono border border-blue-700/50">MIT License</span>
                </div>
                <div className="text-xs text-slate-400">
                  Copyright (c) Yuxi (Evan) You &amp; Vite Contributors / Copyright (c) Tailwind Labs, Inc.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            &copy; 2025-2026 UKPR-S &amp; Ys-tecks. All rights reserved.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            {isEnglish ? 'Close' : '閉じる'}
          </button>
        </div>
      </div>
    </div>
  );
};
