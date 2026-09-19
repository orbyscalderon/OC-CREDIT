-- ============================================================
-- MIGRACIÓN 014: fn_calcular_mora ahora recibe la fecha de "hoy" calculada
-- en la aplicación (zona horaria del tenant) en vez de usar CURRENT_DATE,
-- que reflejaba la zona horaria fija de la sesión de Postgres
-- (America/Santo_Domingo para TODOS los tenants sin importar su país real).
-- ============================================================

BEGIN;

-- Bug preexistente descubierto al verificar este cambio: el "ON CONFLICT DO
-- NOTHING" original no apuntaba a ninguna restricción real (cargos_mora solo
-- tenía PK sobre un UUID aleatorio), así que dos ejecuciones de
-- fn_calcular_mora el mismo día duplicaban el cargo de mora completo en vez
-- de ser un no-op. Un cuota solo puede estar "N días en mora" una vez en su
-- vida (dias_mora crece de 1 en 1 mientras siga impaga), así que esa pareja
-- es la clave natural de idempotencia real.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mora_cuota_dias ON cargos_mora(cuota_id, dias_mora);

-- No se puede CREATE OR REPLACE con una lista de parámetros distinta —
-- Postgres lo trataría como un overload nuevo, dejando el viejo huérfano.
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

                -- ROW_COUNT refleja solo lo realmente insertado (0 si el
                -- ON CONFLICT lo omitió) — v_contador antes contaba
                -- intentos, no filas reales, y mentía en una re-ejecución.
                GET DIAGNOSTICS v_insertadas = ROW_COUNT;
                v_contador := v_contador + v_insertadas;
            END IF;
        END IF;
    END LOOP;

    RETURN v_contador;
END;
$$ LANGUAGE plpgsql;

COMMIT;
