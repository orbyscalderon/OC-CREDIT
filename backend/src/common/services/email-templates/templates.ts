// Plantillas de email en texto plano + HTML mínimo -- sin librería de
// templating (mjml/handlebars) a propósito, son 3 emails simples y una
// dependencia más no se justifica. Mismo azul de marca que el panel web
// (frontend/src/components/Layout/Sidebar.tsx: #2563EB).

function layout(tituloInterno: string, cuerpoHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563EB;padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">OCA Ruta</span>
        </td></tr>
        <tr><td style="padding:32px;color:#161c2c;font-size:15px;line-height:1.6;">
          ${cuerpoHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8f9fb;color:#5b6478;font-size:12px;">
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
    subject: 'Recuperar tu contraseña — OCA Ruta',
    html: layout('Recuperar contraseña', `
      <p>Hola ${params.nombre},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste vos, hacé clic en el siguiente botón:</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.link}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Restablecer contraseña</a>
      </p>
      <p style="color:#5b6478;font-size:13px;">Este enlace vence en 1 hora. Si no fuiste vos quien lo solicitó, podés ignorar este correo — tu contraseña actual sigue funcionando.</p>
    `),
  };
}

export function plantillaBienvenida(params: { nombreEmpresa: string; nombreAdmin: string; email: string; loginUrl: string }): { subject: string; html: string } {
  return {
    subject: `Bienvenido a OCA Ruta, ${params.nombreEmpresa}`,
    html: layout('Bienvenida', `
      <p>Hola ${params.nombreAdmin},</p>
      <p>Tu cuenta para <strong>${params.nombreEmpresa}</strong> ya está lista. Ya podés iniciar sesión con tu email (<strong>${params.email}</strong>) y la contraseña que elegiste al registrarte.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${params.loginUrl}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Ir a mi panel</a>
      </p>
      <p style="color:#5b6478;font-size:13px;">Tenés 7 días de prueba gratis para probar todo antes de decidir tu plan. Cualquier duda, respondé este correo.</p>
    `),
  };
}

export function plantillaAvisoAdmin(params: { nombreAdmin: string; titulo: string; mensaje: string; link?: string; textoLink?: string }): { subject: string; html: string } {
  return {
    subject: `${params.titulo} — OCA Ruta`,
    html: layout('Aviso', `
      <p>Hola ${params.nombreAdmin},</p>
      <p><strong>${params.titulo}</strong></p>
      <p>${params.mensaje}</p>
      ${params.link ? `<p style="text-align:center;margin:28px 0;">
        <a href="${params.link}" style="background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">${params.textoLink ?? 'Ver en el panel'}</a>
      </p>` : ''}
    `),
  };
}
