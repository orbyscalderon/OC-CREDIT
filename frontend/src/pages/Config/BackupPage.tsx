import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Download, Shield, HardDrive, Clock } from 'lucide-react';
import { api } from '@/api/axios';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKUP_KEY = 'oc_ultimo_backup';

interface BackupMeta { fecha: string; archivo: string; }

function getUltimoBackup(): BackupMeta | null {
  try { return JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null'); }
  catch { return null; }
}

export function BackupPage() {
  const { t } = useTranslation();
  const [descargado, setDescargado] = useState(false);
  const [ultimoBackup, setUltimoBackup] = useState<BackupMeta | null>(getUltimoBackup);

  const backupMut = useMutation({
    mutationFn: () => api.get('/reportes/backup').then((r) => r.data as object),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fechaStr = new Date().toISOString().split('T')[0];
      const archivo = `backup-oc-credit-${fechaStr}.json`;
      a.href = url;
      a.download = archivo;
      a.click();
      URL.revokeObjectURL(url);
      const meta: BackupMeta = { fecha: new Date().toISOString(), archivo };
      localStorage.setItem(BACKUP_KEY, JSON.stringify(meta));
      setUltimoBackup(meta);
      setDescargado(true);
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('backup.titulo')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('backup.subtitulo')}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <HardDrive size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{t('backup.exportacion_completa')}</p>
            <p className="text-sm text-gray-500 mt-1">
              {t('backup.exportacion_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { icon: '👥', label: t('backup.item_clientes') },
            { icon: '💰', label: t('backup.item_prestamos') },
            { icon: '📋', label: t('backup.item_plan_amortizacion') },
            { icon: '🧾', label: t('backup.item_transacciones') },
            { icon: '💼', label: t('backup.item_cajas') },
            { icon: '🔒', label: t('backup.item_aislado') },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-gray-600">
              <span>{icon}</span>
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <Shield size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            {t('backup.aviso_seguridad')}
          </p>
        </div>

        <button
          onClick={() => { setDescargado(false); backupMut.mutate(); }}
          disabled={backupMut.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Download size={16} />
          {backupMut.isPending ? t('backup.generando') : t('backup.descargar')}
        </button>

        {descargado && (
          <p className="text-center text-sm text-emerald-600 font-medium">
            {t('backup.descargado_exito')}
          </p>
        )}
      </div>

      {ultimoBackup && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <Clock size={16} className="text-gray-400 flex-shrink-0" />
          <div className="text-xs text-gray-500">
            <p className="font-medium text-gray-700">{t('backup.ultimo_backup')}</p>
            <p className="mt-0.5">
              {format(parseISO(ultimoBackup.fecha), "dd 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
              {' '}·{' '}
              <span className="font-mono text-gray-400">{ultimoBackup.archivo}</span>
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        {t('common.copyright')}
      </p>
    </div>
  );
}
