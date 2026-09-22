-- Registra cada compra/renovación de suscripción verificada vía Google Play
-- Billing (app móvil). purchase_token es único -- evita que un mismo
-- purchaseToken (reenviado por retry del cliente o por una notificación
-- duplicada) active el plan dos veces.
CREATE TABLE IF NOT EXISTS google_play_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  plan_id VARCHAR(50) NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  purchase_token TEXT NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'activa', -- activa | cancelada | expirada | en_gracia
  fecha_expiracion TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (purchase_token)
);

CREATE INDEX IF NOT EXISTS idx_google_play_compras_tenant ON google_play_compras(tenant_id);
