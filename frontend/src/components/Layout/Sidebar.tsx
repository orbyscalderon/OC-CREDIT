import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Wallet,
  MapPin, ShieldAlert, BarChart3, Settings, LogOut,
  Globe, Crown, ClipboardList, HardDrive, ChevronRight,
  UserCog, PiggyBank, CalendarOff, Route as RouteIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { Rol } from '@/types';
import { clsx } from 'clsx';

const navItems = [
  { to: '/panel',          label: 'Dashboard',       icon: LayoutDashboard, roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/clientes',       label: 'Clientes',         icon: Users,           roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/mi-ruta',        label: 'Mi Ruta',          icon: RouteIcon,       roles: [Rol.COBRADOR_TENANT] },
  { to: '/prestamos',      label: 'Préstamos',        icon: CreditCard,      roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/cajas',          label: 'Cajas / Cobros',   icon: Wallet,          roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/cobros/nuevo',   label: 'Cobro Manual',     icon: PiggyBank,       roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/rutas',          label: 'Rutas',            icon: MapPin,          roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/empleados',      label: 'Empleados',        icon: UserCog,         roles: [Rol.ADMIN_TENANT] },
  { to: '/buro',           label: 'Buró de Crédito',  icon: ShieldAlert,     roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT] },
  { to: '/cuentas-cobrar', label: 'Cuentas x Cobrar', icon: ClipboardList,   roles: [Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT] },
  { to: '/reportes',       label: 'Reportes',         icon: BarChart3,       roles: [Rol.ADMIN_TENANT] },
  { to: '/config',         label: 'Configuración',    icon: Settings,        roles: [Rol.ADMIN_TENANT] },
  { to: '/config/feriados',label: 'Feriados',         icon: CalendarOff,     roles: [Rol.ADMIN_TENANT] },
  { to: '/config/backup',  label: 'Copia Seguridad',  icon: HardDrive,       roles: [Rol.ADMIN_TENANT] },
];

/* CSS hover via Tailwind no funciona bien con bg-[color] dinámico en sidebar oscuro,
   así que usamos clases estáticas con variable CSS para el hover bg */
const SIDEBAR_BG    = '#0f172a';
const SIDEBAR_HOVER = '#1e293b';
const SIDEBAR_ACTIVE_BG = 'linear-gradient(135deg, #1e3a5f 0%, #1e3060 100%)';

export function Sidebar() {
  const { user, logout } = useAuth();
  const settings = useTenantSettings();

  const allowed = navItems.filter((i) => user && i.roles.includes(user.rol as Rol));
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'OC';

  return (
    <aside className="flex h-screen w-64 flex-col flex-shrink-0" style={{ background: SIDEBAR_BG }}>

      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 h-16 flex-shrink-0"
        style={{ borderBottom: `1px solid ${SIDEBAR_HOVER}` }}
      >
        {settings?.url_logo ? (
          <img src={settings.url_logo} alt="Logo" className="h-8 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <span className="text-white text-xs font-extrabold">OC</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">OC Credit</p>
              <p className="text-[10px] leading-none mt-0.5" style={{ color: '#64748b' }}>Panel Administrativo</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Navegación ────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${SIDEBAR_HOVER} transparent` }}
      >
        {allowed.map(({ to, label, icon: Icon }, i) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/panel'}
            /* S0-2: un único prop style (función) que incluye animationDelay */
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
                <span className="flex-1 truncate">{label}</span>
                {isActive && (
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
          { to: '/portal',      label: 'Portal Clientes', icon: Globe },
          { to: '/super-admin', label: 'Super Admin',      icon: Crown },
        ].map(({ to, label, icon: Icon }) => (
          <a
            key={to}
            href={to}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[#1e293b] hover:text-white"
            style={{ color: '#475569' }}
          >
            <Icon size={13} />
            {label}
          </a>
        ))}
      </div>

      {/* ── Usuario + logout ──────────────────────────────────────── */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${SIDEBAR_HOVER}` }}
      >
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.email}</p>
            <p className="text-[10px] capitalize truncate" style={{ color: '#64748b' }}>
              {user?.rol?.replace(/_/g, ' ')}
            </p>
          </div>
          {/* S3-19: hover con CSS class en lugar de JS events */}
          <button
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="p-1.5 rounded-md transition-colors flex-shrink-0 hover:text-red-400 hover:bg-red-500/10"
            style={{ color: '#475569' }}
          >
            <LogOut size={13} />
          </button>
        </div>
        <p className="text-[9px] text-center mt-2 leading-tight px-2" style={{ color: '#334155' }}>
          © 2026 OC HOLDING GROUP LLC.
        </p>
      </div>
    </aside>
  );
}
