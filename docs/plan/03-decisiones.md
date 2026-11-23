# 03 · Decisiones de arquitectura

Cada decisión está **tomada**. El ejecutor no la reabre: si cree que es incorrecta, se detiene y lo reporta. Las que dependen de una respuesta del dueño indican la pregunta (`P#`, lista en `README.md`) y el **valor por defecto** con el que se implementa mientras tanto.

---

## Reglas de Nivel 1 (innegociables)

> El encargo menciona "reglas de Nivel 1" pero el repositorio no las define en ningún archivo. Esta es la **propuesta** del arquitecto; queda pendiente de aprobación (pregunta P0). Una vez aprobadas se copian tal cual a `CLAUDE.md`.

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

---

## Estructura y convenciones

**D-01 · Sin carpeta `src/`; el alias `@/*` sigue apuntando a la raíz.** Mover todo a `src/` son ~100 movimientos sin beneficio funcional.

**D-02 · Tres zonas de código según dónde corre.**
- `server/` — solo servidor. Todo archivo empieza con `import "server-only";`.
- `lib/` — funciones puras, seguras en navegador y servidor. Sin React, sin Mongoose, sin `process.env` privado.
- `hooks/`, `context/`, `Components/` — React de cliente.

Las reglas de negocio que deben coincidir en ambos lados (precios, cupones, estados de pedido, permisos) viven en `lib/` y llevan pruebas unitarias.

**D-03 · `models/` y `Components/` no se mueven ni se renombran.** `models/` ya está bien ubicado. `Components/` no se pasa a minúscula por el riesgo R6.

**D-04 · Capa de servicios.** Un `route.ts` solo hace: (1) comprobar sesión/permiso, (2) validar entrada con Zod, (3) llamar a un servicio, (4) responder. Toda consulta a Mongoose vive en `server/services/*.service.ts`. Las páginas de servidor también llaman a servicios, nunca a modelos.

**D-05 · `Product` conserva `strict: false`.** Endurecerlo puede descartar campos heredados al guardar. La protección contra campos arbitrarios se hace en la validación de entrada (lista blanca Zod). Los campos que hoy viven "de contrabando" (`imagenes`, `imagenPrincipal`, `tags`) se declaran en el esquema.

**D-06 · Validación con Zod 4** (`zod` como dependencia directa). Un esquema por entidad en `server/validation/`. Los esquemas usan `.strict()` solo en endpoints **nuevos**; en los existentes se usa `.strip()` (descarta lo desconocido sin fallar) para no romper al admin actual, que envía campos extra.

**D-07 · Forma de las respuestas de la API.**
- Éxito: el recurso directamente (objeto o arreglo), como hoy. Listas paginadas nuevas: `{ items, total, page, pageSize }`.
- Error: `{ "error": "mensaje para mostrar", "code": "CODIGO_ESTABLE", "fields": { "campo": "motivo" } }`. `error` ya existe hoy; `code` y `fields` son nuevos y opcionales.
- No se introduce un sobre `{ ok, data }`: obligaría a reescribir todos los clientes y viola N1-6.

**D-08 · Tipos compartidos en `types/`.** Un archivo por entidad. Cada entidad tiene su tipo público (lo que ve el navegador) y, si aplica, su tipo admin (`ProductAdmin extends Product` con costo y proveedor). Los archivos dejan de declarar copias locales.

**D-09 · Pruebas con Vitest**, solo unitarias, solo sobre `lib/`. No se prueban rutas ni componentes en este plan.

**D-10 · Dinero como `Number` en soles con 2 decimales.** Toda operación pasa por `redondear2()` de `lib/money.ts`. No se migra a céntimos: sería una migración destructiva de todos los precios.

**D-11 · Registro (logs).** `server/logger.ts` con `log.info / warn / error`. Prohibido registrar cuerpos de petición, contraseñas, tokens o correos completos. `console.log` de depuración se elimina al tocar cada archivo.

**D-12 · Transacciones de MongoDB** (`session.withTransaction`) para toda operación que toque stock y pedido, o cupón y pedido, a la vez. Requiere replica set (Atlas lo es).

---

## Autenticación, roles y permisos

**D-13 · Se mantienen dos sistemas de sesión separados** (admin y cliente), con sus cookies (`admin-token`, `user-token`), secretos y duraciones actuales. Unificarlos no aporta y arriesga dejar fuera al administrador.

**D-14 · Una sola librería JWT: `jose`.** Se elimina `jsonwebtoken`. Algoritmo HS256, igual que hoy, así que **los tokens ya emitidos siguen siendo válidos**.

**D-15 · Sesión revocable con `tokenVersion`.** `AdminUser` y `User` ganan `tokenVersion` (entero, por defecto 0). El token lleva `tv`. Los guards de servidor cargan el usuario y rechazan si `activo` es falso o `tv` no coincide. Se incrementa al cambiar/restablecer contraseña y al desactivar. Un token antiguo sin `tv` se lee como `tv = 0`.

**D-16 · Defensa en dos capas.** `proxy.ts` (antes `middleware.ts`) sigue filtrando por prefijo como primera barrera barata. **Además**, cada handler protegido llama a `requireAdmin(permiso)` o `requireUser()`. El guard es la autoridad; el proxy es un atajo.

**D-17 · Tres roles de administrador, fijos en código.**

| Permiso | `superadmin` | `gestor` | `ventas` |
|---|:-:|:-:|:-:|
| `catalogo.editar` (productos, categorías, banners, promociones, orden, imágenes) | ✔ | ✔ | — |
| `inventario.ver` | ✔ | ✔ | ✔ |
| `inventario.editar` | ✔ | ✔ | — |
| `costos.ver` (precio de costo, proveedor, margen) | ✔ | ✔ | — |
| `pedidos.ver` | ✔ | ✔ | ✔ |
| `pedidos.gestionar` | ✔ | ✔ | ✔ |
| `descuentos.gestionar` | ✔ | ✔ | — |
| `cupones.gestionar` | ✔ | ✔ | — |
| `admins.gestionar` | ✔ | — | — |

