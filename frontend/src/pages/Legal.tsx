import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const HOY = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });

export function LegalPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <Link to="/" className="text-xl font-extrabold text-brand-600">OCA Ruta</Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-gray-600 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{t('legal.titulo')}</h1>
        <p className="text-xs text-gray-400 mb-10">{t('legal.ultima_actualizacion', { fecha: HOY })}</p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-10">
          <p>
            <strong>{t('legal.intro_bold1')}</strong> {t('legal.intro_mid1')}{' '}
            <strong>{t('legal.intro_bold2')}</strong>{t('legal.intro_mid2')}
          </p>
        </div>

        <h2 id="terminos" className="text-xl font-bold text-gray-900 mt-10 mb-3">{t('legal.seccion1_titulo')}</h2>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s1_1_titulo')}</h3>
        <p>
          {t('legal.s1_1_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s1_2_titulo')}</h3>
        <p>
          {t('legal.s1_2_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s1_3_titulo')}</h3>
        <p>
          {t('legal.s1_3_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s1_4_titulo')}</h3>
        <p>
          {t('legal.s1_4_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s1_5_titulo')}</h3>
        <p>
          {t('legal.s1_5_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s1_6_titulo')}</h3>
        <p>
          {t('legal.s1_6_texto')}
        </p>

        <h2 id="privacidad" className="text-xl font-bold text-gray-900 mt-12 mb-3">{t('legal.seccion2_titulo')}</h2>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s2_1_titulo')}</h3>
        <p>
          {t('legal.s2_1_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s2_2_titulo')}</h3>
        <p>
          {t('legal.s2_2_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s2_3_titulo')}</h3>
        <p>
          {t('legal.s2_3_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s2_4_titulo')}</h3>
        <p>
          {t('legal.s2_4_texto')}
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s2_5_titulo')}</h3>
        <p>
          {t('legal.s2_5_texto')}
        </p>

        <h3 id="eliminar-cuenta" className="font-semibold text-gray-900 mt-6 mb-2">{t('legal.s2_6_titulo')}</h3>
        <p>{t('legal.s2_6_intro')}</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>{t('legal.s2_6_paso1')}</li>
          <li>{t('legal.s2_6_paso2')}</li>
          <li>{t('legal.s2_6_paso3')}</li>
        </ol>
        <p className="mt-2">{t('legal.s2_6_datos_eliminados')}</p>
        <p className="mt-2">{t('legal.s2_6_datos_conservados')}</p>
        <p className="mt-2">{t('legal.s2_6_plazo')}</p>

        <h2 className="text-xl font-bold text-gray-900 mt-12 mb-3">{t('legal.seccion3_titulo')}</h2>
        <p>
          {t('legal.s3_texto')}
        </p>

        <p className="mt-10 text-xs text-gray-400">
          {t('legal.copyright', { year: new Date().getFullYear() })}
        </p>

        <Link to="/" className="inline-block mt-8 text-brand-600 font-medium text-sm">{t('legal.volver_inicio')}</Link>
      </div>
    </div>
  );
}
