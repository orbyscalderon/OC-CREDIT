import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';

const MODALIDADES = ['Diario', 'Semanal', 'Quincenal', 'Mensual'] as const;

interface CuotaPreview {
  numero: number;
  capital: number;
  interes: number;
  total: number;
}

/**
 * Replica el algoritmo real del backend (calcularPlanAmortizacion):
 * interés simple sobre el capital, dividido en partes iguales, donde la
 * última cuota absorbe el residuo de redondeo. Así la vista previa coincide
 * centavo a centavo con lo que el sistema generará al aprobar el préstamo.
 */
function calcularPlan(capital: number, tasaPct: number, numCuotas: number): CuotaPreview[] {
  const totalInteres = Math.round(capital * (tasaPct / 100) * 100) / 100;
  const capitalBase = Math.floor((capital / numCuotas) * 100) / 100;
  const interesBase = Math.floor((totalInteres / numCuotas) * 100) / 100;

  const plan: CuotaPreview[] = [];
  let capitalAcum = 0;
  let interesAcum = 0;

  for (let i = 1; i <= numCuotas; i++) {
    const esUltima = i === numCuotas;
    const cap = esUltima ? Math.round((capital - capitalAcum) * 100) / 100 : capitalBase;
    const int = esUltima ? Math.round((totalInteres - interesAcum) * 100) / 100 : interesBase;
    capitalAcum += cap;
    interesAcum += int;
    plan.push({ numero: i, capital: cap, interes: int, total: Math.round((cap + int) * 100) / 100 });
  }

  return plan;
}

export function CalculadoraPrestamo() {
  const [capital, setCapital] = useState(10000);
  const [tasa, setTasa] = useState(20);
  const [cuotas, setCuotas] = useState(10);
  const [modalidad, setModalidad] = useState<typeof MODALIDADES[number]>('Diario');

  const plan = useMemo(
    () => (cuotas > 0 ? calcularPlan(capital, tasa, cuotas) : []),
    [capital, tasa, cuotas],
  );

  const totalInteres = plan.reduce((s, c) => s + c.interes, 0);
  const totalPagar = capital + totalInteres;
  const cuotaMonto = plan[0]?.total ?? 0;

  const fmt = (n: number) =>
    'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Calculator size={20} className="text-blue-600" />
        <h3 className="font-bold text-gray-900">Calculadora de Préstamo</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Capital a prestar
          </label>
          <input
            type="number"
            min={500} max={500000} step={500}
            value={capital}
            onChange={e => setCapital(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tasa de interés %</label>
            <input
              type="number"
              min={1} max={100} step={0.5}
              value={tasa}
              onChange={e => setTasa(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número de cuotas</label>
            <input
              type="number"
              min={1} max={365}
              value={cuotas}
              onChange={e => setCuotas(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Modalidad de pago</label>
          <div className="flex gap-2 flex-wrap">
            {MODALIDADES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModalidad(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  modalidad === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="mt-5 rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Capital</span>
          <span className="font-semibold">{fmt(capital)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Interés total ({tasa}%)</span>
          <span className="font-semibold text-amber-600">{fmt(totalInteres)}</span>
        </div>
        <div className="border-t border-blue-200 pt-2 flex justify-between">
          <span className="font-bold text-gray-800">Total a pagar</span>
          <span className="font-bold text-blue-700">{fmt(totalPagar)}</span>
        </div>
        <div className="flex justify-between text-sm bg-white rounded-lg px-3 py-2 mt-1">
          <span className="text-gray-600">Cuota {modalidad.toLowerCase()}</span>
          <span className="font-extrabold text-blue-600 text-base">{fmt(cuotaMonto)}</span>
        </div>
      </div>

      {/* Plan cuota por cuota */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Detalle cuota por cuota
        </p>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">#</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Capital</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Interés</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plan.map((c) => (
                  <tr key={c.numero} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-500">{c.numero}</td>
                    <td className="px-3 py-1.5 text-right mono-nums">{fmt(c.capital)}</td>
                    <td className="px-3 py-1.5 text-right mono-nums text-amber-600">{fmt(c.interes)}</td>
                    <td className="px-3 py-1.5 text-right mono-nums font-semibold text-gray-800">{fmt(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          Las fechas reales se calculan al aprobar (omiten domingos y feriados). La última cuota puede variar unos centavos por redondeo.
        </p>
      </div>
    </div>
  );
}
