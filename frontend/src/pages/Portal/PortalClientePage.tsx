import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Shield, ChevronRight } from 'lucide-react';
import axios from 'axios';

const portalApi = axios.create({ baseURL: '/api/v1', timeout: 15_000 });

interface ProximaCuota {
  numero: number;
  monto: number;
  vence: string;
}

interface Prestamo {
  prestamo_id: string;
  capital: number;
  estado: string;
  modalidad: string;
  cuotas_pendientes: number;
  proxima_cuota: ProximaCuota | null;
}

interface ClientePortal {
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  prestamos: Prestamo[];
}

export function PortalClientePage() {
  const [cedula, setCedula] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [cliente, setCliente] = useState<ClientePortal | null>(null);

  const consultarMut = useMutation({
    mutationFn: async () => {
      const r = await portalApi.get(`/portal/consultar/${cedula.trim()}?tenantId=${tenantId}`);
      return (r.data as any).data ?? r.data;
    },
    onSuccess: (data) => setCliente(data),
  });

  const fmt = (n: number) =>
    'RD$ ' + Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Portal del Cliente</h1>
          <p className="text-blue-100 text-sm mt-1">Consulta tus préstamos y cuotas pendientes</p>
        </div>

        {!cliente ? (
          <div className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu cédula</label>
              <input
                value={cedula}
                onChange={e => setCedula(e.target.value)}
                placeholder="000-0000000-0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID de tu empresa prestamista</label>
              <input
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                placeholder="Código de empresa (te lo da tu prestamista)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {consultarMut.isError && (
              <p className="text-sm text-red-500">No se encontró cliente con esa cédula.</p>
            )}

            <button
              onClick={() => consultarMut.mutate()}
              disabled={!cedula.trim() || !tenantId.trim() || consultarMut.isPending}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {consultarMut.isPending ? 'Consultando…' : 'Consultar mis préstamos'}
            </button>

            <p className="text-center text-xs text-gray-400">
              © 2026 OC HOLDING GROUP LLC. Todos los derechos reservados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info cliente */}
            <div className="bg-white rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                  {cliente.nombre[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{cliente.nombre} {cliente.apellido}</p>
                  <p className="text-xs text-gray-500">{cliente.cedula}</p>
                </div>
              </div>
            </div>

            {/* Préstamos */}
            {cliente.prestamos?.filter(Boolean).map((pr, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">
                    Préstamo {pr.modalidad}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    pr.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {pr.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Capital</p>
                    <p className="font-semibold">{fmt(pr.capital)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Cuotas pendientes</p>
                    <p className="font-semibold">{pr.cuotas_pendientes}</p>
                  </div>
                </div>

                {pr.proxima_cuota && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Próxima cuota</p>
                        <p className="text-lg font-extrabold text-blue-700">
                          {fmt(pr.proxima_cuota.monto)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Vence: {new Date(pr.proxima_cuota.vence).toLocaleDateString('es-DO')}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-blue-400" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setCliente(null)}
              className="w-full rounded-xl bg-white/20 py-2.5 text-sm font-medium text-white hover:bg-white/30"
            >
              Nueva consulta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
