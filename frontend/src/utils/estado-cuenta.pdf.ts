import { jsPDF } from 'jspdf';
import i18n from '@/i18n/config';

interface PrestamoResumen {
  id: string;
  capital_aprobado: number;
  modalidad: string;
  num_cuotas: number;
  estado: string;
  fecha_aprobacion: string | null;
}

interface EstadoCuentaData {
  clienteNombre: string;
  clienteCedula: string | null;
  clienteTelefono: string | null;
  clienteDireccion: string | null;
  tenantNombre: string;
  prestamos: PrestamoResumen[];
  simboloMoneda?: string;
  idioma?: 'es' | 'en';
}

const MODALIDAD_KEY: Record<string, string> = {
  Diario: 'calculadora.modalidad_diario',
  Semanal: 'calculadora.modalidad_semanal',
  Quincenal: 'calculadora.modalidad_quincenal',
  Mensual: 'calculadora.modalidad_mensual',
};

export function generarEstadoCuentaPDF(data: EstadoCuentaData): void {
  const { simboloMoneda = 'RD$' } = data;
  const lng = data.idioma ?? i18n.language ?? 'es';
  const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, { ...params, lng });
  const locale = lng === 'en' ? 'en-US' : 'es-DO';

  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  const fmt = (n: number) =>
    simboloMoneda + ' ' + Number(n).toLocaleString(locale, { minimumFractionDigits: 2 });

  const fmtFecha = (f: string | null) =>
    f ? new Date(f).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 18;

  // ── Encabezado ─────────────────────────────────────────────────────────────
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.text(data.tenantNombre, margin, y);
  y += 7;

  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100);
  doc.text(t('estado_cuenta.titulo', { fecha: new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) }), margin, y);
  y += 10;

  // Línea divisora
  doc.setDrawColor(220).line(margin, y, W - margin, y);
  y += 8;

  // ── Datos del cliente ───────────────────────────────────────────────────────
  doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(30);
  doc.text(t('estado_cuenta.datos_cliente'), margin, y);
  y += 6;

  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(60);
  const col2 = W / 2;
  doc.text(t('estado_cuenta.nombre', { nombre: data.clienteNombre }), margin, y);
  doc.text(t('estado_cuenta.cedula', { cedula: data.clienteCedula ?? '—' }), col2, y);
  y += 6;
  doc.text(t('estado_cuenta.telefono', { telefono: data.clienteTelefono ?? '—' }), margin, y);
  doc.text(t('estado_cuenta.direccion', { direccion: data.clienteDireccion ?? '—' }), col2, y);
  y += 10;

  doc.setDrawColor(220).line(margin, y, W - margin, y);
  y += 8;

  // ── Historial de préstamos ──────────────────────────────────────────────────
  doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(30);
  doc.text(t('estado_cuenta.historial_titulo'), margin, y);
  y += 7;

  if (!data.prestamos.length) {
    doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(150);
    doc.text(t('estado_cuenta.sin_prestamos'), margin, y);
    y += 8;
  } else {
    // Cabecera de tabla
    const cols = { capital: margin, modalidad: 68, cuotas: 108, estado: 130, fecha: 155 };
    doc.setFillColor(245, 247, 250).rect(margin, y - 4, W - margin * 2, 8, 'F');
    doc.setFontSize(8.5).setFont('helvetica', 'bold').setTextColor(80);
    doc.text(t('estado_cuenta.col_capital'), cols.capital, y);
    doc.text(t('estado_cuenta.col_modalidad'), cols.modalidad, y);
    doc.text(t('estado_cuenta.col_cuotas'), cols.cuotas, y);
    doc.text(t('estado_cuenta.col_estado'), cols.estado, y);
    doc.text(t('estado_cuenta.col_aprobacion'), cols.fecha, y);
    y += 6;

    let totalCapital = 0;
    data.prestamos.forEach((p, i) => {
      if (y > 250) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(250, 251, 252).rect(margin, y - 3.5, W - margin * 2, 7, 'F');
      }
      doc.setFont('helvetica', 'normal').setTextColor(40);
      doc.text(fmt(p.capital_aprobado), cols.capital, y);
      doc.text(t(MODALIDAD_KEY[p.modalidad] ?? p.modalidad), cols.modalidad, y);
      doc.text(String(p.num_cuotas), cols.cuotas, y);
      doc.text(t(`estado_prestamo.${p.estado}`), cols.estado, y);
      doc.text(fmtFecha(p.fecha_aprobacion), cols.fecha, y);
      y += 7;
      totalCapital += Number(p.capital_aprobado);
    });

    y += 2;
    doc.setDrawColor(200).line(margin, y, W - margin, y);
    y += 6;
    doc.setFont('helvetica', 'bold').setTextColor(30).setFontSize(10);
    doc.text(t('estado_cuenta.total_capital_historico', { monto: fmt(totalCapital) }), margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100);
    doc.text(t('estado_cuenta.total_prestamos', { n: data.prestamos.length }), margin, y);
  }

  // ── Pie de página ───────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8).setTextColor(160);
  doc.text(
    t('estado_cuenta.derechos_reservados', { year: new Date().getFullYear(), tenant: data.tenantNombre }),
    W / 2, pageH - 10,
    { align: 'center' },
  );

  doc.save(`estado-cuenta-${data.clienteNombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
