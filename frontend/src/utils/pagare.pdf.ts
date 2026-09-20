import { jsPDF } from 'jspdf';
import type { Prestamo } from '@/types';
import i18n from '@/i18n/config';

interface PagareData {
  prestamo: Prestamo;
  tenantNombre: string;
  tenantDireccion?: string;
  tenantTelefono?: string;
  simboloMoneda?: string;
  firmaClienteDataUrl?: string;   // PNG base64 de la firma digital
  idioma?: 'es' | 'en';           // default: idioma activo del panel
}

const MODALIDAD_KEY: Record<string, string> = {
  Diario: 'calculadora.modalidad_diario',
  Semanal: 'calculadora.modalidad_semanal',
  Quincenal: 'calculadora.modalidad_quincenal',
  Mensual: 'calculadora.modalidad_mensual',
};

export function generarPagarePDF(data: PagareData): void {
  const { prestamo, tenantNombre, simboloMoneda = 'RD$' } = data;
  const lng = data.idioma ?? i18n.language ?? 'es';
  const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, { ...params, lng });
  const locale = lng === 'en' ? 'en-US' : 'es-DO';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const hoy = new Date().toLocaleDateString(locale, {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const fmt = (n: number) =>
    simboloMoneda + ' ' + n.toLocaleString(locale, { minimumFractionDigits: 2 });

  const cliente = prestamo.cliente;
  const nombreCliente = cliente
    ? `${cliente.nombre} ${cliente.apellido}`
    : t('pagare.cliente_default');
  const cedulaCliente = cliente?.cedula ?? '_______________';
  const modalidadLabel = t(MODALIDAD_KEY[prestamo.modalidad] ?? prestamo.modalidad);

  // ── Encabezado ─────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(t('pagare.titulo'), 105, 25, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(tenantNombre, 105, 32, { align: 'center' });

  doc.setFontSize(9);
  doc.text(t('pagare.fecha', { fecha: hoy }), 170, 40, { align: 'right' });
  doc.text(t('pagare.ref', { ref: prestamo.id.slice(-8).toUpperCase() }), 170, 45, { align: 'right' });

  // ── Línea separadora ───────────────────────────────────────
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // ── Cuerpo ─────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const texto = [
    t('pagare.l1', { nombre: nombreCliente, cedula: cedulaCliente }),
    t('pagare.l2', { tenant: tenantNombre }),
  ];

  let y = 60;
  texto.forEach((line) => {
    doc.text(line, 20, y);
    y += 6;
  });

  // Monto destacado
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(prestamo.capital_aprobado), 105, y + 5, { align: 'center' });
  y += 14;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const cuotaMonto = fmt((prestamo.capital_aprobado * (1 + prestamo.tasa_interes / 100)) / prestamo.num_cuotas);
  const detalles = [
    t('pagare.interes_cuotas', { tasa: prestamo.tasa_interes, cuotas: prestamo.num_cuotas }),
    lng === 'en'
      ? t('pagare.cuota_monto_en', { modalidad: modalidadLabel, monto: cuotaMonto })
      : t('pagare.cuota_monto_es', { modalidad: prestamo.modalidad.toLowerCase(), monto: cuotaMonto }),
    t('pagare.vencimiento', {
      fecha: prestamo.fecha_primer_vencimiento
        ? new Date(prestamo.fecha_primer_vencimiento).toLocaleDateString(locale)
        : t('pagare.vencimiento_pendiente'),
    }),
    '',
    t('pagare.mora_clausula'),
    t('pagare.no_prorroga_clausula'),
  ];

  detalles.forEach((line) => {
    doc.text(line, 20, y);
    y += line ? 6 : 4;
  });

  // ── Tabla resumen ──────────────────────────────────────────
  y += 6;
  doc.setFillColor(240, 247, 255);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text(t('pagare.capital_prestado'), 25, y + 5.5);
  doc.text(t('pagare.tasa_interes'), 75, y + 5.5);
  doc.text(t('pagare.num_cuotas_corto'), 115, y + 5.5);
  doc.text(t('pagare.modalidad'), 150, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(fmt(prestamo.capital_aprobado), 25, y + 5.5);
  doc.text(`${prestamo.tasa_interes}%`, 75, y + 5.5);
  doc.text(String(prestamo.num_cuotas), 115, y + 5.5);
  doc.text(modalidadLabel, 150, y + 5.5);
  y += 10;

  // ── Firmas ─────────────────────────────────────────────────
  y = Math.max(y + 20, 220);
  doc.setLineWidth(0.3);

  // Si hay firma digital, insertarla encima de la línea
  if (data.firmaClienteDataUrl) {
    try {
      doc.addImage(data.firmaClienteDataUrl, 'PNG', 20, y - 25, 60, 22);
    } catch (_) { /* imagen inválida, continúa sin firma */ }
  }

  doc.line(20, y, 80, y);
  doc.line(110, y, 190, y);

  doc.setFontSize(9);
  doc.text(t('pagare.firma_deudor'), 50, y + 5, { align: 'center' });
  doc.text(`${nombreCliente}`, 50, y + 10, { align: 'center' });
  doc.text(t('pagare.cedula_corto', { cedula: cedulaCliente }), 50, y + 15, { align: 'center' });

  doc.text(t('pagare.firma_prestamista'), 150, y + 5, { align: 'center' });
  doc.text(tenantNombre, 150, y + 10, { align: 'center' });

  // ── Pie ────────────────────────────────────────────────────
  // Este es un documento legal del PRESTAMISTA (el tenant), no del proveedor
  // del software -- el pie no debe llevar la marca de OCA Credit.
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    t('pagare.derechos_reservados', { year: new Date().getFullYear(), tenant: tenantNombre }),
    105,
    285,
    { align: 'center' },
  );

  // Descargar
  doc.save(`pagare-${prestamo.id.slice(-8).toUpperCase()}.pdf`);
}