El rol se lee **de la base en cada petición**, nunca del token. Los administradores existentes pasan a `superadmin` (migración 001). Un documento sin `rol` se trata como `superadmin` (equivale a su acceso actual) y se registra un aviso. Los altos nuevos nacen como `gestor`. No hay roles configurables desde la interfaz.

**D-18 · Límite de intentos solo en MongoDB**, colección nueva `RateLimit` con TTL real sobre un campo `Date`. Se eliminan los limitadores en memoria. `LoginBlock` y `UserLoginBlock` dejan de usarse pero **no se borran** (N1-3).

| Clave | Máximo | Ventana | Bloqueo |
|---|---|---|---|
| `login-admin:ip:<ip>` (solo fallos) | 3 | 1 h | 15 min |
| `login-user:ip:<ip>` (solo fallos) | 5 | 1 h | 15 min |
| `register:ip:<ip>` | 3 | 1 h | — |
| `resend-verif:email:<email>` | 3 | 1 h | — |
| `forgot:email:<email>` | 3 | 1 h | — |
| `forgot:ip:<ip>` | 10 | 1 h | — |
| `order:ip:<ip>` | 5 | 1 h | — |
| `coupon:ip:<ip>` | 10 | 10 min | — |

El bloqueo por cuenta del cliente (`User.intentosFallidos`, `bloqueadoHasta`) se conserva tal cual.

**D-19 · IP del cliente:** `cf-connecting-ip` → `x-real-ip` → primer valor de `x-forwarded-for` → `"unknown"`. *Depende de P3.* Por defecto se implementa este orden.

---

## Catálogo e inventario

**D-20 · API pública y API de administración separadas.** Los `GET` públicos existentes devuelven una **proyección pública**: sin `precioCosto` ni `proveedor`, y solo productos con `activo` distinto de `false`. El panel pasa a leer de `/api/admin/*`, que exige sesión y devuelve todo (los campos de costo solo con `costos.ver`). *Ocultar inactivos depende de P4;* por defecto se ocultan.

**D-21 · `stock` (texto) es siempre derivado** de `stockCantidad` y `stockMinimo` por una única función `estadoDeStock()` en `lib/stock.ts`. Nadie lo escribe a mano. El formulario de producto cambia el selector de estado por los campos de cantidad y mínimo.

**D-22 · Todo cambio de stock deja rastro** en la colección nueva `StockMovement` (quién, cuánto, antes, después, por qué). Los cambios pasan por `inventory.service`, nunca por un `update` directo.

**D-23 · Las promociones no llevan stock numérico.** Conservan su etiqueta manual. Un pedido con promociones no descuenta inventario por ellas. *Depende de P7.*

---

## Subida de imágenes a Cloudinary

**D-24 · La subida sigue pasando por el servidor** (`POST /api/upload`, multipart). Se descarta la subida directa firmada desde el navegador: solo suben administradores, el volumen es bajo, y pasar por el servidor permite inspeccionar el archivo. Contrato de petición y respuesta sin cambios.

Endurecimiento:
1. `requireAdmin("catalogo.editar")` dentro del handler.
2. El contenido se inspecciona con `sharp` (ya instalada): se aceptan solo JPEG, PNG, WebP y AVIF reales; se rechaza lo demás aunque diga `image/*`.
3. Se redimensiona a un máximo de 2 000 px por lado antes de subir. Límite de 5 MB por archivo y 10 archivos se mantiene.
4. Banners y promociones reciben sufijo de tiempo en el `public_id` (como ya hacen los productos) y `overwrite: false`.
5. `upload/delete` acepta los prefijos `productos/`, `banners/`, `promociones/`.
6. **No** se borran imágenes de Cloudinary automáticamente al eliminar un producto (un borrado accidental sería irrecuperable). Queda como mejora futura.

**D-25 · No se unifican los generadores de URL de imagen existentes** en `ProductCard` y páginas públicas: generan transformaciones ligeramente distintas y unificarlos cambiaría lo que se ve (N1-1). Se crea `lib/cloudinaryUrl.ts` para el código nuevo.

---

## Pedidos

**D-26 · Pedido = registro guardado + confirmación por WhatsApp. Sin pasarela de pago en este plan.** El cliente llena `/checkout`, el servidor guarda el pedido y lo lleva a `/pedido/[codigo]`, donde un botón abre WhatsApp con el código del pedido. El pago se acuerda por chat y el administrador lo marca a mano. *Depende de P5.*

**D-27 · Interruptor `NEXT_PUBLIC_CHECKOUT_ENABLED`.** Apagado: los botones del carrito abren WhatsApp como hoy. Encendido: llevan a `/checkout`. Es el plan de reversa de todo el bloque de pedidos.

**D-28 · Se puede comprar sin cuenta.** Si hay sesión de cliente, el pedido se asocia a su `userId` y aparece en "Mis pedidos". No se obliga a registrarse.

**D-29 · El servidor reconstruye el pedido.** El navegador envía solo `{ id, cantidad }` por ítem. El servidor busca cada id primero en `Product` y, si no está, en `Promotion`; toma nombre y precio de la base; recalcula subtotal, descuento por monto, cupón y total. El pedido guarda una **copia** de nombre, precio e imagen de cada ítem (los cambios posteriores del catálogo no lo alteran).

**D-30 · Estados y transiciones.**

```
pendiente ──► confirmado ──► enviado ──► entregado
    │              │            │
    └──────────────┴────────────┴──► cancelado
```
`confirmado → entregado` también es válido (recojo en tienda). `entregado` y `cancelado` son finales.

**D-31 · El stock se descuenta al CONFIRMAR, no al crear.** Como no hay pago y cualquiera puede crear un pedido, descontar al crear permitiría vaciar el inventario con pedidos falsos. Al crear solo se comprueba que haya stock. Al confirmar, en una transacción, se descuenta cada producto con condición `stockCantidad >= cantidad`; si alguno no alcanza, no se confirma nada y se responde 409 con la lista. Al cancelar un pedido con stock ya descontado, se devuelve. No existe "forzar". *Depende de P21.*

