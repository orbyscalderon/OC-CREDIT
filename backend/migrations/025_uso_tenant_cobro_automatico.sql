-- Agrega tiene_cobro_automatico a v_uso_tenant -- sin esto el frontend no
-- puede saber, después de recargar la página, si el tenant tiene o no una
-- tarjeta guardada para el cobro automático (el mensaje de "cancelado" que
-- se ve tras tocar el botón es solo estado local de React, no persiste).
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
    t.fecha_prueba_hasta,
    (t.stripe_payment_method_id IS NOT NULL) AS tiene_cobro_automatico
   FROM tenants t
     LEFT JOIN planes_saas p ON p.id::text = t.plan_id::text;

ALTER VIEW v_uso_tenant SET (security_invoker = true);
