export interface CefrLevel {
  code: string;
  name: string;
  description: string;
  available: boolean;
}

export const CEFR_LEVELS: CefrLevel[] = [
  { code: 'A1', name: 'Complete Beginner', description: 'Basic phrases and greetings', available: true },
  { code: 'A2', name: 'Beginner', description: 'Simple conversations', available: true },
  { code: 'B1', name: 'Intermediate', description: 'Everyday topics and travel', available: true },
  { code: 'B2', name: 'Upper Intermediate', description: 'Fluent with native speakers', available: true },
  { code: 'C1', name: 'Advanced', description: 'Complex texts and speech', available: false },
  { code: 'C2', name: 'Proficiency', description: 'Near-native fluency', available: false },
];

/** "Beginner (A2)" — plain-English name first, CEFR code in brackets. */
export function formatLevel(code: string | null | undefined) {
  if (!code) return 'Not set';
  const level = CEFR_LEVELS.find((item) => item.code === code.toUpperCase());
  return level ? `${level.name} (${level.code})` : code;
}

const FLAG_BY_CODE: Record<string, string> = {
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  nl: '🇳🇱',
  ru: '🇷🇺',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
};

const CODE_BY_NAME: Record<string, string> = {
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  dutch: 'nl',
  russian: 'ru',
  japanese: 'ja',
  chinese: 'zh',
  korean: 'ko',
};

const NAME_BY_CODE: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(CODE_BY_NAME).map(([name, code]) => [code, name.charAt(0).toUpperCase() + name.slice(1)])
  ),
  en: 'English',
};

/** Accepts an ISO code ("es") or an English name ("Spanish"). */
export function flagForLanguage(language: string | null | undefined) {
  if (!language) return '🌍';
  const key = language.toLowerCase();
  return FLAG_BY_CODE[key] || FLAG_BY_CODE[CODE_BY_NAME[key]] || '🌍';
}

/** Accepts an ISO code ("es") or an English name ("spanish"). */
export function languageName(language: string | null | undefined) {
  if (!language) return 'Not set';
  const key = language.toLowerCase();
  return NAME_BY_CODE[key] || NAME_BY_CODE[CODE_BY_NAME[key]] || language.charAt(0).toUpperCase() + language.slice(1);
}

/** Opens the guest language/level menu in the header. */
export const OPEN_PREFERENCES_EVENT = 'reetle-open-preferences';
