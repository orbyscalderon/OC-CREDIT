-- ============================================================
-- SEED v2: Datos de demostración para OC Credit
-- Ejecutar DESPUÉS de 001 y 002
-- ============================================================

BEGIN;

-- ── Tenant demo ──────────────────────────────────────────────
INSERT INTO tenants (id, nombre_empresa, ruc_cedula, email_contacto, telefono, pais, activo, plan_suscripcion)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Prestamos Demo S.R.L.',
  '1-31-12345-1',
  'admin@demo.oc',
  '809-555-0100',
  'DO',
  TRUE,
  'profesional'
)
ON CONFLICT (id) DO NOTHING;

-- ── Configuración white-label ─────────────────────────────────
INSERT INTO tenant_settings (
  tenant_id, url_logo, color_primario, color_secundario, color_acento,
  moneda, simbolo_moneda, texto_pie_recibo, nombre_comercial
)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  NULL,
  '#2563EB', '#1D4ED8', '#FF6F00',
  'DOP', 'RD$',
  'Gracias por su pago. OC Credit — Soluciones financieras.',
  'Prestamos Demo S.R.L.'
)
ON CONFLICT (tenant_id) DO NOTHING;

-- ── Usuario admin ─────────────────────────────────────────────
-- Email: admin@demo.oc  |  Password: Admin1234!
INSERT INTO usuarios (id, tenant_id, email, password_hash, rol, activo)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'admin@demo.oc',
  '$2b$12$vbw7SCjMYW8dZ81B/2H/euL8cJUURuStEisPiiRB9DMSNm60TUAhy',
  'admin_tenant',
  TRUE
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ── Empleado admin ────────────────────────────────────────────
INSERT INTO empleados (id, tenant_id, usuario_id, nombre, apellido, cedula, telefono, activo)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'Carlos',
  'Administrador',
  '001-0000001-1',
  '809-555-0101',
  TRUE
)
ON CONFLICT (tenant_id, cedula) DO NOTHING;

-- ── Usuario cobrador ──────────────────────────────────────────
-- Email: cobrador@demo.oc  |  Password: Cobrador1234!
INSERT INTO usuarios (id, tenant_id, email, password_hash, rol, activo)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'cobrador@demo.oc',
  '$2b$12$uh928k/0SetajY3a6nvl2eBzoqdAw6p0jGH6209shl/Q0xfbFGuWW',
  'cobrador_tenant',
  TRUE
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ── Empleado cobrador ─────────────────────────────────────────
INSERT INTO empleados (id, tenant_id, usuario_id, nombre, apellido, cedula, telefono, activo)
VALUES (
  'cccccccc-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'Pedro',
  'Cobrador',
  '001-0000002-2',
  '809-555-0202',
  TRUE
)
ON CONFLICT (tenant_id, cedula) DO NOTHING;

-- ── Ruta ─────────────────────────────────────────────────────
INSERT INTO rutas (id, tenant_id, nombre, descripcion, activa, cobrador_id)
VALUES (
  'dddddddd-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Ruta Norte',
  'Sector norte de la ciudad',
  TRUE,
  'cccccccc-0000-0000-0000-000000000002'
)
ON CONFLICT (id) DO NOTHING;

-- ── Clientes ─────────────────────────────────────────────────
INSERT INTO clientes (id, tenant_id, cedula, nombre, apellido, telefono, direccion_casa, activo, ruta_id)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '001-1111111-1', 'María', 'González', '809-555-1001', 'Calle 1 #10, Santo Domingo', TRUE,
   'dddddddd-0000-0000-0000-000000000001'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '001-2222222-2', 'José', 'Martínez', '809-555-1002', 'Av. 27 de Febrero #45', TRUE,
   'dddddddd-0000-0000-0000-000000000001'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   '001-3333333-3', 'Ana', 'Pérez', '809-555-1003', 'C/ Duarte #22, Los Alcarrizos', TRUE,
   'dddddddd-0000-0000-0000-000000000001')
ON CONFLICT (tenant_id, cedula) DO NOTHING;

-- ── Préstamo activo ───────────────────────────────────────────
-- Capital 10,000 | Tasa 20% | 10 cuotas diarias
-- Cuota = (10000 + 2000) / 10 = 1200
INSERT INTO prestamos (
  id, tenant_id, cliente_id, cobrador_id, ruta_id,
  capital_solicitado, capital_aprobado, capital_neto_entregado,
  tasa_interes_pactada, modalidad, numero_cuotas,
  monto_cuota, total_interes, total_a_pagar,
  estado, fecha_aprobacion, fecha_desembolso, fecha_primer_pago
)
VALUES (
  'ffffffff-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'eeeeeeee-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000002',
  'dddddddd-0000-0000-0000-000000000001',
  10000.00, 10000.00, 10000.00,
  20.0000, 'Diario', 10,
  1200.00, 2000.00, 12000.00,
  'Activo', CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + 1
)
ON CONFLICT (id) DO NOTHING;

-- ── Cuotas de amortización ────────────────────────────────────
INSERT INTO cuotas_amortizacion (
  tenant_id, prestamo_id, numero_cuota,
  fecha_vencimiento, capital, interes, monto_total,
  capital_pagado, interes_pagado, monto_pagado, estado
)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000001',
  'ffffffff-0000-0000-0000-000000000001',
  i,
  CURRENT_DATE + i,
  1000.00,
  200.00,
  1200.00,
  0.00, 0.00, 0.00,
  'Pendiente'
FROM generate_series(1, 10) AS i
ON CONFLICT (prestamo_id, numero_cuota) DO NOTHING;

-- ── Segundo préstamo (cliente 2, pendiente de aprobación) ─────
INSERT INTO prestamos (
  id, tenant_id, cliente_id, cobrador_id, ruta_id,
  capital_solicitado, tasa_interes_pactada, modalidad, numero_cuotas,
  estado
)
VALUES (
  'ffffffff-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'eeeeeeee-0000-0000-0000-000000000002',
  'cccccccc-0000-0000-0000-000000000002',
  'dddddddd-0000-0000-0000-000000000001',
  5000.00, 20.0000, 'Semanal', 8,
  'Pendiente'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verificación final
SELECT
  (SELECT COUNT(*) FROM tenants)          AS tenants,
  (SELECT COUNT(*) FROM usuarios)         AS usuarios,
  (SELECT COUNT(*) FROM empleados)        AS empleados,
  (SELECT COUNT(*) FROM clientes)         AS clientes,
  (SELECT COUNT(*) FROM prestamos)        AS prestamos,
  (SELECT COUNT(*) FROM cuotas_amortizacion) AS cuotas;
