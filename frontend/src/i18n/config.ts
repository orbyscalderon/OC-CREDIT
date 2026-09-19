import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from '../locales/es/common.json';

/**
 * Arranca con un único idioma (es) — el objetivo de esta fase es dejar la
 * tubería lista (componentes ya usan t('clave') en vez de texto fijo), no
 * traducir toda la app de una vez. Agregar un idioma nuevo es solo sumar
 * otro recurso aquí, sin tocar los componentes ya migrados.
 */
i18n.use(initReactI18next).init({
  resources: {
    es: { common: es },
  },
  lng: 'es',
  fallbackLng: 'es',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
