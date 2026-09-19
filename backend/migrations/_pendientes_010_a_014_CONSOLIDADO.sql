-- ============================================================
-- SCRIPT CONSOLIDADO: migraciones 010 a 014 (las 5 que faltan en Supabase)
-- Generado para pegar UNA sola vez en el SQL Editor del dashboard de Supabase.
-- Es seguro re-ejecutarlo si algo falla a mitad de camino: todas las
-- sentencias usan IF NOT EXISTS / OR REPLACE / ON CONFLICT, así que no
-- duplican nada si ya se aplicó una parte.
-- ============================================================

-- ── 010: historial de reasignación de cobrador por ruta ─────────────────────
CREATE TABLE IF NOT EXISTS ruta_historial_cobrador (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ruta_id                     UUID NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
    ruta_nombre                 VARCHAR(100) NOT NULL,
    cobrador_anterior_id        UUID,
    cobrador_anterior_nombre    VARCHAR(200),
    cobrador_nuevo_id           UUID NOT NULL,
    cobrador_nuevo_nombre       VARCHAR(200) NOT NULL,
    cambiado_por_id             UUID NOT NULL,
    cambiado_por_nombre         VARCHAR(200),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ruta_historial_cobrador ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ruta_historial_cobrador_ruta
  ON ruta_historial_cobrador (ruta_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clientes_ruta_orden
  ON clientes (tenant_id, ruta_id, orden_visita);

-- ── 011: geocerca antifraude en cobros ──────────────────────────────────────
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS radio_geocerca_metros INTEGER NOT NULL DEFAULT 150;

-- ── 012: documento de identidad configurable por país ───────────────────────
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30) NOT NULL DEFAULT 'cedula';

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30) NOT NULL DEFAULT 'cedula';

ALTER TABLE buro_credito
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30) NOT NULL DEFAULT 'cedula';

ALTER TABLE consultas_buro
  ADD COLUMN IF NOT EXISTS tipo_documento_consultado VARCHAR(30) NOT NULL DEFAULT 'cedula';

DROP INDEX IF EXISTS idx_buro_cedula;
DROP INDEX IF EXISTS idx_buro_cedula_activo;
CREATE INDEX IF NOT EXISTS idx_buro_cedula_tipo        ON buro_credito(cedula, tipo_documento);
CREATE INDEX IF NOT EXISTS idx_buro_cedula_tipo_activo ON buro_credito(cedula, tipo_documento, activo) WHERE activo = TRUE;

CREATE OR REPLACE VIEW v_perfil_buro AS
WITH peso_riesgo AS (
    SELECT
        bc.*,
        CASE nivel_riesgo
            WHEN 'CriticoNoPrestable' THEN 4
            WHEN 'Alto'               THEN 3
            WHEN 'Medio'              THEN 2
            WHEN 'Bajo'               THEN 1
        END AS peso_nivel
    FROM buro_credito bc
    WHERE activo = TRUE
)
SELECT
    cedula,
    nombre,
    apellido,
    telefono,
    COUNT(*)                                                    AS total_reportes,
    COUNT(*) FILTER (WHERE NOT deuda_saldada)                  AS reportes_deuda_activa,
    COUNT(*) FILTER (WHERE deuda_saldada)                      AS reportes_deuda_saldada,
    SUM(saldo_impagado) FILTER (WHERE NOT deuda_saldada)       AS deuda_pendiente_total,
    SUM(capital_original)                                       AS capital_historico_total,
    COUNT(DISTINCT tenant_id)                                   AS numero_agencias_reportantes,
    ARRAY_AGG(DISTINCT tenant_nombre ORDER BY tenant_nombre)    AS agencias_reportantes,
    ARRAY_AGG(DISTINCT motivo::TEXT)                           AS motivos_historicos,
    MAX(fecha_reporte)                                          AS ultimo_reporte,
    MIN(fecha_reporte)                                          AS primer_reporte,
    MAX(dias_mora_al_reportar)                                  AS max_dias_mora,
    CASE MAX(peso_nivel)
        WHEN 4 THEN 'CriticoNoPrestable'::nivel_riesgo_buro
        WHEN 3 THEN 'Alto'::nivel_riesgo_buro
        WHEN 2 THEN 'Medio'::nivel_riesgo_buro
        WHEN 1 THEN 'Bajo'::nivel_riesgo_buro
    END                                                         AS nivel_riesgo_consolidado,
    CASE
        WHEN MAX(peso_nivel) = 4 THEN 'NO_PRESTAR'
        WHEN MAX(peso_nivel) = 3 AND COUNT(*) FILTER (WHERE NOT deuda_saldada) > 0 THEN 'NO_PRESTAR'
        WHEN MAX(peso_nivel) >= 3 THEN 'PRESTAR_CON_MUCHA_CAUTELA'
        WHEN MAX(peso_nivel) = 2 THEN 'PRESTAR_CON_CAUTELA'
        ELSE 'PRECAUCION_HISTORIA_NEGATIVA'
    END                                                         AS recomendacion,
    tipo_documento
