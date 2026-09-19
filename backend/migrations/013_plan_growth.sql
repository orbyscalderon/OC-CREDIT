-- ============================================================
-- MIGRACIÓN 013: Agrega el plan intermedio "Growth" (3 planes)
-- No modifica los precios reales de "basico" ni "pro" — los montos
-- de "growth" son PROVISIONALES (interpolados entre ambos) hasta que
-- el usuario defina el precio real de mercado.
-- ============================================================

BEGIN;

INSERT INTO planes_saas (
  id, nombre, descripcion,
  precio_mensual_usd, precio_anual_usd,
  max_prestamos_activos, max_cobradores, max_rutas,
  permite_portal_cliente, permite_whatsapp_bot, permite_pagare_pdf,
  permite_mapa, permite_reportes_avanz, activo, orden_display
) VALUES (
  'growth',
  'Growth',
  'Para negocios en crecimiento con varias rutas y cobradores',
  35.00, 29.75, -- PROVISIONAL: interpolado entre basico (20) y pro (50)
  200, 6, 10,
  TRUE, FALSE, TRUE,
  TRUE, FALSE, TRUE, 2
)
ON CONFLICT (id) DO UPDATE SET
  precio_mensual_usd    = EXCLUDED.precio_mensual_usd,
  precio_anual_usd      = EXCLUDED.precio_anual_usd,
  max_prestamos_activos = EXCLUDED.max_prestamos_activos,
  max_cobradores        = EXCLUDED.max_cobradores,
  max_rutas             = EXCLUDED.max_rutas,
  permite_portal_cliente = EXCLUDED.permite_portal_cliente,
  permite_whatsapp_bot   = EXCLUDED.permite_whatsapp_bot,
  permite_pagare_pdf     = EXCLUDED.permite_pagare_pdf,
  permite_mapa           = EXCLUDED.permite_mapa,
  permite_reportes_avanz = EXCLUDED.permite_reportes_avanz,
  orden_display          = EXCLUDED.orden_display;

-- "pro" pasa a mostrarse en tercer lugar (basico=1, growth=2, pro=3)
UPDATE planes_saas SET orden_display = 3 WHERE id = 'pro';

COMMIT;

SELECT id, nombre, precio_mensual_usd, max_prestamos_activos, orden_display
FROM planes_saas ORDER BY orden_display;
