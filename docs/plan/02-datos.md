# 02 · Datos

Modelos de MongoDB nuevos y modificados, campo por campo, índices y scripts de migración.

**Regla general (N1-3):** todo cambio es aditivo. No se borra ni renombra ninguna colección, campo o índice. Todo campo nuevo en un modelo existente tiene valor por defecto o es opcional, y el código tolera que falte en documentos antiguos.

---

## 1. Resumen

| Colección | Modelo | Estado | Fase |
|---|---|---|---|
| `products` | `Product` | Modificado (campos declarados, índice corregido) | 06, 13 |
| `adminusers` | `AdminUser` | Modificado (`rol`, `tokenVersion`) | 08, 09 |
| `users` | `User` | Modificado (`telefono`, `tokenVersion`) | 08 |
| `ratelimits` | `RateLimit` | **Nuevo** | 07 |
| `stockmovements` | `StockMovement` | **Nuevo** | 13 |
| `orders` | `Order` | **Nuevo** | 15 |
| `coupons` | `Coupon` | **Nuevo** | 18 |
| `couponredemptions` | `CouponRedemption` | **Nuevo** | 18 |
| `complaints` | `Complaint` | **Nuevo** | 22b |
| `counters` | `Counter` | **Nuevo** | 22b |
| `categories`, `banners`, `promotions`, `discounttiers` | — | Sin cambios de esquema | — |
| `loginblocks`, `userloginblocks` | — | Dejan de usarse; **se conservan** | 07 |

---

## 2. Modelos modificados

### 2.1 `Product` (`models/Product.ts`)

Campos que ya existen en los documentos pero no en el esquema (hoy entran por `strict: false`); se **declaran**:

| Campo | Tipo | Por defecto | Notas |
|---|---|---|---|
| `imagenes` | `[String]` | `[]` | `public_id` de Cloudinary, en orden |
| `imagenPrincipal` | `String` | `""` | `public_id` de la portada |
| `tags` | `[String]` | `[]` | |

Otros cambios en el archivo:

| Cambio | Antes | Después | Fase |
|---|---|---|---|
| Registro del modelo | `delete mongoose.models.Product; export default mongoose.model(...)` | `export default (models.Product as Model<IProduct>) \|\| model<IProduct>("Product", ProductSchema)` | 06 |
| Índice compuesto | `{ categoriaSlug: 1, stock: 1, precio: 1 }` | `{ categoriaSlugs: 1, stock: 1, precio: 1 }` | 06 |
| Índice nuevo | — | `{ activo: 1, mostrarEnHome: 1 }` | 06 |
| Cálculo de `stock` en el hook | lógica en línea | llama a `estadoDeStock()` de `lib/stock.ts` (misma regla) | 06 |
| `strict: false` | — | **se mantiene** (D-05) | — |

El índice antiguo `categoriaSlug_1_stock_1_precio_1` queda en Atlas sin uso. No se borra por script; si el dueño quiere, lo elimina a mano desde Atlas.

Regla de `stock` (única, `lib/stock.ts`):
```
cantidad <= 0        → "Agotado"
cantidad <= minimo   → "Limitado"
en otro caso         → "Disponible"
```

### 2.2 `AdminUser` (`models/AdminUser.ts`)

| Campo nuevo | Tipo | Por defecto | Notas |
|---|---|---|---|
| `rol` | `String`, enum `["superadmin","gestor","ventas"]` | `"gestor"` | Los existentes pasan a `superadmin` con la migración 001 |
| `tokenVersion` | `Number` | `0` | Se incrementa para cerrar todas las sesiones de ese admin |

Se añade la interfaz `IAdminUser` y el modelo queda tipado (`model<IAdminUser>`).

### 2.3 `User` (`models/User.ts`)

| Campo nuevo | Tipo | Por defecto | Notas |
|---|---|---|---|
| `telefono` | `String` | `""` | Normalizado `51` + 9 dígitos. Se rellena solo cuando el cliente compra con sesión o lo edita en su perfil |
| `tokenVersion` | `Number` | `0` | |

Se corrige el **comentario** del índice TTL (borra la cuenta no verificada, no "los tokens"). El índice no cambia.

---

