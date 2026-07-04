-- =============================================================================
-- OC CREDIT - Buró de Crédito Permanente (Cross-Tenant)
-- © 2026 OC HOLDING GROUP LLC. Todos los derechos reservados.
-- Migration: 002_buro_credito.sql
--
-- DISEÑO DE PERMANENCIA:
--   - Las tablas buro_credito y consultas_buro NO tienen FK con CASCADE.
--   - Los datos sobreviven a la eliminación de tenants, empleados o préstamos.
--   - SOLO un super_admin puede inactivar un registro (nunca borrar).
--   - La cédula es el identificador universal cross-tenant.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- NUEVOS ENUMs
-- ---------------------------------------------------------------------------

CREATE TYPE nivel_riesgo_buro AS ENUM (
    'Bajo',              -- Deuda histórica resuelta, bajo monto
    'Medio',             -- 1 incidente menor, resuelto o antiguo
    'Alto',              -- 1+ incidentes sin resolver, deuda media
    'CriticoNoPrestable' -- Fraude, impago total o múltiples agencias
);

CREATE TYPE motivo_reporte_buro AS ENUM (
    'MoraExtendida',       -- 30+ días mora sin pagar
    'ImpagoParcial',       -- Cuotas sin pagar al cierre forzoso
    'ImpagoTotal',         -- No realizó ningún pago
    'Fraude',              -- Documentos falsos o suplantación
    'PrestamoAbandonado',  -- Desapareció con el capital prestado
    'ChequesDevueltos'     -- Cheques sin fondo (pago digital fallido)
);

CREATE TYPE rol_sistema AS ENUM (
    'super_admin',        -- Plataforma OC HOLDING GROUP LLC
    'admin_tenant',
    'supervisor_tenant',
    'cobrador_tenant'
);

-- Agregar super_admin al ENUM de rol_usuario si no existe
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'super_admin';

-- ---------------------------------------------------------------------------
-- TABLA: buro_credito
-- PERMANENTE — sin FK con CASCADE, datos inmortales por diseño
-- ---------------------------------------------------------------------------
CREATE TABLE buro_credito (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación permanente del deudor (nunca se borra)
    cedula                      VARCHAR(20)     NOT NULL,
    nombre                      VARCHAR(100)    NOT NULL,
    apellido                    VARCHAR(100)    NOT NULL,
    telefono                    VARCHAR(30),
    fecha_nacimiento            DATE,

    -- Quién reportó (datos desnormalizados para permanencia)
    -- NO usamos FK con ON DELETE CASCADE para que el registro sobreviva
    tenant_id                   UUID            NOT NULL,   -- sin REFERENCES
    tenant_nombre               VARCHAR(200)    NOT NULL,   -- nombre al momento del reporte
    empleado_reporta_id         UUID,                       -- sin REFERENCES
    empleado_reporta_nombre     VARCHAR(200),

    -- Referencia débil al préstamo (puede quedar en NULL si se archiva)
    prestamo_id                 UUID,                       -- sin REFERENCES
    capital_original            NUMERIC(12,2),
    saldo_impagado              NUMERIC(12,2)   NOT NULL    CHECK (saldo_impagado >= 0),
    moneda                      CHAR(3)         NOT NULL    DEFAULT 'DOP',
    dias_mora_al_reportar       INTEGER,

    -- Clasificación del riesgo
    motivo                      motivo_reporte_buro NOT NULL,
    nivel_riesgo                nivel_riesgo_buro   NOT NULL DEFAULT 'Alto',
    descripcion_detallada       TEXT,

    -- Permanencia estricta
    fecha_reporte               DATE            NOT NULL    DEFAULT CURRENT_DATE,
    activo                      BOOLEAN         NOT NULL    DEFAULT TRUE,

    -- Solo super_admin puede inactivar (no se permite DELETE jamás)
    inactivado_por_email        VARCHAR(150),
    fecha_inactivacion          TIMESTAMPTZ,
    motivo_inactivacion         TEXT,
    -- Si la persona pagó la deuda después del reporte
    deuda_saldada               BOOLEAN         NOT NULL    DEFAULT FALSE,
    fecha_saldo_deuda           DATE,
    comprobante_saldo_url       VARCHAR(500),

    created_at                  TIMESTAMPTZ     NOT NULL    DEFAULT NOW()
    -- NOTA: No hay updated_at. Los reportes son INMUTABLES.
    -- Para corregir un error se inactiva y se crea uno nuevo.
);

COMMENT ON TABLE buro_credito IS
    'Historial crediticio negativo permanente cross-tenant. NUNCA se borra, solo se inactiva por super_admin. '
    'Datos desnormalizados para garantizar permanencia ante eliminación de tenants.';

COMMENT ON COLUMN buro_credito.activo IS
    'FALSE = inactivado por super_admin (error, resolución legal). Los datos siguen existiendo.';

COMMENT ON COLUMN buro_credito.deuda_saldada IS
    'TRUE = el deudor finalmente pagó la deuda. El reporte se mantiene visible pero con este flag.';

