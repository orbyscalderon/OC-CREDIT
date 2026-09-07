-- tenants.plan_id tiene DEFAULT 'free' con FK a planes_saas, pero nunca existió
-- una fila 'free' — el INSERT inicial de un tenant nuevo (antes del UPDATE que
-- fija el plan real) violaba la llave foránea. Placeholder inactivo, invisible
-- en el listado público (activo=false), que el registro siempre sobrescribe.
INSERT INTO planes_saas (id, nombre, descripcion, precio_mensual_usd, precio_anual_usd,
  max_prestamos_activos, max_cobradores, max_rutas, permite_portal_cliente, permite_whatsapp_bot,
  permite_pagare_pdf, permite_mapa, permite_reportes_avanz, activo, orden_display)
VALUES ('free', 'Sin plan', 'Placeholder interno, se sobrescribe siempre al registrar', 0, 0, 0, 0, 0, false, false, false, false, false, false, 0)
ON CONFLICT (id) DO NOTHING;

-- Expone fecha_prueba_hasta (ya existía en tenants) en la vista de uso de plan,
-- para que el frontend pueda mostrar cuántos días de prueba quedan.
CREATE OR REPLACE VIEW v_uso_tenant AS
 SELECT t.id AS tenant_id,
    t.nombre_empresa,
    t.plan_id,
    p.nombre AS plan_nombre,
    p.max_prestamos_activos,
    p.max_cobradores,
    p.max_rutas,
    p.permite_portal_cliente,
    p.permite_whatsapp_bot,
    p.permite_pagare_pdf,
    p.permite_mapa,
    p.permite_reportes_avanz,
    COALESCE(( SELECT count(*) AS count
           FROM prestamos pr
          WHERE pr.tenant_id = t.id AND pr.estado = 'Activo'::estado_prestamo), 0::bigint) AS prestamos_activos_usados,
    COALESCE(( SELECT count(*) AS count
           FROM empleados e
             JOIN usuarios u ON u.id = e.usuario_id
          WHERE e.tenant_id = t.id AND u.rol = 'cobrador_tenant'::rol_usuario AND e.activo = true), 0::bigint) AS cobradores_usados,
    COALESCE(( SELECT count(*) AS count
           FROM rutas r
          WHERE r.tenant_id = t.id AND r.activa = true), 0::bigint) AS rutas_usadas,
    round(COALESCE(( SELECT count(*) AS count
           FROM prestamos pr
          WHERE pr.tenant_id = t.id AND pr.estado = 'Activo'::estado_prestamo), 0::bigint)::numeric * 100.0 / NULLIF(p.max_prestamos_activos, 0)::numeric, 1) AS pct_prestamos_usados,
    t.activo,
    t.fecha_inicio_suscripcion,
    t.fecha_vencimiento_suscripcion,
    t.fecha_prueba_hasta
   FROM tenants t
     LEFT JOIN planes_saas p ON p.id::text = t.plan_id::text;
