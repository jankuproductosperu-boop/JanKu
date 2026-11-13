# Fase 18 · Cupones (backend)

> ⚠️ **ALTO RIESGO — cupones y dinero.** Un error regala descuentos o permite usar un cupón más veces de las debidas. Revisión del dueño obligatoria.

## 1. Objetivo y por qué va en este orden

Crear los cupones de descuento: modelo, reglas de validez (puras y con pruebas), consumo atómico al crear el pedido, liberación al cancelarlo, validación previa para el checkout y administración por API. Aplica D-38 a D-44.

Va después de pedidos (fases 15 y 17) porque un cupón solo existe dentro de un pedido. **Sin interfaz** (fase 19): tras esta fase el cliente no ve nada nuevo.

## 2. Prerrequisitos

- Fase 17 fusionada.
- **Respuestas a P10** (acumulación con el descuento por monto) y **P11** (¿se exige cuenta para usar cupones?). Por defecto: D-39 y D-42.
- Base de desarrollo con transacciones.
- Rama: `fase-18-cupones-backend`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `models/Coupon.ts`, `models/CouponRedemption.ts` | Modelos (`02-datos.md` §3.4, §3.5) |
| Modificar | `types/coupon.ts` | Añadir `Coupon`, `CouponInput`, `CouponMotivo`, `CouponValidateResult` |
| Crear | `lib/coupon.ts` + `lib/__tests__/coupon.test.ts` | `normalizarCodigo`, `evaluarCupon` |
| Crear | `server/validation/coupon.schema.ts` | `cuponCrearSchema`, `cuponActualizarSchema`, `cuponValidarSchema` |
| Crear | `server/services/coupon.service.ts` | Ver contrato |
| Modificar | `server/services/order.service.ts` | `crearPedido` acepta cupón y pasa a ser transaccional; `cancelarPedido` libera el cupón; se exporta `resolverItems` |
| Modificar | `server/validation/order.schema.ts` | `pedidoCrearSchema` gana `cupon: z.string().trim().max(30).optional()` |
| Modificar | `types/order.ts` | `OrderCreateInput` gana `cupon?: string`; `OrderCreateResult` gana `cuponAplicado: boolean` |
| Crear | `app/api/coupons/validate/route.ts` | `POST` público |
| Crear | `app/api/admin/coupons/route.ts`, `app/api/admin/coupons/[id]/route.ts` | `GET`, `POST`, `PATCH` |
| Modificar | `scripts/migrations/003-indices.mjs` | Añadir los índices de `coupons` y `couponredemptions` |
| Modificar | `scripts/smoke.mjs` | `POST /api/coupons/validate` con `{}` → 400; `GET /api/admin/coupons` sin cookie → 401 |

## 4. Pasos de implementación

1. `lib/coupon.ts` y pruebas (**primero las pruebas**).
2. Modelos y tipos.
3. Esquemas.
4. `coupon.service.ts`.
5. `order.service.ts`:
   a. Extraer de `crearPedido` los pasos 1–5 (unir, resolver, disponibilidad, construir ítems) a `export async function resolverItems(items): Promise<{ items: ItemPedido[]; lineas: Linea[] }>`. Sin cambios de comportamiento.
   b. `crearPedido` con cupón: algoritmo de la sección 5.
   c. `cancelarPedido`: dentro de su transacción, si `pedido.cupon` → `liberarCupon({ orderId, session })`.
6. Rutas.
7. Índices en `003-indices.mjs` (el ejecutor solo simula).
8. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// lib/coupon.ts
export function normalizarCodigo(entrada: string): string;   // trim + mayúsculas + quitar espacios internos
export type CouponMotivo = "no_valido" | "no_alcanza_minimo" | "ya_usado";
export type CuponEvaluable = {
  activo: boolean; fechaInicio?: string | Date | null; fechaFin?: string | Date | null;
  usosMaximos?: number | null; usosActuales: number; usosPorCliente: number; montoMinimo: number;
};
export function evaluarCupon(c: CuponEvaluable, ctx: { subtotal: number; ahora: Date; usosDelCliente: number }):
  { valido: true } | { valido: false; motivo: CouponMotivo };
