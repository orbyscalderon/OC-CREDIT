-- Geocerca antifraude: radio maximo (metros) entre el GPS del cobro y la
-- casa registrada del cliente para aceptar el pago. Configurable por tenant.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS radio_geocerca_metros INTEGER NOT NULL DEFAULT 150;