## 3. Modelos nuevos

### 3.1 `RateLimit` (`models/RateLimit.ts`) — fase 07

| Campo | Tipo | Req. | Por defecto | Notas |
|---|---|:-:|---|---|
| `key` | `String` | ✔ | — | Único. Formato `<politica>:<tipo>:<valor>`, ej. `login-admin:ip:190.1.2.3` |
| `count` | `Number` | ✔ | `0` | Intentos en la ventana actual |
| `windowStart` | `Date` | ✔ | — | Inicio de la ventana |
| `blockedUntil` | `Date` | | `null` | Fin del bloqueo, si lo hay |
| `expiresAt` | `Date` | ✔ | — | `max(windowStart + ventana, blockedUntil)` |

Índices: `{ key: 1 }` único · `{ expiresAt: 1 }` con `expireAfterSeconds: 0` (TTL real, campo `Date`).
Sin `timestamps`.

### 3.2 `StockMovement` (`models/StockMovement.ts`) — fase 13

| Campo | Tipo | Req. | Notas |
|---|---|:-:|---|
| `productId` | `ObjectId` ref `Product` | ✔ | |
| `tipo` | `String` enum `["entrada","salida","ajuste","pedido","devolucion"]` | ✔ | `entrada`/`salida`/`ajuste` = manuales; `pedido` = descuento por confirmar; `devolucion` = reposición por cancelar |
| `cantidad` | `Number` | ✔ | Con signo: positivo suma, negativo resta. Nunca 0 |
| `stockAntes` | `Number` | ✔ | |
| `stockDespues` | `Number` | ✔ | `stockAntes + cantidad`, nunca negativo |
| `motivo` | `String` | | Máx. 200. Obligatorio para `ajuste` |
| `orderId` | `ObjectId` ref `Order` | | Solo en `pedido` y `devolucion` |
| `adminId` | `ObjectId` ref `AdminUser` | | Quién lo hizo. Vacío si fue el sistema |
| `createdAt` | `Date` | ✔ | `timestamps: { createdAt: true, updatedAt: false }` |

Índices: `{ productId: 1, createdAt: -1 }` · `{ orderId: 1 }`.
Es un libro de registro: **nunca se edita ni se borra** un movimiento.

### 3.3 `Order` (`models/Order.ts`) — fase 15

