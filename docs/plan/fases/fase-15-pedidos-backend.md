# Fase 15 · Pedidos: modelo y creación (backend)

> **Aviso de la fase 13b (variantes):** cada ítem del pedido guarda `varianteId` y `varianteEtiqueta`. El servidor **vuelve a leer** el precio de la variante y valida su stock (N1-5); si el producto tiene variantes y el ítem no trae `varianteId`, responde 400. Ver `fase-13b-variantes.md` §10.
>
> **Aviso del 2026-11-14 (D-68, stock secreto):** `ajustarStock` responde `Stock insuficiente: hay N` (409 `SIN_STOCK`). Ese texto es para el panel: en `/api/orders` (público) el error de stock **no** debe incluir la cantidad; solo qué ítem no alcanza.

> ⚠️ **ALTO RIESGO — dinero y datos personales.** Es el primer endpoint público que **escribe** en la base. Revisión del dueño obligatoria.

## 1. Objetivo y por qué va en este orden

Crear el modelo `Order` y los tres endpoints que necesita el cliente: crear un pedido, consultarlo con su token y listar los propios. El servidor reconstruye precios y totales (N1-5, D-29). **No hay interfaz todavía** (fase 16), no se descuenta stock (fase 17) y no hay cupones (fase 18): tras esta fase nada cambia para el visitante.

Va después de la fase 14 (precios compartidos) y de la 07 (limitador).

## 2. Prerrequisitos

- Fase 14 fusionada.
- **Respuestas a P5** (sin pasarela de pago), **P6** (envío), **P7** (promociones sin stock numérico), **P8** (solo teléfonos de Perú). Por defecto: D-26, D-33, D-23, D-34.
- **Respuesta a P1**: las pruebas crean pedidos reales en la base a la que apunte `.env.local`.
- **Paso manual del dueño:** simular y aplicar `003-indices.mjs` (desarrollo; producción antes de desplegar).
- Rama: `fase-15-pedidos-backend`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `models/Order.ts` | Modelo (`02-datos.md` §3.3) |
| Crear | `types/order.ts` | Tipos; exportar en `types/index.ts` |
| Crear | `lib/orderStatus.ts` + `lib/__tests__/orderStatus.test.ts` | Estados y transiciones |
| Crear | `lib/phone.ts` + `lib/__tests__/phone.test.ts` | `normalizarTelefono` |
| Crear | `server/validation/order.schema.ts` | `pedidoCrearSchema` |
| Crear | `server/services/order.service.ts` | `crearPedido`, `obtenerPedidoPublico`, `listarPedidosDeUsuario` |
| Crear | `app/api/orders/route.ts` | `POST` |
| Crear | `app/api/orders/[codigo]/route.ts` | `GET` |
| Crear | `app/api/orders/mine/route.ts` | `GET` |
| Crear | `scripts/migrations/003-indices.mjs` | Índices (`02-datos.md` §4.2) |
| Modificar | `lib/whatsapp.ts` | Añadir `enlaceWhatsAppPedido` |
| Modificar | `scripts/smoke.mjs` | Comprobaciones nuevas |

`proxy.ts` **no se toca**: `/api/orders` no está en la lista de rutas de administrador y debe seguir siendo pública.

## 4. Pasos de implementación

1. `lib/phone.ts`, `lib/orderStatus.ts` y sus pruebas.
2. `types/order.ts`, `models/Order.ts`.
3. `server/validation/order.schema.ts`.
4. `server/services/order.service.ts` → `crearPedido` siguiendo **en este orden** el algoritmo de la sección 5.
5. `obtenerPedidoPublico`, `listarPedidosDeUsuario`.
6. Rutas. `POST /api/orders`:
   ```ts
   export const POST = handle(async (req) => {
     const ip = obtenerIP(req.headers);
     const limite = await registrarIntento("order", "ip", ip);
     if (!limite.permitido) throw demasiadosIntentos(limite.minutosRestantes);
     const datos = pedidoCrearSchema.parse(await req.json());
     const usuario = await getOptionalUser();
     const r = await crearPedido(datos, { userId: usuario?.id, ip, userAgent: req.headers.get("user-agent") ?? "" });
     return json(r, { status: 201, headers: SECURITY_HEADERS });
   });
   ```
