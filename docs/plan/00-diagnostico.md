# 00 · Diagnóstico del repositorio

Fecha del análisis: 2026-11-12 · Rama: `main` · Commit base: `7a97da2` · 42 commits · 110 archivos versionados (~13 700 líneas de código).

Este documento describe **lo que hay hoy**. No propone cambios (eso está en `01-arquitectura.md`, `02-datos.md` y `03-decisiones.md`).

---

## 1. Qué es el proyecto

Tienda online "Janku" (jan-ku.com), Huancayo, Perú. Hoy es un **catálogo con carrito que termina en WhatsApp**: no existen pedidos guardados, pagos en línea ni cupones.

| Aspecto | Estado actual |
|---|---|
| Framework | Next.js 16.2.11 (App Router), React 19.2, TypeScript 5.9 `strict` |
| Estilos | Tailwind CSS 4 (`app/globals.css`), `framer-motion`, `lucide-react` |
| Base de datos | MongoDB Atlas vía Mongoose 9.6 |
| Autenticación | Dos sistemas JWT separados en cookies httpOnly: admin (`admin-token`, 8 h) y cliente (`user-token`, 7 d) |
| Imágenes | Cloudinary (subida por el servidor), más URLs antiguas en `i.postimg.cc` e `img.jan-ku.com` |
| Email | Resend por `fetch` directo (verificación, reset, bienvenida) |
| Hosting | Render (según el dueño; no hay `render.yaml` en el repo) |
| Pruebas | **Ninguna**. No hay framework de tests |
| Documentación | `README.md` es la plantilla de create-next-app. No hay `CLAUDE.md` ni reglas escritas |

### Línea base de calidad (medida hoy)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errores |
| `npx eslint .` | ❌ 78 problemas: **40 errores**, 38 avisos |
| `npm run build` | No ejecutado en este análisis (se mide en la fase 01) |

Desglose de ESLint: 21 errores `no-require-imports` (todos en `scripts/*.js`), 7 `no-explicit-any`, 5 `no-html-link-for-pages`, 4 `react-hooks/set-state-in-effect`, 2 `no-unescaped-entities`, 1 `prefer-const`; avisos: 24 `no-unused-vars`, 12 `no-img-element`, 2 `exhaustive-deps`.

---

## 2. Mapa funcional

### Sitio público
| Ruta | Archivo | Cómo obtiene datos |
|---|---|---|
| `/` | `app/page.tsx` + `Components/HomeProducts` | Cliente: descarga **todos** los productos de `/api/products` y filtra en el navegador |
| `/[categoria]` | `app/(paginas)/[categoria]/page.tsx` | Cliente: descarga todos los productos, categorías y banners |
| `/producto/[slug]` | `page.tsx` (servidor) + `ProductPageClient.tsx` | Servidor: consulta Mongo directo. El cliente además descarga todos los productos para "relacionados" |
| `/promociones`, `/promocion/[id]` | `app/(paginas)/promocion*` | Cliente / servidor directo a Mongo |
| `/busqueda` | `app/busqueda/page.tsx` | Cliente: descarga todo y busca en el navegador |
| `/carrito`, `/favoritos` | `app/(paginas)/...` | `localStorage` (`janku-cart`, `janku-favorites`) |
| `/auth/*` | login, registro, verificar-email, recuperar/nueva contraseña, perfil | APIs `/api/auth-user/*` |
| `/contacto`, `/nosotros` | estáticas | — |

Flujo de compra actual: carrito → botón "Realizar pedido" → abre `wa.me/51978339737` con el detalle en texto. El carrito admite **productos y promociones** mezclados (las promociones entran con `_id` de la promoción y nombre "Promoción N"); el ítem no guarda de qué tipo es.

