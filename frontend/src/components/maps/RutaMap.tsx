import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import type { CoordenadasResponse, ClienteUbicacion } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';
import 'leaflet/dist/leaflet.css';

// Fix broken default marker icons in Vite/Webpack builds
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const cobroIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const novedadIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const clienteIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const rutaIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Props {
  puntos: CoordenadasResponse[];
  clientes?: ClienteUbicacion[];
  /** Ubicación de referencia guardada en la ruta (no un cliente ni un evento). */
  rutaUbicacion?: { lat: number; lng: number; nombre: string; direccion?: string | null } | null;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export function RutaMap({ puntos, clientes = [], rutaUbicacion, center = [18.4861, -69.9312], zoom = 12, height = '400px' }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  // La trayectoria solo conecta eventos del día (cobros/novedades) — las
  // casas de los clientes son ubicaciones fijas, no se incluyen en la línea.
  const coordPairs = puntos
    .filter((p) => p.lat && p.lng)
    .map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Trayectoria */}
      {coordPairs.length > 1 && (
        <Polyline positions={coordPairs} color="#3b82f6" weight={2} opacity={0.6} />
      )}

      {puntos.map((p, idx) => (
        <Marker
          key={`evento-${idx}`}
          position={[p.lat, p.lng]}
          icon={p.tipo === 'cobro' ? cobroIcon : novedadIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold capitalize">{p.tipo}</p>
              <p>{p.descripcion}</p>
              {p.monto !== undefined && (
                <p className="text-emerald-600 font-medium">
                  {formatCurrency(p.monto, user)}
                </p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                {new Date(p.created_at).toLocaleString('es-DO')}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Ubicación de cada cliente — dónde se entrega y cobra el préstamo */}
      {clientes.map((c) => (
        <Marker key={`cliente-${c.id}`} position={[c.lat, c.lng]} icon={clienteIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{c.nombre} {c.apellido}</p>
              {c.cedula && <p className="text-gray-500 text-xs">{c.cedula}</p>}
              {c.direccion_casa && <p className="mt-1">{c.direccion_casa}</p>}
              <p className="mt-1 text-xs text-blue-600">
                {c.prestamos_activos > 0
                  ? t('rutas.mapa_prestamos_activos', { count: c.prestamos_activos })
                  : t('rutas.mapa_sin_prestamos')}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Ubicación de referencia de la ruta (dirección/GPS guardados al crearla) */}
      {rutaUbicacion && (
        <Marker position={[rutaUbicacion.lat, rutaUbicacion.lng]} icon={rutaIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{rutaUbicacion.nombre}</p>
              {rutaUbicacion.direccion && <p className="mt-1">{rutaUbicacion.direccion}</p>}
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
