-- =============================================================================
-- OC CREDIT - Sistema de Préstamos y Cobranzas por Rutas
-- © 2026 OC Moon Group LLC. Todos los derechos reservados.
-- Migration: 001_initial_schema.sql
-- Engine: PostgreSQL 15+
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- trigram indexes for text search

-- ---------------------------------------------------------------------------
-- TIPOS ENUM NATIVOS
-- ---------------------------------------------------------------------------

CREATE TYPE rol_usuario AS ENUM (
    'admin_tenant',
    'supervisor_tenant',
    'cobrador_tenant'
);

CREATE TYPE estado_prestamo AS ENUM (
    'Pendiente',
    'Activo',
    'Pagado',
    'Vencido',
    'PagadoPorRenovacion',
    'Rechazado',
    'Cancelado'
);

CREATE TYPE modalidad_prestamo AS ENUM (
    'Diario',
    'Semanal',
    'Quincenal',
    'Mensual'
);

CREATE TYPE estado_cuota AS ENUM (
    'Pendiente',
    'Abonado',
    'Pagado',
    'Vencida'
);

CREATE TYPE tipo_transaccion AS ENUM (
    'Cobro',
    'Gasto',
    'Apertura',
    'Cierre',
    'PagoDigital',
    'Ajuste',
    'Retiro'
);

CREATE TYPE estado_caja AS ENUM (
    'Abierta',
    'Cerrada',
    'Cuadrada'
);

CREATE TYPE tipo_novedad AS ENUM (
    'Cliente_No_Estaba',
    'Cliente_Sin_Dinero',
    'Otro'
);

CREATE TYPE tipo_cargo_mora AS ENUM (
    'PorcentajeDiario',
    'MontoFijo'
);

CREATE TYPE estado_cargo_mora AS ENUM (
    'Pendiente',
    'Pagado',
    'Condonado'
);

CREATE TYPE estado_webhook AS ENUM (
    'Pendiente',
    'Procesado',
    'Fallido'
);

-- ---------------------------------------------------------------------------
-- TABLA: tenants
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
    id                              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa                  VARCHAR(200)    NOT NULL,
    ruc_cedula                      VARCHAR(50)     NOT NULL UNIQUE,
    email_contacto                  VARCHAR(150)    NOT NULL UNIQUE,
    telefono                        VARCHAR(30),
    pais                            CHAR(2)         NOT NULL DEFAULT 'DO', -- ISO 3166-1 alpha-2
    activo                          BOOLEAN         NOT NULL DEFAULT TRUE,
    plan_suscripcion                VARCHAR(50)     NOT NULL DEFAULT 'basico',
    fecha_inicio_suscripcion        DATE            NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento_suscripcion   DATE,
    max_cobradores                  INTEGER         NOT NULL DEFAULT 5,
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Empresas inquilinas del sistema SaaS multi-tenant';
COMMENT ON COLUMN tenants.id IS 'Discriminador de tenant para aislamiento de datos';