```
Orden de evaluación (el primero que falle decide):
1. `!activo` → `no_valido`
2. `fechaInicio` en el futuro → `no_valido`
3. `fechaFin` en el pasado → `no_valido`
4. `usosMaximos != null && usosActuales >= usosMaximos` → `no_valido`
5. `usosDelCliente >= usosPorCliente` → `ya_usado`
6. `subtotal < montoMinimo` → `no_alcanza_minimo`

Un código inexistente también es `no_valido`: **desde fuera no se distingue** inexistente, inactivo, vencido o agotado (D-43).

Mensajes para el cliente (únicos, en `lib/coupon.ts` como `MENSAJES_CUPON`):

| Motivo | Mensaje |
|---|---|
| `no_valido` | "Este cupón no es válido." |
| `ya_usado` | "Ya usaste este cupón." |
| `no_alcanza_minimo` | "Tu compra aún no alcanza el mínimo para este cupón." |

```ts
// server/validation/coupon.schema.ts   (.strict())
const codigo = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,20}$/, "4 a 20 caracteres: letras, números o guion");
const fecha = z.union([z.null(), z.coerce.date()]);
export const cuponCrearSchema = z.object({
  codigo,
  descripcion: z.string().trim().max(200).optional(),
  tipo: z.enum(["porcentaje", "monto_fijo"]),
  valor: z.coerce.number().positive().max(999999),
  topeDescuento: z.union([z.null(), z.coerce.number().positive().max(999999)]).optional(),
  montoMinimo: z.coerce.number().min(0).max(999999).default(0),
  fechaInicio: fecha.optional(),
  fechaFin: fecha.optional(),
  usosMaximos: z.union([z.null(), z.coerce.number().int().min(1).max(1000000)]).optional(),
  usosPorCliente: z.coerce.number().int().min(1).max(1000).default(1),
  acumulable: z.boolean().default(false),
  activo: z.boolean().default(true),
}).strict()
  .refine((d) => d.tipo !== "porcentaje" || d.valor <= 100, { path: ["valor"], message: "El porcentaje no puede superar 100" })
  .refine((d) => d.tipo === "porcentaje" || d.topeDescuento == null, { path: ["topeDescuento"], message: "El tope solo aplica a porcentaje" })
  .refine((d) => !d.fechaInicio || !d.fechaFin || d.fechaInicio < d.fechaFin, { path: ["fechaFin"], message: "Debe ser posterior al inicio" });
export const cuponActualizarSchema = /* mismos campos, todos opcionales, SIN `codigo` */;
export const cuponValidarSchema = z.object({
  codigo: z.string().trim().min(1).max(30),
  items: z.array(z.object({ id: objectId, cantidad: z.coerce.number().int().min(1).max(99) }).strict()).min(1).max(50),
  telefono: z.string().trim().max(20).optional(),
}).strict();
```

```ts
// server/services/coupon.service.ts
export function claveCliente(a: { userId?: string; telefono?: string }): string | null;   // "user:<id>" | "tel:<51…>" | null
export async function validarCupon(a: { codigo: string; lineas: Linea[]; clienteKey: string | null }): Promise<CouponValidateResult>;   // SOLO LECTURA
export async function consumirCupon(a: { couponId: string; orderId: string; clienteKey: string; monto: number; session: ClientSession }): Promise<void>;
export async function liberarCupon(a: { orderId: string; session: ClientSession }): Promise<void>;
export async function listarCupones(): Promise<Coupon[]>;                        // createdAt desc
export async function crearCupon(datos: CouponInput, actor: { adminId: string }): Promise<Coupon>;
export async function actualizarCupon(id: string, datos: Partial<CouponInput>): Promise<Coupon>;

