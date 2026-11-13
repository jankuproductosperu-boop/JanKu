# 01 · Arquitectura

Estructura de carpetas antes y después, convenciones, capa de servicios, tipos compartidos y tabla de movimientos. Las justificaciones están en `03-decisiones.md` (se citan como `D-NN`).

---

## 1. Estructura ANTES (hoy)

```
janku/
├── app/
│   ├── layout.tsx                      ← html + fuentes + providers + Navbar + Footer + carrito (para TODO, incl. admin)
│   ├── page.tsx                        ← home
│   ├── globals.css
│   ├── (paginas)/
│   │   ├── [categoria]/page.tsx
│   │   ├── auth/{login,registro,verificar-email,recuperar-contrasena,nueva-contrasena,perfil}/page.tsx
│   │   ├── carrito/page.tsx
│   │   ├── contacto/page.tsx
│   │   ├── favoritos/page.tsx
│   │   ├── nosotros/page.tsx
│   │   ├── producto/[slug]/{page.tsx,ProductPageClient.tsx}
│   │   ├── promocion/[id]/{page.tsx,PromocionPageClient.tsx}
│   │   └── promociones/page.tsx
│   ├── busqueda/page.tsx
│   ├── login-admin/page.tsx
│   ├── admin/
│   │   ├── page.tsx                    ← 1 505 líneas
│   │   ├── descuentos/page.tsx
│   │   ├── inventario/page.tsx
│   │   └── orden/page.tsx
│   └── api/
│       ├── auth/{login,logout,check}/route.ts
│       ├── auth-user/{register,login,logout,check,verify-email,forgot-password,reset-password,profile}/route.ts
│       ├── banners/{route.ts,[id]/route.ts}
│       ├── categories/{route.ts,[id]/route.ts}
│       ├── discounts/{route.ts,[id]/route.ts}
│       ├── products/{route.ts,[id]/route.ts,reorder/route.ts}
│       ├── promotions/{route.ts,[id]/route.ts}
│       └── upload/{route.ts,delete/route.ts}
├── Components/
│   ├── Accordion/Accordion.tsx
│   ├── BenefitsSection/BenefitsSection.tsx
│   ├── Cart/{CartSidebar.tsx,FloatingCartButton.tsx,index.ts}
│   ├── ErrorBoundary/ErrorBoundary.tsx
│   ├── FloatingWhatsApp/FloatingWhatsApp.tsx
│   ├── Footer/Footer.tsx
│   ├── GoogleAnalytics/GoogleAnalytics.tsx
│   ├── Header/Header.tsx
│   ├── HomeProducts/HomeProducts.tsx
│   ├── ImageUploader/ImageUploader.tsx   ← sin uso
│   ├── InfoSection/Infosection.tsx
│   ├── Navbar/Navbar.tsx
│   └── ProductCard/ProductCard.tsx
├── context/{CartContext,FavoritesContext,UserContext}.tsx
├── lib/
│   ├── authUtils.ts        ← validaciones + tokens + 3 limitadores en memoria + IP + cabeceras
│   ├── cache.ts            ← caché de fetch en el navegador
│   ├── cloudinary.ts       ← SDK (servidor) + slugify + generador de URL
│   ├── email.ts            ← Resend + 3 plantillas
│   ├── loginAttempts.ts    ← limitador en memoria del admin
│   ├── mongodb.ts
│   ├── productUrl.ts
│   ├── useAuth.ts          ← hook
│   ├── useAuthUser.ts      ← hook sin uso
│   ├── useImageUpload.ts   ← hook sin uso
│   ├── useScrollDirection.ts ← hook
│   └── whatsapp.ts
├── models/{AdminUser,Banner,Category,DiscountTier,LoginBlock,Product,Promotion,User,UserLoginBlock}.ts
├── scripts/{add-admin,change-password,create-admin,delete-admin,migrate-categories,migrate-codigoUrl,migrate-inventory,migrate-whatsapp-numero}.js, fixImages.ts
├── public/{apple-touch-icon.png,favicon.ico,og-image.png}
├── middleware.ts
├── next.config.ts · eslint.config.mjs · postcss.config.mjs · tsconfig.json · package.json · README.md
```