-- ---------------------------------------------------------------------------
-- TABLA: consultas_buro (Log de quién consultó a quién)
-- ---------------------------------------------------------------------------
CREATE TABLE consultas_buro (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL,   -- sin REFERENCES, permanente
    tenant_nombre       VARCHAR(200)    NOT NULL,
    consultado_por_id   UUID,
    consultado_por_nombre VARCHAR(200),
    cedula_consultada   VARCHAR(20)     NOT NULL,
    nombre_consultado   VARCHAR(200),
    resultados_encontrados INTEGER      NOT NULL    DEFAULT 0,
    nivel_maximo_encontrado nivel_riesgo_buro,
    decision_tomada     VARCHAR(50),    -- 'Aprobado', 'Rechazado', 'AprobadoConRiesgo'
    monto_prestamo      NUMERIC(12,2),
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT NOW()
);

COMMENT ON TABLE consultas_buro IS
    'Auditoría inmutable de todas las consultas al buró. Permite rastrear si se prestó a alguien con mala historia.';

-- ---------------------------------------------------------------------------
-- TABLA: super_admin_usuarios (Plataforma OC HOLDING GROUP LLC)
-- Segregada de usuarios para no contaminar el scope de tenants
-- ---------------------------------------------------------------------------
CREATE TABLE super_admin_usuarios (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE super_admin_usuarios IS
    'Administradores de la plataforma OC HOLDING GROUP LLC. No pertenecen a ningún tenant.';

-- ---------------------------------------------------------------------------
-- VISTA AGREGADA: v_perfil_buro (consulta enriquecida por cédula)
-- ---------------------------------------------------------------------------
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
    -- Recomendación automática
    CASE
        WHEN MAX(peso_nivel) = 4 THEN 'NO_PRESTAR'
        WHEN MAX(peso_nivel) = 3 AND COUNT(*) FILTER (WHERE NOT deuda_saldada) > 0 THEN 'NO_PRESTAR'
        WHEN MAX(peso_nivel) >= 3 THEN 'PRESTAR_CON_MUCHA_CAUTELA'
        WHEN MAX(peso_nivel) = 2 THEN 'PRESTAR_CON_CAUTELA'
        ELSE 'PRECAUCION_HISTORIA_NEGATIVA'
    END                                                         AS recomendacion
FROM peso_riesgo
GROUP BY cedula, nombre, apellido, telefono;

-- ---------------------------------------------------------------------------
-- FUNCIÓN: Auto-reportar al buró cuando un préstamo entra en default
-- Se invoca desde el backend al marcar préstamo como Vencido o cancelar
-- ---------------------------------------------------------------------------
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
    -- Obtener datos del préstamo
    SELECT * INTO v_prestamo FROM prestamos WHERE id = p_prestamo_id;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- Obtener datos del cliente
    SELECT * INTO v_cliente FROM clientes WHERE id = v_prestamo.cliente_id;
    IF NOT FOUND OR v_cliente.cedula IS NULL THEN RETURN NULL; END IF;

    -- Obtener datos del tenant
    SELECT * INTO v_tenant FROM tenants WHERE id = v_prestamo.tenant_id;

    -- Calcular saldo impagado
    SELECT COALESCE(SUM(monto_total - monto_pagado), 0)
    INTO v_saldo_cuotas
    FROM cuotas_amortizacion
    WHERE prestamo_id = p_prestamo_id
      AND estado IN ('Pendiente', 'Abonado', 'Vencida');

    SELECT COALESCE(SUM(monto_mora - monto_pagado), 0)
    INTO v_saldo_mora
    FROM cargos_mora
    WHERE prestamo_id = p_prestamo_id AND estado = 'Pendiente';

    -- Calcular días de mora máxima
    SELECT COALESCE(MAX(CURRENT_DATE - fecha_vencimiento), 0)
    INTO v_dias_mora
    FROM cuotas_amortizacion
    WHERE prestamo_id = p_prestamo_id
      AND estado IN ('Pendiente', 'Abonado', 'Vencida')
      AND fecha_vencimiento < CURRENT_DATE;

    -- Solo reportar si hay deuda real
    IF (v_saldo_cuotas + v_saldo_mora) <= 0 THEN RETURN NULL; END IF;

    INSERT INTO buro_credito (
        cedula, nombre, apellido, telefono,
        tenant_id, tenant_nombre,
        prestamo_id, capital_original, saldo_impagado, moneda,
        dias_mora_al_reportar, motivo, nivel_riesgo, descripcion_detallada
    ) VALUES (
        v_cliente.cedula,
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

-- ---------------------------------------------------------------------------
-- ÍNDICES optimizados para búsquedas cross-tenant
-- ---------------------------------------------------------------------------
CREATE INDEX idx_buro_cedula          ON buro_credito(cedula);
CREATE INDEX idx_buro_cedula_activo   ON buro_credito(cedula, activo) WHERE activo = TRUE;
CREATE INDEX idx_buro_nombre_trgm     ON buro_credito USING gin(nombre gin_trgm_ops);
CREATE INDEX idx_buro_apellido_trgm   ON buro_credito USING gin(apellido gin_trgm_ops);
CREATE INDEX idx_buro_tenant          ON buro_credito(tenant_id);
CREATE INDEX idx_buro_nivel_riesgo    ON buro_credito(nivel_riesgo);
CREATE INDEX idx_buro_fecha           ON buro_credito(fecha_reporte DESC);
CREATE INDEX idx_buro_prestamo        ON buro_credito(prestamo_id) WHERE prestamo_id IS NOT NULL;
CREATE INDEX idx_consultas_cedula     ON consultas_buro(cedula_consultada);
CREATE INDEX idx_consultas_tenant     ON consultas_buro(tenant_id, created_at DESC);

COMMIT;
