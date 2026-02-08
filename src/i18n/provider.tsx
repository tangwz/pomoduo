import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, normalizeLocale, type LocaleCode } from './locale';
import { MESSAGES, type I18nMessages } from './messages';

interface I18nContextValue {
  locale: LocaleCode;
  messages: I18nMessages;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  messages: MESSAGES[DEFAULT_LOCALE],
});

interface I18nProviderProps {
  locale: string | null | undefined;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const normalizedLocale = normalizeLocale(locale);
  const value = useMemo(
    () => ({
      locale: normalizedLocale,
      messages: MESSAGES[normalizedLocale],
    }),
    [normalizedLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