---

## 2. Estructura DESPUÉS (al cerrar la fase 21)

Leyenda: `★` nuevo · `→` movido · `✎` modificado · sin marca = intacto.

```
janku/
├── CLAUDE.md                                   ★ lo crea el arquitecto tras aprobar el plan; la fase 21 lo actualiza
├── .env.example                                ★ solo nombres
├── proxy.ts                                    → desde middleware.ts
├── vitest.config.ts                            ★
├── app/
│   ├── layout.tsx                              ✎ solo html, fuentes, GA, providers
│   ├── globals.css
│   ├── (tienda)/                               → renombrado desde (paginas)
│   │   ├── layout.tsx                          ★ Navbar, Footer, carrito flotante, WhatsApp, padding
│   │   ├── page.tsx                            → desde app/page.tsx
│   │   ├── [categoria]/page.tsx
│   │   ├── auth/{login,registro,verificar-email,recuperar-contrasena,nueva-contrasena,perfil}/page.tsx
│   │   ├── auth/pedidos/page.tsx               ★ Mis pedidos
│   │   ├── busqueda/page.tsx                   → desde app/busqueda
│   │   ├── carrito/page.tsx                    ✎
│   │   ├── checkout/page.tsx                   ★
│   │   ├── contacto/page.tsx · favoritos/page.tsx · nosotros/page.tsx
│   │   ├── pedido/[codigo]/page.tsx            ★ confirmación / seguimiento
│   │   ├── producto/[slug]/{page.tsx,ProductPageClient.tsx}
│   │   ├── promocion/[id]/{page.tsx,PromocionPageClient.tsx}
│   │   └── promociones/page.tsx
│   ├── (admin)/
│   │   ├── login-admin/page.tsx                → desde app/login-admin
│   │   └── admin/
│   │       ├── layout.tsx                      ★ barra lateral + guard de sesión
│   │       ├── page.tsx                        ✎ queda en < 150 líneas (pestañas)
│   │       ├── _components/                    ★ extraídos de page.tsx
│   │       │   ├── ProductosTab.tsx · BannersTab.tsx · CategoriasTab.tsx · PromocionesTab.tsx
│   │       │   ├── ImageUploader.tsx · BannerImageField.tsx · PromocionImageField.tsx
│   │       │   └── AdminNav.tsx
│   │       ├── descuentos/page.tsx · inventario/page.tsx · orden/page.tsx
│   │       ├── cupones/page.tsx                ★
│   │       ├── pedidos/page.tsx                ★
│   │       ├── pedidos/[id]/page.tsx           ★
│   │       └── usuarios/page.tsx               ★ solo superadmin
│   └── api/
│       ├── auth/…  · auth-user/…               ✎ (mismas rutas)
│       ├── banners/… · categories/… · discounts/… · products/… · promotions/… · upload/…   ✎ (mismas rutas)
│       ├── orders/route.ts                     ★ POST crear
│       ├── orders/[codigo]/route.ts            ★ GET público con token
│       ├── orders/mine/route.ts                ★ GET del cliente con sesión
│       ├── coupons/validate/route.ts           ★
│       └── admin/
│           ├── products/route.ts               ★ GET completo
│           ├── banners/route.ts · promotions/route.ts   ★ GET completo (incluye inactivos)
│           ├── orders/route.ts · orders/[id]/route.ts · orders/expire/route.ts   ★
│           ├── coupons/route.ts · coupons/[id]/route.ts                          ★
│           ├── inventory/adjust/route.ts · inventory/movements/route.ts          ★
│           └── users/route.ts · users/[id]/route.ts                              ★
├── Components/                                  (misma capitalización)
│   ├── Cart/{CartSidebar.tsx,FloatingCartButton.tsx}   ✎  (index.ts eliminado)
│   ├── Checkout/{CheckoutForm.tsx,OrderSummary.tsx,CouponField.tsx}   ★
│   └── …resto igual (ImageUploader/ eliminado)
├── context/{CartContext,FavoritesContext,UserContext}.tsx      ✎ CartContext
├── hooks/                                       ★
│   ├── useAuth.ts                               → desde lib/
│   └── useScrollDirection.ts                    → desde lib/
├── lib/                                         solo código puro, seguro en navegador
│   ├── cache.ts · productUrl.ts · whatsapp.ts   ✎ whatsapp.ts
│   ├── cloudinaryUrl.ts                         ★
│   ├── money.ts                                 ★ redondear2, formatearSoles
│   ├── slug.ts                                  ★ única implementación de slugify
│   ├── stock.ts                                 ★ estadoDeStock
│   ├── pricing.ts                               ★ subtotal, descuento por monto, cupón, totales
│   ├── orderStatus.ts                           ★ estados y transiciones
│   ├── permissions.ts                           ★ roles y matriz de permisos
│   ├── phone.ts                                 ★ normalizarTelefono
│   ├── coupon.ts                                ★ normalizarCodigo, evaluarCupon
│   ├── html.ts                                  ★ escapeHtml
│   ├── siteConfig.ts                            ★ número de WhatsApp, nombre, URL
│   └── __tests__/*.test.ts                      ★
├── server/                                      ★ todo empieza con `import "server-only"`
│   ├── db.ts                                    → desde lib/mongodb.ts
│   ├── logger.ts
│   ├── cloudinary.ts                            → desde lib/cloudinary.ts (parte SDK)
│   ├── auth/
│   │   ├── session.ts        firmar/verificar JWT (jose), leer/escribir cookies
│   │   ├── guards.ts         requireAdmin, requireUser, getOptionalUser
│   │   ├── rateLimit.ts      sobre el modelo RateLimit
│   │   ├── ip.ts             obtenerIP
│   │   ├── tokens.ts         generarToken, hashearToken
│   │   └── validators.ts     validarEmail, validarPassword, validarNombre
│   ├── http/
│   │   ├── errors.ts         AppError y fábricas
│   │   └── respond.ts        json, fail, handle, SECURITY_HEADERS
│   ├── validation/
│   │   ├── common.ts · product.schema.ts · category.schema.ts · banner.schema.ts
│   │   ├── promotion.schema.ts · discount.schema.ts · order.schema.ts
│   │   ├── coupon.schema.ts · admin-user.schema.ts
│   │   └── inventory.schema.ts · upload.schema.ts
│   ├── services/
│   │   ├── product.service.ts · category.service.ts · banner.service.ts
│   │   ├── promotion.service.ts · discount.service.ts
│   │   ├── inventory.service.ts · order.service.ts · coupon.service.ts
│   │   └── admin-user.service.ts · upload.service.ts
│   └── email/
│       ├── send.ts                              → desde lib/email.ts (función sendEmail)
│       ├── layout.ts                            plantilla HTML común
│       ├── auth-emails.ts                       → desde lib/email.ts (3 correos existentes)
│       └── order-emails.ts                      ★
├── models/
│   ├── AdminUser.ts ✎ · Product.ts ✎ · User.ts ✎
│   ├── Banner.ts · Category.ts · DiscountTier.ts · Promotion.ts
│   ├── LoginBlock.ts · UserLoginBlock.ts        (sin uso, se conservan)
│   └── Order.ts · Coupon.ts · CouponRedemption.ts · StockMovement.ts · RateLimit.ts   ★
├── types/                                       ★
│   ├── product.ts · category.ts · banner.ts · promotion.ts · discount.ts
│   ├── cart.ts · order.ts · coupon.ts · inventory.ts · user.ts · admin.ts · api.ts
│   └── index.ts
├── scripts/
│   ├── legacy/                                  → los 9 scripts actuales
│   ├── migrations/{_runner.mjs,001-admin-roles.mjs,002-product-defaults.mjs,003-indices.mjs}   ★
│   └── admin/{crear-admin.mjs,cambiar-password.mjs}   ★ sin contraseñas fijas
├── docs/plan/…
└── public/…
```

