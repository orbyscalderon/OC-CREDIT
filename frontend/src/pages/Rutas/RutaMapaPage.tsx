import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { rutasApi } from '@/api/rutas.api';
import { RutaMap } from '@/components/maps/RutaMap';
import { format } from 'date-fns';

export function RutaMapaPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: ruta } = useQuery({
    queryKey: ['ruta', id],
    queryFn: () => rutasApi.obtener(id!),
    enabled: !!id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['coordenadas', id, fecha],
    queryFn: () => rutasApi.coordenadas(id!, fecha),
    enabled: !!id,
  });

  const eventos = data?.eventos ?? [];
  const clientes = data?.clientes ?? [];

  return (
    <div className="p-6 space-y-5">
      <Link to="/rutas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        {t('rutas.volver')}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {t('rutas.mapa_de_ruta', { nombre: ruta?.nombre ?? '…' })}
        </h1>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
          {t('rutas.leyenda_cobro')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
          {t('rutas.leyenda_novedad')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
          {t('rutas.leyenda_cliente')}
        </span>
      </div>

      {isLoading ? (
        <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
          {t('rutas.cargando_mapa')}
        </div>
      ) : (
        <RutaMap puntos={eventos} clientes={clientes} height="480px" />
      )}

      <p className="text-xs text-gray-400">
        {t('rutas.resumen_eventos', { eventos: eventos.length, fecha, clientes: clientes.length })}
        {' · '}{t('rutas.mapa_atribucion')}
      </p>
    </div>
  );
}
