# CLAUDE.md · Janku

## 1. Qué es

Tienda online de Janku (jan-ku.com, Huancayo, Perú): catálogo, carrito, pedido por WhatsApp y, tras el interruptor, checkout con pedido guardado, cupones y "Mis pedidos".
Panel `/admin` con roles (superadmin, gestor, ventas) para catálogo, inventario con movimientos, pedidos, descuentos, cupones, puntos de entrega y administradores.
Sin pasarela de pago: el pago se coordina por WhatsApp y se marca en el panel.
El plan de reestructuración (fases 01–21) está cerrado; el acta es `docs/plan/cierre.md`.

**Stack:** Next.js 16.2 (App Router) · React 19.2 · TypeScript 5.9 estricto · Tailwind 4 · MongoDB Atlas con Mongoose 9 · Zod 4 · jose 6 · Vitest 3 · Cloudinary 2 · Resend 6. Hosting en Render, despliegue desde `main`.

## 2. Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local en `http://localhost:3000` (lo arranca el dueño) |
| `npm run build` | Build de producción |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Pruebas unitarias (Vitest, solo `lib/`) |
| `npm run smoke` | Prueba de humo HTTP contra el servidor local. Crea un pedido de prueba: el límite es 5 pedidos/h por IP, no lo repitas seguido |

## 3. Reglas de Nivel 1 (innegociables)

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

Línea base de lint vigente: **0 errores** (12 avisos), ver `docs/plan/linea-base.md`.

## 4. Mapa de carpetas

```
app/
  layout.tsx · globals.css · icon.png     html, fuentes, GA, providers; icono por convención de Next
  (tienda)/        sitio público: layout con Navbar/Footer/carrito y sus páginas
  (admin)/         login-admin/ y admin/ (barra lateral, _components/, una carpeta por pantalla)
  api/             rutas públicas + api/admin/** (solo administradores)
Components/        componentes React de la tienda (C mayúscula, no renombrar)
context/           CartContext, FavoritesContext, UserContext
hooks/             useAuth, useScrollDirection, useAlmacenLocal (estado en localStorage)
lib/               funciones PURAS (navegador y servidor), pruebas en lib/__tests__/
server/            SOLO servidor; todo archivo empieza con import "server-only"
  db.ts · logger.ts · cloudinary.ts
  auth/            session, guards, rateLimit, ip, tokens, validators
  http/            errors (AppError), respond (json, fail, handle)
  validation/      esquemas Zod, uno por entidad
  services/        lógica de negocio y todo acceso a Mongoose
  analytics/       token de Google para las estadísticas del panel (fase 23b)
  email/           send (con timeout) y auth-emails, complaint-emails
models/            modelos Mongoose
types/             tipos compartidos; se importa desde "@/types"
scripts/
  migrations/      NNN-nombre.mjs + _runner.mjs (simulan por defecto)
  admin/           crear-admin.mjs, cambiar-password.mjs
  legacy/          scripts antiguos ya aplicados; no ejecutar
  smoke.mjs        prueba de humo
public/            favicon, apple-touch-icon, og-image
backups/           copias que hacen las migraciones (fuera de git)
docs/plan/         el plan, decisiones y acta de cierre
proxy.ts           primer filtro de rutas protegidas
```

Los grupos `(tienda)` y `(admin)` no forman parte de la URL.

**Regla de dependencias**

```
páginas cliente, Components, context, hooks ──► lib, types
route.ts, páginas de servidor ──► server/auth, server/http, server/validation, server/services ──► models, server/db, lib, types
```

- `server/**` nunca se importa desde un archivo `"use client"`, ni desde `lib/`, `hooks/`, `context/` o `Components/`.
- `lib/**` no importa de `server/`, `models/`, `react` ni `next/*`.
- `models/**` solo se importa desde `server/services/**`, `server/auth/**` y `scripts/**`.
- Si el build falla por `server-only`, se corrige el import; nunca se quita la línea `import "server-only"`.

## 5. Cómo añadir…