7. `lib/whatsapp.ts` → `enlaceWhatsAppPedido`.
8. `003-indices.mjs` (solo simulación por parte del ejecutor).
9. Smoke (solo peticiones que deben ser rechazadas; **no crea pedidos**): `POST /api/orders` con `{}` → 400; `GET /api/orders/JK-000000-XXXX?t=x` → 404; `GET /api/orders/mine` sin cookie → 401.
10. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// lib/phone.ts
/** Devuelve "51" + 9 dígitos, o null si no es un móvil peruano válido. */
export function normalizarTelefono(entrada: string): string | null;
// Quita todo lo que no sea dígito. Acepta: 9 dígitos que empiezan por 9  → "51" + valor
//                                          11 dígitos que empiezan por "519" → tal cual
// Cualquier otra cosa → null.

// lib/orderStatus.ts
export const ORDER_ESTADOS = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"] as const;
export type OrderEstado = (typeof ORDER_ESTADOS)[number];
export const TRANSICIONES: Record<OrderEstado, readonly OrderEstado[]> = {
  pendiente:  ["confirmado", "cancelado"],
  confirmado: ["enviado", "entregado", "cancelado"],
  enviado:    ["entregado", "cancelado"],
  entregado:  [],
  cancelado:  [],
};
export function puedeTransicionar(de: OrderEstado, a: OrderEstado): boolean;
export function etiquetaEstado(e: OrderEstado): string;   // "Pendiente", "Confirmado", "Enviado", "Entregado", "Cancelado"
```

```ts
// types/order.ts
export type PagoEstado = "pendiente" | "pagado" | "reembolsado";
export type MetodoPago = "" | "yape" | "plin" | "transferencia" | "efectivo" | "otro";
export type MetodoEntrega = "delivery_huancayo" | "recojo" | "envio_provincia";
export type OrderItem = { tipo: "producto" | "promocion"; refId: string; nombre: string; codigo?: string; imagenUrl?: string; precioUnitario: number; cantidad: number; subtotal: number };
export type OrderPublic = {
  codigo: string; estado: OrderEstado;
  cliente: { nombre: string; telefono: string; email?: string };
  entrega: { metodo: MetodoEntrega; direccion?: string; referencia?: string; ciudad?: string; departamento?: string };
  items: OrderItem[];
  subtotal: number;
  descuentoNivel: { nombre: string; monto: number } | null;
  cupon: { codigo: string; monto: number } | null;
  descuentoTotal: number; costoEnvio: number; envioPorCoordinar: boolean; total: number;
  pago: { estado: PagoEstado; metodo: MetodoPago };
  notasCliente?: string;
  historial: { estado: OrderEstado; fecha: string }[];
  createdAt: string;
};
export type Order = OrderPublic & { _id: string; userId?: string; items: (OrderItem & { precioCosto?: number })[]; notasInternas?: string; stockDescontado: boolean; origen?: { ip?: string; userAgent?: string }; pago: OrderPublic["pago"] & { referencia?: string; fecha?: string } };
// Se escribe A MANO (types/ no puede importar de server/). Debe coincidir con pedidoCrearSchema;
// en order.schema.ts se añade la comprobación:  const _c: OrderCreateInput = {} as z.infer<typeof pedidoCrearSchema>;
export type OrderCreateInput = {
  items: { id: string; cantidad: number }[];
  cliente: { nombre: string; telefono: string; email?: string };
  entrega: { metodo: MetodoEntrega; direccion?: string; referencia?: string; ciudad?: string; departamento?: string };
  notas?: string;
  website?: string;
};
export type OrderCreateResult = { codigo: string; token: string; total: number; whatsappUrl: string };
```

```ts
// server/validation/order.schema.ts   (.strict(): endpoint nuevo)
export const pedidoCrearSchema = z.object({
  items: z.array(z.object({ id: objectId, cantidad: z.coerce.number().int().min(1).max(99) }).strict()).min(1).max(50),
  cliente: z.object({
    nombre: z.string().trim().min(2).max(100),
    telefono: z.string().trim().max(20),
    email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]).optional(),
  }).strict(),
  entrega: z.object({
    metodo: z.enum(["delivery_huancayo", "recojo", "envio_provincia"]),
    direccion: z.string().trim().max(200).optional(),
    referencia: z.string().trim().max(200).optional(),
    ciudad: z.string().trim().max(100).optional(),
    departamento: z.string().trim().max(100).optional(),
  }).strict(),
  notas: z.string().trim().max(500).optional(),
  website: z.string().max(0).optional(),      // trampa anti-bots: debe llegar vacío o no llegar
}).strict()
  .superRefine((d, ctx) => {
    if (!normalizarTelefono(d.cliente.telefono)) ctx.addIssue({ code: "custom", path: ["cliente", "telefono"], message: "Ingresa un celular válido de 9 dígitos" });
    if (d.entrega.metodo !== "recojo" && !(d.entrega.direccion ?? "").length) ctx.addIssue({ code: "custom", path: ["entrega", "direccion"], message: "Ingresa tu dirección" });
    if (d.entrega.metodo === "envio_provincia") {
      if (!(d.entrega.ciudad ?? "").length) ctx.addIssue({ code: "custom", path: ["entrega", "ciudad"], message: "Ingresa tu ciudad" });
      if (!(d.entrega.departamento ?? "").length) ctx.addIssue({ code: "custom", path: ["entrega", "departamento"], message: "Ingresa tu departamento" });
    }
  });
