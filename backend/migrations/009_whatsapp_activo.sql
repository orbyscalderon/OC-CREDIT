-- La entidad TenantSettings ya declara whatsapp_activo (toggle de WhatsApp por
-- tenant) pero nunca existio una migracion que la creara en tenant_settings.
-- Sin esta columna, CUALQUIER login falla (auth.service carga TenantSettings).
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS whatsapp_activo BOOLEAN NOT NULL DEFAULT true;