### Panel admin
| Ruta | Archivo | Tamaño |
|---|---|---|
| `/login-admin` | `app/login-admin/page.tsx` | 125 líneas |
| `/admin` | `app/admin/page.tsx` (productos, banners, categorías, promociones en pestañas) | **1 505 líneas** |
| `/admin/inventario` | `app/admin/inventario/page.tsx` | 628 |
| `/admin/orden` | `app/admin/orden/page.tsx` (orden manual de productos) | 393 |
| `/admin/descuentos` | `app/admin/descuentos/page.tsx` (descuentos por monto) | 465 |

### API (`app/api`)
| Grupo | Endpoints | Protección |
|---|---|---|
| `auth` (admin) | `login`, `logout`, `check` | pública / cookie |
| `auth-user` (cliente) | `register`, `login`, `logout`, `check`, `verify-email`, `forgot-password`, `reset-password`, `profile` | pública / cookie |
| `products` | `GET/POST`, `[id] GET/PUT/DELETE`, `reorder POST` | escritura protegida **solo en `middleware.ts`** |
| `categories`, `banners`, `promotions`, `discounts` | `GET/POST`, `[id] GET/PUT/DELETE` | ídem |
| `upload` | `POST`, `delete DELETE` | ídem |

### Modelos Mongoose (`models/`)
`Product`, `Category`, `Banner`, `Promotion`, `DiscountTier`, `User`, `AdminUser`, `LoginBlock`, `UserLoginBlock`.

---

## 3. Deuda técnica

Severidad: 🔴 seguridad/datos · 🟠 corrección/mantenibilidad · 🟡 limpieza.

### 3.1 Seguridad y datos

| # | Sev. | Hallazgo | Dónde |
|---|---|---|---|
| S1 | 🔴 | `GET /api/products` es público y devuelve **todos los campos de todos los productos**, incluidos `precioCosto`, `proveedor`, `stockCantidad`, `stockMinimo`. Cualquiera ve costos y proveedores. También devuelve productos con `activo: false`. | `app/api/products/route.ts`, `app/api/products/[id]/route.ts` |
| S2 | 🔴 | La página de producto pasa el documento completo de Mongo al componente cliente (mismo filtrado de costos en el HTML). | `app/(paginas)/producto/[slug]/page.tsx` |
| S3 | 🔴 | **Asignación masiva**: `POST/PUT` de productos, banners, categorías, promociones y descuentos guardan el `body` tal cual, sin validar ni limitar campos. `Product` además tiene `strict: false`, así que se puede escribir cualquier campo. | todos los `route.ts` de catálogo |
| S4 | 🔴 | La autorización del admin vive **solo** en `middleware.ts` (por prefijo de ruta y método). Ningún handler vuelve a comprobar la sesión. Una ruta nueva fuera de la lista queda abierta sin que nadie lo note. | `middleware.ts` |
| S5 | 🔴 | Los JWT no se revalidan contra la base: un admin desactivado (`activo: false`) o un cliente que borró su cuenta sigue con sesión válida hasta que expira (8 h / 7 d). El claim `v: 1` del token admin no se comprueba nunca. | `app/api/auth*/**`, `middleware.ts` |
| S6 | 🔴 | No hay roles: todo admin puede todo. | `models/AdminUser.ts` |
| S7 | 🟠 | Límite de intentos en memoria del proceso (se pierde en cada reinicio/deploy de Render) más una copia en Mongo. Los índices TTL de `LoginBlock` y `UserLoginBlock` están sobre `lastAttempt`, que es `Number`: **MongoDB solo expira campos `Date`**, así que esos documentos nunca se borran. | `lib/loginAttempts.ts`, `lib/authUtils.ts`, `models/*LoginBlock.ts` |
| S8 | 🟠 | `forgot-password` no tiene límite de envíos: permite bombardear de correos a una víctima y gastar la cuota de Resend. | `app/api/auth-user/forgot-password/route.ts` |
| S9 | 🟠 | La IP del cliente se toma del primer valor de `x-forwarded-for`, que el cliente puede falsificar; detrás de Cloudflare la IP fiable es `cf-connecting-ip`. Afecta a todos los límites por IP. | `lib/authUtils.ts`, `app/api/auth/login/route.ts` |
| S10 | 🟠 | Subida de imágenes: confía en `file.type` (lo declara el navegador), no inspecciona el contenido. `upload/delete` solo permite borrar `productos/`, por lo que banners y promociones nunca se limpian. Banners y promociones se suben con `overwrite: true` y un `public_id` derivado solo del nombre: dos banners con el mismo título se pisan. | `app/api/upload/**`, `lib/cloudinary.ts` |
| S11 | 🟠 | `scripts/create-admin.js` crea `admin` / `admin123` con contraseña fija e impresa en consola. | `scripts/create-admin.js` |
| S12 | 🟠 | El descuento por monto se calcula solo en el navegador. Hoy no es explotable (el pedido es un mensaje de WhatsApp), pero **sí lo será** al guardar pedidos. | `context/CartContext.tsx` |
| S13 | 🟡 | CSP usa `'unsafe-inline'` en `script-src`. Aceptable por ahora; no se toca en este plan. | `next.config.ts` |
| S14 | 🟡 | El índice TTL de `User` (`tokenVerificacionExpira`, filtro `emailVerificado: false`) **borra la cuenta completa** no verificada a las 24 h; el comentario dice "eliminar tokens". El comportamiento es razonable, el comentario engaña. | `models/User.ts` |

