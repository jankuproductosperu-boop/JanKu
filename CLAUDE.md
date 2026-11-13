# CLAUDE.md · Janku

Tienda online de Janku (jan-ku.com, Huancayo, Perú). Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind 4 + MongoDB Atlas (Mongoose 9). Imágenes en Cloudinary, correo con Resend, hosting en Render.

El repositorio está en plena reestructuración por fases. El plan completo vive en `docs/plan/`.

## Antes de hacer nada en cada sesión

1. Lee **`docs/plan/README.md`**.
2. Lee **el archivo de la fase que te asignaron**: `docs/plan/fases/fase-NN-nombre.md`. Solo esa fase.
3. Relee las Reglas de Nivel 1 de este archivo.
4. Consulta `01-arquitectura.md`, `02-datos.md` o `03-decisiones.md` únicamente cuando tu fase los cite.

Si no te asignaron una fase, pregunta cuál antes de tocar código.

Trabaja en una rama `fase-NN-nombre` creada desde `main` actualizado. No tomes decisiones de arquitectura: están tomadas en `docs/plan/03-decisiones.md`. Si algo no está especificado, o lo que encuentras en el código contradice el plan, **detente y pregunta**. Cierra siempre con `docs/plan/fases/fase-00-verificacion-visual.md` y reporta resultados reales.

## Reglas de Nivel 1 (innegociables)

| Id | Regla |
|---|---|
| **N1-1** | **El sitio público no cambia sin que la fase lo pida.** Mismas URLs, mismo aspecto, mismo flujo de WhatsApp. Toda fase termina con la verificación visual de `fases/fase-00-verificacion-visual.md`. |
| **N1-2** | **Secretos fuera del repo y de la salida.** Nunca leer en voz alta, imprimir, registrar ni confirmar valores de `.env*`. Solo nombres de variables. |
| **N1-3** | **Base de datos solo aditiva.** No se borran ni renombran colecciones, campos o índices. Los scripts de migración simulan por defecto y solo escriben con `--apply`, que **solo ejecuta el dueño**. Prohibido `syncIndexes()`, `dropIndex`, `deleteMany` y `drop`. |
| **N1-4** | **La seguridad no retrocede.** No se relajan CSP, opciones de cookies, límites de intentos, comprobaciones de sesión ni los mensajes genéricos que evitan enumerar usuarios. |
| **N1-5** | **El servidor es la única fuente de verdad** de precios, descuentos, cupones, totales y stock. Lo que envía el navegador en esos campos se ignora y se recalcula. |
| **N1-6** | **Contratos existentes compatibles.** Los endpoints que ya existen conservan ruta, método y forma de respuesta. Se pueden añadir campos opcionales; no quitar ni renombrar. |
| **N1-7** | **Una fase por sesión, dentro de su lista de archivos.** No se tocan archivos fuera de la sección "Archivos" de la fase ni se instalan dependencias que la fase no nombre. Si hace falta, se detiene y se pregunta. |
| **N1-8** | **Nada sale de la máquina sin permiso.** Sin `git push`, sin despliegues, sin ejecutar scripts contra la base, sin llamadas a Cloudinary/Resend reales, salvo orden explícita del dueño en esa sesión. |
| **N1-9** | **No cambiar mayúsculas/minúsculas de rutas.** `Components/` se queda con C mayúscula; `Infosection.tsx` conserva su nombre. |
| **N1-10** | **Cerrar en verde.** `npm run typecheck`, `npm run lint` (sin errores nuevos respecto a la línea base), `npm test` y `npm run build` pasan antes de dar una fase por terminada. Si algo falla, se reporta con la salida; no se oculta. |

## Comandos

| Comando | Qué hace | Disponible desde |
|---|---|---|
| `npm run dev` | Servidor local en `http://localhost:3000` | hoy |
| `npm run build` | Build de producción | hoy |
| `npm run lint` | ESLint | hoy |
| `npm run typecheck` | `tsc --noEmit` | fase 01 |
| `npm test` | Pruebas unitarias (Vitest, solo `lib/`) | fase 01 |
| `npm run smoke` | Prueba de humo HTTP contra el servidor local (solo lecturas) | fase 01 |