```
El esquema **no** tiene campos de precio, descuento ni total: si el navegador los envía, la petición se rechaza con 400.

```ts
// server/services/order.service.ts
export async function crearPedido(datos: OrderCreateInput, ctx: { userId?: string; ip: string; userAgent: string }): Promise<OrderCreateResult>;
export async function obtenerPedidoPublico(codigo: string, acceso: { token?: string; userId?: string }): Promise<OrderPublic>;
export async function listarPedidosDeUsuario(userId: string): Promise<OrderPublic[]>;   // createdAt desc, máximo 50
```

**Algoritmo de `crearPedido`:**
1. Unir ítems con el mismo `id` sumando cantidades (máx. 99 por ítem tras unir; si se supera → `entradaInvalida`).
2. Buscar todos los ids en `Product` con `{ _id: { $in }, activo: { $ne: false } }`. Los ids no encontrados, buscarlos en `Promotion` con `{ _id: { $in }, activo: true }`.
3. Si queda algún id sin resolver → `conflicto("Algunos productos ya no están disponibles", "ITEMS_NO_DISPONIBLES")` con `fields = { "<id>": "No disponible" }`.
4. Disponibilidad (comprobación, **sin descontar**):
   - Producto: si `stockCantidad < cantidad` → sin stock.
   - Promoción: si `stock === "Agotado"` → sin stock.
   - Si hay alguno → `conflicto("No hay stock suficiente", "SIN_STOCK")` con `fields = { "<id>": "Quedan N" }` (o `"Agotado"`).
5. Construir `items[]`: `nombre` = `producto.nombre` o `promocion.titulo`; `precioUnitario` = precio **de la base**; `imagenUrl`; `codigo`; `precioCosto` (solo producto); `subtotal = redondear2(precio × cantidad)`.
6. `niveles = await listarNivelesActivos()` → `totales = calcularTotales({ lineas, niveles, costoEnvio: 0 })`.
7. `envioPorCoordinar = datos.entrega.metodo === "envio_provincia"`.
8. `codigo = generarCodigo()`; `token = generarToken()` (de `server/auth/tokens`); `tokenAccesoHash = hashearToken(token)`.
9. `Order.create({...})` con `estado: "pendiente"`, `historial: [{ estado: "pendiente", fecha: new Date() }]`, `origen: { ip, userAgent: userAgent.slice(0, 200) }`, `userId` si hay sesión, `cliente.telefono` normalizado. Si falla por `codigo` duplicado (11000), generar otro y reintentar hasta 3 veces.
10. Si hay `userId` y el usuario no tiene `telefono` guardado → `User.updateOne({ _id, telefono: "" }, { $set: { telefono } })`.
11. `log.info("pedido.creado", { codigo, total, items: items.length })` (sin datos personales).
12. Devolver `{ codigo, token, total: totales.total, whatsappUrl: enlaceWhatsAppPedido({ codigo, total: totales.total, nombre: cliente.nombre }) }`.

`generarCodigo()`: `"JK-" + AAMMDD (fecha en America/Lima) + "-" + 4 caracteres` tomados con `crypto.randomInt` del alfabeto `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`.

**`obtenerPedidoPublico`**: busca por `codigo` (seleccionando `+tokenAccesoHash`). Acceso permitido si `hashearToken(token) === tokenAccesoHash` (comparar con `crypto.timingSafeEqual`) **o** `order.userId === acceso.userId`. En cualquier otro caso, y también si no existe → `noEncontrado("Pedido")` (misma respuesta en ambos casos). Devuelve la proyección `OrderPublic`.

| Endpoint | Acceso | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/orders` | público, 5/h por IP | `pedidoCrearSchema` | 201 `OrderCreateResult` |
| `GET /api/orders/[codigo]?t=<token>` | token o dueño con sesión | — | `OrderPublic`; 404 si no |
| `GET /api/orders/mine` | `requireUser()` | — | `OrderPublic[]` |

