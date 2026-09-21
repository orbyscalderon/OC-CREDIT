-- ============================================================
-- MIGRACIÓN 021: permisos personalizados por empleado
--
-- NULL (default para todos los usuarios existentes) = usa el set de
-- permisos por defecto de su rol base (PERMISOS_POR_ROL en
-- backend/src/common/constants/permisos.enum.ts) -- comportamiento
-- IDÉNTICO al actual, cero riesgo para nadie que no se edite a mano.
-- Un array no-NULL reemplaza por completo el set del rol para ese
-- usuario puntual (lo arma el admin desde Empleados).
-- ============================================================

BEGIN;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS permisos_custom TEXT[];

COMMENT ON COLUMN usuarios.permisos_custom IS
  'Permisos personalizados (ver permisos.enum.ts). NULL = usa el set por defecto de su rol base.';

COMMIT;
