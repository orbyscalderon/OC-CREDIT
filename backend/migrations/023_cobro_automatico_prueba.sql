-- Tarjeta obligatoria al registrarse + cobro automático cuando vence la
-- prueba gratis de 7 días. stripe_customer_id/stripe_sub_id ya existían
-- (migración 004) pero nunca se usaron -- se suma el payment_method y
-- contadores para no reintentar el cobro indefinidamente si la tarjeta
-- fue rechazada.
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cobro_prueba_intentos     INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cobro_prueba_ultimo_intento TIMESTAMPTZ;