// types/coupon.ts
export type CouponValidateResult =
  | { valido: true; codigo: string; aplicado: "cupon" | "ambos" | "nivel"; descuentoCupon: number; descuentoNivel: number; descuentoTotal: number; total: number; mensaje: string }
  | { valido: false; motivo: CouponMotivo; mensaje: string };
```
- `validarCupon`: busca por código normalizado; cuenta canjes `aplicado` del cliente (0 si `clienteKey` es `null`); `evaluarCupon`; `calcularTotales({ lineas, niveles, cupon })`. `mensaje` si `aplicado === "nivel"`: "Tu descuento por monto de compra es mayor que este cupón, así que aplicamos ese." En otro caso: "Cupón aplicado: ahorras S/ X".
- `consumirCupon` (dentro de la transacción recibida, **en este orden**):
  1. `Coupon.updateOne({ _id, activo: true, $or: [{ usosMaximos: null }, { $expr: { $lt: ["$usosActuales", "$usosMaximos"] } }] }, { $inc: { usosActuales: 1 } })` → si `modifiedCount !== 1` → `conflicto(MENSAJES_CUPON.no_valido, "CUPON_NO_VALIDO")`.
  2. `usos = CouponRedemption.countDocuments({ couponId, clienteKey, estado: "aplicado" })` → si `usos >= cupon.usosPorCliente` → `conflicto(MENSAJES_CUPON.ya_usado, "CUPON_YA_USADO")` (la transacción revierte el paso 1).
  3. `CouponRedemption.create([{ couponId, orderId, clienteKey, monto, estado: "aplicado" }], { session })`.
  El paso 1 va primero a propósito: escribe en el documento del cupón, lo que obliga a dos pedidos simultáneos con el mismo cupón a ejecutarse uno tras otro.
- `liberarCupon`: busca el canje `aplicado` de ese `orderId`; si no hay, no hace nada. Lo marca `liberado` y hace `Coupon.updateOne({ _id, usosActuales: { $gt: 0 } }, { $inc: { usosActuales: -1 } })`.
- `actualizarCupon`: `codigo` no es editable. `tipo` y `valor` solo si `usosActuales === 0`; si no → `conflicto("No se puede cambiar el tipo o valor de un cupón ya usado. Desactívalo y crea otro.", "CUPON_EN_USO")`.

**`crearPedido` con cupón** (reemplaza los pasos 6–9 de la fase 15):
1. `{ items, lineas } = await resolverItems(datos.items)`; `niveles = await listarNivelesActivos()`.
2. Sin `datos.cupon` → igual que en la fase 15, `cuponAplicado: false`.
3. Con `datos.cupon`:
   - `clienteKey = claveCliente({ userId: ctx.userId, telefono })` (siempre existe: el teléfono es obligatorio).
   - `r = await validarCupon({ codigo, lineas, clienteKey })`.
   - `!r.valido` → `conflicto(r.mensaje, "CUPON_" + r.motivo.toUpperCase())`. **El pedido no se crea**: el cliente decide si sigue sin cupón.
   - `r.aplicado === "nivel"` → el pedido se crea **sin** cupón (no se consume); `cuponAplicado: false`.
   - `"cupon"` o `"ambos"` → en **una transacción**: `Order.create` con `cupon: { couponId, codigo, monto: r.descuentoCupon }` y los totales de `r`; luego `consumirCupon(...)`. Si `consumirCupon` lanza, no queda ni pedido ni consumo.
4. Respuesta: `{ codigo, token, total, whatsappUrl, cuponAplicado }`.

| Endpoint | Acceso | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/coupons/validate` | público, 10 / 10 min por IP (`coupon:ip`) | `cuponValidarSchema` | **Siempre 200** con `CouponValidateResult` (también cuando `valido: false`) |
| `GET /api/admin/coupons` | `cupones.gestionar` | — | `Coupon[]` |
| `POST /api/admin/coupons` | `cupones.gestionar` | `cuponCrearSchema` | 201 `Coupon`; 409 `DUPLICADO` |
| `PATCH /api/admin/coupons/[id]` | `cupones.gestionar` | `cuponActualizarSchema` | `Coupon` |

