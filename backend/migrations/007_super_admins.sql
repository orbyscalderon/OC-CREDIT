-- Cuentas reales de Super Admin (plataforma OC Moon Group LLC).
-- Reemplaza el header estático x-super-admin-key, que quedaba expuesto en
-- el bundle JS del frontend y no daba trazabilidad de quién hizo cada acción.

CREATE TABLE IF NOT EXISTS super_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre        VARCHAR(150) NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acceso TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
