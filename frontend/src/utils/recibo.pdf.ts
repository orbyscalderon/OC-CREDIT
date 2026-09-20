import { jsPDF } from 'jspdf';
import i18n from '@/i18n/config';

interface ReciboPagoData {
  transaccionId: string;
  clienteNombre: string;
  clienteCedula: string;
  montoCobrado: number;
  distribucion: {
    mora: number;
    interes: number;
    capital: number;
  };
  cobrador: string;
  tenantNombre: string;
  piePagina?: string;
  simboloMoneda?: string;
  fecha?: string;
  idioma?: 'es' | 'en';
}

export function generarReciboPDF(data: ReciboPagoData): void {
  const { simboloMoneda = 'RD$', piePagina } = data;
  const lng = data.idioma ?? i18n.language ?? 'es';
  const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, { ...params, lng });
  const locale = lng === 'en' ? 'en-US' : 'es-DO';

  const doc = new jsPDF({ unit: 'mm', format: [80, 140] }); // 80mm ticket

  const fmt = (n: number) =>
    simboloMoneda + ' ' + Number(n).toLocaleString(locale, { minimumFractionDigits: 2 });

  const fecha = data.fecha
    ? new Date(data.fecha).toLocaleString(locale)
    : new Date().toLocaleString(locale);

  let y = 8;
  const cx = 40; // centro del ticket

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.tenantNombre, cx, y, { align: 'center' });
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(t('recibo.titulo'), cx, y, { align: 'center' });
  y += 5;

  doc.setLineWidth(0.3);
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFontSize(8);
  doc.text(t('recibo.ref', { ref: data.transaccionId.slice(-8).toUpperCase() }), 5, y);
  y += 4;
  doc.text(t('recibo.fecha', { fecha }), 5, y);
  y += 4;
  doc.text(t('recibo.cliente', { nombre: data.clienteNombre }), 5, y);
  y += 4;
  doc.text(t('recibo.cedula', { cedula: data.clienteCedula }), 5, y);
  y += 4;
  doc.text(t('recibo.cobrador', { nombre: data.cobrador }), 5, y);
  y += 5;

  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text(t('recibo.distribucion_titulo'), 5, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  const dist = data.distribucion;
  if (dist.mora > 0) {
    doc.text(t('recibo.mora'), 5, y);
    doc.text(fmt(dist.mora), 75, y, { align: 'right' });
    y += 4;
  }
  if (dist.interes > 0) {
    doc.text(t('recibo.interes'), 5, y);
    doc.text(fmt(dist.interes), 75, y, { align: 'right' });
    y += 4;
  }
  if (dist.capital > 0) {
    doc.text(t('recibo.capital'), 5, y);
    doc.text(fmt(dist.capital), 75, y, { align: 'right' });
    y += 4;
  }

  y += 2;
  doc.setLineWidth(0.5);
  doc.line(5, y, 75, y);
  y += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(t('recibo.total_pagado'), 5, y);
  doc.text(fmt(data.montoCobrado), 75, y, { align: 'right' });
  y += 8;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (piePagina) {
    doc.text(piePagina, cx, y, { align: 'center', maxWidth: 68 });
    y += 8;
  }
  doc.text(t('recibo.derechos_reservados', { year: new Date().getFullYear(), tenant: data.tenantNombre }), cx, y, { align: 'center' });

  doc.save(`recibo-${data.transaccionId.slice(-8).toUpperCase()}.pdf`);
}
