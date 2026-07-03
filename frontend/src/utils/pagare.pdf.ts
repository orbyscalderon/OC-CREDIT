import { jsPDF } from 'jspdf';
import type { Prestamo } from '@/types';

interface PagareData {
  prestamo: Prestamo;
  tenantNombre: string;
  tenantDireccion?: string;
  tenantTelefono?: string;
  simboloMoneda?: string;
  firmaClienteDataUrl?: string;   // PNG base64 de la firma digital
}

export function generarPagarePDF(data: PagareData): void {
  const { prestamo, tenantNombre, simboloMoneda = 'RD$' } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const hoy = new Date().toLocaleDateString('es-DO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const fmt = (n: number) =>
    simboloMoneda + ' ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const cliente = prestamo.cliente;
  const nombreCliente = cliente
    ? `${cliente.nombre} ${cliente.apellido}`
    : 'Cliente';
  const cedulaCliente = cliente?.cedula ?? '_______________';

  // ── Encabezado ─────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PAGARÉ', 105, 25, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(tenantNombre, 105, 32, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Fecha: ${hoy}`, 170, 40, { align: 'right' });
  doc.text(`Ref: ${prestamo.id.slice(-8).toUpperCase()}`, 170, 45, { align: 'right' });

  // ── Línea separadora ───────────────────────────────────────
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // ── Cuerpo ─────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const texto = [
    `Yo, ${nombreCliente}, portador de la cédula de identidad No. ${cedulaCliente},`,
    `me comprometo a pagar incondicionalmente a ${tenantNombre} la suma de:`,
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

  const detalles = [
    `Más intereses a la tasa de ${prestamo.tasa_interes}% sobre saldo, en ${prestamo.num_cuotas} cuotas`,
    `${prestamo.modalidad.toLowerCase()}s de ${fmt((prestamo.capital_aprobado * (1 + prestamo.tasa_interes / 100)) / prestamo.num_cuotas)}`,
    `con vencimiento de la primera cuota el ${
      prestamo.fecha_primer_vencimiento
        ? new Date(prestamo.fecha_primer_vencimiento).toLocaleDateString('es-DO')
        : '___/___/______'
    }.`,
    '',
    'En caso de mora, se aplicará el cargo correspondiente según las condiciones pactadas.',
    'Este pagaré no admite prórroga y es ejecutable por la vía ejecutiva.',
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
  doc.text('Capital prestado', 25, y + 5.5);
  doc.text('Tasa interés', 75, y + 5.5);
  doc.text('# Cuotas', 115, y + 5.5);
  doc.text('Modalidad', 150, y + 5.5);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(fmt(prestamo.capital_aprobado), 25, y + 5.5);
  doc.text(`${prestamo.tasa_interes}%`, 75, y + 5.5);
  doc.text(String(prestamo.num_cuotas), 115, y + 5.5);
  doc.text(prestamo.modalidad, 150, y + 5.5);
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
  doc.text('Firma del deudor', 50, y + 5, { align: 'center' });
  doc.text(`${nombreCliente}`, 50, y + 10, { align: 'center' });
  doc.text(`Cédula: ${cedulaCliente}`, 50, y + 15, { align: 'center' });

  doc.text('Firma del prestamista', 150, y + 5, { align: 'center' });
  doc.text(tenantNombre, 150, y + 10, { align: 'center' });

  // ── Pie ────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    '© 2026 OC Moon Group LLC. Todos los derechos reservados. Generado por OC Credit.',
    105,
    285,
    { align: 'center' },
  );

  // Descargar
  doc.save(`pagare-${prestamo.id.slice(-8).toUpperCase()}.pdf`);
}
