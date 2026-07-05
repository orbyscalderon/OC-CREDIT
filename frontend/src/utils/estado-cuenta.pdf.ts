import { jsPDF } from 'jspdf';

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
}

export function generarEstadoCuentaPDF(data: EstadoCuentaData): void {
  const { simboloMoneda = 'RD$' } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  const fmt = (n: number) =>
    simboloMoneda + ' ' + Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const fmtFecha = (f: string | null) =>
    f ? new Date(f).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = 18;

  // ── Encabezado ─────────────────────────────────────────────────────────────
  doc.setFontSize(16).setFont('helvetica', 'bold');
  doc.text(data.tenantNombre, margin, y);
  y += 7;

  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100);
  doc.text(`Estado de Cuenta — Generado el ${new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y);
  y += 10;

  // Línea divisora
  doc.setDrawColor(220).line(margin, y, W - margin, y);
  y += 8;

  // ── Datos del cliente ───────────────────────────────────────────────────────
  doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(30);
  doc.text('Datos del cliente', margin, y);
  y += 6;

  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(60);
  const col2 = W / 2;
  doc.text(`Nombre: ${data.clienteNombre}`, margin, y);
  doc.text(`Cédula: ${data.clienteCedula ?? '—'}`, col2, y);
  y += 6;
  doc.text(`Teléfono: ${data.clienteTelefono ?? '—'}`, margin, y);
  doc.text(`Dirección: ${data.clienteDireccion ?? '—'}`, col2, y);
  y += 10;

  doc.setDrawColor(220).line(margin, y, W - margin, y);
  y += 8;

  // ── Historial de préstamos ──────────────────────────────────────────────────
  doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(30);
  doc.text('Historial de Préstamos', margin, y);
  y += 7;

  if (!data.prestamos.length) {
    doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(150);
    doc.text('Sin préstamos registrados.', margin, y);
    y += 8;
  } else {
    // Cabecera de tabla
    const cols = { capital: margin, modalidad: 68, cuotas: 108, estado: 130, fecha: 155 };
    doc.setFillColor(245, 247, 250).rect(margin, y - 4, W - margin * 2, 8, 'F');
    doc.setFontSize(8.5).setFont('helvetica', 'bold').setTextColor(80);
    doc.text('Capital', cols.capital, y);
    doc.text('Modalidad', cols.modalidad, y);
    doc.text('Cuotas', cols.cuotas, y);
    doc.text('Estado', cols.estado, y);
    doc.text('Aprobación', cols.fecha, y);
    y += 6;

    let totalCapital = 0;
    data.prestamos.forEach((p, i) => {
      if (y > 250) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(250, 251, 252).rect(margin, y - 3.5, W - margin * 2, 7, 'F');
      }
      doc.setFont('helvetica', 'normal').setTextColor(40);
      doc.text(fmt(p.capital_aprobado), cols.capital, y);
      doc.text(p.modalidad, cols.modalidad, y);
      doc.text(String(p.num_cuotas), cols.cuotas, y);
      doc.text(p.estado, cols.estado, y);
      doc.text(fmtFecha(p.fecha_aprobacion), cols.fecha, y);
      y += 7;
      totalCapital += Number(p.capital_aprobado);
    });

    y += 2;
    doc.setDrawColor(200).line(margin, y, W - margin, y);
    y += 6;
    doc.setFont('helvetica', 'bold').setTextColor(30).setFontSize(10);
    doc.text(`Total capital histórico: ${fmt(totalCapital)}`, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100);
    doc.text(`Total de préstamos: ${data.prestamos.length}`, margin, y);
  }

  // ── Pie de página ───────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8).setTextColor(160);
  doc.text(
    `© ${new Date().getFullYear()} OC HOLDING GROUP LLC. Todos los derechos reservados. Generado por OC Credit.`,
    W / 2, pageH - 10,
    { align: 'center' },
  );

  doc.save(`estado-cuenta-${data.clienteNombre.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
