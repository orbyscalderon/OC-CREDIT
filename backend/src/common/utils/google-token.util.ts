import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdTokenPayload {
  email: string;
  nombre: string;
  apellido: string;
}

/**
 * Verifica un ID token de Google (emitido por Google Identity Services en
 * el frontend/móvil) contra GOOGLE_CLIENT_ID. Usado tanto por el login como
 * por el registro con Google, para no duplicar la verificación.
 */
export async function verificarGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<GoogleIdTokenPayload> {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  const email = (payload?.email ?? '').toLowerCase().trim();
  if (!email) throw new Error('Token de Google sin email');
  return {
    email,
    nombre: payload?.given_name ?? 'Usuario',
    apellido: payload?.family_name ?? 'Google',
  };
}
