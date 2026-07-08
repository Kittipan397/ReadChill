"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "th" | "en";

interface Translations {
  [key: string]: {
    th: string;
    en: string;
  };
}

// Minimal dictionary for demonstration
const dictionary: Translations = {
  overview: { th: "ภาพรวม", en: "Overview" },
  contentManager: { th: "จัดการเนื้อหา", en: "Content Manager" },
  finance: { th: "การเงิน & รายได้", en: "Finance & Revenue" },
  partnerMgmt: { th: "จัดการนักเขียน", en: "Partner Management" },
  settings: { th: "ตั้งค่าระบบ", en: "Platform Settings" },
  logout: { th: "ออกจากระบบ", en: "Logout" }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "th",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>("th");

  useEffect(() => {
    const savedLang = localStorage.getItem("admin_lang") as Language;
    if (savedLang) setLanguage(savedLang);
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("admin_lang", lang);
  };

  const t = (key: string) => {
    if (dictionary[key]) {
      return dictionary[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
