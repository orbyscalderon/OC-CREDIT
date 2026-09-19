const RADIO_TIERRA_KM = 6371;

/** Distancia entre dos puntos GPS en kilómetros (fórmula de Haversine). */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface PuntoOrdenable {
  id: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Ordena puntos por cercanía usando la heurística del vecino más cercano,
 * partiendo del primer punto CON coordenadas en la lista de entrada.
 * Los puntos sin coordenadas (lat o lng null) se dejan al final, en el
 * mismo orden relativo en que llegaron (normalmente ya alfabético).
 */
export function ordenarPorCercania<T extends PuntoOrdenable>(puntos: T[]): T[] {
  const conCoordenadas = puntos.filter((p) => p.lat != null && p.lng != null);
  const sinCoordenadas = puntos.filter((p) => p.lat == null || p.lng == null);

  if (conCoordenadas.length <= 1) return [...conCoordenadas, ...sinCoordenadas];

  const restantes = [...conCoordenadas];
  const ordenados: T[] = [restantes.shift()!];

  while (restantes.length > 0) {
    const actual = ordenados[ordenados.length - 1];
    let idxMasCercano = 0;
    let distMasCercana = Infinity;

    for (let i = 0; i < restantes.length; i++) {
      const d = haversineKm(actual.lat!, actual.lng!, restantes[i].lat!, restantes[i].lng!);
      if (d < distMasCercana) {
        distMasCercana = d;
        idxMasCercano = i;
      }
    }

    ordenados.push(restantes.splice(idxMasCercano, 1)[0]);
  }

  return [...ordenados, ...sinCoordenadas];
}
