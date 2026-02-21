import i18n from './i18n-setup';
import { normalizeLocaleTag } from './translation-data';

const normalizeIntlLocale = (locale?: string) => {
  if (!locale) {
    return undefined;
  }
  const normalized = normalizeLocaleTag(locale).toLowerCase();
  if (normalized.startsWith('zh')) {
    return 'zh';
  }
  if (normalized.startsWith('en')) {
    return 'en';
  }
  return locale;
};

const getIntlLocale = () => normalizeIntlLocale(i18n.language);

const onIntlLocaleChange = (listener: () => void) => {
  i18n.on('languageChanged', listener);
  return () => {
    i18n.off('languageChanged', listener);
  };
};

export { getIntlLocale, onIntlLocaleChange };
