import { clsx } from 'clsx';

type Variant = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple';

const variants: Record<Variant, string> = {
  green:  'bg-emerald-100 text-emerald-700',
  red:    'bg-red-100 text-red-700',
  amber:  'bg-amber-100 text-amber-700',
  blue:   'bg-blue-100 text-blue-700',
  gray:   'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ label, variant = 'gray' }: { label: string; variant?: Variant }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant])}>
      {label}
    </span>
  );
}

export function estadoPrestamoVariant(estado: string): Variant {
  const map: Record<string, Variant> = {
    Activo: 'green', Pendiente: 'amber', Pagado: 'blue',
    Vencido: 'red', Rechazado: 'red', PagadoPorRenovacion: 'purple',
  };
  return map[estado] ?? 'gray';
}

export function nivelRiesgoVariant(nivel: string): Variant {
  const map: Record<string, Variant> = {
    Bajo: 'green', Medio: 'amber', Alto: 'red', CriticoNoPrestable: 'red',
  };
  return map[nivel] ?? 'gray';
}