**Las URLs públicas no cambian.** Los grupos de ruta `(tienda)` y `(admin)` van entre paréntesis y Next.js no los incluye en la URL: `/`, `/busqueda`, `/admin`, `/login-admin` siguen iguales.

---

## 3. Tabla de movimientos (ruta vieja → ruta nueva)

Todos los movimientos se hacen con `git mv` para conservar historial.

| # | Ruta vieja | Ruta nueva | Fase | Notas |
|---|---|---|---|---|
| 1 | `lib/useAuth.ts` | `hooks/useAuth.ts` | 03 | Actualizar 4 imports (`app/admin/**`) |
| 2 | `lib/useScrollDirection.ts` | `hooks/useScrollDirection.ts` | 03 | 1 import (`Components/Navbar`) |
| 3 | `lib/mongodb.ts` | `server/db.ts` | 03 | Reemplazar `@/lib/mongodb` → `@/server/db` en todo el repo |
| 4 | `lib/cloudinary.ts` | `server/cloudinary.ts` | 03 | `generateSlug` sale a `lib/slug.ts`; `getCloudinaryUrl` sale a `lib/cloudinaryUrl.ts` |
| 5 | `lib/email.ts` | `server/email/send.ts` + `server/email/auth-emails.ts` | 03 | Se parte en dos; mismas funciones exportadas |
| 6 | `lib/authUtils.ts` | `server/auth/validators.ts`, `server/auth/tokens.ts`, `server/auth/ip.ts`, `server/http/respond.ts` | 03 | Se parte. Los 3 limitadores en memoria se quedan temporalmente en `server/auth/legacyLimiters.ts` hasta la fase 07 |
| 7 | `lib/loginAttempts.ts` | `server/auth/legacyLimiters.ts` (fusionado) | 03 | Se elimina en fase 07 |
| 8 | `scripts/*.js`, `scripts/fixImages.ts` | `scripts/legacy/` | 03 | Sin cambios de contenido |
| 9 | `app/page.tsx` | `app/(tienda)/page.tsx` | 04 | |
| 10 | `app/(paginas)/**` | `app/(tienda)/**` | 04 | Renombrar el grupo completo |
| 11 | `app/busqueda/page.tsx` | `app/(tienda)/busqueda/page.tsx` | 04 | |
| 12 | `app/login-admin/page.tsx` | `app/(admin)/login-admin/page.tsx` | 04 | |
| 13 | `app/admin/**` | `app/(admin)/admin/**` | 04 | |
| 14 | `middleware.ts` | `proxy.ts` | 08 | Solo tras verificar la convención en `node_modules/next/dist/docs/` |

