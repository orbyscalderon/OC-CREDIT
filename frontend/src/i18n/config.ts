import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from '../locales/es/common.json';
import en from '../locales/en/common.json';

export const IDIOMAS_SOPORTADOS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS_SOPORTADOS)[number];

const IDIOMA_STORAGE_KEY = 'oc-credit-idioma';

function idiomaGuardado(): Idioma {
  try {
    const guardado = localStorage.getItem(IDIOMA_STORAGE_KEY);
    if (guardado && (IDIOMAS_SOPORTADOS as readonly string[]).includes(guardado)) {
      return guardado as Idioma;
    }
  } catch { /* localStorage no disponible (SSR, privacidad, etc.) -- se ignora */ }
  return 'es';
}

i18n.use(initReactI18next).init({
  resources: {
    es: { common: es },
    en: { common: en },
  },
  lng: idiomaGuardado(),
  fallbackLng: 'es',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export function cambiarIdioma(idioma: Idioma) {
  i18n.changeLanguage(idioma);
  try {
    localStorage.setItem(IDIOMA_STORAGE_KEY, idioma);
  } catch { /* privado/bloqueado -- el cambio de idioma sigue aplicando esta sesión */ }
}

export default i18n;
