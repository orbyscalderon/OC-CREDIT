-- ============================================================
-- MIGRACIÓN 017: umbral configurable de días de mora para reporte
-- automático al buró (sin cerrar el préstamo), por tenant.
--
-- NULL = deshabilitado (default) -- el admin debe configurarlo a
-- propósito en Configuración para activarlo, dado que es un reporte
-- de crédito PERMANENTE y cross-tenant.
-- ============================================================

BEGIN;

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS dias_mora_reporte_auto INTEGER;

COMMENT ON COLUMN tenant_settings.dias_mora_reporte_auto IS
  'Días de mora sin acción del admin para reportar automáticamente al buró (sin cerrar el préstamo). NULL = deshabilitado.';

COMMIT;