**D-32 · Código de pedido** `JK-AAMMDD-XXXX` (4 caracteres de `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`), único, con reintento ante colisión. **Token de acceso** aleatorio de 32 bytes: va en la URL (`/pedido/JK-…?t=…`), en la base se guarda su hash SHA-256. Sin token válido (y sin ser el dueño con sesión) la página responde 404: el pedido contiene datos personales.

**D-33 · Envío.** `costoEnvio` existe en el modelo. En esta versión: Huancayo y recojo = 0; provincia = 0 con `envioPorCoordinar: true` y aviso "el costo de envío se coordina por WhatsApp". *Depende de P6.* *Desde la fase 16b, lo de Huancayo y recojo lo sustituyen D-71 y D-72; lo de provincia sigue vigente (D-73).*

**D-34 · Teléfono solo Perú**: 9 dígitos que empiezan en 9, guardado como `51` + 9 dígitos. *Depende de P8.*

**D-35 · Pedidos pendientes caducan a las 72 h.** Sin cron: se cancelan de forma perezosa cuando un administrador abre la lista de pedidos (y por un endpoint manual). La cancelación libera el cupón. *El plazo depende de P15.*

**D-36 · Correos de pedido** (confirmación al cliente si dejó email, aviso al negocio). Un fallo de envío nunca hace fallar el pedido.

---

## Cupones y descuentos

**D-37 · El descuento por monto existente se conserva** con sus reglas (gana el nivel de mayor `montoMinimo` alcanzado; no se suman). Pasa a calcularse con la misma función en navegador y servidor (`lib/pricing.ts`).

**D-38 · Un cupón por pedido.**

**D-39 · Cupón y descuento por monto NO se acumulan por defecto: se aplica el mayor de los dos** (empate: el de monto). Cada cupón tiene un interruptor `acumulable`; si está activo, se aplica primero el descuento por monto y el cupón sobre lo que queda. *Depende de P10.*

**D-40 · Tipos de cupón:** porcentaje (con tope opcional en soles) o monto fijo. Condiciones: vigencia, compra mínima, usos totales, usos por cliente. No hay cupones por producto o categoría en este plan.

**D-41 · El cupón se consume al CREAR el pedido y se libera al cancelarlo.** El incremento de `usosActuales` es atómico y condicional (no puede pasar del máximo ni con peticiones simultáneas). El cliente ve el total real desde el primer momento. El riesgo de agotarlo con pedidos falsos se cubre con el límite por IP, el límite por cliente y la caducidad de D-35.

**D-42 · "Cliente" para el límite de usos** = `userId` si hay sesión; si no, teléfono normalizado. No se exige cuenta para usar un cupón. *Depende de P11.*

**D-43 · Validar un cupón nunca revela por qué falla** más allá de un motivo genérico por categoría (`no_valido`, `no_alcanza_minimo`, `ya_usado`), con límite de 10 intentos cada 10 minutos por IP, para que no se puedan adivinar códigos.

**D-44 · Códigos** en mayúsculas, 4–20 caracteres `A-Z 0-9 -`, únicos. La entrada del cliente se normaliza (trim + mayúsculas).

---

## Proceso de trabajo

**D-45 · Una rama por fase** (`fase-NN-nombre`), creada desde `main` actualizado. Commits pequeños en español, como el historial actual. El ejecutor no hace `push` ni fusiona (N1-8).

**D-46 · Migraciones numeradas** en `scripts/migrations/NNN-nombre.mjs`, con un ejecutor común: simulan por defecto, `--apply` para escribir, idempotentes, y antes de escribir guardan copia de los documentos afectados en `backups/` (ignorada por git). Detalle en `02-datos.md`.

**D-47 · Los scripts antiguos de `scripts/` no se borran**; se mueven a `scripts/legacy/` y se excluyen de ESLint.

---

## Rediseño del panel (fases 12b–12d y propuestas posteriores)

*Acordadas con el dueño el 2026-11-13. Detalle de las propuestas en `propuestas-panel.md`.*

**D-48 · Navegación del panel: barra lateral a la izquierda** (el dueño la pidió a la derecha al principio y la cambió a la izquierda el 2026-11-13), con una URL por sección (`/admin/productos`, `/admin/categorias`…). En móvil es un cajón que entra desde la izquierda. Sustituye a la barra superior de la fase 12.

**D-49 · Estilo del panel derivado de la tienda.** Tokens de color bajo la clase `.panel` (azul `#2C2C6C` de navbar/footer, acento `indigo-600`); no se toca `app/globals.css`. La referencia visual vive en `referencia-panel/`.

**D-50 · Modo oscuro opcional.** Sigue la preferencia del sistema; la elección manual se guarda en `localStorage` dentro de `try/catch`.

**D-51 · Secciones del diseño de referencia que NO se construyen:** *Proveedores* (no es una entidad: es un campo de texto del producto), *Biblioteca de medios* (Cloudinary ya gestiona las imágenes y la limpieza de huérfanas está fuera de alcance), *Configuración de la tienda* (exigiría un modelo de ajustes sin necesidad hoy) y *campana de alertas* (no hay sistema de notificaciones; el stock crítico ya sale en el Resumen).

**D-52 · El Resumen solo muestra datos reales.** Las tarjetas de pedidos, clientes, cupones y visitas se añaden en la fase que crea esos datos. Nada de cifras de ejemplo en producción.

**D-53 · Fuente del panel: la que ya carga el layout raíz** (`--font-geist-sans`). Sin fuentes externas: el CSP (`font-src 'self'`) no se relaja (N1-4).

**D-54 · Los roles se mantienen** (`superadmin`, `gestor`, `ventas`, D-17). El menú solo enseña lo que el rol permite; ocultar un enlace no sustituye a `requireAdmin`.

**D-55 · Visitas: contador propio simple** (un documento por producto y día) para «más vistos»; el resto de analítica se queda en Google Analytics. *Propuesta 21b.*

