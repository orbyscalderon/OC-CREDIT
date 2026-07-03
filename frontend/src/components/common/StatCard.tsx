import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'amber';
}

const colorConfig = {
  blue:  { iconBg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', iconColor: '#2563eb', border: '#bfdbfe', accent: '#3b82f6' },
  green: { iconBg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', iconColor: '#16a34a', border: '#bbf7d0', accent: '#22c55e' },
  red:   { iconBg: 'linear-gradient(135deg,#fff1f2,#fecdd3)', iconColor: '#dc2626', border: '#fecaca', accent: '#ef4444' },
  amber: { iconBg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', iconColor: '#d97706', border: '#fde68a', accent: '#f59e0b' },
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'blue' }: Props) {
  const cfg = colorConfig[color];

  return (
    <div
      className="bg-white rounded-2xl p-5 transition-all duration-200 cursor-default"
      style={{ border: `1px solid ${cfg.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px -4px rgba(0,0,0,0.10), 0 0 0 1px ${cfg.border}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-none">{title}</p>
          {/* S2-8: tabular-nums para evitar jitter en cifras que se actualizan */}
          <p className="mt-2.5 text-2xl font-bold text-gray-900 leading-none truncate mono-nums">{value}</p>
          {trend && (
            <p className={`mt-2 text-xs font-medium mono-nums ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend}
            </p>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
          style={{ background: cfg.iconBg }}
        >
          <Icon size={20} style={{ color: cfg.iconColor }} />
        </div>
      </div>
      <div className="mt-4 h-1 rounded-full opacity-25" style={{ background: cfg.accent }} />
    </div>
  );
}
