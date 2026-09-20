import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Download, Shield, HardDrive, Clock, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/api/axios';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface RestoreResult {
  restaurados: Record<string, number>;
  en_el_archivo: Record<string, number>;
}

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

  // ── Restaurar backup ──────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{ nombre: string; contenido: object } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const onArchivoElegido = async (file: File | undefined) => {
    setErrorArchivo(null);
    setConfirmando(false);
    if (!file) { setArchivoSeleccionado(null); return; }
    try {
      const texto = await file.text();
      const contenido = JSON.parse(texto);
      setArchivoSeleccionado({ nombre: file.name, contenido });
    } catch {
      setArchivoSeleccionado(null);
      setErrorArchivo(t('backup.archivo_invalido'));
    }
  };

  const restoreMut = useMutation({
    mutationFn: () => api.post('/reportes/restaurar-backup', archivoSeleccionado!.contenido).then((r) => r.data as RestoreResult),
    onSuccess: () => {
      setConfirmando(false);
      setArchivoSeleccionado(null);
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  const restoreErrMsg = restoreMut.isError
    ? ((restoreMut.error as any)?.response?.data?.message ?? t('backup.error_restaurar'))
    : null;

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

        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          {t('backup.aviso_manual')}
        </p>
      </div>

      {/* Restaurar backup */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Upload size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{t('backup.restaurar_titulo')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('backup.restaurar_desc')}</p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={(e) => onArchivoElegido(e.target.files?.[0])}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
        >
          <Upload size={15} />
          {archivoSeleccionado ? archivoSeleccionado.nombre : t('backup.elegir_archivo')}
        </button>

        {errorArchivo && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <AlertCircle size={13} /> {errorArchivo}
          </p>
        )}

        {archivoSeleccionado && !restoreMut.isSuccess && (
          <>
            {!confirmando ? (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-700"
              >
                {t('backup.restaurar_boton')}
              </button>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs text-amber-800">{t('backup.confirmar_restaurar')}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => restoreMut.mutate()}
                    disabled={restoreMut.isPending}
                    className="flex-1 rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {restoreMut.isPending ? t('backup.restaurando') : t('backup.si_restaurar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {t('common.cancelar')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {restoreErrMsg && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <AlertCircle size={13} /> {Array.isArray(restoreErrMsg) ? restoreErrMsg.join(', ') : restoreErrMsg}
          </p>
        )}

        {restoreMut.isSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> {t('backup.restaurado_exito')}
            </p>
            {Object.entries(restoreMut.data.restaurados).map(([tabla, n]) => (
              <p key={tabla} className="text-xs text-emerald-700">
                {t(`backup.tabla_${tabla}`)}: +{n}
                {restoreMut.data.en_el_archivo[tabla] > n && (
                  <span className="text-emerald-600/70">
                    {' '}({t('backup.ya_existian', { n: restoreMut.data.en_el_archivo[tabla] - n })})
                  </span>
                )}
              </p>
            ))}
          </div>
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
