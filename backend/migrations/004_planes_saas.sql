-- ============================================================
-- MIGRACIÓN 004: Planes SaaS y límites por tenant
-- ============================================================

BEGIN;

-- ── Tabla maestra de planes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS planes_saas (
    id                      VARCHAR(50)     PRIMARY KEY,
    nombre                  VARCHAR(100)    NOT NULL,
    descripcion             TEXT,
    precio_mensual_usd      NUMERIC(8,2)    NOT NULL,
    precio_anual_usd        NUMERIC(8,2)    NOT NULL,   -- con 15% dto
    max_prestamos_activos   INTEGER         NOT NULL,
    max_cobradores          INTEGER         NOT NULL,
    max_rutas               INTEGER         NOT NULL,
    permite_portal_cliente  BOOLEAN         NOT NULL DEFAULT FALSE,
    permite_whatsapp_bot    BOOLEAN         NOT NULL DEFAULT FALSE,
    permite_pagare_pdf      BOOLEAN         NOT NULL DEFAULT TRUE,
    permite_mapa            BOOLEAN         NOT NULL DEFAULT FALSE,
    permite_reportes_avanz  BOOLEAN         NOT NULL DEFAULT FALSE,
    activo                  BOOLEAN         NOT NULL DEFAULT TRUE,
    orden_display           SMALLINT        NOT NULL DEFAULT 0
);

-- ── Planes predefinidos (mismo modelo que prestamistapp) ─────
INSERT INTO planes_saas VALUES
('free',         'Gratis',       'Para comenzar sin costo',           0.00,   0.00,    5,   1,   1, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, 1),
('personal',     'Personal',     'Para prestamistas individuales',    10.00,   8.50,  20,   1,   2, FALSE, FALSE, TRUE,  FALSE, FALSE, TRUE, 2),
('basico',       'Básico',       'Para pequeñas financieras',        20.00,  17.00,  40,   3,   5, FALSE, FALSE, TRUE,  TRUE,  FALSE, TRUE, 3),
('profesional',  'Profesional',  'El más popular',                   40.00,  34.00,  80,  10,  20, TRUE,  FALSE, TRUE,  TRUE,  TRUE,  TRUE, 4),
('avanzado',     'Avanzado',     'Para empresas en crecimiento',     60.00,  51.00, 200,  15,  30, TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE, 5),
('comercial',    'Comercial',    'Para operaciones medianas',        90.00,  76.50, 500,  20,  40, TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE, 6),
('enterprise',   'Enterprise',  'Sin límites operativos',          100.00,  85.00,9999,9999,9999, TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE, 7)
ON CONFLICT (id) DO NOTHING;

-- ── Agregar columnas de plan a tenants ───────────────────────
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS plan_id              VARCHAR(50)  NOT NULL DEFAULT 'free'
                                                  REFERENCES planes_saas(id),
    ADD COLUMN IF NOT EXISTS max_prestamos_activos INTEGER      NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS facturacion_anual    BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fecha_prueba_hasta   DATE,
    ADD COLUMN IF NOT EXISTS stripe_customer_id  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS stripe_sub_id       VARCHAR(100);

-- Actualizar el tenant demo al plan profesional
UPDATE tenants
SET plan_id = 'profesional',
    max_prestamos_activos = 80,
    max_cobradores = 10
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── Vista de uso por tenant ───────────────────────────────────
CREATE OR REPLACE VIEW v_uso_tenant AS
SELECT
    t.id                        AS tenant_id,
    t.nombre_empresa,
    t.plan_id,
    p.nombre                    AS plan_nombre,
    p.max_prestamos_activos,
    p.max_cobradores,
    p.max_rutas,
    p.permite_portal_cliente,
    p.permite_whatsapp_bot,
    p.permite_pagare_pdf,
    p.permite_mapa,
    p.permite_reportes_avanz,
    COALESCE((
        SELECT COUNT(*)
        FROM prestamos pr
        WHERE pr.tenant_id = t.id AND pr.estado = 'Activo'
    ), 0)                       AS prestamos_activos_usados,
    COALESCE((
        SELECT COUNT(*)
        FROM empleados e
        INNER JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.tenant_id = t.id AND u.rol = 'cobrador_tenant' AND e.activo = TRUE
    ), 0)                       AS cobradores_usados,
    COALESCE((
        SELECT COUNT(*)
        FROM rutas r
        WHERE r.tenant_id = t.id AND r.activa = TRUE
    ), 0)                       AS rutas_usadas,
    ROUND(
        COALESCE((
            SELECT COUNT(*)
            FROM prestamos pr
            WHERE pr.tenant_id = t.id AND pr.estado = 'Activo'
        ), 0) * 100.0 / NULLIF(p.max_prestamos_activos, 0),
    1)                          AS pct_prestamos_usados,
    t.activo,
    t.fecha_inicio_suscripcion,
    t.fecha_vencimiento_suscripcion
FROM tenants t
LEFT JOIN planes_saas p ON p.id = t.plan_id;

-- ── Función: verificar si tenant puede crear préstamo ─────────
CREATE OR REPLACE FUNCTION fn_puede_crear_prestamo(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_uso v_uso_tenant%ROWTYPE;
BEGIN
    SELECT * INTO v_uso FROM v_uso_tenant WHERE tenant_id = p_tenant_id;

    IF v_uso.prestamos_activos_usados >= v_uso.max_prestamos_activos THEN
        RETURN jsonb_build_object(
            'puede', false,
            'motivo', 'Has alcanzado el límite de ' || v_uso.max_prestamos_activos ||
                      ' préstamos activos de tu plan ' || v_uso.plan_nombre || '.',
            'usados', v_uso.prestamos_activos_usados,
            'limite', v_uso.max_prestamos_activos,
            'plan_id', v_uso.plan_id
        );
    END IF;

    RETURN jsonb_build_object(
        'puede', true,
        'usados', v_uso.prestamos_activos_usados,
        'limite', v_uso.max_prestamos_activos,
        'plan_id', v_uso.plan_id
    );
END;
$$;

COMMIT;
