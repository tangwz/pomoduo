export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: LocaleCode = 'en-US';

export function normalizeLocale(locale: string | null | undefined): LocaleCode {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  const normalized = locale.trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'zh' || normalized === 'zh-cn') {
    return 'zh-CN';
  }

  return 'en-US';
}

export function detectPreferredLocale(): LocaleCode {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  return normalizeLocale(navigator.language);
}
