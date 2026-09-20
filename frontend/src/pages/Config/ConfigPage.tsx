import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/axios';
import { reportesApi } from '@/api/reportes.api';
import { useAuth } from '@/hooks/useAuth';
import type { TenantSettings } from '@/types';
import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, AlertCircle, KeyRound, Upload, X, MessageCircle, Link2, Copy, Check,
} from 'lucide-react';
import { ZONAS_HORARIAS, FORMATOS_FECHA } from '@/utils/zonasHorarias';
import { MONEDAS, buscarMoneda } from '@/utils/currencies';

type FormData = {
  color_primario: string;
  color_secundario: string;
  moneda: string;
  simbolo_moneda: string;
  nombre_comercial?: string;
  texto_pie_recibo?: string;
  whatsapp_activo: boolean;
  zona_horaria: string;
  formato_fecha: string;
};

export function ConfigPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();

  const schema = z.object({
    color_primario:   z.string().regex(/^#[0-9A-Fa-f]{6}$/, t('config.color_hex_invalido')),
    color_secundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/, t('config.color_hex_invalido')),
    moneda:           z.string().min(1, t('config.requerido')).max(3),
    simbolo_moneda:   z.string().min(1, t('config.requerido')).max(5),
    nombre_comercial: z.string().max(200).optional().or(z.literal('')),
    texto_pie_recibo: z.string().max(300).optional().or(z.literal('')),
    whatsapp_activo:  z.boolean(),
    zona_horaria:     z.string().min(1, t('config.requerido')),
    formato_fecha:    z.string().min(1, t('config.requerido')),
  });

  // ── Portal link ────────────────────────────────────────────────────────────
  const portalUrl = `${window.location.origin}/portal?tenantId=${user?.tenantId ?? ''}`;
  const [copiado, setCopiado] = useState(false);
  const copiarLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // ── Logo upload ────────────────────────────────────────────────────────────
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const logoMut = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('logo', file);
      return api.post('/tenants/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] });
      setLogoFile(null);
    },
  });

  // ── Cambiar contraseña ──────────────────────────────────────────────────────
  const [showPwd, setShowPwd] = useState(false);
  const [pwdActual, setPwdActual] = useState('');
  const [pwdNueva, setPwdNueva] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  const cambiarPwdMut = useMutation({
    mutationFn: () =>
      api.put('/auth/cambiar-password', { password_actual: pwdActual, nueva_password: pwdNueva })
        .then(r => r.data),
    onSuccess: () => {
      setPwdMsg(t('config.contrasena_actualizada'));
      setTimeout(() => {
        setShowPwd(false);
        setPwdActual(''); setPwdNueva(''); setPwdConfirm(''); setPwdMsg('');
      }, 1800);
    },
  });

  const pwdErr = cambiarPwdMut.isError
    ? ((cambiarPwdMut.error as any)?.response?.data?.message ?? t('config.error_cambiar_contrasena'))
    : null;

  // ── Settings form ───────────────────────────────────────────────────────────
  const { data: settings } = useQuery<TenantSettings>({
    queryKey: ['tenant-settings'],
    queryFn: reportesApi.tenantSettings,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      color_primario: '#3b82f6', color_secundario: '#1d4ed8',
      moneda: 'DOP', simbolo_moneda: 'RD$',
      nombre_comercial: '', texto_pie_recibo: '',
      whatsapp_activo: true,
      zona_horaria: 'America/Santo_Domingo', formato_fecha: 'DD/MM/YYYY',
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        color_primario:   settings.color_primario   ?? '#3b82f6',
        color_secundario: settings.color_secundario ?? '#1d4ed8',
        moneda:           settings.moneda           ?? 'DOP',
        simbolo_moneda:   settings.simbolo_moneda   ?? 'RD$',
        nombre_comercial: settings.nombre_comercial ?? '',
        texto_pie_recibo: settings.texto_pie_recibo ?? '',
        whatsapp_activo:  settings.whatsapp_activo  ?? true,
        zona_horaria:     settings.zona_horaria     ?? 'America/Santo_Domingo',
        formato_fecha:    settings.formato_fecha    ?? 'DD/MM/YYYY',
      });
      if (settings.url_logo && !logoFile) setLogoPreview(`/api/v1/tenants/logo`);
    }
  }, [settings, reset]);

  const saveMut = useMutation({
    mutationFn: (dto: FormData) => api.put('/tenants/settings', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-settings'] }),
  });

  const errMsg = saveMut.isError
    ? ((saveMut.error as any)?.response?.data?.message ?? t('config.error_guardar'))
    : null;

  const whatsappActivo = watch('whatsapp_activo');
  const monedaWatch = watch('moneda');

  // Si la moneda guardada no está en la lista curada, se arranca en modo
  // manual -- así no se pisa silenciosamente una moneda ya configurada que
  // no está entre las más comunes.
  const [monedaManual, setMonedaManual] = useState(false);
  useEffect(() => {
    if (settings) setMonedaManual(!buscarMoneda(settings.moneda ?? 'DOP'));
  }, [settings]);

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('config.titulo')}</h1>
        <p className="text-sm text-gray-500">{t('config.subtitulo')}</p>
      </div>

      {/* ── Apariencia ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit((d) => saveMut.mutate(d))} className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-800">{t('config.apariencia_datos')}</h2>

        {/* Logo */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.logo')}</label>
          <div className="flex items-center gap-3">
            {(logoPreview || settings?.url_logo) && (
              <img
                src={logoFile ? logoPreview! : `/api/v1/tenants/logo`}
                alt={t('config.logo_alt')}
                className="h-12 w-auto rounded-lg border border-gray-200 object-contain bg-gray-50 p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="flex-1">
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setLogoFile(f);
                  setLogoPreview(URL.createObjectURL(f));
                }}
              />
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                <Upload size={14} />
                {logoFile ? logoFile.name : t('config.subir_imagen')}
              </button>
            </div>
            {logoFile && (
              <button
                type="button"
                onClick={() => {
                  logoMut.mutate(logoFile!);
                }}
                disabled={logoMut.isPending}
                className="btn-primary text-xs py-2"
              >
                {logoMut.isPending ? t('config.subiendo') : t('config.guardar_logo')}
              </button>
            )}
          </div>
          {logoMut.isSuccess && (
            <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> {t('config.logo_actualizado')}
            </p>
          )}
        </div>

        {/* Nombre comercial */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.nombre_comercial')}</label>
          <input
            {...register('nombre_comercial')}
            placeholder={user?.tenant_nombre ?? t('config.nombre_comercial_placeholder')}
            className="input-field"
          />
          <p className="mt-1 text-xs text-gray-400">
            {t('config.nombre_comercial_hint', { nombre: user?.tenant_nombre ?? '' })}
          </p>
        </div>

        {/* Colores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.color_primario')}</label>
            <div className="flex items-center gap-2">
              <input {...register('color_primario')} type="color" className="h-10 w-14 rounded-lg border border-gray-200 p-0.5 cursor-pointer" />
              <input {...register('color_primario')} placeholder="#3b82f6" className="input-field" />
            </div>
            {errors.color_primario && <p className="mt-1 text-xs text-red-500">{errors.color_primario.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.color_secundario')}</label>
            <div className="flex items-center gap-2">
              <input {...register('color_secundario')} type="color" className="h-10 w-14 rounded-lg border border-gray-200 p-0.5 cursor-pointer" />
              <input {...register('color_secundario')} placeholder="#1d4ed8" className="input-field" />
            </div>
          </div>
        </div>

        {/* Moneda */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.moneda')}</label>
          {!monedaManual ? (
            <select
              value={buscarMoneda(monedaWatch) ? monedaWatch : ''}
              onChange={(e) => {
                if (!e.target.value) {
                  setMonedaManual(true);
                  setValue('moneda', '');
                  setValue('simbolo_moneda', '');
                  return;
                }
                const m = buscarMoneda(e.target.value)!;
                setValue('moneda', m.codigo, { shouldValidate: true });
                setValue('simbolo_moneda', m.simbolo, { shouldValidate: true });
              }}
              className="input-field"
            >
              {MONEDAS.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.codigo} — {m.nombre} ({m.simbolo})
                </option>
              ))}
              <option value="">{t('config.moneda_otra')}</option>
            </select>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input {...register('moneda')} placeholder={t('config.codigo_moneda')} className="input-field" maxLength={3} />
                {errors.moneda && <p className="mt-1 text-xs text-red-500">{errors.moneda.message}</p>}
              </div>
              <div>
                <input {...register('simbolo_moneda')} placeholder={t('config.simbolo')} className="input-field" maxLength={5} />
                {errors.simbolo_moneda && <p className="mt-1 text-xs text-red-500">{errors.simbolo_moneda.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMonedaManual(false);
                  setValue('moneda', 'DOP');
                  setValue('simbolo_moneda', 'RD$');
                }}
                className="col-span-2 text-left text-xs text-brand-600 underline"
              >
                {t('config.moneda_volver_lista')}
              </button>
            </div>
          )}
        </div>

        {/* Zona horaria y formato de fecha */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.zona_horaria')}</label>
            <select {...register('zona_horaria')} className="input-field">
              {ZONAS_HORARIAS.map((z) => (
                <option key={z.valor} value={z.valor}>{z.etiqueta}</option>
              ))}
            </select>
            {errors.zona_horaria && <p className="mt-1 text-xs text-red-500">{errors.zona_horaria.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.formato_fecha')}</label>
            <select {...register('formato_fecha')} className="input-field">
              {FORMATOS_FECHA.map((f) => (
                <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
              ))}
            </select>
            {errors.formato_fecha && <p className="mt-1 text-xs text-red-500">{errors.formato_fecha.message}</p>}
          </div>
        </div>

        {/* Pie de recibo */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('config.pie_recibo')}</label>
          <textarea
            {...register('texto_pie_recibo')}
            rows={3}
            placeholder={t('config.pie_recibo_placeholder')}
            className="input-field resize-none"
          />
        </div>

        {/* WhatsApp */}
        <div className="rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className={whatsappActivo ? 'text-green-600' : 'text-gray-400'} />
              <div>
                <p className="text-sm font-semibold text-gray-800">{t('config.whatsapp_titulo')}</p>
                <p className="text-xs text-gray-500">{t('config.whatsapp_desc')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValue('whatsapp_activo', !whatsappActivo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                whatsappActivo ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                whatsappActivo ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {whatsappActivo
              ? t('config.whatsapp_activo_msg')
              : t('config.whatsapp_inactivo_msg')}
          </p>
        </div>

        {saveMut.isSuccess && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">{t('config.guardado_exito')}</p>
          </div>
        )}

        {errMsg && (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{errMsg}</p>
          </div>
        )}

        <button type="submit" disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? t('config.guardando') : t('config.guardar_cambios')}
        </button>
      </form>

      {/* ── Portal del cliente ──────────────────────────────────────────────── */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-800">{t('config.portal_cliente')}</h2>
        </div>
        <p className="text-xs text-gray-500">
          {t('config.portal_desc')}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 font-mono truncate">
            {portalUrl}
          </div>
          <button
            onClick={copiarLink}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              copiado
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'btn-secondary'
            }`}
          >
            {copiado ? <Check size={13} /> : <Copy size={13} />}
            {copiado ? t('config.copiado') : t('config.copiar')}
          </button>
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs"
          >
            {t('config.abrir')}
          </a>
        </div>
        <p className="text-[11px] text-gray-400">
          {t('config.portal_footer')}
        </p>
      </div>

      {/* ── Seguridad ───────────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{t('config.seguridad')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('config.seguridad_desc')}</p>
          </div>
          <button
            onClick={() => setShowPwd(v => !v)}
            className="flex items-center gap-2 btn-secondary text-xs"
          >
            <KeyRound size={14} />
            {t('config.cambiar_contrasena')}
          </button>
        </div>

        {showPwd && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('config.contrasena_actual')}</label>
              <input
                type="password"
                value={pwdActual}
                onChange={e => setPwdActual(e.target.value)}
                className="input-field"
                placeholder={t('config.contrasena_actual_placeholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('config.nueva_contrasena')}</label>
              <input
                type="password"
                value={pwdNueva}
                onChange={e => setPwdNueva(e.target.value)}
                className="input-field"
                placeholder={t('config.nueva_contrasena_placeholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('config.confirmar_nueva_contrasena')}</label>
              <input
                type="password"
                value={pwdConfirm}
                onChange={e => setPwdConfirm(e.target.value)}
                className="input-field"
                placeholder={t('config.repetir_contrasena_placeholder')}
              />
              {pwdNueva && pwdConfirm && pwdNueva !== pwdConfirm && (
                <p className="mt-1 text-xs text-red-500">{t('config.contrasenas_no_coinciden')}</p>
              )}
            </div>

            {pwdMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-xs text-emerald-700">{pwdMsg}</p>
              </div>
            )}
            {pwdErr && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-700">{pwdErr}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => cambiarPwdMut.mutate()}
                disabled={
                  !pwdActual || pwdNueva.length < 8 || pwdNueva !== pwdConfirm || cambiarPwdMut.isPending
                }
                className="btn-primary flex-1 justify-center text-sm"
              >
                {cambiarPwdMut.isPending ? t('config.actualizando') : t('config.actualizar_contrasena')}
              </button>
              <button
                onClick={() => { setShowPwd(false); setPwdActual(''); setPwdNueva(''); setPwdConfirm(''); setPwdMsg(''); }}
                className="btn-secondary"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