| Campo | Tipo | Req. | Por defecto | Notas |
|---|---|:-:|---|---|
| `codigo` | `String` | ✔ | — | Único. `JK-AAMMDD-XXXX` |
| `tokenAccesoHash` | `String` | ✔ | — | SHA-256 hex del token de la URL. `select: false` |
| `userId` | `ObjectId` ref `User` | | `null` | Solo si compró con sesión |
| **`cliente`** | subdocumento | ✔ | | |
| `cliente.nombre` | `String` | ✔ | — | 2–100, trim |
| `cliente.telefono` | `String` | ✔ | — | `51` + 9 dígitos |
| `cliente.email` | `String` | | `""` | minúsculas, máx. 200 |
| **`entrega`** | subdocumento | ✔ | | |
| `entrega.metodo` | `String` enum `["delivery_huancayo","recojo","envio_provincia"]` | ✔ | — | |
| `entrega.direccion` | `String` | | `""` | Máx. 200. Obligatoria salvo `recojo` |
| `entrega.referencia` | `String` | | `""` | Máx. 200 |
| `entrega.ciudad` | `String` | | `""` | Máx. 100. Obligatoria en `envio_provincia` |
| `entrega.departamento` | `String` | | `""` | Máx. 100. Obligatorio en `envio_provincia` |
| **`items`** | arreglo de subdocumentos (sin `_id` propio) | ✔ | | 1 a 50 |
| `items[].tipo` | `String` enum `["producto","promocion"]` | ✔ | — | |
| `items[].refId` | `ObjectId` | ✔ | — | `_id` del producto o promoción |
| `items[].nombre` | `String` | ✔ | — | Copia al momento de comprar |
| `items[].codigo` | `String` | | `""` | SKU del producto, si tiene |
| `items[].imagenUrl` | `String` | | `""` | |
| `items[].precioUnitario` | `Number` | ✔ | — | Copia del precio |
| `items[].cantidad` | `Number` | ✔ | — | Entero 1–99 |
| `items[].subtotal` | `Number` | ✔ | — | `redondear2(precioUnitario × cantidad)` |
| `items[].precioCosto` | `Number` | | `0` | Copia del costo; **nunca** sale en respuestas públicas |
| `subtotal` | `Number` | ✔ | — | Suma de subtotales |
| `descuentoNivel` | `{ nivelId: ObjectId, nombre: String, monto: Number }` | | `null` | Descuento por monto aplicado |
| `cupon` | `{ couponId: ObjectId, codigo: String, monto: Number }` | | `null` | Cupón aplicado |
| `descuentoTotal` | `Number` | ✔ | `0` | |
| `costoEnvio` | `Number` | ✔ | `0` | |
| `envioPorCoordinar` | `Boolean` | ✔ | `false` | `true` en `envio_provincia` |
| `total` | `Number` | ✔ | — | `max(0, subtotal − descuentoTotal) + costoEnvio` |
| `estado` | `String` enum `["pendiente","confirmado","enviado","entregado","cancelado"]` | ✔ | `"pendiente"` | |
| **`pago`** | subdocumento | ✔ | | |
| `pago.estado` | `String` enum `["pendiente","pagado","reembolsado"]` | ✔ | `"pendiente"` | |
| `pago.metodo` | `String` enum `["","yape","plin","transferencia","efectivo","otro"]` | | `""` | Lo marca el admin |
| `pago.referencia` | `String` | | `""` | Nº de operación. Máx. 100 |
| `pago.fecha` | `Date` | | `null` | |
| `stockDescontado` | `Boolean` | ✔ | `false` | `true` tras confirmar; evita descontar o reponer dos veces |
| `notasCliente` | `String` | | `""` | Máx. 500 |
| `notasInternas` | `String` | | `""` | Máx. 2000. Solo admin |
| `historial` | `[{ estado: String, fecha: Date, adminId: ObjectId, nota: String }]` | ✔ | | Una entrada por cambio de estado; la primera es `pendiente` |
| `origen` | `{ ip: String, userAgent: String }` | | | Para detectar abuso. Solo admin. `userAgent` cortado a 200 |
| `createdAt`, `updatedAt` | `Date` | ✔ | | `timestamps: true` |

Índices: `{ codigo: 1 }` único · `{ estado: 1, createdAt: -1 }` · `{ userId: 1, createdAt: -1 }` · `{ "cliente.telefono": 1, createdAt: -1 }`.

Proyección pública (`OrderPublic`): todo **excepto** `tokenAccesoHash`, `items[].precioCosto`, `notasInternas`, `origen`, `historial[].adminId`, `userId`.

### 3.4 `Coupon` (`models/Coupon.ts`) — fase 18

| Campo | Tipo | Req. | Por defecto | Notas |
|---|---|:-:|---|---|
| `codigo` | `String` | ✔ | — | Único, mayúsculas, trim, `/^[A-Z0-9-]{4,20}$/` |
| `descripcion` | `String` | | `""` | Interna. Máx. 200 |
| `tipo` | `String` enum `["porcentaje","monto_fijo"]` | ✔ | — | |
| `valor` | `Number` | ✔ | — | `> 0`. Si `porcentaje`, `<= 100` |
| `topeDescuento` | `Number` | | `null` | Solo `porcentaje`: máximo en soles |
| `montoMinimo` | `Number` | ✔ | `0` | Subtotal mínimo del pedido |
| `fechaInicio` | `Date` | | `null` | `null` = desde ya |
| `fechaFin` | `Date` | | `null` | `null` = sin vencimiento |
| `usosMaximos` | `Number` | | `null` | `null` = ilimitado |
| `usosPorCliente` | `Number` | ✔ | `1` | Mínimo 1 |
| `usosActuales` | `Number` | ✔ | `0` | Solo lo modifica `coupon.service` con `$inc` |
| `acumulable` | `Boolean` | ✔ | `false` | Si se suma al descuento por monto (D-39) |
| `activo` | `Boolean` | ✔ | `true` | |
| `creadoPor` | `ObjectId` ref `AdminUser` | | | |
| `createdAt`, `updatedAt` | `Date` | ✔ | | |

