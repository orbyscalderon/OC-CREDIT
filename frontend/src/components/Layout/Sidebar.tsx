import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, UserPlus, CreditCard, Wallet,
  MapPin, ShieldAlert, BarChart3, Settings, LogOut,
  Globe, Crown, ClipboardList, HardDrive, ChevronRight,
  UserCog, PiggyBank, CalendarOff, Route as RouteIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { prestamosApi } from '@/api/prestamos.api';
import { Rol } from '@/types';
import { clsx } from 'clsx';

// labelKey en vez de texto fijo -- se resuelve con t() dentro del componente
// para que reaccione al cambio de idioma (este array vive fuera del render).
const navItems = [
  { to: '/panel',          labelKey: 'nav.dashboard',       icon: LayoutDashboard, roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/clientes',       labelKey: 'nav.clientes',        icon: Users,           roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/clientes/nuevo', labelKey: 'nav.nuevo_cliente',   icon: UserPlus,        roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/mi-ruta',        labelKey: 'nav.mi_ruta',         icon: RouteIcon,       roles: [Rol.COBRADOR_TENANT] },
  { to: '/prestamos',      labelKey: 'nav.prestamos',       icon: CreditCard,      roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/cajas',          labelKey: 'nav.cajas_cobros',    icon: Wallet,          roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/cobros/nuevo',   labelKey: 'nav.cobro_manual',    icon: PiggyBank,       roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/rutas',          labelKey: 'nav.rutas',           icon: MapPin,          roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/empleados',      labelKey: 'nav.empleados',       icon: UserCog,         roles: [Rol.ADMIN_TENANT] },
  { to: '/buro',           labelKey: 'nav.buro',            icon: ShieldAlert,     roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/cuentas-cobrar', labelKey: 'nav.cuentas_cobrar',  icon: ClipboardList,   roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/reportes',       labelKey: 'nav.reportes',        icon: BarChart3,       roles: [Rol.ADMIN_TENANT] },
  { to: '/config',         labelKey: 'nav.config',          icon: Settings,        roles: [Rol.ADMIN_TENANT] },
  { to: '/config/feriados',labelKey: 'nav.feriados',        icon: CalendarOff,     roles: [Rol.ADMIN_TENANT] },
  { to: '/config/backup',  labelKey: 'nav.backup',          icon: HardDrive,       roles: [Rol.ADMIN_TENANT] },
];

/* CSS hover via Tailwind no funciona bien con bg-[color] dinámico en sidebar oscuro,
   así que usamos clases estáticas con variable CSS para el hover bg */
const SIDEBAR_BG    = '#0f172a';
const SIDEBAR_HOVER = '#1e293b';
const SIDEBAR_ACTIVE_BG = 'linear-gradient(135deg, #1e3a5f 0%, #1e3060 100%)';

const ROL_KEY: Record<string, string> = {
  [Rol.ADMIN_TENANT]: 'empleados.rol_admin',
  [Rol.SUPERVISOR_TENANT]: 'empleados.rol_supervisor',
  [Rol.COBRADOR_TENANT]: 'empleados.rol_cobrador',
};

export function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const settings = useTenantSettings();

  const esAdmin = user?.rol === Rol.ADMIN_TENANT || user?.rol === Rol.SUPERVISOR_TENANT;
  const { data: pendientesData } = useQuery({
    queryKey: ['prestamos-pendientes-count'],
    queryFn: () => prestamosApi.listar({ estado: 'Pendiente', limit: 1 }),
    refetchInterval: 2 * 60 * 1000,
    enabled: esAdmin,
    select: (d) => d.total as number,
  });
  const pendientes = pendientesData ?? 0;

  const logoUrl = settings?.url_logo
    ? (settings.url_logo.startsWith('http') ? settings.url_logo : '/api/v1/tenants/logo')
    : null;

  const allowed = navItems.filter((i) => user && i.roles.includes(user.rol as Rol));
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'OC';

  return (
    <aside className="flex h-screen w-64 flex-col flex-shrink-0" style={{ background: SIDEBAR_BG }}>

      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 h-16 flex-shrink-0"
        style={{ borderBottom: `1px solid ${SIDEBAR_HOVER}` }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <span className="text-white text-xs font-extrabold">OC</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">OCA Credit</p>
              <p className="text-[10px] leading-none mt-0.5" style={{ color: '#64748b' }}>{t('nav.panel_administrativo')}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Navegación ────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${SIDEBAR_HOVER} transparent` }}
      >
        {allowed.map(({ to, labelKey, icon: Icon }, i) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/panel' || to === '/clientes'}
            style={({ isActive }) => ({
              animationDelay: `${i * 25}ms`,
              background: isActive ? SIDEBAR_ACTIVE_BG : 'transparent',
              color: isActive ? '#ffffff' : '#94a3b8',
            })}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 animate-slide-in',
                !isActive && 'hover:bg-[#1e293b] hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: isActive ? '#93c5fd' : 'currentColor' }}
                />
                <span className="flex-1 truncate">{t(labelKey)}</span>
                {to === '/prestamos' && pendientes > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white flex-shrink-0">
                    {pendientes > 99 ? '99+' : pendientes}
                  </span>
                )}
                {isActive && (to !== '/prestamos' || pendientes === 0) && (
                  <ChevronRight size={12} style={{ color: '#60a5fa' }} className="flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Links externos ────────────────────────────────────────── */}
      {/* S3-19: hover con clase CSS en lugar de onMouseEnter/Leave */}
      <div
        className="px-3 pb-3 space-y-0.5 pt-3"
        style={{ borderTop: `1px solid ${SIDEBAR_HOVER}` }}
      >
        {[
          { to: '/portal',      labelKey: 'nav.portal_clientes', icon: Globe },
          { to: '/super-admin', labelKey: 'nav.super_admin',     icon: Crown },
        ].map(({ to, labelKey, icon: Icon }) => (
          <a
            key={to}
            href={to}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[#1e293b] hover:text-white"
            style={{ color: '#475569' }}
          >
            <Icon size={13} />
            {t(labelKey)}
          </a>
        ))}
      </div>

      {/* ── Usuario + logout ──────────────────────────────────────── */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${SIDEBAR_HOVER}` }}
      >
        <div className="flex justify-center pb-2">
          <LanguageSwitcher dark />
        </div>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.email}</p>
            <p className="text-[10px] capitalize truncate" style={{ color: '#64748b' }}>
              {user?.rol && ROL_KEY[user.rol] ? t(ROL_KEY[user.rol]) : user?.rol?.replace(/_/g, ' ')}
            </p>
          </div>
          {/* S3-19: hover con CSS class en lugar de JS events */}
          <button
            onClick={logout}
            title={t('nav.cerrar_sesion')}
            aria-label={t('nav.cerrar_sesion')}
            className="p-1.5 rounded-md transition-colors flex-shrink-0 hover:text-red-400 hover:bg-red-500/10"
            style={{ color: '#475569' }}
          >
            <LogOut size={13} />
          </button>
        </div>
        <p className="text-[9px] text-center mt-2 leading-tight px-2" style={{ color: '#334155' }}>
          © 2026 OCA HOLDING GROUP LLC.
        </p>
      </div>
    </aside>
  );
}