Eliminaciones (código sin ningún import, comprobado con búsqueda):

| Archivo | Fase | Motivo |
|---|---|---|
| `lib/useAuthUser.ts` | 03 | Duplicado de `context/UserContext.tsx`, sin uso |
| `lib/useImageUpload.ts` | 03 | Duplicado dentro de `app/admin/page.tsx`, sin uso |
| `Components/ImageUploader/ImageUploader.tsx` | 03 | Ídem |
| `Components/Cart/index.ts` | 03 | Sin uso y con export mal nombrado |
| `server/auth/legacyLimiters.ts` | 07 | Reemplazado por `server/auth/rateLimit.ts` |

---

## 4. Convenciones

### Nombres
- **Idioma**: nombres de dominio en español, como el código actual (`nombre`, `precio`, `pedido`). Sufijos y términos técnicos en inglés (`.service.ts`, `.schema.ts`, `route.ts`, `requireAdmin`).
- **Archivos**: componentes `PascalCase.tsx`; todo lo demás `camelCase.ts` o `kebab.sufijo.ts` (`order.service.ts`).
- **Modelos**: `PascalCase` singular en inglés, como los existentes (`Order`, `Coupon`).
- **Rutas de API**: inglés plural (`/api/orders`). **Rutas de página**: español (`/pedido`, `/checkout`, `/admin/cupones`).
- **Exports**: con nombre. `default` solo donde Next.js lo exige (páginas, layouts) y en modelos (convención actual).