**D-56 · Variantes de producto: opcionales y de ejes libres** (color, talla u otros), con stock propio por combinación y precio/imagen opcionales. Un producto sin variantes no cambia. *Propuesta 13b, modelo superior.*

**D-57 · Subcategorías: solo la base.** Campo opcional `padre` en `Category`, sin interfaz hasta que el catálogo (hoy ~80–100 productos) lo justifique.

**D-58 · Novedades por fecha.** `nuevoHasta` opcional en `Product`; «novedad» = fecha futura, calculado al consultar, sin tareas programadas. El producto conserva su categoría. *Propuesta 12e.*

**D-59 · Popup de oferta configurable desde el panel:** imagen, texto de botón, destino (producto, categoría, promoción o enlace validado), interruptor activo y fechas opcionales. Se muestra una vez cada 24 h. *Propuesta 12f; cambia lo que ve el público, requiere aprobación explícita (N1-1).*

---

## Variantes de producto (fase 13b)

*Acordadas con el dueño el 2026-11-13. Detalle en `fases/fase-13b-variantes.md`.*

**D-60 · Modelo de variantes.** Dentro de `Product`: `opciones` (ejes libres: máx. 3, 20 valores cada uno) y `variantes` (máx. 100), cada una con `_id` propio, `combinacion`, `stockCantidad`, `precio?`, `imagen?`, `sku?` y `activo`. «Tiene variantes» = `variantes` no vacío. Sin colección nueva.

**D-61 · Stock por variante, por la misma puerta.** El stock de una variante solo cambia con `ajustarStock({ variantId })` y deja un movimiento con la etiqueta de la variante. El `stockCantidad` del producto pasa a ser la **suma de las variantes activas** (derivado por el servidor) y su etiqueta (Disponible/Limitado/Agotado) se calcula de ese total. Un producto con variantes rechaza ajustes sin `variantId`.

**D-62 · Precio.** La variante puede tener precio propio; si no, hereda el del producto. Las tarjetas muestran «Desde S/ …» cuando los precios difieren.

**D-63 · Línea del carrito.** Se identifica por `lineaId` = `productoId` o `productoId:varianteId`. Los carritos ya guardados en los navegadores (sin variante) siguen funcionando sin migrar.

**D-64 · Las variantes no se eliminan: se desactivan.** Así el historial de movimientos y pedidos conserva sentido (N1-3). Quitar todas las variantes de un producto queda fuera de esta fase.

**D-65 · La tarjeta de un producto con variantes no agrega directo al carrito:** lleva a la ficha, donde se eligen las opciones. Productos sin variantes: sin cambios.

**D-66 · Pedidos y WhatsApp llevan la variante.** El mensaje de WhatsApp y cada ítem de pedido incluyen la etiqueta de la variante; el servidor revalida variante, precio y stock (N1-5). Las fases 14, 15 y 17 se ajustan a esto.

**D-67 · Subcategorías: solo la base (D-57).** `Category.padre` opcional (slug de la categoría madre), sin interfaz ni uso público.

---

## Ajustes del 2026-11-14 (revisión del panel y arranque de la 13b)

*Acordados con el dueño el 2026-11-14.*

**D-68 · La cantidad exacta de stock es secreta.** La API pública (`GET /api/products`, `GET /api/products/[id]` y la ficha `/producto/[slug]`) deja de enviar `stockCantidad` y `stockMinimo`, y las variantes públicas no llevan `stockCantidad`: llevan solo su etiqueta `stock` (Disponible / Limitado / Agotado), calculada en el servidor. La tienda nunca usó la cantidad (solo la etiqueta) y el panel lee de `/api/admin/*`, así que no cambia nada visible. Es una excepción a N1-6 aprobada por el dueño.

**D-69 · Las variantes existentes no se pueden omitir al guardar.** Si `PUT /api/products/[id]` trae `variantes` y falta alguna de las ya guardadas, o trae un `_id` que no existe en el producto → 400. Se desactivan, nunca se borran (D-64).

**D-70 · Retoque visual del panel** (pedido por el dueño durante la 13b). Solo estilo, sin reestructurar: tarjetas, botones e iconos de sección con el azul de la tienda (`#2C2C6C`) y el acento índigo, y un modo oscuro con más contraste y profundidad. Se hace con los tokens de `.panel` (D-49); no se toca `app/globals.css` fuera de ese bloque, ni la tienda, ni el CSP.

---

## Entrega (fase 16b)

*Aprobadas por el dueño el 2026-11-14 (Q1 sí, Q2 enterado, Q3 solo departamentos). Sustituyen lo que D-33 decía sobre Huancayo y recojo.*

**D-71 · Delivery gratis por carrito.** Con método `delivery_huancayo`: si **algún** ítem de tipo producto tiene `deliveryHuancayo` verdadero → `costoEnvio = 0`, `envioPorCoordinar = false`. Si ninguno → `costoEnvio = 0` y `envioPorCoordinar = true` (aviso: "Se cobrará un adicional por el delivery; te avisaremos el costo por WhatsApp"). Las **promociones nunca cuentan**. Lo decide el servidor (N1-5) con `entregaGratis()` de `lib/shipping.ts`; el navegador solo lo muestra (checkout y `/carrito`). Se interpreta igual que `ProductCard`: solo el valor `true` cuenta (un producto sin el campo guardado no califica).

**D-72 · Puntos de entrega.** Entidad administrable (`DeliveryPoint`, pantalla Panel → Puntos de entrega, permiso `catalogo.editar`). Elegir uno = método `punto_entrega`: sin costo ni aviso de adicional. El pedido guarda una **copia** del punto (nombre, dirección, referencia, horario), así que editarlo después no cambia pedidos ya hechos. Un punto inactivo o inexistente al crear el pedido → 409 `PUNTO_NO_DISPONIBLE`. Nunca se borran: se desactivan (N1-3). `recojo` se conserva en el enum solo para pedidos antiguos; al crear un pedido se rechaza con 400.

