# Fase 17 · Gestión de pedidos en el panel y descuento de stock

> ⚠️ **ALTO RIESGO — inventario.** Confirmar o cancelar un pedido mueve stock real. Revisión del dueño obligatoria.

## 1. Objetivo y por qué va en este orden

Dar al negocio la pantalla para trabajar los pedidos: verlos, confirmarlos (lo que **descuenta el stock**), marcarlos como enviados/entregados, cancelarlos (lo que **repone el stock** si ya se había descontado), registrar el pago y dejar notas internas. Aplica D-30, D-31 y D-35.

Va después de la fase 16. Al terminar esta fase se puede encender el interruptor del checkout en producción.

## 2. Prerrequisitos

- Fases 13, 15 y 16 fusionadas.
- Base con transacciones (Atlas).
- **Respuesta a P15**: ¿72 horas es un buen plazo para caducar pedidos pendientes?
- Hay al menos 3 pedidos de prueba en la base de desarrollo.
- **Paso manual del dueño al terminar:** añadir `NEXT_PUBLIC_CHECKOUT_ENABLED=true` en Render y redeployar (cuando decida abrir el checkout).
- Rama: `fase-17-pedidos-admin`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Modificar | `server/services/inventory.service.ts` | Añadir `descontarPorPedido`, `reponerPorPedido` |
| Modificar | `server/services/order.service.ts` | Añadir funciones de administración |
| Modificar | `server/validation/order.schema.ts` | Añadir `pedidoAccionSchema`, `pedidoListaQuerySchema` |
| Crear | `app/api/admin/orders/route.ts` | `GET` lista |
| Crear | `app/api/admin/orders/[id]/route.ts` | `GET` detalle, `PATCH` acción |
| Crear | `app/api/admin/orders/expire/route.ts` | `POST` caducar pendientes |
| Crear | `app/(admin)/admin/pedidos/page.tsx` | Lista |
| Crear | `app/(admin)/admin/pedidos/[id]/page.tsx` | Detalle y acciones |
| Modificar | `app/(admin)/admin/_components/AdminNav.tsx` | Enlace "Pedidos" (permiso `pedidos.ver`), primero de la lista |
| Modificar | `scripts/smoke.mjs` | `GET /api/admin/orders` sin cookie → 401 |

## 4. Pasos de implementación

1. `inventory.service`: `descontarPorPedido` y `reponerPorPedido` (sección 5). Ambas **exigen** recibir `session`.
2. `order.service`: funciones de administración. Cada cambio de estado sigue el patrón:
   ```
   withTransaction(session):
     pedido = Order.findById(id).session(session)          → noEncontrado
     si !puedeTransicionar(pedido.estado, destino)         → conflicto("…", "TRANSICION_INVALIDA")
     efectos de inventario (según tabla)
     Order.updateOne({ _id: id, estado: pedido.estado }, { $set: {...}, $push: { historial: {...} } }).session(session)
       → si modifiedCount !== 1: lanzar conflicto("El pedido cambió mientras lo editabas. Recarga.", "PEDIDO_MODIFICADO")
   ```
   El filtro por `estado` anterior evita que dos administradores confirmen el mismo pedido a la vez.