### 3.2 Corrección

| # | Sev. | Hallazgo | Dónde |
|---|---|---|---|
| C1 | 🟠 | Borrar categoría comprueba `Product.countDocuments({ categoriaSlug })` (singular). El campo real es `categoriaSlugs`: la comprobación siempre da 0 y **se pueden borrar categorías con productos**. | `app/api/categories/[id]/route.ts` |
| C2 | 🟠 | Índice compuesto `{ categoriaSlug: 1, stock: 1, precio: 1 }` sobre un campo que no existe. | `models/Product.ts` |
| C3 | 🟠 | **A verificar en fase 13**: al crear un producto desde `/admin`, el formulario no envía `stockCantidad`; el esquema pone 0 por defecto y el hook `pre('validate')` recalcula `stock = "Agotado"`, ignorando el selector del formulario. | `models/Product.ts`, `app/admin/page.tsx` |
| C4 | 🟠 | `Product` se registra con `delete mongoose.models.Product` + `mongoose.model(...)` (truco para recarga en caliente) en vez del patrón estándar. | `models/Product.ts` |
| C5 | 🟠 | El admin guarda `imagenes`, `imagenPrincipal` y `tags` en productos, pero esos campos **no están en el esquema**: existen solo gracias a `strict: false`. | `models/Product.ts`, `app/admin/page.tsx` |
| C6 | 🟠 | `CartContext` hace `JSON.parse` de `localStorage` sin `try/catch`: un valor corrupto rompe toda la tienda. | `context/CartContext.tsx` |
| C7 | 🟠 | El layout raíz envuelve también al panel admin: `/admin` se muestra con el Navbar, el Footer, el carrito flotante y el `padding-top: 150px` de la tienda. | `app/layout.tsx` |
| C8 | 🟡 | `Components/Cart/index.ts` exporta `FloatingCartButton` con el nombre `CartItem`. Nadie lo importa. | `Components/Cart/index.ts` |
| C9 | 🟡 | `metadata.icons.icon` apunta a `/icon.png`, que no existe en `public/`. | `app/layout.tsx` |

### 3.3 Mantenibilidad