**D-73 · Envío a provincia.** Datos: departamento (lista cerrada de 25: 24 departamentos + Callao, sin "Lima Provincias"), provincia y ciudad (texto libre). Sin dirección ni referencia; si llegan → 400 (cada método rechaza los campos que no le corresponden). Aviso fijo: "La agencia de envío, tu DNI y el resto de datos los coordinamos por WhatsApp." Sigue con `envioPorCoordinar = true`. Sin campo distrito salvo que el dueño lo pida.

---

## Legal y cookies (fase 22a)

*Aprobadas por el dueño el 2026-11-19 (Q1: correo productosjanku@gmail.com; Q2–Q4 por defecto).*

**D-74 · Datos del titular en un solo sitio** (`LEGAL` en `lib/siteConfig.ts`). Janku es el nombre comercial de una persona natural con RUC 10 en el Nuevo RUS: tienda virtual, solo boleta de venta electrónica, precios finales.

**D-75 · Google Analytics solo con consentimiento** y sin consulta en `page_location` (el token del pedido no sale). "Rechazar" igual de visible que "Aceptar"; rechazar desactiva GA y borra `_ga*`.

**D-76 · Aceptación de términos** con casilla sin marcar en registro y checkout. En la API es un campo opcional (N1-6); si llega, el servidor guarda `LEGAL.version` y su propia fecha.

**D-77 · Política de cambios:** revisión al recibir; sin devoluciones por cambio de opinión; 3 días para fallas de fábrica no visibles (cambio, reparación o devolución del dinero); en provincia, video de desempaque y aviso en 24 h. No limita los derechos del consumidor.

**D-78 · Sin plazos de entrega fijos** en los textos públicos.

---

## Libro de Reclamaciones (fase 22b)

*Aprobadas por el dueño el 2026-11-19 (Q5, Q6 y Q7 por defecto).*

**D-79 · Libro de Reclamaciones propio**, en la base (`complaints`), con correlativo anual `LR-AAAA-NNNNNN` (año en hora de Lima, contador atómico en `counters`) y copia de los datos del proveedor (`LEGAL`) en cada hoja, que no cambia aunque `LEGAL` cambie. La copia y el aviso se envían sin `await` dentro de la petición; un fallo de correo no impide registrar la hoja y queda `copiaEnviada: false`. El aviso a la tienda va a `LEGAL.correo` (Q6) y no lleva DNI ni domicilio.

**D-80 · Las hojas no se borran y la respuesta es inmutable** (N1-3 y valor de registro). Solo se responde una hoja `pendiente`; la segunda respuesta → 409 `YA_RESPONDIDO`.

**D-81 · Plazo mostrado** = 15 días hábiles contando solo sábados y domingos como no hábiles (nunca más permisivo que el real: los feriados no se descuentan).

**D-82 · Permisos de reclamos** = los de pedidos (Q5): ven la lista y la hoja quienes tienen `pedidos.ver`; responden quienes tienen `pedidos.gestionar`. Sin permiso nuevo. La tarjeta "Reclamos por responder" del Resumen solo aparece con `pedidos.ver` (Q7).

---

## Panel nuevo (fase 23a)

*Aprobada por el dueño el 2026-11-20.*

**D-83 · Panel nuevo con preferencias por navegador.** Tema, tamaño y color de la barra lateral y ancho del panel se eligen en el personalizador (engranaje) y se guardan en el navegador de cada persona (`localStorage`); no viajan al servidor. Sustituye el estilo de D-70. Buscador y campana solo usan endpoints existentes y respetan permisos.

**D-84 · Sin plantilla de terceros.** La estructura se inspira en paneles comerciales (referencia del dueño), pero el código, los nombres y los recursos visuales son propios de Janku; el logo es `public/apple-touch-icon.png`.

---

## Estadísticas (fase 23b)

*Aprobada por el dueño el 2026-11-20 (Q1: solo superadmin).*

**D-85 · Estadísticas desde GA4 con cuenta de servicio de solo lectura.** El servidor firma un JWT con `jose` (sin dependencia nueva), pide un token a Google y consulta la Data API; los informes se guardan 10 min en memoria y el tiempo real 1 min. La clave vive solo en variables de entorno y nunca va a logs ni respuestas. Sin credenciales, la API responde 503 `ANALYTICS_NO_CONFIGURADO` y el panel explica cómo conectar; si Google falla, 502 con mensaje fijo. Permiso nuevo `estadisticas.ver`, solo superadmin.

**D-86 · «Más vistos» desde Analytics** (rutas `/producto/{slug}` cruzadas con el catálogo por `codigoUrl`) en lugar del contador propio de la 21b: sin escrituras por visita ni endpoint público nuevo. Las cifras solo cuentan a quien aceptó las cookies (D-75): sirven para comparar, no como total.

---

## Catálogo en el servidor (fase 24, primera parte)

*Aprobada por el dueño el 2026-11-20 (Q2 y Q3 por defecto; Q1 aplazada).*

**D-87 · Cada página pide solo su parte del catálogo.** `GET /api/products` acepta filtros opcionales `?ids=` (hasta 100), `?categoria=`, `?home=1` y `?relacionados=`; sin filtros responde igual que siempre (N1-6) y los parámetros desconocidos se ignoran. El servidor parte de la misma consulta pública de siempre (misma proyección, sin costos ni stock exacto, D-68) y aplica en memoria la misma regla que antes aplicaba cada página; así el contenido y el orden visibles son idénticos por construcción (N1-1; comprobado contra la base de desarrollo: inicio, 7 categorías y relacionados iguales). Lo que viaja al navegador baja de ~310 KB a 9–205 KB según la página. La página de categoría se genera en el servidor en cada visita (sin caché: los cambios del panel se ven al instante) con título y descripción para Google. Se añaden `/sitemap.xml` y `/robots.txt`, generados al pedirlos (el build no se conecta a la base). **Aplazado:** la paginación «cargar más» (Q1) hasta que el catálogo crezca, y la búsqueda, que calcula sus filtros sobre el catálogo entero.