### Imports
- Siempre con alias `@/…`; nunca rutas relativas que suban de carpeta (`../`).
- `server/**` **nunca** se importa desde un archivo con `"use client"`, desde `lib/`, `hooks/`, `context/` ni `Components/`. `import "server-only"` hace que el build falle si ocurre.
- `lib/**` no importa de `server/`, `models/`, `react` ni `next/*`.
- `models/**` solo se importa desde `server/services/**`, `server/auth/**` y `scripts/**`.

### Dirección de dependencias
```
app/(páginas cliente), Components, context, hooks ──► lib, types
app/api/**/route.ts, páginas de servidor ──► server/auth, server/http, server/validation, server/services ──► models, server/db, lib, types
```

### Anatomía de un `route.ts`
```ts
import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { productoCrearSchema } from "@/server/validation/product.schema";
import { crearProducto } from "@/server/services/product.service";

export const POST = handle(async (req) => {
  await requireAdmin("catalogo.editar");           // 1. sesión y permiso
  const datos = productoCrearSchema.parse(await req.json());  // 2. validar
  const producto = await crearProducto(datos);     // 3. servicio
  return json(producto);                           // 4. responder
});
```
`handle` captura `AppError`, `ZodError` y el error 11000 de Mongo (duplicado) y los convierte en la respuesta de error de D-07. Ningún handler lleva su propio `try/catch` genérico.

### Servicios
- Una función por caso de uso, con nombre en español e infinitivo: `listarProductosPublicos()`, `crearPedido()`, `confirmarPedido()`.
- Reciben datos **ya validados** y devuelven objetos planos (`.lean()` + serialización de `_id` a string donde vaya al cliente).
- Lanzan `AppError` (`noEncontrado()`, `conflicto()`, `noAutorizado()`, `prohibido()`, `entradaInvalida()`); nunca devuelven `NextResponse`.
- Llaman a `connectDB()` ellos mismos al inicio. Los handlers no lo hacen.
- No leen cookies ni cabeceras: quién es el actor se recibe por parámetro (`actor: { adminId: string }`).

### Errores estándar (`server/http/errors.ts`)

| Fábrica | HTTP | `code` |
|---|---|---|
| `entradaInvalida(fields?)` | 400 | `ENTRADA_INVALIDA` |
| `noAutorizado()` | 401 | `NO_AUTORIZADO` |
| `prohibido()` | 403 | `PROHIBIDO` |
| `noEncontrado(que)` | 404 | `NO_ENCONTRADO` |
| `conflicto(mensaje, code?)` | 409 | `CONFLICTO` (o el indicado) |
| `demasiadosIntentos(minutos?)` | 429 | `DEMASIADOS_INTENTOS` |
| (no capturado) | 500 | `ERROR_INTERNO`, mensaje fijo "Error en el servidor" |

### Componentes y páginas
- Una página de más de ~300 líneas se parte en componentes dentro de una carpeta `_components/` vecina.
- Los colores de marca siguen como están (`#2C2C6C`, `#241B57`); no se introduce un sistema de diseño.
- Texto visible siempre en español, tuteo, como el sitio actual.

---

## 5. Tipos compartidos (`types/`)

Las definiciones campo por campo de las entidades nuevas están en `02-datos.md`. Aquí, qué exporta cada archivo.