| # | Sev. | Hallazgo |
|---|---|---|
| M1 | 🟠 | **Tipos duplicados**: `Product` está redeclarado en 7 archivos, `Category` en 6, `Banner` en 3, `Promotion` en 3, `DiscountTier` en 2. Cada copia tiene campos distintos. No hay carpeta `types/`. |
| M2 | 🟠 | **Sin capa de servicios**: cada `route.ts` y dos páginas de servidor hablan directo con Mongoose. La regla de stock (Disponible/Limitado/Agotado) está escrita dos veces (hook del modelo y `PUT /api/products/[id]`). |
| M3 | 🟠 | `app/admin/page.tsx` (1 505 líneas) contiene tipos, un hook de subida, un componente de subida y cuatro CRUD completos. Duplica `lib/useImageUpload.ts` y `Components/ImageUploader/ImageUploader.tsx`, que quedaron **sin uso**. |
| M4 | 🟠 | Mensaje de WhatsApp del carrito duplicado en `CartSidebar.tsx` y `carrito/page.tsx`. El número `51978339737` está escrito a mano en **8 sitios**. |
| M5 | 🟠 | Dos librerías JWT (`jsonwebtoken` para firmar, `jose` para verificar). `getClientIP` y `SECURITY_HEADERS` duplicados entre `lib/authUtils.ts` y `app/api/auth/login/route.ts`. Slugify implementado 4 veces. |
| M6 | 🟠 | Todo el catálogo público se resuelve en el navegador descargando la colección entera (sin paginación, sin filtros en servidor). Coste de SEO y de rendimiento que crece con el catálogo. **Fuera del alcance de este plan** (ver README). |
| M7 | 🟡 | `lib/` mezcla código de servidor (`mongodb.ts`, `cloudinary.ts`, `email.ts`), hooks de React (`useAuth.ts`…) y utilidades puras. `lib/cloudinary.ts` importa el SDK de Node, por eso existe una copia de slugify en `productUrl.ts`. |
| M8 | 🟡 | Dependencias instaladas y no usadas: `express`, `cors`, `mongodb`, `@types/express`, `@types/cors`. `sharp` está instalada y no se importa. `dotenv` solo la usan los scripts. `eslint-config-next` está en 16.0.6 mientras `next` está en 16.2.11. |
| M9 | 🟡 | 36 `console.log` en código de aplicación, varios imprimen el `body` completo de la petición (`POST /api/products`, `PUT /api/categories/[id]`). |
| M10 | 🟡 | Código muerto: `lib/useAuthUser.ts`, `lib/useImageUpload.ts`, `Components/ImageUploader/`, `Components/Cart/index.ts`, `scripts/fixImages.ts`. |
| M11 | 🟡 | Scripts de migración sin modo simulación: todos escriben al ejecutarse. No hay registro de cuáles se aplicaron. |
| M12 | 🟡 | `middleware.ts`: en Next.js 16 la convención se renombró a `proxy.ts` y `middleware` quedó obsoleta (sigue funcionando). Verificar en `node_modules/next/dist/docs/` antes de migrar (fase 08). |
| M13 | 🟡 | Hay un cambio sin confirmar en `next.config.ts` (se quitó un comentario sobre CSP). Es del dueño; ninguna fase lo toca. |

---

## 4. Riesgos

