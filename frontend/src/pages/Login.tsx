import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import { useState } from 'react';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

export function LoginPage() {
  const { t } = useTranslation();
  const schema = z.object({
    email:    z.string().email(t('login.email_invalido')),
    password: z.string().min(6, t('login.password_min')),
  });
  type FormData = z.infer<typeof schema>;

  const { login, loginWithGoogle, loading, error, googleError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (isAuthenticated) return <Navigate to="/panel" replace />;

  const onSubmit = async (data: FormData) => {
    const ok = await login(data.email, data.password);
    if (ok) navigate('/panel', { replace: true });
  };

  return (
    <div className="min-h-screen flex relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      {/* Panel izquierdo decorativo */}
      <div
        className="hidden lg:flex w-[420px] flex-shrink-0 flex-col justify-between p-10"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-extrabold">OC</span>
          </div>
          <span className="text-white font-bold text-lg">OCA Ruta</span>
        </div>

        {/* Feature highlights */}
        <div className="space-y-5">
          <h2 className="text-3xl font-extrabold text-white leading-tight whitespace-pre-line">
            {t('login.titulo_marca')}
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            {t('login.subtitulo_marca')}
          </p>
          <div className="space-y-3 pt-2">
            {[t('login.feat_1'), t('login.feat_2'), t('login.feat_3'), t('login.feat_4')].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-brand-500/30 border border-brand-400/40 flex items-center justify-center flex-shrink-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-blue-100 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-400/60 text-xs">{t('common.copyright')}</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Header móvil (solo se ve en sm) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-extrabold">OC</span>
            </div>
            <span className="font-bold text-gray-900">OCA Ruta</span>
          </div>

          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
              <Shield size={20} className="text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('login.bienvenido')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('login.subtitulo')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {t('login.email')}
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="admin@empresa.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {t('login.contrasena')}
                </label>
                <Link to="/olvide-password" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  {t('login.olvidaste_password')}
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 transition-all duration-150 mt-2"
              style={{ boxShadow: '0 4px 12px -2px rgba(37,99,235,0.4)' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {t('login.iniciando_sesion')}
                </span>
              ) : (
                <>
                  {t('login.iniciar_sesion')}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          {googleClientId && (
            <div className="mt-6">
              <div className="relative flex items-center mb-4">
                <div className="flex-1 border-t border-gray-200" />
                <span className="mx-3 text-xs text-gray-400">{t('login.o_continua_con')}</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(cred) => {
                    if (cred.credential) loginWithGoogle(cred.credential);
                  }}
                  onError={() => {}}
                  width="320"
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>

              {googleError && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                  {googleError}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-gray-400 hover:text-brand-600 transition-colors">
              ← {t('common.volver_inicio')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