| Archivo | Exporta | Notas |
|---|---|---|
| `types/product.ts` | `StockEstado`, `Product`, `ProductAdmin`, `ProductInput` | `Product` = proyección pública. `ProductAdmin = Product & { precioCosto?, proveedor? }` |
| `types/category.ts` | `Category`, `CategoryInput` | |
| `types/banner.ts` | `BannerPosicion`, `Banner`, `BannerInput` | |
| `types/promotion.ts` | `PromotionEtiqueta`, `Promotion`, `PromotionInput` | |
| `types/discount.ts` | `TipoDescuento`, `DiscountTier`, `DiscountTierInput` | `TipoDescuento = "porcentaje" \| "monto_fijo"` |
| `types/cart.ts` | `CartItemTipo`, `CartItem` | `CartItem` gana `tipo?: "producto" \| "promocion"` (opcional: los carritos ya guardados no lo tienen) |
| `types/order.ts` | `OrderEstado`, `PagoEstado`, `MetodoPago`, `MetodoEntrega`, `OrderItem`, `Order`, `OrderPublic`, `OrderCreateInput`, `OrderCreateResult` | |
| `types/coupon.ts` | `Coupon`, `CouponInput`, `CuponAplicable`, `CouponValidateResult` | |
| `types/user.ts` | `SessionUser`, `UserProfile` | |
| `types/admin.ts` | `AdminRol`, `Permiso`, `AdminSession`, `AdminUserPublic` | |
| `types/api.ts` | `ApiError`, `Paginated<T>` | `ApiError = { error: string; code?: string; fields?: Record<string,string> }` |
| `types/index.ts` | reexporta todo | Se importa `from "@/types"` |

Reglas:
- Todos los `_id` son `string` en `types/` (ya serializados).
- Las fechas son `string` ISO en `types/`.
- Los tipos de documento Mongoose (`IProduct`, `IUser`…) se quedan en su archivo de `models/` y no se exportan a `types/`.
- Los campos opcionales reflejan la realidad de los datos antiguos: si un documento viejo puede no tenerlo, es opcional.

---

## 6. Capa de servicios: quién usa qué

| Servicio | Funciones (firma completa en la fase indicada) | Fase |
|---|---|---|
| `product.service` | Fase 06: `listarProductos`, `obtenerProductoPorId`, `obtenerProductoPorSlug`, `crearProducto`, `actualizarProducto`, `eliminarProducto`, `reordenarProductos`. Fase 10: `listarProductos` se divide en `listarProductosPublicos` y `listarProductosAdmin`; se añaden `obtenerProductoPublicoPorId` y `obtenerProductoPublicoPorSlug` | 06, 10, 13 |
| `upload.service` | `prepararImagen`, `subirImagenes`, `eliminarImagen` | 11 |
| `category.service` | `listarCategorias`, `obtenerCategoria`, `crearCategoria`, `actualizarCategoria`, `eliminarCategoria` | 06 |
| `banner.service` | `listarBannersActivos`, `listarBanners` (fase 10), `obtenerBanner`, `crearBanner`, `actualizarBanner`, `eliminarBanner` | 06 |
| `promotion.service` | `listarPromocionesActivas`, `obtenerPromocion`, `indiceDePromocion`, `crearPromocion`, `actualizarPromocion`, `eliminarPromocion` | 06 |
| `discount.service` | `listarNiveles`, `listarNivelesActivos`, `obtenerNivel`, `crearNivel`, `actualizarNivel`, `eliminarNivel` | 06 |
| `inventory.service` | `ajustarStock`, `descontarPorPedido`, `reponerPorPedido`, `listarMovimientos` | 13, 17 |
| `order.service` | `crearPedido`, `obtenerPedidoPublico`, `listarPedidosDeUsuario`, `listarPedidosAdmin`, `obtenerPedidoAdmin`, `confirmarPedido`, `marcarEnviado`, `marcarEntregado`, `cancelarPedido`, `registrarPago`, `agregarNota`, `caducarPendientes` | 15, 17 |
| `coupon.service` | `claveCliente`, `validarCupon`, `consumirCupon`, `liberarCupon`, `listarCupones`, `crearCupon`, `actualizarCupon` (desactivar = `actualizarCupon` con `activo: false`) | 18 |
| `admin-user.service` | `listarAdmins`, `crearAdmin`, `actualizarAdmin` (incluye cambio de contraseña) | 09 |