FROM peso_riesgo
GROUP BY cedula, tipo_documento, nombre, apellido, telefono;

CREATE OR REPLACE FUNCTION fn_auto_reportar_buro(
    p_prestamo_id       UUID,
    p_motivo            motivo_reporte_buro,
    p_nivel_riesgo      nivel_riesgo_buro DEFAULT 'Alto',
    p_descripcion       TEXT              DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_prestamo      prestamos%ROWTYPE;
    v_cliente       clientes%ROWTYPE;
    v_tenant        tenants%ROWTYPE;
    v_saldo_cuotas  NUMERIC(12,2);
    v_saldo_mora    NUMERIC(12,2);
    v_dias_mora     INTEGER;
    v_reporte_id    UUID;
BEGIN
    SELECT * INTO v_prestamo FROM prestamos WHERE id = p_prestamo_id;
    IF NOT FOUND THEN RETURN NULL; END IF;

    SELECT * INTO v_cliente FROM clientes WHERE id = v_prestamo.cliente_id;
    IF NOT FOUND OR v_cliente.cedula IS NULL THEN RETURN NULL; END IF;

    SELECT * INTO v_tenant FROM tenants WHERE id = v_prestamo.tenant_id;

    SELECT COALESCE(SUM(monto_total - monto_pagado), 0)
    INTO v_saldo_cuotas
    FROM cuotas_amortizacion
    WHERE prestamo_id = p_prestamo_id
      AND estado IN ('Pendiente', 'Abonado', 'Vencida');

    SELECT COALESCE(SUM(monto_mora - monto_pagado), 0)
    INTO v_saldo_mora
    FROM cargos_mora
    WHERE prestamo_id = p_prestamo_id AND estado = 'Pendiente';

    SELECT COALESCE(MAX(CURRENT_DATE - fecha_vencimiento), 0)
    INTO v_dias_mora
    FROM cuotas_amortizacion
    WHERE prestamo_id = p_prestamo_id
      AND estado IN ('Pendiente', 'Abonado', 'Vencida')
      AND fecha_vencimiento < CURRENT_DATE;

    IF (v_saldo_cuotas + v_saldo_mora) <= 0 THEN RETURN NULL; END IF;

    INSERT INTO buro_credito (
        cedula, tipo_documento, nombre, apellido, telefono,
        tenant_id, tenant_nombre,
        prestamo_id, capital_original, saldo_impagado, moneda,
        dias_mora_al_reportar, motivo, nivel_riesgo, descripcion_detallada
    ) VALUES (
        v_cliente.cedula,
        v_cliente.tipo_documento,
        v_cliente.nombre,
        v_cliente.apellido,
        v_cliente.telefono,
        v_prestamo.tenant_id,
        v_tenant.nombre_empresa,
        p_prestamo_id,
        v_prestamo.capital_aprobado,
        v_saldo_cuotas + v_saldo_mora,
        (SELECT moneda FROM tenant_settings WHERE tenant_id = v_prestamo.tenant_id),
        v_dias_mora,
        p_motivo,
        p_nivel_riesgo,
        p_descripcion
    )
    RETURNING id INTO v_reporte_id;

    RETURN v_reporte_id;
END;
$$ LANGUAGE plpgsql;

-- ── 013: plan intermedio "Growth" (3 planes) ────────────────────────────────
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
  35.00, 29.75,
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

UPDATE planes_saas SET orden_display = 3 WHERE id = 'pro';

-- ── 014: fn_calcular_mora por zona horaria del tenant (+ fix idempotencia) ──
CREATE UNIQUE INDEX IF NOT EXISTS uq_mora_cuota_dias ON cargos_mora(cuota_id, dias_mora);

DROP FUNCTION IF EXISTS fn_calcular_mora(UUID);

CREATE OR REPLACE FUNCTION fn_calcular_mora(p_tenant_id UUID, p_fecha_hoy DATE)
RETURNS INTEGER AS $$
DECLARE
    v_settings      tenant_settings%ROWTYPE;
    v_cuota         cuotas_amortizacion%ROWTYPE;
    v_dias_mora     INTEGER;
    v_monto_mora    NUMERIC(12,2);
    v_contador      INTEGER := 0;
    v_insertadas    INTEGER;
BEGIN
    SELECT * INTO v_settings FROM tenant_settings WHERE tenant_id = p_tenant_id;

    FOR v_cuota IN
        SELECT ca.*
        FROM cuotas_amortizacion ca
        JOIN prestamos p ON p.id = ca.prestamo_id
        WHERE ca.tenant_id = p_tenant_id
          AND ca.estado IN ('Pendiente', 'Abonado')
          AND ca.fecha_vencimiento < p_fecha_hoy - v_settings.dias_mora_gracia
          AND p.estado = 'Activo'
    LOOP
        v_dias_mora := (p_fecha_hoy - v_cuota.fecha_vencimiento) - v_settings.dias_mora_gracia;

        IF v_dias_mora > 0 THEN
            v_monto_mora := ROUND(
                (v_cuota.monto_total - v_cuota.monto_pagado) *
                v_settings.tasa_mora_diaria * v_dias_mora,
                2
            );

            IF v_monto_mora > 0 THEN
                INSERT INTO cargos_mora (
                    tenant_id, prestamo_id, cuota_id,
                    tipo, dias_mora, tasa_aplicada, monto_mora, fecha_generacion
                )
                VALUES (
                    p_tenant_id, v_cuota.prestamo_id, v_cuota.id,
                    'PorcentajeDiario', v_dias_mora,
                    v_settings.tasa_mora_diaria, v_monto_mora, p_fecha_hoy
                )
                ON CONFLICT (cuota_id, dias_mora) DO NOTHING;

                GET DIAGNOSTICS v_insertadas = ROW_COUNT;
                v_contador := v_contador + v_insertadas;
            END IF;
        END IF;
    END LOOP;

    RETURN v_contador;
END;
$$ LANGUAGE plpgsql;

-- ── Verificación (correr después de aplicar todo) ───────────────────────────
SELECT 'tenant_settings.radio_geocerca_metros' AS chequeo,
       EXISTS(SELECT 1 FROM information_schema.columns
              WHERE table_name='tenant_settings' AND column_name='radio_geocerca_metros') AS ok
UNION ALL
SELECT 'clientes.tipo_documento',
       EXISTS(SELECT 1 FROM information_schema.columns
              WHERE table_name='clientes' AND column_name='tipo_documento')
UNION ALL
SELECT 'planes_saas.growth',
       EXISTS(SELECT 1 FROM planes_saas WHERE id='growth')
UNION ALL
SELECT 'fn_calcular_mora(uuid,date)',
       EXISTS(SELECT 1 FROM pg_proc WHERE proname='fn_calcular_mora'
              AND pg_get_function_identity_arguments(oid) = 'p_tenant_id uuid, p_fecha_hoy date');