Índices: `{ codigo: 1 }` único.
Los cupones **no se borran**: se desactivan (los pedidos los referencian).

### 3.5 `CouponRedemption` (`models/CouponRedemption.ts`) — fase 18

| Campo | Tipo | Req. | Notas |
|---|---|:-:|---|
| `couponId` | `ObjectId` ref `Coupon` | ✔ | |
| `orderId` | `ObjectId` ref `Order` | ✔ | Único: un pedido, un canje |
| `clienteKey` | `String` | ✔ | `user:<userId>` o `tel:<telefono>` (D-42) |
| `monto` | `Number` | ✔ | Descuento otorgado |
| `estado` | `String` enum `["aplicado","liberado"]` | ✔ | `liberado` cuando el pedido se cancela |
| `createdAt`, `updatedAt` | `Date` | ✔ | |

Índices: `{ orderId: 1 }` único · `{ couponId: 1, clienteKey: 1, estado: 1 }`.

### 3.6 `Complaint` (`models/Complaint.ts`) — fase 22b

Hoja del Libro de Reclamaciones (D-79, D-80). Con `timestamps`. **Nunca se borra** (el modelo lo impide con un `pre` en las operaciones de borrado y reemplazo) y la respuesta, una vez puesta, no cambia. Se conservan al menos 2 años.

| Campo | Tipo | Req. | Notas |
|---|---|:-:|---|
| `codigo` | `String` único | ✔ | `LR-AAAA-NNNNNN`; año en hora de Lima, correlativo de `counters` |
| `proveedor` | `{ nombreComercial, titular, ruc, domicilio, correo }` | ✔ | Copia de `LEGAL` al crear |
| `consumidor` | `{ nombre, tipoDocumento: "DNI"|"CE"|"PASAPORTE", numeroDocumento, domicilio, telefono, email }` | ✔ | `telefono` normalizado con `lib/phone` (`51…`) |
| `representante` | `{ nombre, tipoDocumento, numeroDocumento }` | | Padre, madre o apoderado si el consumidor es menor |
| `bien` | `{ tipo: "producto"|"servicio", descripcion, montoReclamado? }` | ✔ | `montoReclamado` en soles con `redondear2` |
| `pedidoCodigo` | `String` | | Texto tal como lo escribió el consumidor; no se comprueba |
| `tipo` | `String` enum `["reclamo","queja"]` | ✔ | |
| `detalle` | `String` (20–3000) | ✔ | |
| `pedidoConsumidor` | `String` (5–1000) | ✔ | |
| `fechaLimite` | `Date` | ✔ | +15 días hábiles (D-81), final del día en Lima |
| `estado` | `String` enum `["pendiente","respondido"]` | ✔ | |
| `respuesta` | `{ texto, fecha, adminId, adminNombre }` | | Inmutable una vez puesta |
| `copiaEnviada` · `respuestaEnviada` | `Boolean` | ✔ | `false` hasta que Resend confirma el envío |
| `ip` | `String` | | Solo para abuso; se ve solo en el panel |
| `createdAt`, `updatedAt` | `Date` | ✔ | |

Índices (migración 004): `{ codigo: 1 }` único · `{ estado: 1, fechaLimite: 1 }` · `{ createdAt: -1 }`.

### 3.7 `Counter` (`models/Counter.ts`) — fase 22b

| Campo | Tipo | Req. | Notas |
|---|---|:-:|---|
| `_id` | `String` | ✔ | Nombre del contador: `reclamos-AAAA` |
| `seq` | `Number` | ✔ | Último número usado; solo `$inc` atómico con `upsert` |

Sin índices propios (solo `_id`). No se reinicia ni se borra.

---

## 4. Scripts de migración

### 4.1 Ejecutor común: `scripts/migrations/_runner.mjs` (fase 09)

Todos los scripts lo usan. Comportamiento obligatorio:

