-- =============================================================================
-- OC CREDIT - Sistema de Préstamos y Cobranzas por Rutas
-- © 2026 OCA HOLDING GROUP LLC. Todos los derechos reservados.
-- Migration: 016_ubicacion_ruta.sql
--
-- Las rutas no tenían ninguna ubicación propia -- el mapa de una ruta sin
-- clientes/eventos georreferenciados caía siempre al centro hardcodeado
-- de Santo Domingo, sin importar dónde estuviera realmente la ruta (ej.
-- una ruta en Gaspar Hernández, Puerto Plata, abría el mapa en la capital).
-- Seguro de re-ejecutar.
-- =============================================================================

ALTER TABLE rutas
  ADD COLUMN IF NOT EXISTS direccion VARCHAR(255),
  ADD COLUMN IF NOT EXISTS latitud   NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitud  NUMERIC(10,7);
