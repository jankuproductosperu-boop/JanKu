# Fase 23b · Estadísticas de Google Analytics en el panel (incluye «más vistos»)

> **Propuesta (2026-11-20), pendiente de aprobación del dueño.** Requiere la 23a y un paso manual del dueño en Google Cloud y Google Analytics. Sustituye la propuesta 21b (contador propio, D-55): los productos más vistos salen de Analytics.

> ⚠️ **Riesgo medio:** credencial nueva de servidor y llamadas a un servicio externo. Ninguna escritura en la base.

## 1. Objetivo

Pantalla Panel → Estadísticas, **solo para superadmin**, con datos reales de Google Analytics 4:
- Usuarios, sesiones, páginas vistas, duración media y porcentaje de rebote, con variación frente al periodo anterior.
- Visitas por día (gráfico de línea) en 7, 28 o 90 días.
- **Productos más vistos** y páginas más vistas.
- Origen del tráfico (directo, Google, redes, etc.) y dispositivos.
- Usuarios en tiempo real (últimos 30 minutos).
- En el Resumen, una tarjeta «Visitas hoy» y la lista corta «Más vistos esta semana» (solo superadmin).

**Por qué Analytics y no un contador propio (21b):** no añade escrituras a la base en cada visita, no abre un endpoint público nuevo que se pueda inflar con bots y no guarda nada del visitante. Contra: solo cuenta a quien aceptó las cookies (D-75), así que las cifras son **menores que las reales**; sirven para comparar, no para contar. Si más adelante hace falta el número total, se retoma la 21b.

## 2. Prerrequisitos (paso manual del dueño, una vez)

1. Ser **Administrador** de la propiedad GA4 de jan-ku.com.
2. Google Cloud: proyecto nuevo → activar «Google Analytics Data API» → crear cuenta de servicio → crear clave JSON.
3. Google Analytics → Administrar → Gestión del acceso a la propiedad → agregar el correo de la cuenta de servicio con rol **Lector**.
4. Anotar el **ID de la propiedad** (número, no el `G-XXXX`).
5. Variables en `.env.local` y en Render: `GA_PROPERTY_ID`, `GA_SA_EMAIL`, `GA_SA_PRIVATE_KEY`. El dueño las pega; el agente nunca las lee ni las imprime (N1-2).

Google no revisa ni aprueba nada: no hay inicio de sesión de usuarios con Google.

| # | Pregunta | Por defecto |
|---|---|---|
| **Q1** | ¿Quién ve las estadísticas? | Solo superadmin (respuesta del dueño, 2026-11-20): permiso nuevo `estadisticas.ver` |
| **Q2** | ¿Librería oficial de Google o llamadas directas? | **Directas** con `jose` (ya instalada) para firmar el token y `fetch` a la API: sin dependencia nueva |
| **Q3** | ¿Cada cuánto se refrescan los datos? | Caché en memoria del servidor: 10 min los informes, 1 min el tiempo real |

## 3. Archivos

| Acción | Ruta | Contenido |
|---|---|---|
| Modificar | `types/admin.ts` · `lib/permissions.ts` · `lib/__tests__/permissions.test.ts` | Permiso `estadisticas.ver` solo para superadmin |
| Crear | `server/analytics/googleAuth.ts` | Firma un JWT RS256 con `jose` y lo cambia por un token de acceso (`oauth2.googleapis.com/token`), guardado hasta que vence |
| Crear | `server/services/analytics.service.ts` | `obtenerResumen(rango)`, `obtenerSerieDiaria(rango)`, `obtenerMasVistos(rango)`, `obtenerOrigenes(rango)`, `obtenerTiempoReal()`, con caché y tiempo máximo de 10 s |
| Crear | `server/validation/analytics.schema.ts` | `rango`: `7d` \| `28d` \| `90d` |
| Crear | `app/api/admin/analytics/route.ts` | `GET ?rango=` → todo menos tiempo real |
| Crear | `app/api/admin/analytics/realtime/route.ts` | `GET` → usuarios activos |
| Crear | `lib/analytics.ts` + prueba | Funciones puras: variación porcentual, rutas `/producto/{slug}` → slug, formato de duración |
| Crear | `app/(admin)/admin/estadisticas/page.tsx` | Pantalla (gráficos en SVG propio o con el componente de gráficos que ya use el panel; sin librería nueva) |
| Modificar | `AdminSidebar.tsx` · `app/(admin)/admin/page.tsx` | Enlace «Estadísticas» y tarjetas del Resumen (solo con permiso) |
| Modificar | `scripts/smoke.mjs` | `GET /api/admin/analytics` sin cookie → 401 |
| Modificar | `CLAUDE.md` §8 · `docs/plan/03-decisiones.md` | Variables nuevas (solo nombres); D-85 y D-86 |

## 4. Contratos

| Método y ruta | Guard | Respuesta |
|---|---|---|
| `GET /api/admin/analytics?rango=28d` | `estadisticas.ver` | `{ rango, kpis, serie, masVistos, paginas, origenes, dispositivos, actualizado }` |
| `GET /api/admin/analytics/realtime` | `estadisticas.ver` | `{ activos, actualizado }` |

- `masVistos`: los productos se identifican por la ruta `/producto/{slug}` y se cruzan con el catálogo para mostrar nombre e imagen; las rutas que ya no existen se omiten.
- Sin credenciales configuradas → `503 { code: "ANALYTICS_NO_CONFIGURADO" }` y el panel muestra «Conecta Google Analytics» con los pasos.
- Google responde error o tarda más de 10 s → `502` con mensaje fijo; nunca se reenvía el texto de Google.

## 5. Decisiones nuevas

- **D-85 · Estadísticas desde GA4 con cuenta de servicio de solo lectura**, consultadas desde el servidor, con caché. Solo superadmin (`estadisticas.ver`).
- **D-86 · «Más vistos» desde Analytics** en lugar del contador propio de la 21b (sin escrituras por visita ni endpoint público nuevo). Cifras aproximadas por el consentimiento de cookies.

## 6. Reglas de Nivel 1

- **N1-2:** la clave privada solo en variables de entorno; nunca en logs, respuestas ni errores.
- **N1-4:** endpoints nuevos con guard dentro del handler; sin cambios en el CSP (las llamadas son de servidor a servidor).
- **N1-8:** las llamadas reales a Google en pruebas, solo con permiso del dueño en la sesión.

## 7. Criterios de aceptación

- Sin variables → la pantalla explica cómo conectar; nada falla.
- Con variables → las cifras de 28 días coinciden con las de Google Analytics (± el retraso de procesamiento de Google).
- Un gestor o ventas: sin enlace, y `GET /api/admin/analytics` → 403.
- Prueba de `permissions` en verde; typecheck, lint, test, build y smoke en verde.

## 8. Plan de reversa

`git revert`. Borrar las variables de Render es opcional; la cuenta de servicio se puede quitar en Analytics.

## 9. Modelo recomendado

**Superior** para `googleAuth.ts`, el servicio y las rutas. Sonnet para la pantalla. 1–2 sesiones.
