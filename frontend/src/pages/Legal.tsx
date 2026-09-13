import { Link } from 'react-router-dom';

const HOY = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });

export function LegalPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 py-4 px-6">
        <Link to="/" className="text-xl font-extrabold text-brand-600">OCA Credit</Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-gray-600 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Términos de Servicio y Política de Privacidad</h1>
        <p className="text-xs text-gray-400 mb-10">Última actualización: {HOY}</p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-10">
          <p>
            <strong>OCA Credit</strong> es un nombre comercial (DBA — "doing business as") operado por{' '}
            <strong>OCA HOLDING GROUP LLC</strong>, en adelante "la Compañía". Toda referencia a "OCA Credit"
            en este documento, en la aplicación o en cualquier comunicación se entiende como una referencia
            a OCA HOLDING GROUP LLC actuando bajo ese nombre comercial.
          </p>
        </div>

        <h2 id="terminos" className="text-xl font-bold text-gray-900 mt-10 mb-3">1. Términos de Servicio</h2>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">1.1 Descripción del servicio</h3>
        <p>
          OCA Credit es un software como servicio (SaaS) para la gestión de préstamos, cobranza en ruta,
          buró de crédito y operaciones relacionadas, dirigido a prestamistas y financieras. El acceso se
          otorga por suscripción, bajo los planes publicados en la aplicación.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">1.2 Cuenta y prueba gratuita</h3>
        <p>
          Al registrarte obtienes 7 días de prueba gratuita sin cargo, sobre el plan que elijas. Al finalizar
          ese período, el acceso a la cuenta se suspende hasta que actives una suscripción paga. Ningún dato
          se elimina por la sola expiración de la prueba.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">1.3 Responsabilidad sobre los datos de tus clientes</h3>
        <p>
          Eres el único responsable de la exactitud, legalidad y licitud de los préstamos, clientes y cobros
          que registres en la plataforma. La Compañía actúa como proveedor de la herramienta, no como parte
          de las relaciones de crédito que administras en ella.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">1.4 Pagos y facturación</h3>
        <p>
          Las suscripciones se cobran mensual o anualmente según el plan elegido, mediante los medios de
          pago habilitados en la aplicación. La facturación anual tiene descuento y no es reembolsable de
          forma prorrateada salvo que la ley aplicable indique lo contrario.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">1.5 Cancelación y suspensión</h3>
        <p>
          Puedes cancelar tu suscripción en cualquier momento; el acceso se mantiene hasta el fin del período
          ya pagado. La Compañía puede suspender cuentas que incumplan estos términos o la ley aplicable.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">1.6 Limitación de responsabilidad</h3>
        <p>
          El servicio se ofrece "tal cual". En la máxima medida permitida por la ley, la Compañía no será
          responsable por pérdidas indirectas, lucro cesante, o decisiones de negocio tomadas con base en la
          información de la plataforma.
        </p>

        <h2 id="privacidad" className="text-xl font-bold text-gray-900 mt-12 mb-3">2. Política de Privacidad</h2>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">2.1 Qué datos recopilamos</h3>
        <p>
          Datos de la cuenta (nombre de la empresa, correo, teléfono), datos operativos que tú ingresas
          (clientes, préstamos, cobros, rutas), y datos técnicos básicos (dirección IP, tipo de dispositivo)
          para seguridad y soporte.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">2.2 Para qué los usamos</h3>
        <p>
          Para operar el servicio, procesar pagos de la suscripción, dar soporte, prevenir fraude, y cumplir
          obligaciones legales. No vendemos tus datos ni los de tus clientes a terceros.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">2.3 Con quién los compartimos</h3>
        <p>
          Con procesadores de pago (Google Pay / Stripe) únicamente para completar transacciones, y con
          proveedores de infraestructura (hosting, base de datos) necesarios para operar la plataforma —
          todos bajo obligaciones de confidencialidad.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">2.4 Seguridad</h3>
        <p>
          Las contraseñas se almacenan cifradas, las sesiones usan JWT con expiración, y el acceso a datos de
          cada empresa está aislado del resto de tenants de la plataforma.
        </p>

        <h3 className="font-semibold text-gray-900 mt-6 mb-2">2.5 Tus derechos</h3>
        <p>
          Puedes solicitar acceso, corrección o eliminación de tus datos de cuenta escribiendo a soporte.
          La eliminación de la cuenta no afecta obligaciones legales de conservación de registros financieros
          que puedan aplicar en tu jurisdicción.
        </p>

        <h2 className="text-xl font-bold text-gray-900 mt-12 mb-3">3. Contacto</h2>
        <p>
          Para cualquier consulta sobre estos términos o tu privacidad, contáctanos a través de los canales
          de soporte indicados dentro de la aplicación.
        </p>

        <p className="mt-10 text-xs text-gray-400">
          © {new Date().getFullYear()} OCA HOLDING GROUP LLC, operando como "OCA Credit". Todos los derechos reservados.
        </p>

        <Link to="/" className="inline-block mt-8 text-brand-600 font-medium text-sm">← Volver al inicio</Link>
      </div>
    </div>
  );
}
