import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { cajasApi } from '@/api/cajas.api';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/hooks/useAuth';
import { Rol } from '@/types';

export function CajaArqueoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [montoCierre, setMontoCierre] = useState('');

  const { data: caja, isLoading } = useQuery({
    queryKey: ['arqueo', id],
    queryFn: () => cajasApi.obtenerArqueo(id!),
    enabled: !!id,
  });

  const cerrarMut = useMutation({
    mutationFn: () =>
      cajasApi.cerrar(id!, { monto_cierre_declarado: parseFloat(montoCierre) || 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arqueo', id] });
      qc.invalidateQueries({ queryKey: ['cajas-hoy'] });
    },
  });

  const fmt = (n: number) =>
    'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const isAdmin = user?.rol === Rol.ADMIN_TENANT;

  if (isLoading) return <div className="p-6 text-gray-400">Cargando…</div>;
  if (!caja) return <div className="p-6 text-red-500">Caja no encontrada</div>;

  const neto = caja.monto_apertura + caja.total_cobros - caja.total_gastos;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <Link to="/cajas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver a cajas
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Arqueo de Caja</h1>
            {caja.ruta_nombre && <p className="text-sm text-gray-500">{caja.ruta_nombre}</p>}
          </div>
          <Badge
            label={caja.estado}
            variant={caja.estado === 'Abierta' ? 'green' : 'gray'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-gray-400 text-xs">Apertura</p>
            <p className="font-semibold text-gray-900">{fmt(caja.monto_apertura)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-gray-400 text-xs">Total cobros</p>
            <p className="font-semibold text-emerald-600">{fmt(caja.total_cobros)}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-gray-400 text-xs">Total gastos</p>
            <p className="font-semibold text-red-500">{fmt(caja.total_gastos)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-gray-400 text-xs">Neto esperado</p>
            <p className="font-semibold text-blue-600">{fmt(neto)}</p>
          </div>
        </div>

        {/* Diferencia y cuadre: solo visible para admin */}
        {isAdmin && caja.estado === 'Cerrada' && caja.diferencia_cierre !== null && (
          <div
            className={`rounded-lg p-4 border ${
              caja.estado_cuadre === 'Cuadrado'
                ? 'bg-emerald-50 border-emerald-200'
                : caja.estado_cuadre === 'Sobrante'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p className="text-sm font-semibold">
              {caja.estado_cuadre} — Diferencia: {fmt(Math.abs(caja.diferencia_cierre!))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Declarado por cobrador: {fmt(caja.monto_cierre_declarado ?? 0)}
            </p>
          </div>
        )}

        {/* Formulario de cierre */}
        {caja.estado === 'Abierta' && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Lock size={14} />
              Cerrar caja
            </p>
            <p className="text-xs text-gray-500">
              Introduce el monto en físico que tienes en caja ahora mismo.
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                value={montoCierre}
                onChange={(e) => setMontoCierre(e.target.value)}
                placeholder="Monto declarado"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => cerrarMut.mutate()}
                disabled={!montoCierre || cerrarMut.isPending}
                className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>
            {!isAdmin && (
              <p className="text-xs text-gray-400 italic">
                El resultado del cuadre es revisado por el administrador.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
