-- ============================================================
-- MIGRACIÓN 019: idempotencia para solicitudes de préstamo desde móvil
--
-- El cobrador toma solicitudes de préstamo nuevas en la calle sin red
-- (se encola localmente y se sincroniza al recuperar conexión, igual
-- que cobros/novedades/clientes). Sin esta columna, un reintento de la
-- cola después de un envío que sí llegó pero cuya respuesta se perdió
-- crearía una solicitud duplicada. NULL para préstamos originados
-- desde el panel web.
-- ============================================================

BEGIN;

ALTER TABLE prestamos
  ADD COLUMN IF NOT EXISTS uuid_idempotencia UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prestamos_uuid_idempotencia
  ON prestamos(uuid_idempotencia)
  WHERE uuid_idempotencia IS NOT NULL;

COMMENT ON COLUMN prestamos.uuid_idempotencia IS
  'UUID generado en el móvil para deduplicar reintentos de la cola offline al solicitar un préstamo. NULL si se originó desde el panel web.';

COMMIT;
