-- ============================================================
-- MIGRACIÓN 018: idempotencia para creación de clientes desde móvil
--
-- El cobrador ahora puede dar de alta clientes en la calle, sin red
-- (se encola localmente en el celular y se sincroniza al recuperar
-- conexión, igual que cobros/novedades). Sin esta columna, un reintento
-- automático de la cola después de un envío que sí llegó al servidor
-- pero cuya respuesta se perdió (falla de red a mitad de camino)
-- crearía un cliente duplicado. NULL para clientes creados desde el
-- panel web (no participan de la cola offline).
-- ============================================================

BEGIN;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS uuid_idempotencia UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_uuid_idempotencia
  ON clientes(uuid_idempotencia)
  WHERE uuid_idempotencia IS NOT NULL;

COMMENT ON COLUMN clientes.uuid_idempotencia IS
  'UUID generado en el móvil para deduplicar reintentos de la cola offline. NULL si el cliente se creó desde el panel web.';

COMMIT;
