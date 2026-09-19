import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X, ArrowRight, Shield, MapPin, Smartphone, Zap } from 'lucide-react';
import { planesApi, type Plan, type RegistrarTenantDto } from '@/api/planes.api';
import { CalculadoraPrestamo } from '@/components/common/CalculadoraPrestamo';
import { PAISES } from '@/utils/paises';
import { clsx } from 'clsx';

type FormData = {
  nombre_empresa: string;
  email_admin: string;
  password: string;
  nombre_admin: string;
  apellido_admin: string;
  telefono?: string;
  ruc_cedula?: string;
  pais: string;
  plan_id: string;
  facturacion_anual?: boolean;
};


export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(null);
  const [anual, setAnual] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const schema = z.object({
    nombre_empresa: z.string().min(3, t('landing.minimo3')),
    email_admin: z.string().email(t('landing.email_invalido')),
    password: z.string().min(8, t('landing.minimo8')),
    nombre_admin: z.string().min(2),
    apellido_admin: z.string().min(2),
    telefono: z.string().optional(),
    ruc_cedula: z.string().optional(),
    pais: z.string().length(2),
    plan_id: z.string(),
    facturacion_anual: z.boolean().optional(),
  });

  const { data: planes = [] } = useQuery<Plan[]>({
    queryKey: ['planes-publicos'],
    queryFn: planesApi.listar,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan_id: 'profesional', facturacion_anual: false, pais: 'DO' },
  });

  const [registroOk, setRegistroOk] = useState(false);

  const registrarMut = useMutation({
    mutationFn: (dto: RegistrarTenantDto) => planesApi.registrar(dto),
    onSuccess: () => {
      setRegistroOk(true);
      setTimeout(() => navigate('/login'), 2500);
    },
  });

  const planActual = planes.find((p) => p.id === planSeleccionado);
  const precioSeleccionado = planActual
    ? (anual ? Number(planActual.precio_anual_usd) : Number(planActual.precio_mensual_usd))
    : 0;

  const seleccionarPlan = (planId: string) => {
    setPlanSeleccionado(planId);
    setValue('plan_id', planId);
    setValue('facturacion_anual', anual);
    setShowForm(true);
    setTimeout(() => document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const precioDisplay = (plan: Plan) =>
    anual ? Number(plan.precio_anual_usd) : Number(plan.precio_mensual_usd);

  return (
    <div className="min-h-screen bg-white">

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <span className="text-lg sm:text-xl font-extrabold text-brand-600 whitespace-nowrap">OCA Credit</span>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login" className="text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap">
              {t('landing.nav_iniciar_sesion')}
            </Link>
            <button
              onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary whitespace-nowrap !px-3 !py-2 text-xs sm:!px-4 sm:!py-2.5 sm:text-sm"
            >
              {t('landing.nav_comenzar_gratis')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            {t('landing.hero_titulo_linea1')}<br />{t('landing.hero_titulo_linea2')}
          </h1>
          <p className="mt-5 text-lg text-blue-100 max-w-2xl mx-auto">
            {t('landing.hero_subtitulo')}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 rounded-lg bg-white text-blue-700 px-6 py-3 font-bold text-sm hover:bg-blue-50"
            >
              {t('landing.ver_planes')} <ArrowRight size={16} />
            </button>
            <Link to="/login" className="rounded-lg border border-white/40 px-6 py-3 text-sm font-medium hover:bg-white/10">
              {t('landing.nav_iniciar_sesion')}
            </Link>
          </div>
          <p className="mt-4 text-xs text-blue-200">
            {t('common.copyright')}
          </p>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { icon: <Smartphone size={24} />, titulo: t('landing.feat1_titulo'), d: t('landing.feat1_desc') },
            { icon: <Shield size={24} />, titulo: t('landing.feat2_titulo'), d: t('landing.feat2_desc') },
            { icon: <MapPin size={24} />, titulo: t('landing.feat3_titulo'), d: t('landing.feat3_desc') },
            { icon: <Zap size={24} />, titulo: t('landing.feat4_titulo'), d: t('landing.feat4_desc') },
          ].map(({ icon, titulo, d }) => (
            <div key={titulo} className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                {icon}
              </div>
              <h3 className="font-semibold text-sm text-gray-900">{titulo}</h3>
              <p className="mt-1 text-xs text-gray-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="precios" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900">{t('landing.planes_titulo')}</h2>
            <p className="mt-2 text-gray-500">{t('landing.planes_subtitulo')}</p>

            {/* Toggle anual/mensual */}
            <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setAnual(false)}
                className={clsx('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  !anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
              >
                {t('landing.mensual')}
              </button>
              <button
                onClick={() => setAnual(true)}
                className={clsx('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
              >
                {t('landing.anual')} <span className="ml-1 text-xs text-green-600 font-bold">{t('landing.descuento')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-3">
            {planes.map((plan) => {
              const isPro = plan.id === 'pro';
              const selected = planSeleccionado === plan.id;
              return (
                <div
                  key={plan.id}
                  className={clsx(
                    'relative rounded-2xl border-2 p-7 flex flex-col transition-all',
                    isPro
                      ? 'border-blue-500 bg-blue-600 shadow-2xl shadow-blue-200 text-white'
                      : 'border-gray-200 bg-white',
                    selected && !isPro ? 'border-green-400 ring-2 ring-green-400' : '',
                    selected && isPro  ? 'ring-4 ring-green-300' : '',
                  )}
                >
                  {isPro && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-extrabold text-gray-900 tracking-wide shadow">
                      {t('landing.recomendado')}
                    </span>
                  )}

                  <h3 className={clsx('text-xl font-extrabold', isPro ? 'text-white' : 'text-gray-900')}>
                    {plan.nombre}
                  </h3>
                  <p className={clsx('text-sm mt-1 mb-5', isPro ? 'text-blue-100' : 'text-gray-400')}>
                    {plan.descripcion}
                  </p>

                  <div className="mb-6">
                    <span className={clsx('text-5xl font-black', isPro ? 'text-white' : 'text-gray-900')}>
                      ${precioDisplay(plan).toFixed(0)}
                    </span>
                    <span className={clsx('text-sm ml-1', isPro ? 'text-blue-200' : 'text-gray-400')}>
                      {t('landing.mes_suffix')}
                    </span>
                    {anual && (
                      <p className={clsx('text-xs mt-1', isPro ? 'text-blue-200' : 'text-green-600 font-medium')}>
                        {t('landing.facturado_anual')}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-sm flex-1 mb-7">
                    {[
                      {
                        label: plan.max_prestamos_activos >= 9999
                          ? t('landing.feature_prestamos_ilimitados')
                          : t('landing.feature_prestamos_n', { n: plan.max_prestamos_activos }),
                        ok: true,
                      },
                      {
                        label: plan.max_cobradores >= 9999
                          ? t('landing.feature_cobradores_ilimitados')
                          : t('landing.feature_cobradores_n', { n: plan.max_cobradores }),
                        ok: true,
                      },
                      {
                        label: plan.max_rutas >= 9999
                          ? t('landing.feature_rutas_ilimitadas')
                          : t('landing.feature_rutas_n', { n: plan.max_rutas }),
                        ok: true,
                      },
                      { label: t('landing.feature_app_movil'), ok: true },
                      { label: t('landing.feature_pagares'),        ok: plan.permite_pagare_pdf },
                      { label: t('landing.feature_mapa'),         ok: plan.permite_mapa },
                      { label: t('landing.feature_portal'),          ok: plan.permite_portal_cliente },
                      { label: t('landing.feature_whatsapp'),         ok: plan.permite_whatsapp_bot },
                      { label: t('landing.feature_reportes'),      ok: plan.permite_reportes_avanz },
                      { label: t('landing.feature_buro'),      ok: true },
                    ].map(({ label, ok }) => (
                      <li key={label} className={clsx(
                        'flex items-center gap-2.5',
                        !ok && (isPro ? 'opacity-30' : 'opacity-35'),
                      )}>
                        {ok
                          ? <Check size={15} className={isPro ? 'text-green-300 flex-shrink-0' : 'text-green-500 flex-shrink-0'} />
                          : <X    size={15} className={isPro ? 'text-blue-300 flex-shrink-0' : 'text-gray-300 flex-shrink-0'} />}
                        <span className={isPro ? 'text-blue-50' : 'text-gray-600'}>{label}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => seleccionarPlan(plan.id)}
                    className={clsx(
                      'w-full rounded-xl py-3.5 text-sm font-extrabold transition-all active:scale-[0.99]',
                      selected
                        ? 'bg-green-500 text-white'
                        : isPro
                          ? 'bg-white text-brand-700 hover:bg-brand-50'
                          : 'bg-brand-600 text-white hover:bg-brand-700',
                    )}
                  >
                    {selected ? t('landing.seleccionado') : t('landing.probar_gratis', { plan: plan.nombre })}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CALCULADORA ──────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{t('landing.calcula_titulo')}</h2>
          <p className="text-gray-500 mb-8">{t('landing.calcula_subtitulo')}</p>
          <CalculadoraPrestamo />
        </div>
      </section>

      {/* ── FORMULARIO DE REGISTRO ───────────────────────────────── */}
      <section id="registro" className={clsx('py-16 px-6 bg-gray-50 transition-all', !showForm && 'hidden')}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
            {t('landing.crear_cuenta_titulo')}
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">
            {t('landing.plan_seleccionado')} <strong className="text-brand-600 capitalize">{planSeleccionado}</strong>
            {anual && <span className="ml-2 text-green-600">{t('landing.facturacion_anual_nota')}</span>}
            <br />
            {t('landing.no_cobro_hoy', { precio: `$${precioSeleccionado.toFixed(0)}`, periodo: anual ? t('landing.periodo_ano') : t('landing.periodo_mes') })}
          </p>

          <form
            onSubmit={handleSubmit((d) => registrarMut.mutate(d))}
            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.nombre_empresa')}</label>
              <input {...register('nombre_empresa')} placeholder={t('landing.nombre_empresa_placeholder')}
                className="input-field" />
              {errors.nombre_empresa && <p className="mt-1 text-xs text-red-500">{errors.nombre_empresa.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.pais')}</label>
              <select {...register('pais')} className="input-field">
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {t('landing.pais_hint')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.nombre')}</label>
                <input {...register('nombre_admin')} placeholder={t('landing.nombre_placeholder')}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.apellido')}</label>
                <input {...register('apellido_admin')} placeholder={t('landing.apellido_placeholder')}
                  className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.email_usuario')}</label>
              <input {...register('email_admin')} type="email" placeholder={t('landing.email_placeholder')}
                className="input-field" />
              {errors.email_admin && <p className="mt-1 text-xs text-red-500">{errors.email_admin.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.contrasena')}</label>
              <input {...register('password')} type="password" placeholder={t('landing.contrasena_placeholder')}
                className="input-field" />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.telefono_opcional')}</label>
              <input {...register('telefono')} placeholder={t('landing.telefono_placeholder')}
                className="input-field" />
            </div>

            {/* S1-3: banner de éxito inline — reemplaza alert() */}
            {registroOk && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="text-emerald-500 text-lg">✓</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{t('landing.cuenta_creada')}</p>
                  <p className="text-xs text-emerald-600">{t('landing.redirigiendo')}</p>
                </div>
              </div>
            )}

            {registrarMut.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {(registrarMut.error as {message?: string} | null)?.message ?? t('landing.error_registro')}
              </div>
            )}

            <button
              type="submit"
              disabled={registrarMut.isPending || registroOk}
              className="btn-primary w-full justify-center py-3"
            >
              {registrarMut.isPending ? t('landing.creando_cuenta') : t('landing.crear_cuenta_btn')}
            </button>

            <p className="text-center text-xs text-gray-400">
              {t('landing.acepto_prefix')}{' '}
              <Link to="/legal#terminos" className="underline hover:text-gray-600">{t('landing.terminos_servicio')}</Link>{' '}
              {t('landing.y')}{' '}
              <Link to="/legal#privacidad" className="underline hover:text-gray-600">{t('landing.politica_privacidad')}</Link>{' '}
              {t('landing.de_empresa')}
            </p>
          </form>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-xs">
        <p className="font-semibold text-white mb-1">{t('landing.footer_titulo')}</p>
        <p>{t('common.copyright')}</p>
        <p className="mt-3">
          <Link to="/legal#terminos" className="underline hover:text-gray-200">{t('landing.footer_terminos')}</Link>
          {' · '}
          <Link to="/legal#privacidad" className="underline hover:text-gray-200">{t('landing.footer_privacidad')}</Link>
        </p>
      </footer>
    </div>
  );
}