## Estructura final (objetivo al cerrar la fase 21)

El repo **llega** a esta forma fase a fase; hasta entonces conviven rutas viejas y nuevas. La tabla de movimientos y el árbol completo están en `docs/plan/01-arquitectura.md`.

```
app/
  layout.tsx            html, fuentes, GA, providers
  (tienda)/             sitio público: layout con Navbar/Footer/carrito + todas las páginas
  (admin)/              login-admin/ y admin/ (layout con barra propia, _components/)
  api/                  rutas públicas + api/admin/** (solo administradores)
Components/             componentes React de la tienda (C mayúscula, no renombrar)
context/                CartContext, FavoritesContext, UserContext
hooks/                  hooks de React
lib/                    funciones PURAS, seguras en navegador y servidor, con pruebas en lib/__tests__/
server/                 SOLO servidor; todo archivo empieza con import "server-only"
  db.ts · logger.ts · cloudinary.ts
  auth/                 session, guards, rateLimit, ip, tokens, validators
  http/                 errors (AppError), respond (json, fail, handle)
  validation/           esquemas Zod, uno por entidad
  services/             toda la lógica de negocio y todo acceso a Mongoose
  email/                envío y plantillas
models/                 modelos Mongoose
types/                  tipos compartidos; se importa desde "@/types"
scripts/
  migrations/           NNN-nombre.mjs + _runner.mjs (simulan por defecto)
  admin/                alta y cambio de contraseña de administradores
  legacy/               scripts antiguos ya aplicados; no ejecutar
proxy.ts                primer filtro de rutas protegidas (antes middleware.ts)
docs/plan/              el plan
```

Los grupos `(tienda)` y `(admin)` no forman parte de la URL.

### Regla de dependencias

```
páginas cliente, Components, context, hooks ──► lib, types
route.ts, páginas de servidor ──► server/auth, server/http, server/validation, server/services ──► models, server/db, lib, types
```

- `server/**` nunca se importa desde un archivo `"use client"`, ni desde `lib/`, `hooks/`, `context/` o `Components/`.
- `lib/**` no importa de `server/`, `models/`, `react` ni `next/*`.
- `models/**` solo se importa desde `server/services/**`, `server/auth/**` y `scripts/**`.
- Si el build falla por `server-only`, se corrige el import; nunca se quita la línea `import "server-only"`.

## Convenciones

**Nombres.** Dominio en español (`nombre`, `precio`, `pedido`); términos técnicos en inglés (`.service.ts`, `.schema.ts`, `requireAdmin`). Componentes `PascalCase.tsx`; el resto `camelCase.ts` o `entidad.sufijo.ts`. Modelos en inglés singular (`Order`). Rutas de API en inglés plural (`/api/orders`); rutas de página en español (`/pedido`, `/admin/cupones`). Texto visible en español, de tú.

**Imports.** Siempre con alias `@/…`; nunca `../`. Exports con nombre; `default` solo donde Next.js lo exige y en modelos.

**Un `route.ts` hace cuatro cosas, en este orden:**

```ts
export const POST = handle(async (req) => {
  await requireAdmin("catalogo.editar");                       // 1. sesión y permiso
  const datos = productoCrearSchema.parse(await req.json());   // 2. validar con Zod
  const producto = await crearProducto(datos);                 // 3. llamar al servicio
  return json(producto);                                       // 4. responder
});
```

Sin `try/catch` genérico (lo cubre `handle`), sin `connectDB()`, sin importar modelos.

**Servicios.** Una función por caso de uso, en español e infinitivo (`crearPedido`, `confirmarPedido`). Reciben datos ya validados, devuelven objetos planos, lanzan `AppError`, llaman ellos a `connectDB()`. No leen cookies ni cabeceras: el actor llega por parámetro.

**Respuestas de la API.** Éxito: el recurso directamente; listas paginadas nuevas `{ items, total, page, pageSize }`. Error: `{ error, code?, fields? }`. No hay sobre `{ ok, data }`.

