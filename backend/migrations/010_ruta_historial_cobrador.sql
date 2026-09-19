-- Historial de auditoria de reasignaciones de cobrador por ruta.
-- Tabla insert-only (nunca se actualiza ni se borra una fila existente),
-- mismo patron que consultas_buro/buro_credito: el actor y los cobradores
-- quedan desnormalizados (id + nombre) para no depender de un JOIN al listar.
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

-- Las consultas de "clientes por ruta ordenados por orden_visita" (panel y
-- app movil) no tenian indice compuesto que las respalde.
CREATE INDEX IF NOT EXISTS idx_clientes_ruta_orden
  ON clientes (tenant_id, ruta_id, orden_visita);
