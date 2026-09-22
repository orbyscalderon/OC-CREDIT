// Plantillas de email en texto plano + HTML mínimo -- sin librería de
// templating (mjml/handlebars) a propósito, son 3 emails simples y una
// dependencia más no se justifica. Mismo azul de marca que el panel web
// (frontend/src/components/Layout/Sidebar.tsx: #2563EB).
//
// El ícono se referencia por URL pública (ya servido en producción en
// frontend/public/icon-512.png) -- los clientes de email no renderizan
// imágenes embebidas por path relativo, necesitan una URL https real.
const LOGO_URL = 'https://ocaruta.com/icon-512.png';

function layout(cuerpoHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(22,28,44,.08);">
        <tr><td style="height:4px;background:#2563EB;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #eef0f5;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:36px;padding-right:10px;">
              <img src="${LOGO_URL}" width="36" height="36" alt="OCA Ruta" style="display:block;border-radius:9px;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="color:#161c2c;font-size:18px;font-weight:700;">OCA Ruta</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#161c2c;font-size:15px;line-height:1.6;">
          ${cuerpoHtml}
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f8f9fb;color:#5b6478;font-size:12px;">
          © ${new Date().getFullYear()} OCA HOLDING GROUP LLC. Todos los derechos reservados.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function plantillaRecuperarPassword(params: { nombre: string; link: string }): { subject: string; html: string } {
  return {
    subject: 'Restablecé tu contraseña de OCA Ruta',
    html: layout(`
      <p>Hola ${params.nombre},</p>
      <p>Alguien pidió restablecer la contraseña de tu cuenta en OCA Ruta. Si fuiste vos, elegí una nueva desde acá:</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.link}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Elegir contraseña nueva</a>
      </p>
      <p style="color:#5b6478;font-size:13px;">Por seguridad, este enlace vence en 1 hora y solo sirve una vez. Si no fuiste vos, no hace falta que hagas nada — tu contraseña actual sigue funcionando igual.</p>
    `),
  };
}

export function plantillaBienvenida(params: { nombreEmpresa: string; nombreAdmin: string; email: string; loginUrl: string }): { subject: string; html: string } {
  return {
    subject: `${params.nombreEmpresa} ya está lista en OCA Ruta`,
    html: layout(`
      <p>Hola ${params.nombreAdmin},</p>
      <p>Tu cuenta para <strong>${params.nombreEmpresa}</strong> ya está activa. Iniciá sesión con <strong>${params.email}</strong> y la contraseña que elegiste al registrarte para armar tus rutas, cargar tus clientes y empezar a cobrar.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.loginUrl}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Entrar a mi panel</a>
      </p>
      <p style="color:#5b6478;font-size:13px;">Arrancás con 7 días de prueba gratis. Al terminar, se cobra automáticamente a la tarjeta que registraste. Si no querés continuar, respondé este correo antes de que termine la prueba y cancelamos sin cargos.</p>
    `),
  };
}

export function plantillaCobroPrueba(params: { nombreAdmin: string; nombreEmpresa: string; exito: boolean; planNombre: string; montoUsd: number; motivoFallo?: string; link: string }): { subject: string; html: string } {
  return {
    subject: params.exito
      ? `Cobro exitoso — plan ${params.planNombre} activado`
      : `No pudimos cobrar tu tarjeta — ${params.nombreEmpresa}`,
    html: layout(params.exito ? `
      <p>Hola ${params.nombreAdmin},</p>
      <p>Tu prueba gratis de <strong>${params.nombreEmpresa}</strong> terminó y activamos el plan <strong>${params.planNombre}</strong> — se cobraron <strong>$${params.montoUsd.toFixed(2)} USD</strong> a tu tarjeta registrada. Ya podés seguir usando la cuenta sin interrupciones.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.link}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Entrar a mi panel</a>
      </p>
    ` : `
      <p>Hola ${params.nombreAdmin},</p>
      <p>Tu prueba gratis de <strong>${params.nombreEmpresa}</strong> terminó y no pudimos cobrar tu tarjeta registrada para activar el plan <strong>${params.planNombre}</strong>${params.motivoFallo ? ` (${params.motivoFallo})` : ''}.</p>
      <p>Tu cuenta quedó pausada hasta que actualices el pago. Reintentamos automáticamente los próximos días, o podés pagar ahora mismo desde acá:</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.link}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Actualizar método de pago</a>
      </p>
    `),
  };
}

export function plantillaAvisoAdmin(params: { nombreAdmin: string; titulo: string; mensaje: string; link?: string; textoLink?: string }): { subject: string; html: string } {
  return {
    subject: `${params.titulo} — OCA Ruta`,
    html: layout(`
      <p>Hola ${params.nombreAdmin},</p>
      <p style="font-size:16px;font-weight:700;margin-bottom:4px;">${params.titulo}</p>
      <p>${params.mensaje}</p>
      ${params.link ? `<p style="text-align:center;margin:28px 0;">
        <a href="${params.link}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">${params.textoLink ?? 'Ver en el panel'}</a>
      </p>` : ''}
    `),
  };
}