**Un endpoint.** Un `route.ts` hace cuatro cosas, en este orden:

```ts
export const POST = handle(async (req) => {
  await requireAdmin("catalogo.editar");                       // 1. sesión y permiso
  const datos = productoCrearSchema.parse(await req.json());   // 2. validar con Zod
  const producto = await crearProducto(datos);                 // 3. llamar al servicio
  return json(producto);                                       // 4. responder
});
```

Sin `try/catch` genérico (lo cubre `handle`), sin `connectDB()`, sin importar modelos. Toda ruta de escritura lleva su guard dentro del handler; `proxy.ts` no basta.

**Una entidad.** modelo (`models/X.ts`) → tipo (`types/x.ts`, exportado en `types/index.ts`) → esquema (`server/validation/x.schema.ts`) → servicio (`server/services/x.service.ts`) → ruta (`app/api/...`). Si necesita permiso nuevo, va en `types/admin.ts` y `lib/permissions.ts`, con su prueba.

**Una migración.** `scripts/migrations/NNN-nombre.mjs` sobre `_runner.mjs`: simula por defecto, es idempotente y hace copia en `backups/` antes de escribir. Se simula primero en la base de desarrollo y luego en producción; `--apply` solo lo ejecuta el dueño. Se documenta en `docs/plan/02-datos.md`.

## 6. Convenciones

- **Idioma.** Dominio en español (`nombre`, `precio`, `pedido`); términos técnicos en inglés (`.service.ts`, `.schema.ts`, `requireAdmin`). Texto visible en español, de tú.
- **Nombres.** Componentes `PascalCase.tsx`; el resto `camelCase.ts` o `entidad.sufijo.ts`. Modelos en inglés singular (`Order`). API en inglés plural (`/api/orders`); páginas en español (`/pedido`, `/admin/cupones`).
- **Imports.** Siempre con alias `@/…`; nunca `../`. Exports con nombre; `default` solo donde Next.js lo exige y en modelos.
- **Servicios.** Una función por caso de uso, en infinitivo (`crearPedido`). Reciben datos validados, devuelven objetos planos, lanzan `AppError`, llaman a `connectDB()`. No leen cookies ni cabeceras: el actor llega por parámetro.
- **Respuestas.** Éxito: el recurso directamente; listas paginadas `{ items, total, page, pageSize }`. Error: `{ error, code?, fields? }`. No hay sobre `{ ok, data }`.
- **Errores.** `entradaInvalida` 400 · `noAutorizado` 401 · `prohibido` 403 · `noEncontrado` 404 · `conflicto` 409 · `demasiadosIntentos` 429. Un 500 responde con mensaje fijo; nunca `error.message` interno.
- **Validación.** Zod 4; `.strict()` en endpoints nuevos.
- **Tipos.** En `types/`, con `_id` y fechas como `string`. Prohibido `any`, `as any`, `@ts-ignore`.
- **Dinero.** Soles con 2 decimales; toda operación pasa por `redondear2()` (`lib/money.ts`); los totales salen de `calcularTotales()` (`lib/pricing.ts`), la misma en navegador y servidor.
- **Stock.** La etiqueta (Disponible / Limitado / Agotado) se deriva con `estadoDeStock()`. Todo cambio de `stockCantidad` (producto o variante) pasa por `inventory.service` y deja un `StockMovement`. La cantidad exacta no sale por la API pública (D-68).
- **Autenticación.** `admin-token` (8 h) y `user-token` (7 d), firmadas con `jose`. Handlers protegidos llaman a `requireAdmin(permiso)` o `requireUser()`; el rol se lee de la base en cada petición. La IP del cliente sale de `lib/clientIp.ts` vía `server/auth/ip.ts`.
- **Logs.** `log.info / warn / error` de `server/logger.ts`. Nunca cuerpos, contraseñas, tokens, correos ni datos de clientes. Sin `console.log`.
- **Git.** Una rama por tarea (`fase-NN-nombre`) desde `main`, commits pequeños en español, sin `push`. Al cerrar en verde se pregunta al dueño si se fusiona; solo con su "sí": `git checkout main` y `git merge <rama>` (sin `--force`).