En `validate`: `clienteKey` se arma con la sesión (si hay) o con `telefono` normalizado; si ninguno, `null`. Los ítems se resuelven con `resolverItems` (precios de la base).
No hay `DELETE` de cupones: se desactivan.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-5**: el descuento del cupón lo calcula el servidor con `calcularTotales`; el navegador solo envía el código.
- **N1-4**: límite por IP en `validate`; motivos genéricos; misma respuesta para código inexistente e inactivo; el contador `usosActuales` solo cambia mediante `$inc` condicional dentro de una transacción.
- **N1-3**: cupones y canjes no se borran.
- **N1-6**: `POST /api/orders` sigue aceptando peticiones sin `cupon` con el mismo resultado (se añade un campo a la respuesta).
- **N1-1**: nada visible cambia.

## 7. Criterios de aceptación verificables

`coupon.test.ts` (≥ 12 casos): cada regla de `evaluarCupon` en su frontera (fecha igual a ahora, `usosActuales === usosMaximos`, `subtotal === montoMinimo` → válido), el **orden** de precedencia (inactivo + ya usado → `no_valido`), `normalizarCodigo(" promo 10 ") === "PROMO10"`.

Con `curl` en desarrollo:
- Cupón `PRUEBA10` (10 %, `usosMaximos: 2`, `usosPorCliente: 1`): pedido con cupón → `cuponAplicado: true`, `usosActuales: 1`, un canje `aplicado`.
- Mismo teléfono otra vez → 409 `CUPON_YA_USADO`; no se crea pedido; `usosActuales` sigue en 1.
- Otro teléfono → funciona (`usosActuales: 2`). Un tercero → 409 `CUPON_NO_VALIDO`.
- Cancelar el primer pedido desde el panel → canje `liberado`, `usosActuales: 1`.
- **Simultaneidad**: cupón con `usosMaximos: 1`; dos `POST /api/orders` a la vez con teléfonos distintos → exactamente uno 201 y uno 409; `usosActuales === 1`; un solo pedido creado.
- Carrito donde el descuento por monto supera al cupón (no acumulable) → pedido creado, `cuponAplicado: false`, `usosActuales` no cambia, `cupon: null` en el pedido.
- Cupón `acumulable: true` → `descuentoNivel` y `cupon.monto` ambos presentes; `descuentoTotal` = suma.
- `validate` con un código que no existe y con uno inactivo → respuestas idénticas.
- 11.ª llamada a `validate` en 10 minutos → 429.
- `PATCH` cambiando `valor` de un cupón con usos → 409 `CUPON_EN_USO`.
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa (nada visible cambia).
- [ ] El ejecutor me mostró, con la base de desarrollo, los resultados reales de los casos de la sección 7 (en especial el de simultaneidad).
- [ ] Revisé en Atlas un pedido con cupón: `cupon.codigo`, `cupon.monto`, `descuentoTotal` y `total` cuadran a mano.
- [ ] Confirmé las respuestas a P10 y P11 tal como quedaron implementadas.

## 9. Plan de reversa

`git revert` del commit de fusión. `crearPedido` vuelve a rechazar el campo `cupon`. Las colecciones `coupons` y `couponredemptions` se conservan. Los pedidos ya creados con cupón mantienen su total (es una copia guardada). Como no hay interfaz todavía, ningún cliente se ve afectado.

## 10. Qué NO tocar en esta fase

- `lib/pricing.ts` (la lógica de cupón ya existe desde la fase 14; si parece faltar algo, se reporta).
- `DiscountTier` y `/api/discounts`.
- Páginas y componentes (fase 19).
- Cupones por producto, categoría, primera compra o envío gratis: fuera del plan.

## 11. Modelo recomendado

**Modelo superior (Opus)** para `coupon.service.ts` y los cambios de `order.service.ts`. **Sonnet** para `lib/coupon.ts` con sus pruebas, esquemas, modelos y rutas. **Revisión del dueño** obligatoria del caso de simultaneidad.
