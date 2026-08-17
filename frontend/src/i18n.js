import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationDE from './locales/de.json';
import translationEN from './locales/en.json';

export const APP_LANG_STORAGE_KEY = 'app_language';
export const SUPPORTED_LANGUAGES = ['de', 'en'];

const readInitialLanguage = () => {
  if (typeof window === 'undefined') return 'de';
  const saved = window.localStorage.getItem(APP_LANG_STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;
  const browser = window.navigator?.language?.slice(0, 2)?.toLowerCase();
  if (browser && SUPPORTED_LANGUAGES.includes(browser)) return browser;
  return 'de';
};

const resources = {
  de: {
    translation: translationDE,
  },
  en: {
    translation: translationEN,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    lng: readInitialLanguage(),
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