**D-88 · Subcategorías de un solo nivel (fase 25).** Una categoría puede tener una madre (`Category.padre`, slug); la madre no puede ser a su vez hija y una categoría con hijas no puede ser hija (lo valida el servidor con `validarMadre`, `lib/categorias.ts`, y responde 400). `""` quita la madre; no se usa `$unset` (N1-3). La subcategoría conserva su URL (`/cocina`, la misma ruta `[categoria]`) y muestra la ruta «Hogar › Cocina» si la madre está activa. La página de la madre reúne sus productos y los de sus hijas activas sin repetir, con el orden manual de la madre primero y el resto en el orden del catálogo; arriba lleva botones «Todo · Cocina · …». El menú solo lista las categorías principales. Sin subcategorías creadas, la tienda se ve y ordena igual que antes. La búsqueda y su filtro por categoría no cambian.

**D-89 · Copias de seguridad y rutas de cuenta con Zod (fase 26a).** Atlas M0 no hace copias: `scripts/backup/respaldar.mjs` (solo lee) guarda cada colección en EJSON en `backups/respaldo-<base>-<fecha>/` con un manifiesto; `restaurar.mjs` simula por defecto y con `--apply` (solo el dueño) solo inserta documentos cuyo `_id` falta, sin sobrescribir ni borrar (N1-3). Las 7 rutas heredadas de cuenta (`auth/login`, `auth-user/{login,register,forgot-password,reset-password,verify-email,profile}`) validan la FORMA del cuerpo con Zod (sin `.strict()`, campos de más ignorados como antes); un tipo equivocado responde lo mismo que un JSON mal formado, y las reglas y mensajes de contenido no cambian (N1-4, N1-6). `X-XSS-Protection` pasa a `0` (OWASP). Descartado `sanitizeFilter` de Mongoose: rompería consultas propias con operadores.

**D-90 · Verificación en dos pasos del panel (fase 26b).** TOTP (RFC 6238: HMAC-SHA1, 30 s, 6 dígitos, ventana ±1) implementado con `node:crypto`, sin librería de servidor; `lib/totp.ts` es puro y se prueba con los vectores de RFC 4226 y 6238. Una sola variable `TOTP_ENC_KEY` (32 bytes en base64) de la que HKDF deriva tres claves: AES-256-GCM del secreto (con el id del admin como dato asociado), HMAC de IP y HMAC de los 8 códigos de rescate (10 caracteres sin 0/O/1/I/L, un solo uso). Contraseña correcta con 2FA activa → solo la cookie `admin-2fa` (JWT `typ: "admin-2fa"`, 5 min, `httpOnly`, `strict`, ruta `/api/auth/login`), que `verificarAdmin` rechaza como sesión; `POST /api/auth/login/2fa` la cambia por `admin-token`. Un paso ya aceptado no vale otra vez (`totp.ultimoPaso`, escritura condicional), y gastar un código de rescate es un `$pull` condicional. Límites propios `login-2fa:user` y `seguridad:user` (5 en 15 min, bloqueo 15 min). Respuestas del login con la misma forma más el campo opcional `requiere2fa` (N1-6). Respuestas del dueño (2026-11-21): **obligatoria para superadmin** —`requireAdmin` responde 403 `2FA_REQUERIDA` salvo en `/api/auth/check` y `/api/admin/seguridad/**`, y el panel solo deja abrir Seguridad—, opcional para gestor y ventas; código en cada inicio de sesión (sin recordar el dispositivo); aviso por correo cuando se entra desde una IP no registrada (al propio admin y, si es gestor o ventas, también a los superadmin), sin `await`; salida de emergencia `scripts/admin/desactivar-2fa.mjs`. Activar o desactivar sube `tokenVersion` y se le da cookie nueva a la sesión que lo hizo. Desactivar no borra campos (N1-3): deja `totp: { activo: false }`. **Sin migración**: campo ausente = 2FA desactivada (como `tokenVersion`). QR dibujado en el navegador con `uqr@0.1.3` (sin dependencias propias) a partir del enlace `otpauth://`, como SVG de React (sin `innerHTML`). Si falta `TOTP_ENC_KEY` el login de cuentas sin 2FA funciona (se omite el aviso de IP), pero no se puede activar y el superadmin queda limitado a Seguridad: falla cerrado.

## Carga y fluidez (fase 27)

**D-91 · Esqueletos de carga, 404 y error con la marca, inicio en el servidor y fuera postimg (fase 27).** **Esqueletos:** `loading.tsx` en la tienda (inicio), categoría, producto, Mis pedidos y detalle del pedido, dibujados con `Components/Esqueletos/` (bloques grises que laten, `role="status"` con «Cargando…» para lectores de pantalla, sin pedir datos). El de `(tienda)` también cubre por herencia las páginas sin esqueleto propio (búsqueda, promoción…): `EsqueletoTienda` muestra la forma del inicio solo en `/` y una genérica (título y cuadrícula) en el resto. Mis pedidos es una página de cliente: su esqueleto se ve al navegar, y mientras llegan los pedidos sigue su ruedita de siempre. **Consecuencia aceptada por el dueño (2026-11-21):** con el esqueleto la página se envía en streaming, así que un producto, pedido o promoción inexistente responde **200** con la página de 404 y `<meta name="robots" content="noindex">` en vez del estado 404 (comportamiento estándar de Next.js; Google no la indexa). El smoke deja de exigir 404 en `/pedido/JK-000000-XXXX` y exige 200 + `noindex`; las rutas `/api/**` no cambian (N1-6). **404 y error:** `app/(tienda)/not-found.tsx` y `error.tsx` con logo, texto en español y botones a Inicio y WhatsApp (`SITE.whatsappPedidos`), dentro del layout de la tienda; `app/global-error.tsx` (si falla el layout raíz) lleva su propio `<html>`. Nunca se muestra el mensaje interno del error, solo su `digest`. Las URL de dos o más tramos que no existen (`/a/b`) siguen con el 404 por defecto de Next (no hay `app/not-found.tsx`), y una categoría inexistente sigue mostrando «Categoría no encontrada» con 200, como antes. **Inicio:** la página carga en el servidor `listarProductosPublicosFiltrados({ tipo: "home" })` y `listarBannersActivos()` y aplica la MISMA regla que antes aplicaba `HomeProducts` en el navegador (novedades vigentes, las más recientes primero, máx. 8; luego los marcados por `ordenHome` sin repetir; banners de ubicación `""`, el primero activo por posición). `HomeProducts` deja de ser de cliente y solo dibuja, con el mismo marcado. Se genera en cada visita (`force-dynamic`, sin caché, como la categoría: D-87). Comprobado contra la base de desarrollo con el DOM final (Chrome sin interfaz): 67 productos en el mismo orden y los 3 banners. Antes el HTML llegaba sin productos; ya no se usa la caché de 5 min del navegador (`fetchWithCache`) en el inicio, así que un cambio del panel se ve al recargar. **postimg.cc:** las 4 imágenes fijas (3 del carrusel del encabezado y la de beneficios) se subieron con permiso del dueño a Cloudinary (`estaticas/`, mismos bytes, comprobado por hash) y se cambiaron sus URL; no queda ninguna imagen en postimg en el código, la base de desarrollo ni la copia de jankuDB del 2026-11-22, así que `i.postimg.cc` y `postimg.cc` salen de `images.remotePatterns` y de `img-src` de la CSP (se estrecha, N1-4). Sin dependencias nuevas.

