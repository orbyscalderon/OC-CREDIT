import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/api/auth.api';

export function ResetearPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <p className="text-sm text-red-600">{t('resetear_password.token_faltante')}</p>
          <Link to="/login" className="inline-block mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium">
            {t('olvide_password.volver_login')}
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) {
      setError(t('resetear_password.no_coinciden'));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetearPassword(token, password);
      setExito(true);
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      setError(data?.error ?? data?.message ?? 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
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

        {exito ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={22} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('resetear_password.exito_titulo')}</h1>
            <p className="text-sm text-gray-500 mt-2">{t('resetear_password.exito_mensaje')}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {t('resetear_password.ir_login')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
                <KeyRound size={20} className="text-brand-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{t('resetear_password.titulo')}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('resetear_password.subtitulo')}</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  {t('resetear_password.nueva_password')}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  {t('resetear_password.confirmar_password')}
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 transition-all duration-150 mt-2"
                style={{ boxShadow: '0 4px 12px -2px rgba(37,99,235,0.4)' }}
              >
                {loading ? t('resetear_password.guardando') : t('resetear_password.guardar')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
