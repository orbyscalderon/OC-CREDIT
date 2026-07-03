-- ============================================================
-- MIGRACIÓN 006: Permitir más de una caja abierta simultáneamente
-- por cobrador, una por cada ruta que atienda en el día.
--
-- Antes: UNIQUE (tenant_id, cobrador_id, fecha) -- una sola caja
-- por cobrador por día, sin importar la ruta.
--
-- Ahora: UNIQUE (tenant_id, cobrador_id, ruta_id, fecha) -- una
-- caja por cobrador POR RUTA por día. Un cobrador que cubre dos
-- rutas el mismo día puede tener dos cajas abiertas a la vez,
-- cada una con su propio fondo/cobros/gastos/cierre.
-- ============================================================

BEGIN;

ALTER TABLE cajas DROP CONSTRAINT IF EXISTS uq_caja_cobrador_fecha;

ALTER TABLE cajas
  ADD CONSTRAINT uq_caja_cobrador_ruta_fecha UNIQUE (tenant_id, cobrador_id, ruta_id, fecha);

COMMIT;