## Imágenes y accesibilidad (fase 27b)

**D-92 · Imágenes de Cloudinary a su ancho de pantalla, sin activar la optimización de Next (fase 27b).** `lib/imagenCloudinary.ts` (pura, con pruebas) pone `w_<ancho>` en las URL `https://res.cloudinary.com/<nube>/image/upload/...` y, si faltan, `f_auto`, `q_auto` y `c_limit` (este último para que Cloudinary nunca agrande una imagen más pequeña que el ancho pedido); si la URL ya trae un tramo de transformaciones lo completa (un `w_` previo se cambia), si no añade uno antes de la versión. Cualquier otra URL vuelve igual. `srcSetCloudinary()` arma el `srcSet` con varios anchos. **Por qué no un `loader` de `next/image`:** con `images.unoptimized: true` en `next.config.ts`, Next 16.2 fuerza `unoptimized` en toda imagen aunque la prop diga `false`, y entonces descarta el `srcSet`. Quitar ese `unoptimized` global encendería el optimizador de Next (servidor de Render) para todas las `next/image`, incluidas las de `ProductCard`. Por eso, con el visto bueno del dueño (2026-11-22), el popup y los banners del inicio pasan de `next/image` a `<img>` con `srcSet`/`sizes`, con el mismo estilo que generaba `next/image` (`fill` = posición absoluta al 100 %; `color: transparent`) y la misma precarga (`preload` de `react-dom`); llevan `eslint-disable` de `no-img-element` con referencia a esta decisión. El carrusel de la cabecera y la imagen de beneficios, que ya eran `<img>`, solo ganan `srcSet`/`sizes`. El `sizes` de los banners del inicio se corrige al real (dos por fila también en el celular: `50vw` hasta 1000 px). **Popup:** su imagen se precarga (`preload`, prioridad alta) en cuanto `/api/popup` dice que se mostrará, durante la pausa de 800 ms que ya existía; el popup sale a la misma hora pero completo. No se tocan `ProductCard` (ya pide `w_400`/`w_200`, CLAUDE.md §7) ni el panel. Cada ancho crea en Cloudinary una versión derivada la primera vez que se pide (la primera visita a ese ancho tarda algo más). **Accesibilidad (misma fase):** `aria-label` en los botones y enlaces que solo tenían icono (lupa, menú ☰ con `aria-expanded`, flechas del carrusel de categorías, favoritos con su número, carrito y las cuatro redes del Navbar); la lupa gana 28 px de área táctil con `p-1 -m-1`, sin mover el diseño; etiquetas de stock Disponible `green-700`, Limitado `yellow-400` con texto `gray-900`, Agotado `red-600`, y "Delivery gratis" (texto e icono) `green-700`. Lighthouse 13.5.0, inicio, celular, medianas de 3, mismo equipo y base de desarrollo: rendimiento 66 → 82, LCP 5,6 → 4,9 s, TBT 500 → 70 ms, peso 1293 → 1093 KiB, accesibilidad 88 → 96. Sin dependencias nuevas ni cambios en la API, la base o la CSP.

## Captcha contra bots (fase 26c)

**D-93 · Cloudflare Turnstile en registro, checkout, recuperar contraseña y Libro de Reclamaciones (fase 26c).** La fase proponía el número D-90, que ya era la 2FA (26b). Se activa solo cuando existen las dos claves, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (se lee al construir, en el navegador y en el servidor: las dos partes ven el mismo valor) y `TURNSTILE_SECRET_KEY`; sin ellas no se carga ningún script, no se llama a Cloudflare y todo funciona como antes. **Navegador:** `Components/Turnstile.tsx` inserta `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` solo en esas cuatro páginas, modo Managed con `appearance: "interaction-only"` (no se ve nada salvo que Cloudflare pida un clic; mientras no se ve, su envoltorio es `display: contents` y no suma espacio en el formulario, N1-1), `language: "es"`. El formulario no envía hasta tener token («Estamos comprobando tu navegador…») y, como cada token vale una sola vez, pide otro tras cualquier envío fallido. **Servidor:** el campo opcional `turnstileToken` (N1-6) se saca del cuerpo con `separarTokenTurnstile()` (`lib/turnstile.ts`, pura, con pruebas) **antes** del esquema, así los esquemas estrictos y los tipos `OrderCreateInput`/`ComplaintCreateInput` no cambian; un valor que no sea texto de 1 a 2048 caracteres cuenta como ausente. `server/auth/turnstile.ts` llama a `siteverify` (POST, 3 s de timeout, `remoteip` solo si es una IP pública) y nunca registra el token ni la clave; `interpretarSiteverify()` decide: `success` → válido; `internal-error`, una clave secreta mal puesta (`invalid-input-secret`, `missing-input-secret`, con `log.error`), un 5xx sin códigos, una respuesta ilegible, timeout o error de red → «no disponible»; el resto (token falso, vencido o repetido, sin token) → inválido. Orden en cada ruta: límite por IP → esquema → Turnstile → base. **Respuestas del dueño (2026-11-22): Q1 y Q2 por defecto.** No va en el login (ya tiene bloqueo por intentos). Inválido → 400 `VERIFICACION_FALLIDA` en las cuatro rutas; no disponible → 503 `VERIFICACION_NO_DISPONIBLE` en registro, recuperación y reclamos, y **en el checkout se acepta** con el límite por IP de siempre, para no perder ventas. En recuperar contraseña el rechazo no revela si el correo existe: depende solo del navegador y llega después de los límites por IP y por correo. **CSP:** `https://challenges.cloudflare.com` se añade a `script-src`, `frame-src` y `connect-src`; no se relaja nada más (N1-4). Smoke: 3 comprobaciones nuevas (CSP; `turnstileToken` aceptado en recuperar contraseña sin gastar límites y en reclamos, que gasta 1 intento de 5/h). Sin dependencias nuevas, sin cambios en la base ni en las respuestas de éxito.