```ts
// lib/whatsapp.ts
export function enlaceWhatsAppPedido(args: { codigo: string; total: number; nombre: string }): string;
// Mensaje: "¡Hola! 👋 Soy {nombre}. Acabo de hacer el pedido *{codigo}* por *S/ {total}*. Quiero coordinar el pago y la entrega. ¡Gracias!"
```

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-5**: el esquema rechaza cualquier campo de precio; nombres y precios salen de la base; los totales, de `calcularTotales`.
- **N1-4**: límite por IP antes de validar; trampa `website`; respuesta idéntica para "no existe" y "token incorrecto"; `tokenAccesoHash` con `select: false`; nunca se registra el token.
- **N1-2**: los logs no incluyen nombre, teléfono, email ni dirección.
- **N1-3**: colección nueva; la 003 solo crea índices.
- **N1-1**: ninguna página llama aún a estos endpoints.
- **N1-8**: el smoke no crea pedidos. Las pruebas manuales que sí los crean se hacen en la base de desarrollo.

## 7. Criterios de aceptación verificables

- Pruebas: `normalizarTelefono("987 654 321") === "51987654321"`, `("+51 987654321")` igual, `("12345678")`, `("887654321")`, `("")` → `null`. `puedeTransicionar` para todas las parejas de la tabla (25 combinaciones).
- `POST /api/orders` válido (con `curl`, base de desarrollo) → 201 con `codigo` que cumple `/^JK-\d{6}-[2-9A-HJ-NP-Z]{4}$/`.
- En la base, el pedido tiene los precios **de la base** aunque en el `curl` se intente colar `"precio": 0.01` en un ítem → esa petición devuelve 400.
- `GET /api/orders/<codigo>?t=<token>` → 200 y el cuerpo **no** contiene `tokenAccesoHash`, `precioCosto`, `notasInternas`, `origen` ni `userId`.
- `GET /api/orders/<codigo>?t=malo` y `GET /api/orders/JK-000000-ZZZZ?t=x` → ambos 404 con el mismo cuerpo.
- Cantidad mayor que el stock → 409 `SIN_STOCK` con `fields`.
- Ítem con id de promoción activa → se guarda con `tipo: "promocion"`.
- 6.º `POST` en una hora desde la misma IP → 429.
- `website: "x"` → 400.
- Un carrito que supera un nivel de descuento → `descuentoNivel.monto` coincide con lo que muestra el carrito de la tienda para los mismos productos.
- El stock de los productos **no cambia** al crear el pedido.
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa (la tienda no cambia: no hay interfaz nueva).
- [ ] Simulé y apliqué la 003 en desarrollo.
- [ ] El ejecutor me mostró un pedido de prueba creado con `curl`; lo veo en Atlas (colección `orders`) con nombre, teléfono `51…`, ítems, totales y estado `pendiente`.
- [ ] El total del pedido de prueba coincide con el que muestra el carrito para los mismos productos.
- [ ] Borré o marqué los pedidos de prueba (nota interna "PRUEBA") antes de desplegar.

## 9. Plan de reversa

`git revert` del commit de fusión: desaparecen los endpoints. La colección `orders` y sus índices pueden quedarse (nadie los lee). Ningún otro dato se modifica en esta fase (salvo `User.telefono` de quien compró con sesión, que es inocuo).

## 10. Qué NO tocar en esta fase

- Páginas y componentes (fase 16).
- Descuento de stock, cambios de estado y endpoints de administración (fase 17).
- Cupones: el esquema no acepta `cupon` todavía (fase 18).
- Correos (fase 20).
- `proxy.ts`.

## 11. Modelo recomendado

**Modelo superior (Opus)** para `order.service.ts` y `order.schema.ts`; **Sonnet** puede hacer tipos, `lib/phone.ts`, `lib/orderStatus.ts`, pruebas y rutas. **Revisión del dueño** de la lista de campos de `OrderPublic` (qué datos personales salen por el endpoint público).
