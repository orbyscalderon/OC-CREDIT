import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Users, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, DollarSign, LogOut, Lock, ShieldCheck, PlusCircle,
} from 'lucide-react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

// Login propio de super-admin (JWT separado del de tenants, ver
// SuperAdminAuthController en el backend). sessionStorage en vez de
// localStorage: este token controla TODOS los tenants, así que se prefiere
// que no sobreviva más allá de la pestaña/sesión del navegador.
const SESSION_KEY = 'oc_super_admin_token';

// URL absoluta (no relativa): en producción el frontend (Cloudflare) y el
// backend (Railway) viven en dominios distintos -- '/api/v1' a secas
// nunca llegaba a la API real, devolvía el propio index.html de la SPA
// como "200 OK" (mismo bug que ya se corrigió en PortalClientePage.tsx).
const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

const superApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

superApi.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem(SESSION_KEY);
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

// Token expirado/inválido a mitad de sesión -> volver a pedir login en vez
// de quedarse mostrando datos viejos o errores crípticos en consola.
superApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.reload();
    }
    return Promise.reject(err);
  },
);

const unwrap = (r: any) => r.data?.data ?? r.data;

const PLANES = ['free', 'personal', 'basico', 'profesional', 'avanzado', 'comercial', 'enterprise'];

function SuperAdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMut = useMutation({
    mutationFn: () =>
      superApi.post('/super-admin/auth/login', { email, password }).then(unwrap),
    onSuccess: (data) => {
      sessionStorage.setItem(SESSION_KEY, data.access_token);
      onSuccess();
    },
  });

  const errMsg = loginMut.isError
    ? ((loginMut.error as any)?.response?.data?.message ?? t('superadmin.error_login'))
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <form
        onSubmit={(e) => { e.preventDefault(); loginMut.mutate(); }}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Lock size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">{t('superadmin.marca')}</h1>
            <p className="text-xs text-gray-500">OCA HOLDING GROUP LLC</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('superadmin.email_placeholder')}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('superadmin.password_placeholder')}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {errMsg && <p className="text-xs text-red-400">{errMsg}</p>}

        <button
          type="submit"
          disabled={loginMut.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
        >
          {loginMut.isPending ? t('superadmin.entrando') : t('superadmin.entrar')}
        </button>
      </form>
    </div>
  );
}

