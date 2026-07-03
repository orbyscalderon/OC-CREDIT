import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Users, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, DollarSign, LogOut, Lock,
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

const superApi = axios.create({
  baseURL: '/api/v1',
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
    ? ((loginMut.error as any)?.response?.data?.message ?? 'Error al iniciar sesión')
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
            <h1 className="text-base font-bold text-white">Super Admin</h1>
            <p className="text-xs text-gray-500">OC Moon Group LLC</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
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
          {loginMut.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export function SuperAdminPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(SESSION_KEY));

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  if (!authed) {
    return <SuperAdminLogin onSuccess={() => setAuthed(true)} />;
  }

  const { data: dashboard } = useQuery({
    queryKey: ['sa-dashboard'],
    queryFn: () => superApi.get('/super-admin/dashboard').then(unwrap),
    refetchInterval: 60_000,
  });

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['sa-tenants', page],
    queryFn: () => superApi.get(`/super-admin/tenants?page=${page}&limit=20`).then(unwrap),
  });

  const { data: mrr } = useQuery({
    queryKey: ['sa-mrr'],
    queryFn: () => superApi.get('/super-admin/mrr').then(unwrap),
  });

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

  const tenants: any[] = tenantsData?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">OC Moon Group — Super Admin</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            © 2026 OC Moon Group LLC. Panel exclusivo de plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { qc.invalidateQueries(); }}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw size={13} /> Actualizar
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-red-900/40 hover:text-red-400 hover:border-red-800"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-8">

        {/* KPIs globales */}
        {dashboard && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            {[
              { label: 'Tenants activos',     value: dashboard.tenants_activos,    icon: Building2,   color: 'text-blue-400' },
              { label: 'Tenants inactivos',   value: dashboard.tenants_inactivos,  icon: XCircle,     color: 'text-red-400' },
              { label: 'Préstamos activos',   value: dashboard.prestamos_activos_total, icon: TrendingUp, color: 'text-green-400' },
              { label: 'Usuarios totales',    value: dashboard.usuarios_totales,   icon: Users,       color: 'text-purple-400' },
              { label: 'Reportes buró',       value: dashboard.reportes_buro,      icon: AlertTriangle, color: 'text-amber-400' },
              { label: 'MRR estimado',        value: `$${Number(dashboard.mrr_usd).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-400' },
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
              MRR Histórico — Últimos 12 meses (USD)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[...mrr].reverse()} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(v: number) => [`$${v}`, 'MRR']}
                />
                <Bar dataKey="mrr_nuevo_usd" name="MRR" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabla tenants */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">
              Tenants ({tenantsData?.total ?? 0})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60">
                <tr>
                  {['Empresa', 'Email', 'Plan', 'Uso', 'Estado', 'MRR', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">Cargando…</td></tr>
                ) : tenants.map((t: any) => {
                  const pct = Math.round(Number(t.pct_prestamos_usados) || 0);
                  return (
                    <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-200 truncate max-w-[160px]">{t.nombre_empresa}</p>
                        <p className="text-xs text-gray-500">{t.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{t.email_contacto}</td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue={t.plan_id}
                          onChange={e => cambiarPlanMut.mutate({ id: t.id, plan_id: e.target.value })}
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
                            {t.prestamos_activos_usados}/{t.max_prestamos_activos}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {t.activo ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle size={11} /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium">
                            <XCircle size={11} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-emerald-400 font-medium">
                        ${Number(t.precio_mensual_usd || 0).toFixed(0)}/mo
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActivoMut.mutate({ id: t.id, activo: !t.activo })}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            t.activo
                              ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                              : 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                          }`}
                        >
                          {t.activo ? 'Bloquear' : 'Activar'}
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
                Anterior
              </button>
              <span className="text-gray-500">Página {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= tenantsData.total}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-400 disabled:opacity-40 hover:bg-gray-800">
                Siguiente
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
