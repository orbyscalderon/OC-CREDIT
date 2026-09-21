-- ============================================================
-- MIGRACIÓN 020: recuperar contraseña por email
--
-- Se guarda un HASH sha256 del token (no el token en texto plano) --
-- mismo criterio que password_hash: si la base se filtra, no se puede
-- usar directamente para resetear contraseñas ajenas. El token real
-- (sin hashear) solo existe en el link del email, nunca en la BD.
-- ============================================================

BEGIN;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS reset_password_token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS reset_password_expira TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token
  ON usuarios(reset_password_token_hash)
  WHERE reset_password_token_hash IS NOT NULL;

COMMENT ON COLUMN usuarios.reset_password_token_hash IS
  'sha256 del token de recuperación de contraseña vigente. NULL si no hay solicitud pendiente.';
COMMENT ON COLUMN usuarios.reset_password_expira IS
  'Vencimiento del token de recuperación (1 hora desde que se solicitó).';

COMMIT;
