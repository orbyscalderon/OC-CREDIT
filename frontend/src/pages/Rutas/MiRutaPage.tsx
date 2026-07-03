import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Phone, MapPin, PiggyBank, Route as RouteIcon } from 'lucide-react';
import { rutasApi } from '@/api/rutas.api';
import { clientesApi } from '@/api/clientes.api';

export function MiRutaPage() {
  const { data: rutas = [], isLoading: cargandoRutas } = useQuery({
    queryKey: ['mis-rutas'],
    queryFn: rutasApi.misRutas,
  });

  const [rutaId, setRutaId] = useState<string>('');
  const rutaActiva = rutaId || rutas[0]?.id || '';

  const { data: clientes = [], isLoading: cargandoClientes } = useQuery({
    queryKey: ['clientes-ruta', rutaActiva],
    queryFn: () => clientesApi.porRuta(rutaActiva),
    enabled: !!rutaActiva,
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Ruta</h1>
        <p className="text-sm text-gray-500">Clientes que debes visitar y cobrar hoy</p>
      </div>

      {cargandoRutas ? (
        <p className="text-sm text-gray-400">Cargando rutas…</p>
      ) : rutas.length === 0 ? (
        <div className="card p-6 text-center text-sm text-amber-600 bg-amber-50">
          No tienes ninguna ruta asignada. Pide a tu administrador que te asigne una.
        </div>
      ) : (
        <>
          {rutas.length > 1 && (
            <div className="flex gap-2">
              {rutas.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRutaId(r.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    rutaActiva === r.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <RouteIcon size={13} />
                  {r.nombre}
                </button>
              ))}
            </div>
          )}

          {cargandoClientes ? (
            <p className="text-sm text-gray-400">Cargando clientes…</p>
          ) : clientes.length === 0 ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              Esta ruta no tiene clientes asignados todavía.
            </div>
          ) : (
            <div className="space-y-2">
              {clientes.map((c, i) => (
                <div key={c.id} className="card-interactive p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.nombre} {c.apellido}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {c.cedula && <span>{c.cedula}</span>}
                        {c.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} />
                            {c.telefono}
                          </span>
                        )}
                        {c.direccion_casa && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={11} />
                            {c.direccion_casa}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/cobros/nuevo?cliente_id=${c.id}`}
                    className="btn-primary flex-shrink-0 text-xs px-3 py-2"
                  >
                    <PiggyBank size={14} />
                    Cobrar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