| # | Riesgo | Impacto | Mitigación en el plan |
|---|---|---|---|
| R1 | **No consta que exista una base de datos de desarrollo.** `.env.local` tiene un único `MONGODB_URI`; si apunta a producción, cualquier prueba local o migración toca datos reales. | Muy alto | Pregunta abierta P1. Las fases 09, 13, 15, 17 y 18 exigen confirmar la base antes de ejecutar `--apply`. |
| R2 | Sin tests automáticos: toda regresión se detecta a mano. | Alto | Fase 01 añade Vitest; las reglas de dinero, cupones y estados de pedido nacen con pruebas unitarias. Fase 00 define la verificación visual que se repite siempre. |
| R3 | Cambiar autenticación puede dejar fuera al único administrador. | Alto | Fases 07–09 marcadas ALTO RIESGO, compatibles con tokens ya emitidos, con plan de reversa y prueba en local antes de desplegar. |
| R4 | Las transacciones multi-documento requieren replica set. Atlas lo es en todos sus planes; un Mongo local suelto no. | Medio | Decisión D-12; la fase 17 incluye comprobación previa. |
| R5 | El despliegue en Render es automático desde `main` (supuesto, pregunta P2). Un commit a medias llega a producción. | Alto | Cada fase se trabaja en su propia rama `fase-NN-…` y se fusiona solo tras aprobación. |
| R6 | Windows no distingue mayúsculas en rutas y Render (Linux) sí. Renombrar `Components/` rompería el build solo en producción. | Medio | Regla N1-9: no se cambia la capitalización de ninguna ruta. |
| R7 | Cuota de Resend (3 000/mes en plan gratis) y dominio remitente. Los correos de pedido la consumen. | Bajo | Fase 20: el envío nunca bloquea el pedido; pregunta P9. |
| R8 | `strict: false` en `Product`: endurecerlo podría descartar campos antiguos al guardar. | Medio | Decisión D-05: se mantiene; la protección se hace con validación de entrada. |

---

## 5. Inventario de servicios externos

Solo nombres de variables; ningún valor aparece en este plan.

| Servicio | Para qué | Variables de entorno | Dónde se usa |
|---|---|---|---|
| **MongoDB Atlas** | Base de datos | `MONGODB_URI` | `lib/mongodb.ts`, todos los `scripts/*.js` |
| | | `MONGODB_DB` — **definida pero no usada** por el código (el nombre de la base va dentro de la URI) | — |
| **Render** | Hosting del servidor Next.js | Todas las de esta tabla deben existir en el panel de Render. `NODE_ENV` la fija la plataforma | — |
| **Cloudinary** | Almacén y CDN de imágenes | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (servidor) | `lib/cloudinary.ts` |
| | | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (navegador, para armar URLs) | `app/admin/page.tsx`, `Components/ProductCard`, `lib/useImageUpload.ts` |
| **Cloudflare** | DNS/proxy de `jan-ku.com` y subdominio de imágenes `img.jan-ku.com` (supuesto, pregunta P3) | Ninguna en el código | `next.config.ts` (lista de hosts de imágenes y CSP) |
| **Resend** | Correo transaccional | `RESEND_API_KEY`, `FROM_EMAIL` | `lib/email.ts` |
| **Google Analytics 4** | Analítica | `NEXT_PUBLIC_GA_ID` | `Components/GoogleAnalytics` |
| **WhatsApp** (`wa.me`) | Canal de pedido y contacto | Ninguna; número escrito en el código | 8 archivos |
| **postimg.cc** | Imágenes fijas del encabezado y de la sección de beneficios | Ninguna | `Components/Header`, `Components/BenefitsSection` |
| **YouTube** | Videos de producto (miniatura e iframe) | Ninguna | `ProductPageClient.tsx` |
| **GitHub** | Repositorio `origin` | — | — |

Variables de la aplicación sin servicio externo:

| Variable | Uso |
|---|---|
| `JWT_SECRET` | Firma del token de administrador |
| `USER_JWT_SECRET` | Firma del token de cliente |
| `NEXT_PUBLIC_SITE_URL` | URL base para enlaces en correos y WhatsApp. **Está dos veces en `.env.local`** |
| `ADMIN_PASSWORD` | **Definida pero no usada** por ningún archivo |

Variables **nuevas** que introduce el plan (detalle en cada fase):

| Variable | Fase | Para qué |
|---|---|---|
| `NEXT_PUBLIC_CHECKOUT_ENABLED` | 16 | Interruptor: `"true"` activa el checkout con pedido guardado; cualquier otro valor mantiene el flujo actual de WhatsApp |
| `ADMIN_NOTIFY_EMAIL` | 20 | Dirección que recibe el aviso de pedido nuevo |
