import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, AlertOctagon } from 'lucide-react';
import { buroApi } from '@/api/buro.api';
import { Table } from '@/components/common/Table';
import { Badge, nivelRiesgoVariant } from '@/components/common/Badge';
import type { HistorialCredito } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function BuroPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['buro-propios'],
    queryFn: () => buroApi.misReportes({ limit: 50 }),
  });

  const fmt = (n: number | null) =>
    'RD$ ' + Number(n ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buró de Crédito</h1>
          <p className="text-sm text-gray-500">
            Historial permanente de mal crédito — registros que sobreviven al tenant
          </p>
        </div>
        <Link
          to="/buro/consultar"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Search size={15} />
          Consultar cédula
        </Link>
      </div>

      {/* Aviso permanencia */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
        <AlertOctagon size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          Los reportes del buró son <strong>permanentes e inmutables</strong>. Solo pueden ser
          inactivados por el super-admin de la plataforma ante errores de captura o resolución legal.
          Consulte el historial antes de aprobar cualquier préstamo.
        </p>
      </div>

      <Table<HistorialCredito>
        columns={[
          { key: 'cedula',  header: 'Cédula' },
          { key: 'nombre',  header: 'Cliente', render: (r) => `${r.nombre} ${r.apellido}` },
          {
            key: 'nivel_riesgo',
            header: 'Riesgo',
            render: (r) => <Badge label={r.nivel_riesgo} variant={nivelRiesgoVariant(r.nivel_riesgo)} />,
          },
          { key: 'motivo', header: 'Motivo' },
          {
            key: 'capital_original',
            header: 'Deuda original',
            render: (r) => fmt(r.capital_original),
          },
          {
            key: 'deuda_saldada',
            header: 'Saldada',
            render: (r) => (
              <Badge label={r.deuda_saldada ? 'Sí' : 'No'} variant={r.deuda_saldada ? 'green' : 'red'} />
            ),
          },
          {
            key: 'created_at',
            header: 'Reportado',
            render: (r) => format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es }),
          },
          { key: 'tenant_nombre', header: 'Agencia' },
        ]}
        data={data?.data ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No ha emitido reportes"
      />

      <p className="text-right text-[11px] text-gray-400">
        © 2026 OC HOLDING GROUP LLC. Todos los derechos reservados.
      </p>
    </div>
  );
}
