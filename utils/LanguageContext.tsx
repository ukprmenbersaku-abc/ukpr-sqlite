import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations.ts';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations['ja'];
  currentHostname: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Determine initial language based on hostname, saved preference, or browser language
const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Domain-based language routing:
    // sqlite-ja.y-s.dev -> Japanese site
    // sqlite.y-s.dev -> English / Global site
    if (hostname === 'sqlite-ja.y-s.dev') {
      return 'ja';
    }
    if (hostname === 'sqlite.y-s.dev') {
      return 'en';
    }

    // Check user's manual preference in localStorage
    const saved = localStorage.getItem('lang') as Language | null;
    if (saved === 'ja' || saved === 'en') {
      return saved;
    }

    // Fallback to browser's preferred language
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ja')) {
      return 'ja';
    }
  }
  return 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);
  const [currentHostname, setCurrentHostname] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHostname(window.location.hostname);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang] || translations['ja'];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currentHostname }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
