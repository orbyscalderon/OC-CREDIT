# Guía para completar Play Console — OCA Ruta

## 1. Clasificación de contenido (cuestionario IARC)
Categoría: **Utilidad / Productividad** (no es un juego, no tiene contenido generado por usuarios público, no tiene violencia/contenido sexual/apuestas). Respondé "No" a todas las preguntas de contenido sensible (violencia, terror, apuestas, drogas, contenido sexual). Resultado esperado: clasificación **PEGI 3 / Todos**.

## 2. Formulario de Seguridad de Datos (Data Safety)
Basado en lo que la app realmente usa:

### Datos que se recopilan
| Tipo de dato | ¿Se recopila? | ¿Para qué? | ¿Se comparte con terceros? |
|---|---|---|---|
| Ubicación precisa (GPS) | Sí | Funcionalidad de la app (registrar dónde se hizo el cobro, rutas) | No |
| Fotos | Sí | Evidencia de cobro | No |
| Nombre / email | Sí (login con Google) | Autenticación de cuenta | No (solo con Google para el login, es el proveedor de auth) |
| Info financiera (transacciones) | Sí | Funcionalidad principal (registro de cobros y préstamos) | No |
| Identificadores de dispositivo | Sí | Seguridad (detección de root/emulador para proteger datos de cobranza) | No |

### Marcar en el formulario
- **¿La app recopila o comparte alguno de estos tipos de datos?** → Sí
- **¿Todos los datos recopilados están cifrados en tránsito?** → Sí (HTTPS/TLS en toda la comunicación con el backend)
- **¿Los usuarios pueden solicitar que se elimine su información?** → Sí (ya está en la política de privacidad: contacto de soporte)
- **Propósito de la ubicación y fotos** → "Funcionalidad de la app" (no "Publicidad" ni "Analítica")

### Permisos declarados en la app (para referencia, no se preguntan literal así pero explican el resto)
- `CAMERA` — declarado explícito en el manifest, para foto de evidencia
- Ubicación (fine location) — agregado automáticamente por el plugin `geolocator`
- Bluetooth — para impresora térmica de recibos

## 3. URL de política de privacidad
```
https://ocaruta.com/privacidad
```

## 4. Países de distribución
Recomendado: empezar solo con **República Dominicana** (o los países donde ya operan tenants reales) y ampliar después. Restringir la distribución inicial reduce fricción de compliance (algunos países piden requisitos extra para apps financieras).

## 5. Tipo de cuenta / app
- **App de prueba cerrada primero (recomendado):** subí el `.aab` a un track de "Prueba interna" o "Prueba cerrada" antes de producción. Podés instalarla en tu propio celular y en el de 1-2 cobradores reales antes de que quede pública. Play Store NO exige pasar por testing, pero es la forma más segura de detectar bugs antes de exponerlos a todos tus tenants.
- Para pasar de prueba a producción no hace falta resubir nada, se "promueve" el mismo `.aab` desde la consola.

## 6. Nota sobre revisión de Google
Como es una app financiera (permite ver saldos, registrar cobros de dinero), es común que Google pida una revisión adicional o video de demostración del flujo de login + uso — no es un rechazo, es estándar para apps de la categoría Finanzas. Si lo piden, un video corto de pantalla mostrando login → ver ruta → registrar un cobro alcanza.
