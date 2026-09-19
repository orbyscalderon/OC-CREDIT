import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, AlertOctagon } from 'lucide-react';
import { buroApi } from '@/api/buro.api';
import { Table } from '@/components/common/Table';
import { Badge, nivelRiesgoVariant } from '@/components/common/Badge';
import type { HistorialCredito } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';

export function BuroPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['buro-propios'],
    queryFn: () => buroApi.misReportes({ limit: 50 }),
  });

  const fmt = (n: number | null) => formatCurrency(n, user);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('buro.titulo')}</h1>
          <p className="text-sm text-gray-500">
            {t('buro.subtitulo')}
          </p>
        </div>
        <Link
          to="/buro/consultar"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Search size={15} />
          {t('buro.consultar_cedula')}
        </Link>
      </div>

      {/* Aviso permanencia */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
        <AlertOctagon size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          {t('buro.aviso_prefix')} <strong>{t('buro.aviso_bold')}</strong>{t('buro.aviso_suffix')}
        </p>
      </div>

      <Table<HistorialCredito>
        columns={[
          { key: 'cedula',  header: t('buro.col_cedula') },
          { key: 'nombre',  header: t('buro.col_cliente'), render: (r) => `${r.nombre} ${r.apellido}` },
          {
            key: 'nivel_riesgo',
            header: t('buro.col_riesgo'),
            render: (r) => <Badge label={r.nivel_riesgo} variant={nivelRiesgoVariant(r.nivel_riesgo)} />,
          },
          { key: 'motivo', header: t('buro.col_motivo') },
          {
            key: 'capital_original',
            header: t('buro.col_deuda_original'),
            render: (r) => fmt(r.capital_original),
          },
          {
            key: 'deuda_saldada',
            header: t('buro.col_saldada'),
            render: (r) => (
              <Badge label={r.deuda_saldada ? t('buro.si') : t('buro.no')} variant={r.deuda_saldada ? 'green' : 'red'} />
            ),
          },
          {
            key: 'created_at',
            header: t('buro.col_reportado'),
            render: (r) => format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es }),
          },
          { key: 'tenant_nombre', header: t('buro.col_agencia') },
        ]}
        data={data?.data ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage={t('buro.sin_reportes')}
      />

      <p className="text-right text-[11px] text-gray-400">
        {t('common.copyright')}
      </p>
    </div>
  );
}
