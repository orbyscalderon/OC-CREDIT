-- =============================================================================
-- OC CREDIT - Sistema de Préstamos y Cobranzas por Rutas
-- © 2026 OCA HOLDING GROUP LLC. Todos los derechos reservados.
-- Migration: 015_security_advisor_fixes.sql
-- Corrige los hallazgos del linter de seguridad de Supabase (ERROR/WARN):
--   - 2 vistas con semántica SECURITY DEFINER (corren con privilegios del
--     dueño, ignorando RLS/rol de quien consulta) -> security_invoker = true
--   - 6 funciones con search_path mutable (riesgo de hijacking de schema)
--     -> search_path fijo a 'public'
--   - Extensión pg_trgm instalada en schema public -> movida a 'extensions'
-- Seguro de re-ejecutar.
-- =============================================================================

ALTER FUNCTION fn_set_updated_at() SET search_path = public;
ALTER FUNCTION fn_es_dia_habil(date, uuid) SET search_path = public;
ALTER FUNCTION fn_siguiente_dia_habil(date, uuid) SET search_path = public;
ALTER FUNCTION fn_auto_reportar_buro(uuid, motivo_reporte_buro, nivel_riesgo_buro, text) SET search_path = public;
ALTER FUNCTION fn_puede_crear_prestamo(uuid) SET search_path = public;
ALTER FUNCTION fn_calcular_mora(uuid, date) SET search_path = public;

ALTER VIEW v_perfil_buro SET (security_invoker = true);
ALTER VIEW v_uso_tenant SET (security_invoker = true);

DO $$
BEGIN
    CREATE SCHEMA IF NOT EXISTS extensions;

    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    END IF;
END;
$$;

-- El rol de conexión de la app (postgres/service role) debe poder resolver
-- gin_trgm_ops/similarity()/% sin schema-qualify tras el movimiento.
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET search_path = "$user", public, extensions', current_database());
END;
$$;
