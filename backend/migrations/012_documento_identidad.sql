-- Documento de identidad configurable por pais: la columna "cedula" pasa a
-- convivir con "tipo_documento" (cedula/dni/ssn/curp/... ver
-- backend/src/common/constants/documentos-identidad.ts) para que el buro de
-- credito cross-tenant no confunda un documento de un pais con el de otro
-- que por casualidad tenga el mismo numero como string.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30) NOT NULL DEFAULT 'cedula';

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30) NOT NULL DEFAULT 'cedula';

ALTER TABLE buro_credito
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30) NOT NULL DEFAULT 'cedula';

ALTER TABLE consultas_buro
  ADD COLUMN IF NOT EXISTS tipo_documento_consultado VARCHAR(30) NOT NULL DEFAULT 'cedula';

-- Indices cross-tenant: pasan a ser compuestos (cedula, tipo_documento) para
-- que dos documentos iguales de tipos/paises distintos no colisionen.
DROP INDEX IF EXISTS idx_buro_cedula;
DROP INDEX IF EXISTS idx_buro_cedula_activo;
CREATE INDEX IF NOT EXISTS idx_buro_cedula_tipo        ON buro_credito(cedula, tipo_documento);
CREATE INDEX IF NOT EXISTS idx_buro_cedula_tipo_activo ON buro_credito(cedula, tipo_documento, activo) WHERE activo = TRUE;

-- La vista agregada del buro ahora agrupa tambien por tipo_documento.
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

-- fn_auto_reportar_buro debe propagar el tipo_documento del cliente.
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