1. Carga `.env.local` con `dotenv` (ya instalada).
2. **Simula por defecto.** Solo escribe si se pasa `--apply`.
3. Al arrancar imprime: nombre de la migración, **host y nombre de la base** (extraídos de la URI; nunca usuario ni contraseña), y el modo (`SIMULACIÓN` / `APLICAR`).
4. Con `--apply` pide escribir el nombre de la base para continuar (confirmación interactiva). Se puede omitir con `--yes` solo si además se pasa `--db-name <nombre>` y coincide.
5. Antes de escribir, guarda copia de los documentos afectados en `backups/<fecha>-<migracion>.json` (carpeta en `.gitignore`).
6. Imprime: cuántos documentos revisó, cuántos cambiaría/cambió, y hasta 5 ejemplos (solo `_id` y los campos que cambian).
7. Es **idempotente**: una segunda ejecución no cambia nada.
8. Sale con código 0 si todo fue bien, 1 si hubo error. Cierra la conexión siempre.

Contrato:
```js
// scripts/migrations/_runner.mjs
export async function ejecutarMigracion({
  nombre,            // "001-admin-roles"
  descripcion,       // texto corto
  coleccion,         // "adminusers"
  filtro,            // filtro Mongo de los documentos a cambiar
  cambio,            // (doc) => objeto para $set, o null para saltar
})
```
Uso: `node scripts/migrations/001-admin-roles.mjs` (simula) · `node scripts/migrations/001-admin-roles.mjs --apply` (escribe; **solo el dueño**).

Los scripts usan el driver nativo a través de `mongoose.connection.db.collection(...)`, sin importar los modelos TypeScript.

### 4.2 Migraciones

| Nº | Archivo | Fase | Colección | Filtro | Cambio | Riesgo |
|---|---|---|---|---|---|---|
| 001 | `001-admin-roles.mjs` | 09 | `adminusers` | `{ rol: { $exists: false } }` | `$set: { rol: "superadmin", tokenVersion: 0 }` | Bajo. Sin ella el código ya trata "sin rol" como `superadmin` |
| 002 | `002-product-defaults.mjs` | 13 | `products` | documentos a los que les falte `activo`, `stockCantidad`, `stockMinimo`, `imagenes` o `tags` | `$set` **solo de los campos que falten**: `activo: true`, `stockMinimo: 5`, `imagenes: []`, `tags: []`. Para `stockCantidad` ausente usa la tabla de abajo. **No recalcula `stock`** | Medio. Revisar la simulación: debería afectar a muy pocos o ningún producto (ya se corrió `migrate-inventory.js`) |
| 003 | `003-indices.mjs` | 15 | `orders`, `stockmovements`, `ratelimits`, `products` | — | `createIndex` de los índices nuevos listados en este documento. **Nunca** `dropIndex` ni `syncIndexes` | Bajo |
| 004 | `004-reclamos-indices.mjs` | 22b | `complaints` | — | `createIndex` de los 3 índices de §3.6. Simula por defecto; idempotente; sin copia en `backups/` porque no toca documentos | Bajo. Se aplica en `janku-dev` y luego en producción **antes** de desplegar |

Tabla para `stockCantidad` ausente en la 002 (la misma que usó `scripts/legacy/migrate-inventory.js`): `stock "Disponible"` → 20 · `"Limitado"` → 3 · `"Agotado"` → 0 · sin valor → 10.

No hacen falta migraciones para:
- `tokenVersion` en `users` / `adminusers`: el código lee "ausente" como 0.
- `telefono` en `users`: ausente = `""`.
- Colecciones nuevas: se crean solas al primer insert. La 003 solo adelanta la creación de índices para no depender de `autoIndex` en producción.
- Cupones: `coupons` y `couponredemptions` crean sus índices con `autoIndex` (colecciones vacías, creación instantánea). El ejecutor de la fase 18 añade sus dos índices únicos a `003-indices.mjs` como paso de esa fase.

### 4.3 Orden de aplicación en producción

Cada migración se aplica **antes** de desplegar el código de su fase, en este orden: simular → revisar la salida → `--apply` → verificar con una segunda simulación (debe decir "0 cambios") → desplegar.

### 4.4 Reversa

Las migraciones solo añaden campos o índices. Revertir el código basta: los campos extra son ignorados por el código anterior. Si aun así hay que restaurar, la copia en `backups/` contiene los documentos originales.