export function SuperAdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(SESSION_KEY));

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  // IMPORTANTE: ningún hook puede quedar después de un return condicional --
  // React exige llamar exactamente los mismos hooks, en el mismo orden, en
  // cada render. El `if (!authed) return` (login) vivía ANTES de estos
  // useQuery/useState: mientras el login nunca funcionaba (bug de baseURL ya
  // corregido) esto nunca se notaba, porque `authed` jamás cambiaba de valor
  // en la misma instancia del componente. Apenas el login empezó a andar de
  // verdad, pasar de "no autenticado" a "autenticado" cambiaba la cantidad
  // de hooks llamados entre un render y el siguiente -> crash (React #310).
  // Fix: todos los hooks se llaman siempre; `enabled: authed` evita que las
  // queries disparen red mientras se ve la pantalla de login.
  const { data: dashboard } = useQuery({
    queryKey: ['sa-dashboard'],
    queryFn: () => superApi.get('/super-admin/dashboard').then(unwrap),
    refetchInterval: 60_000,
    enabled: authed,
  });

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['sa-tenants', page],
    queryFn: () => superApi.get(`/super-admin/tenants?page=${page}&limit=20`).then(unwrap),
    enabled: authed,
  });

  const { data: mrr } = useQuery({
    queryKey: ['sa-mrr'],
    queryFn: () => superApi.get('/super-admin/mrr').then(unwrap),
    enabled: authed,
  });

  const [showNuevoAdmin, setShowNuevoAdmin] = useState(false);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPwd, setNuevoPwd] = useState('');

  const { data: admins = [], refetch: refetchAdmins } = useQuery({
    queryKey: ['sa-admins'],
    queryFn: () => superApi.get('/super-admin/admins').then(unwrap),
    enabled: authed,
  });

  const crearAdminMut = useMutation({
    mutationFn: () => superApi.post('/super-admin/admins', { email: nuevoEmail, password: nuevoPwd, nombre: nuevoNombre }).then(unwrap),
    onSuccess: () => {
      refetchAdmins();
      setShowNuevoAdmin(false);
      setNuevoEmail(''); setNuevoNombre(''); setNuevoPwd('');
    },
  });

  const toggleAdminMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      superApi.patch(`/super-admin/admins/${id}/activo`, { activo }).then(unwrap),
    onSuccess: () => refetchAdmins(),
  });
  const toggleAdminErr = toggleAdminMut.isError
    ? ((toggleAdminMut.error as any)?.response?.data?.message ?? t('superadmin.error_cambiar_estado_cuenta'))
    : null;

  const cambiarPlanMut = useMutation({
    mutationFn: ({ id, plan_id }: { id: string; plan_id: string }) =>
      superApi.patch(`/super-admin/tenants/${id}/plan`, { plan_id }).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-tenants'] }),
  });

  const toggleActivoMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      superApi.patch(`/super-admin/tenants/${id}/activo`, { activo }).then(unwrap),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-tenants'] }),
  });

  if (!authed) {
    return <SuperAdminLogin onSuccess={() => setAuthed(true)} />;
  }

  const tenants: any[] = tenantsData?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">{t('superadmin.header_titulo')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('superadmin.header_subtitulo')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { qc.invalidateQueries(); }}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw size={13} /> {t('superadmin.actualizar')}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-red-900/40 hover:text-red-400 hover:border-red-800"
          >
            <LogOut size={13} /> {t('superadmin.salir')}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">

        {/* KPIs globales */}
        {dashboard && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            {[
              { label: t('superadmin.kpi_tenants_activos'),     value: dashboard.tenants_activos,    icon: Building2,   color: 'text-blue-400' },
              { label: t('superadmin.kpi_tenants_inactivos'),   value: dashboard.tenants_inactivos,  icon: XCircle,     color: 'text-red-400' },
              { label: t('superadmin.kpi_prestamos_activos'),   value: dashboard.prestamos_activos_total, icon: TrendingUp, color: 'text-green-400' },
              { label: t('superadmin.kpi_usuarios_totales'),    value: dashboard.usuarios_totales,   icon: Users,       color: 'text-purple-400' },
              { label: t('superadmin.kpi_reportes_buro'),       value: dashboard.reportes_buro,      icon: AlertTriangle, color: 'text-amber-400' },
              { label: t('superadmin.kpi_mrr'),        value: `$${Number(dashboard.mrr_usd).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={15} className={color} />
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* MRR histórico */}
        {mrr && mrr.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              {t('superadmin.mrr_historico')}
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[...mrr].reverse()} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(v: number) => [`$${v}`, t('superadmin.mrr_tooltip_label')]}
                />
                <Bar dataKey="mrr_nuevo_usd" name={t('superadmin.mrr_tooltip_label')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabla tenants */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">
              {t('superadmin.tenants_titulo', { count: tenantsData?.total ?? 0 })}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60">
                <tr>
                  {[t('superadmin.col_empresa'), t('superadmin.col_email'), t('superadmin.col_plan'), t('superadmin.col_uso'), t('superadmin.col_estado'), t('superadmin.col_mrr'), t('superadmin.col_acciones')].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">{t('superadmin.cargando')}</td></tr>
                ) : tenants.map((tn: any) => {
                  const pct = Math.round(Number(tn.pct_prestamos_usados) || 0);
                  return (
                    <tr key={tn.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-200 truncate max-w-[160px]">{tn.nombre_empresa}</p>
                        <p className="text-xs text-gray-500">{tn.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{tn.email_contacto}</td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue={tn.plan_id}
                          onChange={e => cambiarPlanMut.mutate({ id: tn.id, plan_id: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {PLANES.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">
                            {tn.prestamos_activos_usados}/{tn.max_prestamos_activos}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tn.activo ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle size={11} /> {t('superadmin.activo')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium">
                            <XCircle size={11} /> {t('superadmin.inactivo')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-emerald-400 font-medium">
                        ${Number(tn.precio_mensual_usd || 0).toFixed(0)}/mo
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActivoMut.mutate({ id: tn.id, activo: !tn.activo })}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            tn.activo
                              ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                              : 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                          }`}
                        >
                          {tn.activo ? t('superadmin.bloquear') : t('superadmin.activar')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {tenantsData?.total > 20 && (
            <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-end gap-3 text-xs">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-400 disabled:opacity-40 hover:bg-gray-800">
                {t('superadmin.anterior')}
              </button>
              <span className="text-gray-500">{t('superadmin.pagina', { page })}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= tenantsData.total}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-400 disabled:opacity-40 hover:bg-gray-800">
                {t('superadmin.siguiente')}
              </button>
            </div>
          )}
        </div>

        {/* Cuentas Super Admin */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <ShieldCheck size={15} className="text-blue-400" />
              {t('superadmin.cuentas_super_admin', { count: admins.length })}
            </h2>
            <button
              onClick={() => setShowNuevoAdmin(!showNuevoAdmin)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <PlusCircle size={13} />
              {t('superadmin.nueva_cuenta')}
            </button>
          </div>

          {showNuevoAdmin && (
            <div className="px-5 py-4 border-b border-gray-800 bg-gray-800/40 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder={t('superadmin.nombre_placeholder')} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="email" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} placeholder={t('superadmin.email_placeholder')} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="password" value={nuevoPwd} onChange={e => setNuevoPwd(e.target.value)} placeholder={t('superadmin.password_min_placeholder')} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              {crearAdminMut.isError && (
                <p className="text-xs text-red-400">
                  {(crearAdminMut.error as any)?.response?.data?.message ?? t('superadmin.error_crear_cuenta')}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => crearAdminMut.mutate()}
                  disabled={!nuevoEmail || !nuevoPwd || nuevoPwd.length < 12 || crearAdminMut.isPending}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white"
                >
                  {crearAdminMut.isPending ? t('superadmin.creando') : t('superadmin.crear')}
                </button>
                <button onClick={() => setShowNuevoAdmin(false)} className="rounded-lg border border-gray-700 px-4 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
                  {t('common.cancelar')}
                </button>
              </div>
            </div>
          )}

          {toggleAdminErr && (
            <div className="px-5 py-3 border-b border-gray-800 bg-red-950/40">
              <p className="text-xs text-red-400">{toggleAdminErr}</p>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-gray-800/60">
              <tr>
                {[t('superadmin.col_nombre'), t('superadmin.col_email'), t('superadmin.col_estado'), t('superadmin.col_ultimo_acceso'), t('superadmin.col_acciones')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(admins as any[]).map((a) => (
                <tr key={a.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-200">{a.nombre}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.email}</td>
                  <td className="px-4 py-3">
                    {a.activo ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={11} /> {t('superadmin.activo')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400"><XCircle size={11} /> {t('superadmin.inactivo')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.ultimo_acceso ? new Date(a.ultimo_acceso).toLocaleString('es-DO') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAdminMut.mutate({ id: a.id, activo: !a.activo })}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                        a.activo
                          ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                          : 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                      }`}
                    >
                      {a.activo ? t('superadmin.desactivar') : t('superadmin.activar')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