## Mapa de visitas (fase 23d)

**D-94 · Mapa de usuarios con selector Perú · Mundo y barras de países de alto fijo (fase 23d).** *Respuestas del dueño (2026-11-22): Q1–Q4 por defecto.* **Geometría:** Natural Earth 5.1.1 (dominio público): `ne_110m_admin_0_countries` con `ISO_A2_EH` y sin la Antártida (176 formas, proyección Robinson) y `ne_10m_admin_1_states_provinces` filtrado a Perú (26 formas, Mercator). Se simplifica al tamaño de dibujo y se calcula un punto interior de cada forma con `npx mapshaper@0.6.113` (sin instalarlo; versión de septiembre de 2025). `scripts/mapas/generar-mapas.mjs` se ejecuta a mano con la carpeta de los archivos descargados (fuera del repo), escribe `app/(admin)/admin/estadisticas/_mapas/{mundo,peru}.json` como `{ ancho, alto, huancayo, formas: [{ id, nombre, d, x, y }] }` (trazo SVG con coordenadas enteras relativas) y falla si el mundo pasa de 120 KB o Perú de 60 KB; dos ejecuciones dan el mismo archivo byte a byte. Natural Earth pone `PE-LIM` a las dos Limas: el script da `PE-LMA` a «Lima Province» (Lima Metropolitana) y llama «Lima Provincias» a la región. **Peso:** `mundo.json` 46 752 B (13 880 comprimido) y `peru.json` 21 996 B (6 077). Se piden con `import()` en fragmentos aparte que solo carga Estadísticas: Perú al abrir la pantalla y el mundo al pulsar «Mundo». El fragmento propio de Estadísticas pasa de 27 597 a 34 117 B (7 509 → 10 134 comprimido) y el JS total de la página de 155 177 a 161 697 B (45 160 → 47 785). En el build solo el manifiesto de `/admin/estadisticas` enlaza ese fragmento y solo él referencia la geometría: la tienda no carga nada nuevo (N1-1). **Nombres:** `lib/mapas.ts` (pura, con pruebas) quita tildes, mayúsculas y signos, busca primero el nombre completo en la tabla de alias y luego lo intenta sin palabras genéricas («Region», «Department», «Provincia», «Metropolitan»…) ni conectores sueltos al principio o al final, así «Madre de Dios» se conserva. Q4: «Lima» es Lima Metropolitana y «Lima Region», Lima Provincias. Lo que no se puede ubicar («(not set)», una región desconocida o un país que no está en el mapa de 110 m, como Singapur) sale bajo el mapa como «Sin ubicar en el mapa: …» con sus usuarios (R5). Una prueba exige que los `id` de `peru.json` sean exactamente los de la tabla. El tinte usa 5 escalones por cuantiles (la posición entre los lugares con visitas: el mayor siempre lleva el más fuerte) y el radio del marcador crece con la raíz de los usuarios. **Datos:** la consulta de países pasa de 10 a 100 filas (las barras muestran las 10 primeras y «y N países más»; si algún día hubiera más de 100 países, los que pasen no se contarían) y se añade `region` con filtro `countryId = PE` (50 filas) como quinta consulta del segundo `batchRunReports`, dentro de la caché de 10 min. `AnalyticsResumen` gana `regiones?` opcional; ruta, método, guard y el resto de campos no cambian (N1-6). **Pantalla:** primera fila en pantallas grandes `1.5fr 1.1fr 0.9fr` (el mapa pasa de 1fr a 1.1fr; la izquierda se queda casi igual porque los indicadores ya iban justos). La tarjeta «Mapa de usuarios» dibuja en SVG sin librerías la tierra con puntitos (patrón), el tinte con `--accent`, marcadores con anillo claro y centro oscuro, curvas punteadas finas desde Huancayo y un aviso «Junín · 820 usuarios» al pasar el ratón o tocar, con el contorno de la forma activa; lleva `role="img"` y `aria-label`. Debajo, las 5 primeras ciudades (Ciudad · Usuarios · Vistas · %): la tarjeta «Usuarios por ciudad» desaparece. Las barras de países ponen su contenido en posición absoluta, así que nunca estiran la tarjeta: en pantallas grandes miden el alto de la fila (que marca el mapa) y, apiladas, 380 px; las filas se reparten ese alto con 1 o con 10 países, y con más de 3 marcas en el eje se rotula una sí y otra no porque las cifras se pisaban. Comprobado a ojo con el componente real y datos de prueba en Chrome sin interfaz: tema claro y oscuro, 390 px, 1280 y 1440 px con la barra lateral, y 1, 3 y 13 países con la tarjeta del mismo alto. **Visto y no tocado (fuera de la fase):** en columnas estrechas la etiqueta «↑ 20.0 %» de `TarjetaIndicador` se parte en dos líneas (ya pasaba antes) y Windows muestra las banderas como letras. Sin dependencias nuevas ni cambios en la tienda, la base, la CSP o el smoke.
