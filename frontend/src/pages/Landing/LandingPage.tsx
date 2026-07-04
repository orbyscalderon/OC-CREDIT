import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X, ArrowRight, Shield, MapPin, Smartphone, Zap } from 'lucide-react';
import { planesApi, type Plan, type RegistrarTenantDto } from '@/api/planes.api';
import { GooglePayButton } from '@/components/common/GooglePayButton';
import { CalculadoraPrestamo } from '@/components/common/CalculadoraPrestamo';
import { clsx } from 'clsx';

const schema = z.object({
  nombre_empresa: z.string().min(3, 'Mínimo 3 caracteres'),
  email_admin: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  nombre_admin: z.string().min(2),
  apellido_admin: z.string().min(2),
  telefono: z.string().optional(),
  ruc_cedula: z.string().optional(),
  plan_id: z.string(),
  facturacion_anual: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;


export function LandingPage() {
  const navigate = useNavigate();
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(null);
  const [anual, setAnual] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: planes = [] } = useQuery<Plan[]>({
    queryKey: ['planes-publicos'],
    queryFn: planesApi.listar,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan_id: 'profesional', facturacion_anual: false },
  });

  const [registroOk, setRegistroOk] = useState(false);
  const [gpayError, setGpayError] = useState<string | null>(null);

  const registrarMut = useMutation({
    mutationFn: (dto: RegistrarTenantDto) => planesApi.registrar(dto),
    onSuccess: () => {
      setRegistroOk(true);
      setTimeout(() => navigate('/login'), 2500);
    },
  });

  const registrarGpayMut = useMutation({
    mutationFn: (dto: RegistrarTenantDto & { googlePayToken: string }) =>
      planesApi.registrarConGooglePay({ ...dto, monto_usd: precioSeleccionado }),
    onSuccess: () => {
      setRegistroOk(true);
      setTimeout(() => navigate('/login'), 2500);
    },
  });

  const planActual = planes.find((p) => p.id === planSeleccionado);
  const precioSeleccionado = planActual
    ? (anual ? Number(planActual.precio_anual_usd) : Number(planActual.precio_mensual_usd))
    : 0;
  const esPlanGratis = precioSeleccionado === 0;

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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-brand-600">OC Credit</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Iniciar sesión
            </Link>
            <button
              onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary"
            >
              Comenzar gratis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            Sistema de Préstamos y Cobranzas<br />por Rutas para República Dominicana
          </h1>
          <p className="mt-5 text-lg text-blue-100 max-w-2xl mx-auto">
            Control total de tu cartera — desde el panel web hasta el cobrador en calle.
            App móvil offline, buró de crédito permanente y cobranza puerta a puerta.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 rounded-lg bg-white text-blue-700 px-6 py-3 font-bold text-sm hover:bg-blue-50"
            >
              Ver planes <ArrowRight size={16} />
            </button>
            <Link to="/login" className="rounded-lg border border-white/40 px-6 py-3 text-sm font-medium hover:bg-white/10">
              Iniciar sesión
            </Link>
          </div>
          <p className="mt-4 text-xs text-blue-200">
            © 2026 OC HOLDING GROUP LLC. Todos los derechos reservados.
          </p>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { icon: <Smartphone size={24} />, t: 'App Móvil Offline', d: 'Cobra sin internet. Sincroniza al recuperar señal.' },
            { icon: <Shield size={24} />, t: 'Buró de Crédito', d: 'Historial permanente cross-agencia. Consulta antes de prestar.' },
            { icon: <MapPin size={24} />, t: 'GPS & Mapas', d: 'Trazabilidad completa de la ruta del cobrador.' },
            { icon: <Zap size={24} />, t: 'Impresión Bluetooth', d: 'Recibos térmicos ESC/POS al instante en calle.' },
          ].map(({ icon, t, d }) => (
            <div key={t} className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                {icon}
              </div>
              <p className="font-semibold text-sm text-gray-900">{t}</p>
              <p className="mt-1 text-xs text-gray-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="precios" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900">Planes y Precios</h2>
            <p className="mt-2 text-gray-500">Escala según tu operación. Sin contratos.</p>

            {/* Toggle anual/mensual */}
            <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setAnual(false)}
                className={clsx('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  !anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
              >
                Mensual
              </button>
              <button
                onClick={() => setAnual(true)}
                className={clsx('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
              >
                Anual <span className="ml-1 text-xs text-green-600 font-bold">-15%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 max-w-3xl mx-auto sm:grid-cols-2">
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
                      ⭐ RECOMENDADO
                    </span>
                  )}

                  <p className={clsx('text-xl font-extrabold', isPro ? 'text-white' : 'text-gray-900')}>
                    {plan.nombre}
                  </p>
                  <p className={clsx('text-sm mt-1 mb-5', isPro ? 'text-blue-100' : 'text-gray-400')}>
                    {plan.descripcion}
                  </p>

                  <div className="mb-6">
                    <span className={clsx('text-5xl font-black', isPro ? 'text-white' : 'text-gray-900')}>
                      ${precioDisplay(plan).toFixed(0)}
                    </span>
                    <span className={clsx('text-sm ml-1', isPro ? 'text-blue-200' : 'text-gray-400')}>
                      /mes
                    </span>
                    {anual && (
                      <p className={clsx('text-xs mt-1', isPro ? 'text-blue-200' : 'text-green-600 font-medium')}>
                        Facturado anualmente — ahorras 15%
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-sm flex-1 mb-7">
                    {[
                      {
                        label: plan.max_prestamos_activos >= 9999
                          ? 'Préstamos activos ilimitados'
                          : `${plan.max_prestamos_activos} préstamos activos`,
                        ok: true,
                      },
                      {
                        label: plan.max_cobradores >= 9999
                          ? 'Cobradores ilimitados'
                          : `${plan.max_cobradores} cobradores`,
                        ok: true,
                      },
                      {
                        label: plan.max_rutas >= 9999
                          ? 'Rutas ilimitadas'
                          : `${plan.max_rutas} rutas`,
                        ok: true,
                      },
                      { label: 'App móvil offline (Android/iOS)', ok: true },
                      { label: 'Pagarés PDF descargables',        ok: plan.permite_pagare_pdf },
                      { label: 'Mapa GPS en tiempo real',         ok: plan.permite_mapa },
                      { label: 'Portal del cliente web',          ok: plan.permite_portal_cliente },
                      { label: 'WhatsApp Bot automático',         ok: plan.permite_whatsapp_bot },
                      { label: 'Reportes avanzados + aging',      ok: plan.permite_reportes_avanz },
                      { label: 'Buró de crédito permanente',      ok: true },
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
                    {selected ? '✓ Seleccionado' : `Empezar con ${plan.nombre}`}
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
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Calcula tu préstamo</h2>
          <p className="text-gray-500 mb-8">Simula cuotas antes de aprobar cualquier crédito</p>
          <CalculadoraPrestamo />
        </div>
      </section>

      {/* ── FORMULARIO DE REGISTRO ───────────────────────────────── */}
      <section id="registro" className={clsx('py-16 px-6 bg-gray-50 transition-all', !showForm && 'hidden')}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
            Crear cuenta
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">
            Plan seleccionado: <strong className="text-brand-600 capitalize">{planSeleccionado}</strong>
            {anual && <span className="ml-2 text-green-600">· Facturación anual (-15%)</span>}
          </p>

          <form
            onSubmit={handleSubmit((d) => registrarMut.mutate(d))}
            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
              <input {...register('nombre_empresa')} placeholder="Mi Financiera S.R.L."
                className="input-field" />
              {errors.nombre_empresa && <p className="mt-1 text-xs text-red-500">{errors.nombre_empresa.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input {...register('nombre_admin')} placeholder="Carlos"
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input {...register('apellido_admin')} placeholder="López"
                  className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (será tu usuario)</label>
              <input {...register('email_admin')} type="email" placeholder="carlos@empresa.com"
                className="input-field" />
              {errors.email_admin && <p className="mt-1 text-xs text-red-500">{errors.email_admin.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input {...register('password')} type="password" placeholder="Mínimo 8 caracteres"
                className="input-field" />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
              <input {...register('telefono')} placeholder="809-555-0000"
                className="input-field" />
            </div>

            {/* S1-3: banner de éxito inline — reemplaza alert() */}
            {registroOk && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="text-emerald-500 text-lg">✓</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">¡Cuenta creada exitosamente!</p>
                  <p className="text-xs text-emerald-600">Redirigiendo al login en unos segundos…</p>
                </div>
              </div>
            )}

            {(registrarMut.isError || registrarGpayMut.isError) && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {(registrarMut.error as {message?: string} | null)?.message ??
                 (registrarGpayMut.error as {message?: string} | null)?.message ??
                 'Error al registrarse'}
              </div>
            )}

            {gpayError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {gpayError}
              </div>
            )}

            {esPlanGratis ? (
              <button
                type="submit"
                disabled={registrarMut.isPending || registroOk}
                className="btn-primary w-full justify-center py-3"
              >
                {registrarMut.isPending ? 'Creando cuenta…' : 'Crear mi cuenta gratis'}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-xs font-medium text-gray-500">
                  Total: <strong className="text-gray-900">${precioSeleccionado.toFixed(2)} USD</strong>
                  {anual ? ' / año' : ' / mes'}
                </p>
                <GooglePayButton
                  amountUsd={precioSeleccionado}
                  disabled={registrarGpayMut.isPending || registroOk}
                  onError={(msg) => setGpayError(msg)}
                  onPaymentToken={(token) => {
                    setGpayError(null);
                    handleSubmit((formData) =>
                      registrarGpayMut.mutate({ ...formData, googlePayToken: token }),
                    )();
                  }}
                />
                <p className="text-center text-xs text-gray-400">
                  {registrarGpayMut.isPending ? 'Procesando pago…' : 'Pulsa el botón para pagar con Google Pay'}
                </p>
              </div>
            )}

            <p className="text-center text-xs text-gray-400">
              Al registrarte aceptas los términos de servicio de OC HOLDING GROUP LLC.
            </p>
          </form>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-xs">
        <p className="font-semibold text-white mb-1">OC Credit — Sistema de Préstamos por Rutas</p>
        <p>© 2026 OC HOLDING GROUP LLC. Todos los derechos reservados.</p>
        <p className="mt-2">República Dominicana · Azul · PlacetoPay · Leaflet/OSM</p>
      </footer>
    </div>
  );
}
