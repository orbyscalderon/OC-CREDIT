/** Descarga un array de objetos como archivo CSV compatible con Excel */
export function exportarCSV(datos: Record<string, unknown>[], nombreArchivo: string): void {
  if (!datos.length) return;

  const encabezados = Object.keys(datos[0]);
  const escapar = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const filas = [
    encabezados.map(escapar).join(','),
    ...datos.map((row) => encabezados.map((k) => escapar(row[k])).join(',')),
  ];

  // BOM UTF-8 para que Excel reconozca tildes/ñ
  const blob = new Blob(['﻿' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