**Errores.** `entradaInvalida` 400 · `noAutorizado` 401 · `prohibido` 403 · `noEncontrado` 404 · `conflicto` 409 · `demasiadosIntentos` 429. Un error no controlado responde 500 con mensaje fijo; nunca se devuelve `error.message` interno.

**Validación.** Zod 4. `.strict()` en endpoints nuevos; en los que ya existían, objetos normales que descartan claves desconocidas.

**Tipos.** En `types/`, con `_id` y fechas como `string`. No redeclarar `Product`, `Category`, etc. en cada archivo. Prohibido `any`, `as any`, `@ts-ignore`.

**Dinero.** `Number` en soles con 2 decimales; toda operación pasa por `redondear2()` de `lib/money.ts`. Los totales salen de `calcularTotales()` de `lib/pricing.ts`, la misma función en navegador y servidor.

**Stock.** `stock` (Disponible / Limitado / Agotado) siempre se deriva con `estadoDeStock()`. Todo cambio de `stockCantidad` pasa por `inventory.service` y deja un `StockMovement`.

**Autenticación.** Dos sesiones separadas: `admin-token` (8 h) y `user-token` (7 d), firmadas con `jose`. Todo handler protegido llama a `requireAdmin(permiso)` o `requireUser()`; `proxy.ts` es solo un primer filtro. El rol se lee de la base en cada petición.

**Logs.** `log.info / warn / error` de `server/logger.ts`. Nunca cuerpos de petición, contraseñas, tokens, correos ni datos de clientes. Sin `console.log`.

**Migraciones.** `scripts/migrations/NNN-nombre.mjs` sobre `_runner.mjs`: simulan por defecto, son idempotentes, hacen copia en `backups/` antes de escribir. El modelo ejecutor nunca pasa `--apply`.

**Git.** Una rama por fase, commits pequeños en español. Sin `push`. **Fusión a `main`:** al cerrar una fase en verde, pregunta al dueño si ya puedes fusionar; solo si responde que sí, haz `git checkout main` y `git merge <rama>` (sin `--force`). Nunca fusiones sin esa aprobación explícita en la sesión.

## Qué NO hacer

- Renombrar `Components/` o cambiar mayúsculas de cualquier ruta.
- Calcular o aceptar del navegador precios, descuentos, totales o la etiqueta de stock.
- Escribir `stockCantidad` con un `update` directo, o editar/borrar un `StockMovement`.
- Llamar a `syncIndexes()`, borrar índices, colecciones, campos, pedidos o cupones.
- Guardar el `body` de una petición sin pasarlo por su esquema.
- Añadir una ruta de escritura sin guard dentro del handler.
- Unificar los generadores de URL de imagen de `ProductCard` y del panel (cambian lo que se ve).
- Hacer `await` del envío de un correo dentro de una petición o de una transacción.
- Quitar `strict: false` de `Product`.
- Arreglar "de paso" algo que no está en la fase: se anota y se reporta.

## Variables de entorno (solo nombres)

`MONGODB_URI` · `JWT_SECRET` · `USER_JWT_SECRET` · `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` · `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` · `RESEND_API_KEY` · `FROM_EMAIL` · `NEXT_PUBLIC_SITE_URL` · `NEXT_PUBLIC_GA_ID`

Las introduce el plan: `NEXT_PUBLIC_CHECKOUT_ENABLED` (fase 16; solo `"true"` activa el checkout) · `ADMIN_NOTIFY_EMAIL` (fase 20).

Nunca abras `.env.local` para copiar valores.

## Dónde está el porqué

| Necesito saber… | Documento |
|---|---|
| Orden de fases, dependencias, preguntas abiertas | `docs/plan/README.md` |
| Qué había antes y qué deuda se detectó | `docs/plan/00-diagnostico.md` |
| Dónde va cada archivo, tabla de movimientos | `docs/plan/01-arquitectura.md` |
| Campos de cada modelo, migraciones | `docs/plan/02-datos.md` |
| Por qué se decidió algo (D-01 a D-47) | `docs/plan/03-decisiones.md` |
