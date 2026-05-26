import React, { createContext, useContext, useState } from 'react';
import { I18N, LANGUAGES, type LangCode, type I18n } from '../lib/i18n';

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  i18n: I18n;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'EN',
  setLang: () => {},
  i18n: I18N.EN,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangCode>('EN');
  return (
    <LanguageContext.Provider value={{ lang, setLang, i18n: I18N[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export { LANGUAGES, type LangCode, type I18n };
