import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { cobrosApi } from '@/api/cobros.api';
import { cajasApi } from '@/api/cajas.api';
import { clientesApi } from '@/api/clientes.api';
import { prestamosApi } from '@/api/prestamos.api';
import { Badge, estadoPrestamoVariant } from '@/components/common/Badge';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';
import { Rol } from '@/types';

export function CobroNuevoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const esCobrador = user?.rol === Rol.COBRADOR_TENANT;

  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteIdSel, setClienteIdSel] = useState(params.get('cliente_id') ?? '');
  const [prestamoId, setPrestamoId] = useState(params.get('prestamo_id') ?? '');
  const [cajaId, setCajaId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [resultado, setResultado] = useState<{ capital: number; interes: number; mora: number } | null>(null);

  // Cajas abiertas: un cobrador solo ve las suyas (/cajas/dia le está vedado,
  // mostraría las de todo el tenant).
  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas-hoy', esCobrador],
    queryFn: () => (esCobrador ? cajasApi.misCajasActivas() : cajasApi.listarDelDia()),
    select: (data) => data.filter((c) => c.estado === 'Abierta'),
  });

  // Búsqueda de clientes
  const { data: clientesFound = [], isFetching: buscando } = useQuery({
    queryKey: ['buscar-clientes', clienteSearch],
    queryFn: () => clientesApi.buscar(clienteSearch),
    enabled: clienteSearch.length >= 2,
  });

  // Préstamos activos del cliente seleccionado
  const { data: prestamosResp } = useQuery({
    queryKey: ['prestamos-cliente', clienteIdSel],
    queryFn: () => prestamosApi.listar({ cliente_id: clienteIdSel, estado: 'Activo', limit: 50 }),
    enabled: !!clienteIdSel,
    select: (d) => d.data.filter((p) => p.estado === 'Activo'),
  });

  // Si se llega con prestamo_id en la URL (ej. desde "Registrar cobro" en el
  // detalle del préstamo) pero sin cliente_id, prestamosResp nunca se dispara
  // -- prestamoSel quedaría undefined y la caja se mostraría sin filtrar por
  // el cobrador correcto. Se resuelve el préstamo directo para completar
  // clienteIdSel y que el flujo normal (por cliente) tome el control.
  const { data: prestamoDirecto } = useQuery({
    queryKey: ['prestamo-directo', prestamoId],
    queryFn: () => prestamosApi.obtener(prestamoId),
    enabled: !!prestamoId && !clienteIdSel,
  });

  useEffect(() => {
    if (prestamoDirecto && !clienteIdSel) {
      setClienteIdSel(prestamoDirecto.cliente_id);
      setClienteSearch(`${prestamoDirecto.cliente?.nombre ?? ''} ${prestamoDirecto.cliente?.apellido ?? ''}`.trim());
    }
  }, [prestamoDirecto]); // eslint-disable-line react-hooks/exhaustive-deps

  const prestamoSel = prestamosResp?.find((p) => p.id === prestamoId);

  // Cuotas del préstamo elegido, para sugerir el monto a cobrar.
  const { data: cuotasResp } = useQuery({
    queryKey: ['cuotas-prestamo', prestamoId],
    queryFn: () => prestamosApi.cuotas(prestamoId),
    enabled: !!prestamoId,
  });

  const { data: saldoResp } = useQuery({
    queryKey: ['saldo-prestamo', prestamoId],
    queryFn: () => prestamosApi.saldo(prestamoId),
    enabled: !!prestamoId,
  });

  const proximaCuota = cuotasResp?.cuotas
    .filter((c) => c.estado !== 'Pagado')
    .sort((a, b) => a.numero_cuota - b.numero_cuota)[0];

  const cuotaPendiente = proximaCuota ? proximaCuota.monto_total - proximaCuota.monto_pagado : 0;
  const interesPendiente = proximaCuota ? proximaCuota.interes - proximaCuota.interes_pagado : 0;
  // Number(...) por si algún endpoint devuelve el numeric como string (pg
  // los da así en queries raw) -- si no, "+" concatena texto en vez de sumar
  // y el .toFixed() de más abajo revienta la página en blanco.
  const moraPendiente = Number(saldoResp?.saldo_mora ?? 0);
  const montoSugerido = cuotaPendiente + moraPendiente;

  // Saldo TOTAL del préstamo (todas las cuotas + mora, no solo la próxima
  // cuota) -- el tope real contra el que no se puede cobrar de más. Usa
  // saldoResp completo, no montoSugerido, porque un préstamo puede tener
  // varias cuotas vencidas y montoSugerido solo cubre la primera.
  const saldoTotalPrestamo = saldoResp
    ? Number(saldoResp.saldo_cuotas ?? 0) + Number(saldoResp.saldo_mora ?? 0)
    : null;
  const montoExcedeSaldo = saldoTotalPrestamo !== null && (parseFloat(monto) || 0) > saldoTotalPrestamo;

  // El cobro debe entrar en la caja del cobrador asignado a ESTE préstamo —
  // mostrar las demás cajas del tenant solo confunde y el backend las
  // rechazaría igual. Si el cobrador tiene varias rutas/cajas hoy, se
  // muestran todas las suyas para elegir.
  const cajasRelevantes = prestamoSel
    ? cajas.filter((c) => c.cobrador_id === prestamoSel.cobrador_id)
    : cajas;

  // No solo [prestamoId]: cuando se llega con prestamo_id en la URL (sin
  // cliente_id), prestamoSel/cajasRelevantes se resuelven un render después
  // (una vez prestamoDirecto completa clienteIdSel) -- este efecto debe
  // volver a correr en ese momento o cajaId se queda vacío para siempre y
  // el Paso 4 nunca aparece, aunque la caja ya se vea bien en pantalla.
  useEffect(() => {
    setCajaId(cajasRelevantes.length === 1 ? cajasRelevantes[0].id : '');
  }, [prestamoId, cajasRelevantes.length, prestamoSel?.cobrador_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al cambiar de préstamo se limpia el monto -- se rellena solo una vez
  // que llegan las cuotas, con el sugerido (cuota + mora pendiente).
  const [montoAutoPrestamoId, setMontoAutoPrestamoId] = useState('');
  useEffect(() => {
    setMonto('');
  }, [prestamoId]);
  useEffect(() => {
    if (prestamoId && proximaCuota && montoAutoPrestamoId !== prestamoId) {
      setMonto(montoSugerido > 0 ? montoSugerido.toFixed(2) : '');
      setMontoAutoPrestamoId(prestamoId);
    }
  }, [prestamoId, proximaCuota, montoSugerido, montoAutoPrestamoId]);

  const fmt = (n: number) => formatCurrency(n, user);

  const registrarMut = useMutation({
    mutationFn: () => cobrosApi.registrar({
      uuid_idempotencia: crypto.randomUUID(),
      prestamo_id: prestamoId,
      caja_id: cajaId,
      monto_cobrado: parseFloat(monto) || 0,
      descripcion: descripcion || undefined,
    }),
    onSuccess: (data) => {
      setResultado({
        capital: data.distribucion.capital_absorbido,
        interes: data.distribucion.interes_absorbido,
        mora: data.distribucion.mora_absorbida,
      });
    },
  });

  const errMsg = registrarMut.isError
    ? ((registrarMut.error as any)?.response?.data?.message ?? t('cobros.error_registrar'))
    : null;

  const canSubmit = prestamoId && cajaId && parseFloat(monto) > 0 && !montoExcedeSaldo;

  if (resultado) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center space-y-4">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">{t('cobros.registrado_titulo')}</h2>
          <div className="grid grid-cols-3 gap-3 text-sm mt-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400 text-xs">{t('cobros.capital')}</p>
              <p className="font-bold text-gray-900">{fmt(resultado.capital)}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-gray-400 text-xs">{t('cobros.interes')}</p>
              <p className="font-bold text-blue-600">{fmt(resultado.interes)}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-gray-400 text-xs">{t('cobros.mora')}</p>
              <p className="font-bold text-amber-600">{fmt(resultado.mora)}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setResultado(null); setMonto(''); setDescripcion(''); }} className="btn-secondary flex-1 justify-center">
              {t('cobros.registrar_otro')}
            </button>
            <button onClick={() => navigate('/cajas')} className="btn-primary flex-1 justify-center">
              {t('cobros.ver_cajas')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <Link to="/cajas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        {t('cobros.volver_cajas')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('cobros.titulo')}</h1>
        <p className="text-sm text-gray-500">
          {esCobrador ? t('cobros.subtitulo_cobrador') : t('cobros.subtitulo')}
        </p>
      </div>

      {esCobrador && !params.get('cliente_id') && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('cobros.aviso_fuera_ruta')}{' '}
          <Link to="/mi-ruta" className="font-semibold underline">
            {t('cobros.aviso_fuera_ruta_link')}
          </Link>
          .
        </div>
      )}

      <div className="card p-6 space-y-5">
        {/* Paso 1: Cliente */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t('cobros.paso1_buscar_cliente')}
          </label>
          <input
            value={clienteSearch}
            onChange={(e) => { setClienteSearch(e.target.value); setClienteIdSel(''); setPrestamoId(''); }}
            placeholder={t('cobros.buscar_placeholder')}
            className="input-field"
          />
          {/* Se oculta una vez que ya hay un cliente seleccionado -- si no,
              al elegir un resultado el input se llena con "Nombre Apellido",
              eso vuelve a disparar la busqueda, y como ninguna columna sola
              contiene la frase completa, el dropdown reaparecia con
              "Sin resultados" justo debajo del cliente que ya se eligio. */}
          {clienteSearch.length >= 2 && !clienteIdSel && (
            <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {buscando ? (
                <div className="px-3 py-2 text-sm text-gray-400">{t('cobros.buscando')}</div>
              ) : clientesFound.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">{t('cobros.sin_resultados')}</div>
              ) : (
                clientesFound.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setClienteIdSel(c.id); setClienteSearch(`${c.nombre} ${c.apellido}`); setPrestamoId(''); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium">{c.nombre} {c.apellido}</span>
                    <span className="text-gray-400 ml-2">{c.cedula}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Paso 2: Préstamo */}
        {clienteIdSel && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('cobros.paso2_prestamo')}
            </label>
            {!prestamosResp || prestamosResp.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                {t('cobros.sin_prestamos_activos')}
              </p>
            ) : (
              <div className="space-y-2">
                {prestamosResp.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrestamoId(p.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                      prestamoId === p.id
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-400'
                        : 'border-gray-200 hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {fmt(p.capital_aprobado)}
                      </span>
                      <Badge label={p.estado} variant={estadoPrestamoVariant(p.estado)} />
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {t('cobros.prestamo_resumen', { modalidad: p.modalidad, cuotas: p.num_cuotas, id: p.id.slice(-8).toUpperCase() })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Caja */}
        {prestamoId && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('cobros.paso3_caja')}
            </label>
            {cajasRelevantes.length === 0 ? (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {t('cobros.sin_caja_abierta')}{' '}
                <Link to="/cajas" className="underline font-medium">{t('cobros.ver_cajas')}</Link>
              </p>
            ) : cajasRelevantes.length === 1 ? (
              // Única caja relevante (la del cobrador asignado a este préstamo) --
              // no hay nada que elegir, mostrarla como fija evita que parezca
              // editable cuando en realidad el backend solo aceptaría esta.
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <span className="font-semibold">
                  {cajasRelevantes[0].cobrador?.nombre} {cajasRelevantes[0].cobrador?.apellido}
                </span>
                {cajasRelevantes[0].ruta?.nombre && (
                  <span className="text-gray-500"> — {cajasRelevantes[0].ruta.nombre}</span>
                )}
                <span className="text-gray-400"> — {t('cobros.apertura', { monto: fmt(cajasRelevantes[0].monto_apertura) })}</span>
              </div>
            ) : (
              <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className="input-field">
                <option value="">{t('cobros.seleccionar_caja')}</option>
                {cajasRelevantes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cobrador?.nombre} {c.cobrador?.apellido}
                    {c.ruta?.nombre ? ` — ${c.ruta.nombre}` : ''} — {t('cobros.apertura', { monto: fmt(c.monto_apertura) })}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Paso 4: Monto */}
        {cajaId && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('cobros.paso4_monto', { simbolo: user?.tenant_simbolo_moneda ?? 'RD$' })}
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                max={saldoTotalPrestamo ?? undefined}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={`input-field mono-nums ${montoExcedeSaldo ? 'border-red-400 focus:border-red-500' : ''}`}
              />
              {montoExcedeSaldo && saldoTotalPrestamo !== null && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">
                  {t('cobros.monto_excede_saldo', { monto: fmt(parseFloat(monto) || 0), saldo: fmt(saldoTotalPrestamo) })}
                </p>
              )}
              {proximaCuota && (
                <>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {t('cobros.monto_sugerido_hint', {
                      cuota: fmt(cuotaPendiente),
                      mora: moraPendiente > 0 ? ` + ${t('cobros.mora')} ${fmt(moraPendiente)}` : '',
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {interesPendiente > 0 && (
                      <button
                        type="button"
                        onClick={() => setMonto(interesPendiente.toFixed(2))}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
                      >
                        {t('cobros.chip_interes', { monto: fmt(interesPendiente) })}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMonto(cuotaPendiente.toFixed(2))}
                      className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
                    >
                      {t('cobros.chip_cuota', { monto: fmt(cuotaPendiente) })}
                    </button>
                    {moraPendiente > 0 && (
                      <button
                        type="button"
                        onClick={() => setMonto(montoSugerido.toFixed(2))}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 transition-colors"
                      >
                        {t('cobros.chip_cuota_mora', { monto: fmt(montoSugerido) })}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('cobros.observacion')}
              </label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={t('cobros.observacion_placeholder')}
                className="input-field"
                maxLength={200}
              />
            </div>
          </div>
        )}

        {errMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={15} className="text-red-500" />
            <p className="text-sm text-red-700">{Array.isArray(errMsg) ? errMsg.join(', ') : errMsg}</p>
          </div>
        )}

        <button
          onClick={() => registrarMut.mutate()}
          disabled={!canSubmit || registrarMut.isPending}
          className="btn-primary w-full justify-center"
        >
          {registrarMut.isPending ? t('cobros.registrando') : t('cobros.registrar_cobro')}
        </button>
      </div>
    </div>
  );
}