-- ---------------------------------------------------------------------------
-- TABLA: tenant_settings (White-Label / Marca Blanca)
-- ---------------------------------------------------------------------------
CREATE TABLE tenant_settings (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    url_logo                VARCHAR(500),
    color_primario          CHAR(7)     NOT NULL DEFAULT '#1976D2',     -- Hex #RRGGBB
    color_secundario        CHAR(7)     NOT NULL DEFAULT '#424242',
    color_acento            CHAR(7)     NOT NULL DEFAULT '#FF6F00',
    moneda                  CHAR(3)     NOT NULL DEFAULT 'DOP',         -- ISO 4217
    simbolo_moneda          VARCHAR(5)  NOT NULL DEFAULT 'RD$',
    texto_pie_recibo        TEXT,
    dias_mora_gracia        INTEGER     NOT NULL DEFAULT 1,
    tasa_mora_diaria        NUMERIC(7,6) NOT NULL DEFAULT 0.020000,    -- 2.0% diario
    permite_cobro_domingo   BOOLEAN     NOT NULL DEFAULT FALSE,
    zona_horaria            VARCHAR(50) NOT NULL DEFAULT 'America/Santo_Domingo',
    formato_fecha           VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    nombre_comercial        VARCHAR(200),                               -- Para recibos
    direccion_fiscal        TEXT,
    telefono_soporte        VARCHAR(30),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_color_primario   CHECK (color_primario   ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_color_secundario CHECK (color_secundario ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_color_acento     CHECK (color_acento     ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_moneda           CHECK (moneda ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_dias_gracia      CHECK (dias_mora_gracia >= 0),
    CONSTRAINT chk_tasa_mora        CHECK (tasa_mora_diaria >= 0 AND tasa_mora_diaria <= 1)
);

COMMENT ON TABLE tenant_settings IS 'Configuración de marca blanca y parámetros financieros por tenant';

-- ---------------------------------------------------------------------------
-- TABLA: usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email               VARCHAR(150)    NOT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    rol                 rol_usuario     NOT NULL,
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,
    ultimo_acceso       TIMESTAMPTZ,
    token_refresh       TEXT,
    intentos_fallidos   SMALLINT        NOT NULL DEFAULT 0,
    bloqueado_hasta     TIMESTAMPTZ,
    must_change_pwd     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_tenant_email UNIQUE (tenant_id, email),
    CONSTRAINT chk_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE usuarios IS 'Credenciales de acceso. Discriminados por tenant_id';
COMMENT ON COLUMN usuarios.password_hash IS 'bcrypt hash, min cost 12';

-- ---------------------------------------------------------------------------
-- TABLA: empleados (1:1 con usuarios)
-- ---------------------------------------------------------------------------
CREATE TABLE empleados (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id      UUID        NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    cedula          VARCHAR(20),
    telefono        VARCHAR(30),
    direccion       TEXT,
    foto_url        VARCHAR(500),
    activo          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_empleado_cedula_tenant UNIQUE (tenant_id, cedula)
);

COMMENT ON TABLE empleados IS 'Perfil de empleado vinculado 1:1 a usuarios';

-- ---------------------------------------------------------------------------
-- TABLA: rutas
-- ---------------------------------------------------------------------------
CREATE TABLE rutas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    zona            VARCHAR(100),
    cobrador_id     UUID        REFERENCES empleados(id) ON DELETE SET NULL,
    activa          BOOLEAN     NOT NULL DEFAULT TRUE,
    color_mapa      CHAR(7)     DEFAULT '#2196F3',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ruta_nombre_tenant UNIQUE (tenant_id, nombre)
);

COMMENT ON TABLE rutas IS 'Rutas de cobranza. Cada ruta pertenece a un solo tenant';

-- ---------------------------------------------------------------------------
-- TABLA: clientes
-- ---------------------------------------------------------------------------
CREATE TABLE clientes (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ruta_id                     UUID        REFERENCES rutas(id) ON DELETE SET NULL,
    codigo_cliente              VARCHAR(50),
    nombre                      VARCHAR(100) NOT NULL,
    apellido                    VARCHAR(100) NOT NULL,
    cedula                      VARCHAR(20),
    telefono                    VARCHAR(30),
    telefono_referencia         VARCHAR(30),
    nombre_referencia           VARCHAR(200),
    direccion_casa              TEXT,
    latitud_casa                DOUBLE PRECISION,
    longitud_casa               DOUBLE PRECISION,
    foto_url                    VARCHAR(500),
    foto_cedula_frontal_url     VARCHAR(500),
    foto_cedula_trasera_url     VARCHAR(500),
    activo                      BOOLEAN     NOT NULL DEFAULT TRUE,
    orden_visita                INTEGER,
    score_pago                  SMALLINT    DEFAULT 100 CHECK (score_pago BETWEEN 0 AND 100),
    notas_internas              TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cliente_cedula_tenant   UNIQUE (tenant_id, cedula),
    CONSTRAINT uq_cliente_codigo_tenant   UNIQUE (tenant_id, codigo_cliente)
);

COMMENT ON TABLE clientes IS 'Clientes/deudores segregados por tenant y ruta';

-- ---------------------------------------------------------------------------
-- TABLA: feriados (días no laborables)
-- ---------------------------------------------------------------------------
CREATE TABLE feriados (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID    REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
    fecha           DATE    NOT NULL,
    descripcion     VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_feriado_fecha_tenant UNIQUE (tenant_id, fecha)
);

COMMENT ON TABLE feriados IS 'Días feriados. tenant_id NULL aplica a todos los tenants';

-- Feriados nacionales de República Dominicana 2026
INSERT INTO feriados (tenant_id, fecha, descripcion) VALUES
    (NULL, '2026-01-01', 'Año Nuevo'),
    (NULL, '2026-01-06', 'Día de Reyes'),
    (NULL, '2026-01-21', 'Día de la Altagracia'),
    (NULL, '2026-01-26', 'Día de Duarte'),
    (NULL, '2026-02-27', 'Día de la Independencia'),
    (NULL, '2026-04-03', 'Viernes Santo'),
    (NULL, '2026-04-04', 'Sábado Santo'),
    (NULL, '2026-05-01', 'Día del Trabajo'),
    (NULL, '2026-06-11', 'Corpus Christi'),
    (NULL, '2026-08-16', 'Día de la Restauración'),
    (NULL, '2026-09-24', 'Día de las Mercedes'),
    (NULL, '2026-11-06', 'Constitución'),
    (NULL, '2026-12-25', 'Navidad');

-- ---------------------------------------------------------------------------
-- TABLA: prestamos
-- ---------------------------------------------------------------------------
CREATE TABLE prestamos (
    id                          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id                  UUID                NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    supervisor_id               UUID                REFERENCES empleados(id) ON DELETE SET NULL,
    aprobado_por_id             UUID                REFERENCES empleados(id) ON DELETE SET NULL,
    cobrador_id                 UUID                REFERENCES empleados(id) ON DELETE SET NULL,
    ruta_id                     UUID                REFERENCES rutas(id) ON DELETE SET NULL,

    -- Solicitud
    capital_solicitado          NUMERIC(12,2)       NOT NULL CHECK (capital_solicitado > 0),
    capital_aprobado            NUMERIC(12,2)       CHECK (capital_aprobado > 0),
    capital_neto_entregado      NUMERIC(12,2),      -- Después de deducción por renovación
    tasa_interes_pactada        NUMERIC(8,4)        NOT NULL CHECK (tasa_interes_pactada >= 0),

    -- Plan de pago
    modalidad                   modalidad_prestamo  NOT NULL,
    numero_cuotas               INTEGER             NOT NULL CHECK (numero_cuotas > 0),
    monto_cuota                 NUMERIC(12,2),
    total_a_pagar               NUMERIC(12,2),
    total_interes               NUMERIC(12,2),

    -- Estado
    estado                      estado_prestamo     NOT NULL DEFAULT 'Pendiente',

    -- Fechas
    fecha_solicitud             DATE                NOT NULL DEFAULT CURRENT_DATE,
    fecha_aprobacion            DATE,
    fecha_desembolso            DATE,
    fecha_primer_pago           DATE,
    fecha_ultimo_pago_esperado  DATE,

    -- Renovación
    prestamo_anterior_id        UUID                REFERENCES prestamos(id) ON DELETE SET NULL,
    saldo_liquidado_renovacion  NUMERIC(12,2),

    notas                       TEXT,
    created_at                  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE prestamos IS 'Préstamos activos e históricos. Un cliente solo puede tener un préstamo Activo por tenant';

-- Restricción: un cliente no puede tener dos préstamos Activos en el mismo tenant
CREATE UNIQUE INDEX uq_prestamo_activo_por_cliente
    ON prestamos (tenant_id, cliente_id)
    WHERE estado = 'Activo';

-- ---------------------------------------------------------------------------
-- TABLA: cuotas_amortizacion
-- ---------------------------------------------------------------------------
CREATE TABLE cuotas_amortizacion (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prestamo_id         UUID            NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
    numero_cuota        INTEGER         NOT NULL CHECK (numero_cuota > 0),
    fecha_vencimiento   DATE            NOT NULL,

    -- Montos originales del plan
    capital             NUMERIC(12,2)   NOT NULL DEFAULT 0,
    interes             NUMERIC(12,2)   NOT NULL DEFAULT 0,
    monto_total         NUMERIC(12,2)   NOT NULL,   -- capital + interes

    -- Pagos acumulados
    capital_pagado      NUMERIC(12,2)   NOT NULL DEFAULT 0,
    interes_pagado      NUMERIC(12,2)   NOT NULL DEFAULT 0,
    monto_pagado        NUMERIC(12,2)   NOT NULL DEFAULT 0,

    estado              estado_cuota    NOT NULL DEFAULT 'Pendiente',
    fecha_pago          DATE,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cuota_numero_prestamo UNIQUE (prestamo_id, numero_cuota),
    CONSTRAINT chk_cuota_capital_pagado CHECK (capital_pagado   >= 0 AND capital_pagado  <= capital  + 0.01),
    CONSTRAINT chk_cuota_interes_pagado CHECK (interes_pagado   >= 0 AND interes_pagado  <= interes  + 0.01),
    CONSTRAINT chk_cuota_monto_pagado   CHECK (monto_pagado     >= 0 AND monto_pagado    <= monto_total + 0.01)
);

COMMENT ON TABLE cuotas_amortizacion IS 'Plan de amortización generado al aprobar cada préstamo';

-- ---------------------------------------------------------------------------
-- TABLA: cajas
-- ---------------------------------------------------------------------------
CREATE TABLE cajas (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cobrador_id                 UUID            NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
    ruta_id                     UUID            REFERENCES rutas(id) ON DELETE SET NULL,
    fecha                       DATE            NOT NULL DEFAULT CURRENT_DATE,

    -- Apertura
    monto_apertura              NUMERIC(12,2)   NOT NULL DEFAULT 0,
    latitud_apertura            DOUBLE PRECISION,
    longitud_apertura           DOUBLE PRECISION,
    hora_apertura               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Totales calculados en tiempo real
    total_cobros                NUMERIC(12,2)   NOT NULL DEFAULT 0,
    total_gastos                NUMERIC(12,2)   NOT NULL DEFAULT 0,
    monto_esperado              NUMERIC(12,2)   GENERATED ALWAYS AS
                                    (monto_apertura + total_cobros - total_gastos) STORED,

    -- Cierre ciego
    monto_cierre_declarado      NUMERIC(12,2),
    diferencia_cierre           NUMERIC(12,2),  -- Solo visible para Admin
    latitud_cierre              DOUBLE PRECISION,
    longitud_cierre             DOUBLE PRECISION,
    hora_cierre                 TIMESTAMPTZ,
    nota_cierre                 TEXT,

    estado                      estado_caja     NOT NULL DEFAULT 'Abierta',

    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_caja_cobrador_fecha UNIQUE (tenant_id, cobrador_id, fecha)
);

COMMENT ON TABLE cajas IS 'Caja diaria de cada cobrador. El cierre es ciego para el cobrador';

-- ---------------------------------------------------------------------------
-- TABLA: transacciones
-- ---------------------------------------------------------------------------
CREATE TABLE transacciones (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_idempotencia       UUID                NOT NULL UNIQUE,  -- Generado en el móvil
    tenant_id               UUID                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    caja_id                 UUID                NOT NULL REFERENCES cajas(id) ON DELETE RESTRICT,
    cobrador_id             UUID                NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,

    -- Referencias opcionales según tipo
    cliente_id              UUID                REFERENCES clientes(id) ON DELETE RESTRICT,
    prestamo_id             UUID                REFERENCES prestamos(id) ON DELETE RESTRICT,

    tipo                    tipo_transaccion    NOT NULL,
    monto                   NUMERIC(12,2)       NOT NULL CHECK (monto > 0),

    -- Distribución JSON (mora, interes, capital, excedente)
    distribucion_pago       JSONB,

    descripcion             TEXT,
    foto_comprobante_url    VARCHAR(500),       -- Para gastos de ruta

    -- Auditoría geográfica
    latitud_transaccion     DOUBLE PRECISION,
    longitud_transaccion    DOUBLE PRECISION,
    precision_gps           DOUBLE PRECISION,

    -- Sincronización offline
    sincronizado_offline    BOOLEAN             NOT NULL DEFAULT FALSE,
    timestamp_dispositivo   TIMESTAMPTZ,        -- Timestamp original del dispositivo

    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE transacciones IS 'Registro inmutable de cada movimiento de caja. Idempotente por UUID';

-- ---------------------------------------------------------------------------
-- TABLA: cargos_mora
-- ---------------------------------------------------------------------------
CREATE TABLE cargos_mora (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prestamo_id         UUID                NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
    cuota_id            UUID                NOT NULL REFERENCES cuotas_amortizacion(id) ON DELETE CASCADE,

    tipo                tipo_cargo_mora     NOT NULL DEFAULT 'PorcentajeDiario',
    dias_mora           INTEGER             NOT NULL CHECK (dias_mora > 0),
    tasa_aplicada       NUMERIC(7,6),
    monto_mora          NUMERIC(12,2)       NOT NULL CHECK (monto_mora > 0),
    monto_pagado        NUMERIC(12,2)       NOT NULL DEFAULT 0,

    estado              estado_cargo_mora   NOT NULL DEFAULT 'Pendiente',
    fecha_generacion    DATE                NOT NULL DEFAULT CURRENT_DATE,
    fecha_pago          DATE,

    -- Transacción que liquidó esta mora
    transaccion_id      UUID                REFERENCES transacciones(id) ON DELETE SET NULL,

    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_mora_pagado CHECK (monto_pagado >= 0 AND monto_pagado <= monto_mora + 0.01)
);

COMMENT ON TABLE cargos_mora IS 'Penalizaciones por atrasos. Absorbidas con máxima prioridad en el pago';

-- ---------------------------------------------------------------------------
-- TABLA: novedades_ruta
-- ---------------------------------------------------------------------------
CREATE TABLE novedades_ruta (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cobrador_id             UUID            NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
    cliente_id              UUID            NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    prestamo_id             UUID            REFERENCES prestamos(id) ON DELETE SET NULL,
    caja_id                 UUID            REFERENCES cajas(id) ON DELETE SET NULL,
    tipo                    tipo_novedad    NOT NULL,
    descripcion             TEXT,

    -- GPS obligatorio para validar visita física
    latitud                 DOUBLE PRECISION NOT NULL,
    longitud                DOUBLE PRECISION NOT NULL,
    precision_gps           DOUBLE PRECISION,

    foto_url                VARCHAR(500),
    sincronizado_offline    BOOLEAN         NOT NULL DEFAULT FALSE,
    timestamp_dispositivo   TIMESTAMPTZ,

    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE novedades_ruta IS 'Registro de visitas fallidas. GPS obligatorio para auditoría';

-- ---------------------------------------------------------------------------
-- TABLA: webhooks_pagos_digitales
-- ---------------------------------------------------------------------------
CREATE TABLE webhooks_pagos_digitales (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proveedor           VARCHAR(50)         NOT NULL,   -- 'azul', 'placetopay'
    referencia_externa  VARCHAR(200)        NOT NULL,
    monto               NUMERIC(12,2)       NOT NULL,
    moneda              CHAR(3)             NOT NULL,
    estado              estado_webhook      NOT NULL DEFAULT 'Pendiente',
    payload_raw         JSONB,
    transaccion_id      UUID                REFERENCES transacciones(id),
    cliente_id          UUID                REFERENCES clientes(id),
    prestamo_id         UUID                REFERENCES prestamos(id),
    procesado_en        TIMESTAMPTZ,
    error_mensaje       TEXT,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_webhook_referencia_proveedor UNIQUE (proveedor, referencia_externa)
);

COMMENT ON TABLE webhooks_pagos_digitales IS 'Pagos digitales via Azul/PlacetoPay. Aislados del efectivo';

-- ---------------------------------------------------------------------------
-- TABLA: audit_log (Trazabilidad inmutable)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              BIGSERIAL,
    tenant_id       UUID            REFERENCES tenants(id) ON DELETE SET NULL,
    usuario_id      UUID            REFERENCES usuarios(id) ON DELETE SET NULL,
    accion          VARCHAR(100)    NOT NULL,
    tabla_afectada  VARCHAR(100),
    registro_id     UUID,
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    ip_origen       INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_audit_log PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE audit_log IS 'Log de auditoría inmutable particionado por fecha';

-- Partición inicial para 2026
CREATE TABLE audit_log_2026 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE audit_log_2027 PARTITION OF audit_log
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- ---------------------------------------------------------------------------
-- ÍNDICES OPTIMIZADOS
-- ---------------------------------------------------------------------------

-- tenants
CREATE INDEX idx_tenants_activo         ON tenants(activo) WHERE activo = TRUE;
CREATE INDEX idx_tenants_ruc            ON tenants(ruc_cedula);

-- tenant_settings
CREATE INDEX idx_tsettings_tenant       ON tenant_settings(tenant_id);

-- usuarios
CREATE INDEX idx_usuarios_tenant        ON usuarios(tenant_id);
CREATE INDEX idx_usuarios_tenant_email  ON usuarios(tenant_id, email);
CREATE INDEX idx_usuarios_activo        ON usuarios(tenant_id, activo) WHERE activo = TRUE;

-- empleados
CREATE INDEX idx_empleados_tenant       ON empleados(tenant_id);
CREATE INDEX idx_empleados_usuario      ON empleados(usuario_id);
CREATE INDEX idx_empleados_tenant_activo ON empleados(tenant_id, activo) WHERE activo = TRUE;

-- rutas
CREATE INDEX idx_rutas_tenant           ON rutas(tenant_id);
CREATE INDEX idx_rutas_cobrador         ON rutas(cobrador_id);
CREATE INDEX idx_rutas_tenant_activa    ON rutas(tenant_id, activa) WHERE activa = TRUE;

-- clientes
CREATE INDEX idx_clientes_tenant        ON clientes(tenant_id);
CREATE INDEX idx_clientes_ruta          ON clientes(ruta_id);
CREATE INDEX idx_clientes_tenant_ruta   ON clientes(tenant_id, ruta_id);
CREATE INDEX idx_clientes_cedula        ON clientes(cedula) WHERE cedula IS NOT NULL;
CREATE INDEX idx_clientes_nombre_trgm   ON clientes USING gin(nombre gin_trgm_ops);
CREATE INDEX idx_clientes_apellido_trgm ON clientes USING gin(apellido gin_trgm_ops);
CREATE INDEX idx_clientes_activo        ON clientes(tenant_id, activo) WHERE activo = TRUE;

-- prestamos
CREATE INDEX idx_prestamos_tenant           ON prestamos(tenant_id);
CREATE INDEX idx_prestamos_cliente          ON prestamos(cliente_id);
CREATE INDEX idx_prestamos_cobrador         ON prestamos(cobrador_id);
CREATE INDEX idx_prestamos_ruta             ON prestamos(ruta_id);
CREATE INDEX idx_prestamos_estado           ON prestamos(estado);
CREATE INDEX idx_prestamos_tenant_estado    ON prestamos(tenant_id, estado);
CREATE INDEX idx_prestamos_tenant_cliente   ON prestamos(tenant_id, cliente_id);
CREATE INDEX idx_prestamos_tenant_activos   ON prestamos(tenant_id, cobrador_id) WHERE estado = 'Activo';

-- cuotas_amortizacion
CREATE INDEX idx_cuotas_tenant              ON cuotas_amortizacion(tenant_id);
CREATE INDEX idx_cuotas_prestamo            ON cuotas_amortizacion(prestamo_id);
CREATE INDEX idx_cuotas_estado              ON cuotas_amortizacion(estado);
CREATE INDEX idx_cuotas_vencimiento         ON cuotas_amortizacion(fecha_vencimiento);
CREATE INDEX idx_cuotas_tenant_estado       ON cuotas_amortizacion(tenant_id, estado);
CREATE INDEX idx_cuotas_prestamo_estado     ON cuotas_amortizacion(prestamo_id, estado);
CREATE INDEX idx_cuotas_vencidas            ON cuotas_amortizacion(prestamo_id, fecha_vencimiento)
    WHERE estado IN ('Pendiente', 'Abonado', 'Vencida');

-- cajas
CREATE INDEX idx_cajas_tenant           ON cajas(tenant_id);
CREATE INDEX idx_cajas_cobrador         ON cajas(cobrador_id);
CREATE INDEX idx_cajas_fecha            ON cajas(fecha DESC);
CREATE INDEX idx_cajas_estado           ON cajas(estado);
CREATE INDEX idx_cajas_abierta          ON cajas(tenant_id, cobrador_id, estado)
    WHERE estado = 'Abierta';

-- transacciones
CREATE INDEX idx_tx_tenant              ON transacciones(tenant_id);
CREATE INDEX idx_tx_caja                ON transacciones(caja_id);
CREATE INDEX idx_tx_cliente             ON transacciones(cliente_id);
CREATE INDEX idx_tx_prestamo            ON transacciones(prestamo_id);
CREATE INDEX idx_tx_uuid                ON transacciones(uuid_idempotencia);
CREATE INDEX idx_tx_tipo                ON transacciones(tipo);
CREATE INDEX idx_tx_offline             ON transacciones(sincronizado_offline)
    WHERE sincronizado_offline = TRUE;
CREATE INDEX idx_tx_tenant_fecha        ON transacciones(tenant_id, created_at DESC);
CREATE INDEX idx_tx_geo                 ON transacciones(tenant_id)
    INCLUDE (latitud_transaccion, longitud_transaccion)
    WHERE latitud_transaccion IS NOT NULL;

-- cargos_mora
CREATE INDEX idx_mora_tenant            ON cargos_mora(tenant_id);
CREATE INDEX idx_mora_prestamo          ON cargos_mora(prestamo_id);
CREATE INDEX idx_mora_cuota             ON cargos_mora(cuota_id);
CREATE INDEX idx_mora_estado            ON cargos_mora(estado);
CREATE INDEX idx_mora_pendiente         ON cargos_mora(prestamo_id, fecha_generacion ASC)
    WHERE estado = 'Pendiente';

-- novedades
CREATE INDEX idx_novedades_tenant       ON novedades_ruta(tenant_id);
CREATE INDEX idx_novedades_cobrador     ON novedades_ruta(cobrador_id);
CREATE INDEX idx_novedades_cliente      ON novedades_ruta(cliente_id);
CREATE INDEX idx_novedades_fecha        ON novedades_ruta(created_at DESC);

-- webhooks
CREATE INDEX idx_webhooks_tenant        ON webhooks_pagos_digitales(tenant_id);
CREATE INDEX idx_webhooks_estado        ON webhooks_pagos_digitales(estado) WHERE estado = 'Pendiente';

-- audit_log
CREATE INDEX idx_audit_tenant           ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_usuario          ON audit_log(usuario_id);
CREATE INDEX idx_audit_tabla            ON audit_log(tabla_afectada, created_at DESC);

-- ---------------------------------------------------------------------------
-- FUNCIÓN: updated_at trigger automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'tenants', 'tenant_settings', 'usuarios', 'empleados',
        'rutas', 'clientes', 'prestamos', 'cuotas_amortizacion',
        'cajas', 'transacciones', 'cargos_mora'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNCIÓN: Generadora de cuotas respetando días hábiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_es_dia_habil(p_fecha DATE, p_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Excluir domingos (DOW = 0)
    IF EXTRACT(DOW FROM p_fecha) = 0 THEN
        RETURN FALSE;
    END IF;
    -- Excluir feriados globales y del tenant
    IF EXISTS (
        SELECT 1 FROM feriados
        WHERE fecha = p_fecha
          AND (tenant_id IS NULL OR tenant_id = p_tenant_id)
    ) THEN
        RETURN FALSE;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_siguiente_dia_habil(p_fecha DATE, p_tenant_id UUID DEFAULT NULL)
RETURNS DATE AS $$
DECLARE
    v_fecha DATE := p_fecha;
BEGIN
    WHILE NOT fn_es_dia_habil(v_fecha, p_tenant_id) LOOP
        v_fecha := v_fecha + INTERVAL '1 day';
    END LOOP;
    RETURN v_fecha;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- FUNCIÓN: Cálculo y registro de mora automática
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_mora(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_settings      tenant_settings%ROWTYPE;
    v_cuota         cuotas_amortizacion%ROWTYPE;
    v_dias_mora     INTEGER;
    v_monto_mora    NUMERIC(12,2);
    v_contador      INTEGER := 0;
BEGIN
    SELECT * INTO v_settings FROM tenant_settings WHERE tenant_id = p_tenant_id;

    FOR v_cuota IN
        SELECT ca.*
        FROM cuotas_amortizacion ca
        JOIN prestamos p ON p.id = ca.prestamo_id
        WHERE ca.tenant_id = p_tenant_id
          AND ca.estado IN ('Pendiente', 'Abonado')
          AND ca.fecha_vencimiento < CURRENT_DATE - v_settings.dias_mora_gracia
          AND p.estado = 'Activo'
    LOOP
        v_dias_mora := (CURRENT_DATE - v_cuota.fecha_vencimiento) - v_settings.dias_mora_gracia;

        IF v_dias_mora > 0 THEN
            v_monto_mora := ROUND(
                (v_cuota.monto_total - v_cuota.monto_pagado) *
                v_settings.tasa_mora_diaria * v_dias_mora,
                2
            );

            IF v_monto_mora > 0 THEN
                INSERT INTO cargos_mora (
                    tenant_id, prestamo_id, cuota_id,
                    tipo, dias_mora, tasa_aplicada, monto_mora
                )
                VALUES (
                    p_tenant_id, v_cuota.prestamo_id, v_cuota.id,
                    'PorcentajeDiario', v_dias_mora,
                    v_settings.tasa_mora_diaria, v_monto_mora
                )
                ON CONFLICT DO NOTHING;

                v_contador := v_contador + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_contador;
END;
$$ LANGUAGE plpgsql;

COMMIT;