## 7. Qué NO hacer

- Renombrar `Components/` o cambiar mayúsculas de cualquier ruta.
- Calcular o aceptar del navegador precios, descuentos, totales o la etiqueta de stock.
- Escribir `stockCantidad` con un `update` directo, o editar/borrar un `StockMovement`.
- Llamar a `syncIndexes()`, borrar índices, colecciones, campos, pedidos, cupones o variantes (se desactivan).
- Guardar el `body` de una petición sin pasarlo por su esquema.
- Añadir una ruta de escritura sin guard dentro del handler.
- Unificar los generadores de URL de imagen de `ProductCard` y del panel (cambian lo que se ve).
- Hacer `await` del envío de un correo dentro de una petición o de una transacción (los correos de cuenta heredados aún lo hacen: deuda en `cierre.md`).
- Quitar `strict: false` de `Product`.
- Mostrar o registrar contraseñas, también en el panel de Usuarios.
- Arreglar "de paso" algo que no está en la tarea: se anota y se reporta.

## 8. Variables de entorno (solo nombres) y servicios externos

`MONGODB_URI` · `JWT_SECRET` · `USER_JWT_SECRET` · `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` · `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` · `RESEND_API_KEY` · `FROM_EMAIL` · `NEXT_PUBLIC_SITE_URL` · `NEXT_PUBLIC_GA_ID` · `NEXT_PUBLIC_CHECKOUT_ENABLED` (solo `"true"` activa el checkout; se lee al construir)

Verificación en dos pasos del panel (fase 26b): `TOTP_ENC_KEY` (32 bytes en base64, distinta en desarrollo y producción). Sin ella no se puede activar la 2FA y el superadmin queda limitado a Seguridad; si se pierde, los admins con 2FA entran solo tras `scripts/admin/desactivar-2fa.mjs`.

Estadísticas del panel (fase 23b, opcionales: sin ellas la pantalla explica cómo conectar): `GA_PROPERTY_ID` (número de la propiedad GA4) · `GA_SA_EMAIL` · `GA_SA_PRIVATE_KEY` (cuenta de servicio con rol Lector).

Pendiente futuro, sin uso hoy: `ADMIN_NOTIFY_EMAIL` (aviso de pedido nuevo, cuando se hagan los correos de pedido).

Nunca abras `.env.local` para copiar valores.

| Servicio | Uso |
|---|---|
| MongoDB Atlas | Base de producción y base de desarrollo separada (`janku-dev`) |
| Cloudinary | Imágenes de productos, banners, promociones y popup |
| Resend | Correos de cuenta (verificación, bienvenida, recuperación) |
| Render | Hosting; despliega al hacer push a `main` |
| Cloudflare | DNS de `jan-ku.com` en modo "DNS only" (sin proxy; ver `lib/clientIp.ts`) |
| Google Analytics | Medición (`NEXT_PUBLIC_GA_ID`) |
| postimg.cc | Algunas imágenes fijas antiguas |

## 9. Dónde está el porqué

| Necesito saber… | Documento |
|---|---|
| Estado final, deuda que queda, respuestas P0–P25 | `docs/plan/cierre.md` |
| Fases, dependencias, preguntas | `docs/plan/README.md` y `docs/plan/fases/` |
| Qué había antes y qué deuda se detectó | `docs/plan/00-diagnostico.md` |
| Dónde va cada archivo | `docs/plan/01-arquitectura.md` |
| Campos de cada modelo, migraciones | `docs/plan/02-datos.md` |
| Por qué se decidió algo (D-01 a D-73) | `docs/plan/03-decisiones.md` |
| Números de lint, pruebas y build | `docs/plan/linea-base.md` |

Trabajo nuevo: se escribe como fase en `docs/plan/fases/` y se ejecuta igual que las anteriores (leer esta guía y solo esa fase, rama propia, cerrar con la fase 00). Si algo no está especificado o contradice el plan, se detiene y se pregunta.
