"use client";
import { useLanguage } from "@/context/LanguageContext";

export default function T({ path }: { path: string }) {
  const { t } = useLanguage();
  return <>{t(path)}</>;
}
