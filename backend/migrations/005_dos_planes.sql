-- ============================================================
-- MIGRACIÓN 005: Simplificar a 2 planes (Basico y Pro)
-- Orden correcto para respetar FK: insert nuevos -> migrar tenants -> borrar viejos
-- ============================================================

BEGIN;

-- 1. Insertar los 2 planes nuevos (sin tocar los existentes aun)
INSERT INTO planes_saas (
  id, nombre, descripcion,
  precio_mensual_usd, precio_anual_usd,
  max_prestamos_activos, max_cobradores, max_rutas,
  permite_portal_cliente, permite_whatsapp_bot, permite_pagare_pdf,
  permite_mapa, permite_reportes_avanz, activo, orden_display
) VALUES
(
  'basico',
  'Basico',
  'Para prestamistas que estan comenzando',
  20.00, 17.00,
  50, 3, 5,
  FALSE, FALSE, TRUE,
  FALSE, FALSE, TRUE, 1
),
(
  'pro',
  'Pro',
  'Operacion ilimitada con todas las funciones',
  50.00, 42.50,
  9999, 9999, 9999,
  TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, 2
)
ON CONFLICT (id) DO UPDATE SET
  precio_mensual_usd    = EXCLUDED.precio_mensual_usd,
  precio_anual_usd      = EXCLUDED.precio_anual_usd,
  max_prestamos_activos = EXCLUDED.max_prestamos_activos,
  max_cobradores        = EXCLUDED.max_cobradores,
  max_rutas             = EXCLUDED.max_rutas,
  permite_portal_cliente  = EXCLUDED.permite_portal_cliente,
  permite_whatsapp_bot    = EXCLUDED.permite_whatsapp_bot,
  permite_pagare_pdf      = EXCLUDED.permite_pagare_pdf,
  permite_mapa            = EXCLUDED.permite_mapa,
  permite_reportes_avanz  = EXCLUDED.permite_reportes_avanz,
  orden_display           = EXCLUDED.orden_display;

-- 2. Migrar todos los tenants: planes basicos -> basico, resto -> pro
UPDATE tenants SET plan_id = 'basico', max_prestamos_activos = 50,  max_cobradores = 3
WHERE plan_id IN ('free','personal','basico');

UPDATE tenants SET plan_id = 'pro',    max_prestamos_activos = 9999, max_cobradores = 9999
WHERE plan_id IN ('profesional','avanzado','comercial','enterprise');

-- 3. Ahora si podemos borrar los planes viejos que ya nadie referencia
DELETE FROM planes_saas
WHERE id NOT IN ('basico','pro');

COMMIT;

SELECT id, nombre, precio_mensual_usd, max_prestamos_activos,
       permite_whatsapp_bot, permite_mapa
FROM planes_saas ORDER BY orden_display;
