import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cambiarIdioma, type Idioma } from '@/i18n/config';

const ETIQUETAS: Record<Idioma, string> = { es: 'ES', en: 'EN' };

interface LanguageSwitcherProps {
  className?: string;
  dark?: boolean;
}

/** Toggle ES/EN -- persiste en localStorage vía cambiarIdioma(). */
export function LanguageSwitcher({ className = '', dark = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const actual = (i18n.language?.split('-')[0] as Idioma) ?? 'es';
  const otro: Idioma = actual === 'es' ? 'en' : 'es';

  return (
    <button
      type="button"
      onClick={() => cambiarIdioma(otro)}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
        dark
          ? 'text-gray-300 hover:text-white hover:bg-white/10'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      } ${className}`}
      title={otro === 'en' ? 'Switch to English' : 'Cambiar a Español'}
    >
      <Globe size={13} />
      {ETIQUETAS[actual]}
    </button>
  );
}