3. Esquemas y rutas.
4. `caducarPendientes`.
5. Página de lista y página de detalle (sección 5).
6. Enlace en `AdminNav`.
7. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// server/services/inventory.service.ts  (añadidos)
type ItemStock = { productId: string; cantidad: number; nombre: string };
/** Descuenta todos o ninguno. Lanza conflicto(…, "SIN_STOCK") con fields { "<productId>": "Quedan N" } si alguno no alcanza. */
export async function descontarPorPedido(args: { items: ItemStock[]; orderId: string; actor: { adminId: string }; session: ClientSession }): Promise<void>;
export async function reponerPorPedido(args: { items: ItemStock[]; orderId: string; actor?: { adminId: string }; session: ClientSession }): Promise<void>;
```
- Solo reciben ítems con `tipo === "producto"` (las promociones no llevan stock, D-23).
- `descontarPorPedido`: **primero** lee todos los productos y junta los que no alcanzan; si hay alguno, lanza sin escribir nada. Después llama a `ajustarStock({ modo: "restar", tipo: "pedido", motivo: "Pedido <codigo>", orderId, actor, session })` por cada ítem.
- `reponerPorPedido`: `ajustarStock({ modo: "sumar", tipo: "devolucion", … })` por cada ítem. Si un producto ya no existe, lo salta y registra `log.warn("stock.reponer_sin_producto", { productId, orderId })`.

```ts
// server/services/order.service.ts  (añadidos)
type Actor = { adminId: string };
export async function listarPedidosAdmin(q: { estado?: OrderEstado; q?: string; page: number; pageSize: number }): Promise<Paginated<Order>>;
export async function obtenerPedidoAdmin(id: string, opts: { incluirCostos: boolean }): Promise<Order>;
export async function confirmarPedido(id: string, actor: Actor): Promise<Order>;
export async function marcarEnviado(id: string, actor: Actor, nota?: string): Promise<Order>;
export async function marcarEntregado(id: string, actor: Actor): Promise<Order>;
export async function cancelarPedido(id: string, actor: Actor | null, motivo: string): Promise<Order>;   // actor null = sistema (caducidad)
export async function registrarPago(id: string, actor: Actor, pago: { estado: PagoEstado; metodo: MetodoPago; referencia?: string }): Promise<Order>;
export async function agregarNota(id: string, actor: Actor, nota: string): Promise<Order>;
export async function caducarPendientes(): Promise<{ cancelados: number }>;
```

| Acción | Transición | Efecto de inventario | Otros efectos |
|---|---|---|---|
| `confirmarPedido` | `pendiente → confirmado` | `descontarPorPedido`; `stockDescontado = true` | — |
| `marcarEnviado` | `confirmado → enviado` | ninguno | nota opcional (p. ej. nº de guía) en `historial` |
| `marcarEntregado` | `confirmado/enviado → entregado` | ninguno | — |
| `cancelarPedido` | `pendiente/confirmado/enviado → cancelado` | si `stockDescontado`: `reponerPorPedido` y `stockDescontado = false` | `motivo` obligatorio (3–200) en `historial`. *(Fase 18: libera el cupón.)* |
| `registrarPago` | no cambia `estado` | ninguno | `pago.fecha = now` si pasa a `pagado` |
| `agregarNota` | no cambia `estado` | ninguno | **añade** a `notasInternas` una línea `[fecha · admin] texto` (no reemplaza) |

`listarPedidosAdmin`: `q` busca por `codigo` (prefijo, mayúsculas), `cliente.telefono` (solo dígitos) o `cliente.nombre` (contiene, sin distinguir mayúsculas; **escapar** los caracteres especiales de expresión regular de la entrada). Orden `createdAt` descendente. `pageSize` por defecto 25, máximo 100. La lista **no** incluye `items[].precioCosto` ni `origen`.

`caducarPendientes`: busca pedidos `estado: "pendiente"` con `createdAt` anterior a 72 h (máximo 100 por llamada) y llama a `cancelarPedido(id, null, "Caducado: sin confirmar en 72 h")` uno a uno; un fallo en uno no detiene los demás.

```ts
// server/validation/order.schema.ts  (añadidos)
export const pedidoAccionSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("confirmar") }).strict(),
  z.object({ accion: z.literal("enviar"), nota: z.string().trim().max(200).optional() }).strict(),
  z.object({ accion: z.literal("entregar") }).strict(),
  z.object({ accion: z.literal("cancelar"), motivo: z.string().trim().min(3).max(200) }).strict(),
  z.object({ accion: z.literal("pago"), estado: z.enum(["pendiente","pagado","reembolsado"]), metodo: z.enum(["","yape","plin","transferencia","efectivo","otro"]), referencia: z.string().trim().max(100).optional() }).strict(),
  z.object({ accion: z.literal("nota"), nota: z.string().trim().min(1).max(500) }).strict(),
]);
export const pedidoListaQuerySchema = z.object({
  estado: z.enum(ORDER_ESTADOS).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
```

| Endpoint | Permiso | Respuesta |
|---|---|---|
| `GET /api/admin/orders?estado=&q=&page=&pageSize=` | `pedidos.ver` | `Paginated<Order>` |
| `GET /api/admin/orders/[id]` | `pedidos.ver` | `Order` (`precioCosto` solo con `costos.ver`) |
| `PATCH /api/admin/orders/[id]` | `pedidos.gestionar` | `Order` actualizado |
| `POST /api/admin/orders/expire` | `pedidos.gestionar` | `{ cancelados: number }` |

Errores de `PATCH`: 409 `TRANSICION_INVALIDA`, 409 `SIN_STOCK` (con `fields`), 409 `PEDIDO_MODIFICADO`.

**Página `/admin/pedidos`:**
- Al montar: `POST /api/admin/orders/expire` (silencioso; si falla se ignora) y luego carga la lista.
- Filtros: pestañas por estado con "Todos" (por defecto "Pendientes"), caja de búsqueda, paginación.
- Tabla: código, fecha (hora de Lima), cliente, teléfono (enlace `wa.me`), nº de ítems, total, estado (insignia de color), pago. Fila → `/admin/pedidos/[id]`.
- Insignias: pendiente ámbar, confirmado azul, enviado índigo, entregado verde, cancelado gris.

**Página `/admin/pedidos/[id]`:**
- Cabecera: código, estado, fecha, botón "Abrir WhatsApp del cliente".
- Bloques: ítems con totales (margen total solo si la respuesta trae `precioCosto`), cliente y entrega, pago (formulario), notas internas (lista + caja para añadir), historial, origen (IP).
- Botones según `TRANSICIONES[estado]`; los que no correspondan no se muestran. Si `puede("pedidos.gestionar")` es falso, ningún botón.
- "Confirmar pedido" → `confirm("Se descontará el stock de N productos. ¿Continuar?")`. Si responde 409 `SIN_STOCK` → mostrar qué productos faltan y un enlace a `/admin/inventario`.
- "Cancelar pedido" → pide motivo; si `stockDescontado`, el texto avisa "Se devolverá el stock al inventario".
- Tras cada acción: recargar el pedido desde la respuesta.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-5 / inventario**: stock y estado cambian en **la misma transacción**. `stockDescontado` impide descontar o reponer dos veces. No existe "confirmar sin stock".
- **N1-3**: los pedidos nunca se borran; cancelar es un estado. `historial` solo crece.
- **N1-4**: todos los endpoints bajo `/api/admin` (proxy + `requireAdmin`). La búsqueda escapa la entrada antes de construir la expresión regular.
- **N1-1**: no toca el sitio público. Efecto indirecto esperado: al confirmar pedidos, la etiqueta de stock de la tienda puede pasar a "Limitado" o "Agotado".
- **N1-2**: los logs registran códigos e ids, no datos del cliente.

## 7. Criterios de aceptación verificables

Con un producto P (stock 5, mínimo 2) y un pedido con 3 unidades de P:
- Confirmar → P queda en 2, `stock: "Limitado"`; movimiento `pedido` −3 con `orderId`; pedido `confirmado`, `stockDescontado: true`, 2 entradas en `historial`.
- Confirmar de nuevo (segunda petición) → 409 `TRANSICION_INVALIDA`; P sigue en 2.
- Cancelar → P vuelve a 5; movimiento `devolucion` +3; `stockDescontado: false`.
- Segundo pedido con 6 unidades de P (creado bajando luego el stock a mano): confirmar → 409 `SIN_STOCK` con `fields`; P no cambia; el pedido sigue `pendiente`; **ningún** movimiento nuevo.
- Pedido con un producto con stock y otro sin stock suficiente → no se descuenta **ninguno**.
- Pedido solo de promociones → se confirma sin movimientos de stock.
- Dos `PATCH confirmar` simultáneos sobre el mismo pedido → uno 200, otro 409; el stock baja una sola vez.
- `PATCH { accion: "entregar" }` sobre un pedido `pendiente` → 409 `TRANSICION_INVALIDA`.
- Pedido pendiente con `createdAt` de hace 4 días (ajustado a mano en desarrollo) → tras abrir `/admin/pedidos` aparece `cancelado` con el motivo de caducidad.
- Admin `ventas`: puede confirmar; el detalle no muestra costos ni margen.
- Sin cookie: todos los endpoints → 401.
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] Hice un pedido desde la tienda (local, interruptor encendido) y aparece en `/admin/pedidos` → Pendientes.
- [ ] Lo abrí: datos, ítems y totales correctos. El botón de WhatsApp abre el chat con el cliente.
- [ ] Lo confirmé: el stock del producto bajó en `/admin/inventario` y en "Movimientos" aparece el pedido.
- [ ] Registré el pago (Yape + nº de operación) y añadí una nota interna.
- [ ] Lo marqué enviado y luego entregado: ya no ofrece más acciones.
- [ ] Hice otro pedido, lo confirmé y lo cancelé: el stock volvió.
- [ ] Intenté confirmar un pedido con más unidades de las que hay: me avisa qué falta y no cambia nada.
- [ ] La página del cliente (`/pedido/…`) refleja cada cambio de estado.
- [ ] Buscar por código, por teléfono y por nombre funciona.
- [ ] **Cuando esté conforme:** encendí `NEXT_PUBLIC_CHECKOUT_ENABLED` en Render y verifiqué un pedido real de prueba de punta a punta.

## 9. Plan de reversa

1. Inmediato: apagar `NEXT_PUBLIC_CHECKOUT_ENABLED` en Render (dejan de entrar pedidos; vuelve WhatsApp).
2. `git revert` del commit de fusión: desaparece la gestión del panel. Los pedidos y los movimientos de stock **permanecen**; el stock queda en el valor correcto que dejaron las confirmaciones/cancelaciones ya hechas.
3. Si un descuento de stock fue incorrecto: corregir desde `/admin/inventario` con un ajuste con motivo (queda registrado). **No** editar `stockmovements` a mano.

## 10. Qué NO tocar en esta fase

- `crearPedido` y los endpoints públicos de pedidos.
- Páginas de la tienda.
- Cupones (la liberación al cancelar se añade en la fase 18).
- Correos al cambiar de estado (fase 20).
- `ajustarStock` (cerrado en la fase 13): solo se le llama.

## 11. Modelo recomendado

**Modelo superior (Opus)** para los cambios de `order.service.ts` e `inventory.service.ts` (transacciones, concurrencia, idempotencia). **Sonnet** para esquemas, rutas y las dos páginas. **Revisión del dueño** de los servicios y ejecución personal de todos los casos de la sección 7 antes de encender el checkout en producción.
