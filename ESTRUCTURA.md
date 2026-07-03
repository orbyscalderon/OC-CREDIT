# OC Credit — Estructura del Proyecto
## © 2026 OC Moon Group LLC. Todos los derechos reservados.

```
OC CREDIT/
│
├── backend/                          ← API NestJS + TypeScript
│   ├── Dockerfile
│   ├── docker-compose.yml            ← PostgreSQL + API + Backup automático
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                  ← Variables de entorno (nunca commitear .env)
│   │
│   ├── migrations/
│   │   └── 001_initial_schema.sql    ★ SCRIPT SQL COMPLETO (ENUMs + tablas + índices + funciones)
│   │
│   └── src/
│       ├── main.ts                   ← Bootstrap, Swagger, Helmet, CORS
│       ├── app.module.ts             ← Registro de todos los módulos
│       │
│       ├── config/
│       │   └── database.config.ts   ← TypeORM factory (pool, SSL, logging)
│       │
│       ├── common/
│       │   ├── constants/
│       │   │   └── roles.enum.ts    ← ENUMs TypeScript (Rol, EstadoPrestamo, etc.)
│       │   ├── decorators/
│       │   │   ├── current-user.decorator.ts  ← @CurrentUser() → JwtPayload
│       │   │   ├── roles.decorator.ts          ← @Roles(Rol.ADMIN_TENANT)
│       │   │   └── public.decorator.ts         ← @Public() → omite JWT guard
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts           ← Valida Bearer token
│       │   │   └── roles.guard.ts              ← RBAC por rol del JWT
│       │   ├── filters/
│       │   │   └── http-exception.filter.ts   ← Respuestas de error normalizadas
│       │   └── interceptors/
│       │       ├── transform.interceptor.ts   ← Envuelve respuestas en { success, data }
│       │       └── logging.interceptor.ts     ← Logs de latencia HTTP
│       │
│       └── modules/
│           │
│           ├── auth/                 ← JWT Login / Logout + tenant_config en respuesta
│           │   ├── auth.module.ts
│           │   ├── auth.controller.ts   POST /api/v1/auth/login
│           │   ├── auth.service.ts      bcrypt + JWT issue + bloqueo por intentos
│           │   ├── strategies/
│           │   │   └── jwt.strategy.ts
│           │   └── dto/
│           │       └── login.dto.ts
│           │
│           ├── tenants/             ← Gestión de empresas SaaS
│           │   ├── tenants.module.ts
│           │   └── entities/
│           │       ├── tenant.entity.ts
│           │       └── tenant-settings.entity.ts  ← White-Label / Marca Blanca
│           │
│           ├── usuarios/            ← Credenciales + Perfiles de empleado
│           │   ├── usuarios.module.ts
│           │   └── entities/
│           │       ├── usuario.entity.ts
│           │       └── empleado.entity.ts
│           │
│           ├── rutas/               ← Rutas de cobranza + novedades GPS
│           │   ├── rutas.module.ts
│           │   └── entities/
│           │       ├── ruta.entity.ts
│           │       └── novedad-ruta.entity.ts
│           │
│           ├── clientes/            ← Base de clientes con coordenadas
│           │   ├── clientes.module.ts
│           │   └── entities/
│           │       └── cliente.entity.ts
│           │
│           ├── prestamos/           ← Préstamos + plan de amortización
│           │   ├── prestamos.module.ts
│           │   ├── entities/
│           │   │   ├── prestamo.entity.ts
│           │   │   └── cuota-amortizacion.entity.ts
│           │   └── helpers/
│           │       ├── amortizacion.helper.ts    ← Genera plan de cuotas
│           │       └── dias-habiles.helper.ts    ← Omite domingos + feriados
│           │
│           ├── cobros/              ★ ENDPOINT PRINCIPAL
│           │   ├── cobros.module.ts
│           │   ├── cobros.controller.ts  POST /api/v1/cobros/registrar
│           │   ├── cobros.service.ts     ← Cascada ACID: Mora→Interés→Capital
│           │   └── dto/
│           │       └── registrar-cobro.dto.ts   ← Validación + Swagger
│           │
│           ├── cajas/               ← Apertura/Cierre ciego de caja
│           │   ├── cajas.module.ts
│           │   └── entities/
│           │       ├── caja.entity.ts       ← monto_esperado columna generada
│           │       └── transaccion.entity.ts ← Registro inmutable por uuid
│           │
│           ├── mora/                ← Cargos por atraso
│           │   ├── mora.module.ts
│           │   └── entities/
│           │       └── cargo-mora.entity.ts
│           │
│           └── reportes/            ← Dashboard, georreferenciación, arqueos
│               └── reportes.module.ts
│
├── mobile/                          ← [PENDIENTE] Flutter App
│   ├── lib/
│   │   ├── core/
│   │   │   ├── database/            ← SQLite/Hive local
│   │   │   ├── sync/                ← SyncQueue offline
│   │   │   └── printing/            ← ESC/POS Bluetooth 58mm/80mm
│   │   └── modules/
│   │       ├── auth/
│   │       ├── ruta/                ← Listado de clientes del día
│   │       ├── cobros/              ← Registro de pago offline
│   │       ├── novedades/           ← Cliente sin dinero / no estaba
│   │       ├── gastos/              ← Gastos de ruta + foto comprobante
│   │       └── caja/                ← Apertura y cierre ciego
│
└── frontend/                        ← [PENDIENTE] Panel Admin React/Vue
    ├── src/
    │   ├── pages/
    │   │   ├── dashboard/           ← KPIs financieros
    │   │   ├── mapa/                ← Leaflet + OpenStreetMap (sin Google Maps)
    │   │   ├── prestamos/
    │   │   ├── reportes/
    │   │   └── configuracion/       ← White-label por tenant
    │   └── components/
```

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| API Backend | NestJS 10 + TypeScript | Enterprise, DI, RBAC nativo |
| Base de Datos | PostgreSQL 16 | ACID, ENUMs nativos, particionado |
| ORM | TypeORM 0.3 | Integración nativa con NestJS |
| Autenticación | JWT (passport-jwt) | Stateless, codifica tenantId + rol |
| Contenedores | Docker + docker-compose | Portabilidad + backup automático |
| Mapas (Web) | Leaflet + OpenStreetMap | 100% gratuito, sin Google |
| App Móvil | Flutter | Cross-platform, SQLite offline |
| Impresión | ESC/POS Bluetooth | Recibos 58mm/80mm en campo |
| Pasarela Pago | Azul / PlacetoPay | Dominicana, sin Stripe |

## Invariantes de Negocio Implementados

- **Multi-tenant:** `tenant_id` en TODAS las tablas operativas
- **RBAC:** JWT codifica rol, guards en cada endpoint
- **Idempotencia:** `uuid_idempotencia` UNIQUE en `transacciones`
- **Cascada de Pago:** Mora → Interés → Capital (aritmética en centavos)
- **Un solo préstamo activo por cliente:** índice parcial en PostgreSQL
- **Cierre Ciego:** `diferencia_cierre` calculada solo por Admin
- **Días Hábiles:** Función SQL + helper TS omite domingos + feriados
- **Backup:** Contenedor dedicado, cada 6 horas, retención 30 días
