import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/api/auth.api';

export function OlvidePasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // El backend siempre responde éxito (no revela si el email existe) --
      // no hay nada que manejar como error real acá salvo un fallo de red.
      await authApi.olvidePassword(email);
    } finally {
      setLoading(false);
      setEnviado(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white text-xs font-extrabold">OC</span>
          </div>
          <span className="font-bold text-gray-900">OCA Ruta</span>
        </div>

        {enviado ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={22} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('olvide_password.exito_titulo')}</h1>
            <p className="text-sm text-gray-500 mt-2">{t('olvide_password.exito_mensaje')}</p>
            <Link to="/login" className="inline-block mt-6 text-sm text-brand-600 hover:text-brand-700 font-medium">
              {t('olvide_password.volver_login')}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
                <Mail size={20} className="text-brand-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t('olvide_password.titulo')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('olvide_password.subtitulo')}</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  {t('login.email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="admin@empresa.com"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 transition-all duration-150 mt-2"
                style={{ boxShadow: '0 4px 12px -2px rgba(37,99,235,0.4)' }}
              >
                {loading ? t('olvide_password.enviando') : (
                  <>
                    {t('olvide_password.enviar')}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-xs text-gray-400 hover:text-brand-600 transition-colors">
                {t('olvide_password.volver_login')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
