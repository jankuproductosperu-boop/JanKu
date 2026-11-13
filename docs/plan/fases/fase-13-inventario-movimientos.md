# Fase 13 · Inventario con registro de movimientos

> ⚠️ **ALTO RIESGO — inventario y migración.** Cambia cómo se escribe el stock de todos los productos. `--apply` lo ejecuta solo el dueño.

## 1. Objetivo y por qué va en este orden

1. Todo cambio de `stockCantidad` pasa por un único servicio y deja un movimiento en `StockMovement` (quién, cuánto, antes, después, motivo).
2. El texto de stock (`Disponible`/`Limitado`/`Agotado`) deja de poder escribirse a mano: se deriva siempre (D-21). El formulario de producto cambia el selector de estado por cantidad y mínimo.
3. Se verifica y corrige el hallazgo C3 (producto nuevo que nace "Agotado").

Va antes de los pedidos porque confirmar un pedido (fase 17) descuenta stock a través de este mismo servicio.

**Cambio visible anunciado (solo panel):** en el formulario de producto, el desplegable "Stock" se reemplaza por "Cantidad en stock" y "Stock mínimo". En Inventario aparece el botón "Movimientos" por producto.

## 2. Prerrequisitos

- Fase 12 fusionada.
- **Respuesta a P1** (base de desarrollo) y confirmación de que la base admite transacciones (Atlas: sí).
- **Respuesta a P13**: ¿las cantidades de `stockCantidad` actuales son reales o siguen siendo las estimaciones de la migración antigua (20 / 3 / 0)?
- **Pasos manuales del dueño:** simular la migración 002, revisar, aplicar en desarrollo; aplicar en producción antes de desplegar.
- Rama: `fase-13-inventario-movimientos`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `models/StockMovement.ts` | Modelo (`02-datos.md` §3.2) |
| Crear | `types/inventory.ts` | `StockMovimientoTipo`, `StockMovement`; exportar en `types/index.ts` |
| Crear | `server/services/inventory.service.ts` | `ajustarStock`, `listarMovimientos` |
| Crear | `server/validation/inventory.schema.ts` | `ajusteStockSchema` |
| Crear | `app/api/admin/inventory/adjust/route.ts` | `POST` |
| Crear | `app/api/admin/inventory/movements/route.ts` | `GET` |
| Crear | `scripts/migrations/002-product-defaults.mjs` | Migración 002 (`02-datos.md` §4.2) |
| Modificar | `server/services/product.service.ts` | `crearProducto` y `actualizarProducto` reciben `actor`; el stock va por `inventory.service` |
| Modificar | `server/validation/product.schema.ts` | Quitar `stock` de `productoCrearSchema` |
| Modificar | `app/api/products/route.ts`, `app/api/products/[id]/route.ts` | Pasan `actor: { adminId: admin.id }` al servicio |
| Modificar | `app/(admin)/admin/_components/ProductosTab.tsx` | Campos de cantidad y mínimo en lugar del selector de stock |
| Modificar | `app/(admin)/admin/inventario/page.tsx` | Botón y modal "Movimientos" |

## 4. Pasos de implementación

1. **Verificar C3 antes de cambiar nada**: en local, crear un producto desde el panel eligiendo "Disponible" y mirar con qué `stock` queda. Anotar el resultado en el reporte (se espera "Agotado").
2. `models/StockMovement.ts`, `types/inventory.ts`.
3. `server/services/inventory.service.ts` → `ajustarStock` (algoritmo en sección 5), dentro de `mongoose.connection.transaction(async (session) => { … })` o `session.withTransaction`.
4. `listarMovimientos`.
5. `product.service`:
   - `crearProducto(datos, actor)`: crea el producto con `stockCantidad: datos.stockCantidad ?? 0`. Si la cantidad inicial es > 0, crea en la misma transacción un movimiento `tipo: "entrada"`, `cantidad: +N`, `stockAntes: 0`, `stockDespues: N`, `motivo: "Stock inicial"`.
   - `actualizarProducto(id, datos, actor)`: separar `{ stockCantidad, stockMinimo, ...resto }`.
     - Aplicar `resto` y `stockMinimo` con `$set` como hasta ahora.
     - Si `stockCantidad` viene definido y es distinto del actual → `ajustarStock({ productId: id, modo: "fijar", cantidad: stockCantidad, motivo: "Edición desde el panel", actor })`.
     - Al final, recalcular siempre `stock = estadoDeStock(cantidadFinal, minimoFinal)` y guardarlo.
     - Todo en una transacción.
   - Ninguna ruta acepta ya `stock` del cliente.
6. Esquema: quitar `stock` de `productoCrearSchema` (al no ser `.strict()`, si el panel antiguo lo envía se descarta sin error).
7. Rutas nuevas de inventario.
8. `ProductosTab.tsx`: quitar el `<select name="stock">`; añadir dos `<input type="number" min="0" step="1">` con etiquetas "Cantidad en stock" y "Stock mínimo (aviso de 'Limitado')". En `form` inicial: `stockCantidad: ""`, `stockMinimo: "5"`. En `handleSelect`: cargarlos del producto. En `productData`: enviar `stockCantidad: Number(form.stockCantidad || 0)`, `stockMinimo: Number(form.stockMinimo || 5)` y **dejar de enviar** `stock`. Mostrar junto a los campos la etiqueta resultante con `estadoDeStock()` de `@/lib/stock` (solo informativa).
9. `inventario/page.tsx`: junto a cada producto, botón "Movimientos" que abre un modal con `GET /api/admin/inventory/movements?productId=…` (fecha, tipo, cantidad con signo, antes → después, motivo, quién). Solo lectura. La edición en línea existente sigue usando `PUT /api/products/[id]` (que ahora registra el movimiento).
10. `002-product-defaults.mjs` con `_runner.mjs`. Probar **solo en simulación**.
11. Smoke: `GET /api/admin/inventory/movements` y `POST /api/admin/inventory/adjust` sin cookie → 401.
12. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// types/inventory.ts
export type StockMovimientoTipo = "entrada" | "salida" | "ajuste" | "pedido" | "devolucion";
export type StockMovement = {
  _id: string; productId: string; tipo: StockMovimientoTipo; cantidad: number;
  stockAntes: number; stockDespues: number; motivo?: string; orderId?: string;
  adminId?: string; adminNombre?: string; createdAt: string;
};
```

```ts
// server/services/inventory.service.ts
import type { ClientSession } from "mongoose";
export async function ajustarStock(args: {
  productId: string;
  modo: "sumar" | "restar" | "fijar";
  cantidad: number;                 // entero >= 0
  motivo?: string;
  tipo?: StockMovimientoTipo;       // por defecto: sumar→"entrada", restar→"salida", fijar→"ajuste"
  orderId?: string;
  actor?: { adminId: string };
  session?: ClientSession;          // si llega, se usa esa transacción; si no, se abre una propia
}): Promise<{ stockAntes: number; stockDespues: number; stock: StockEstado }>;

export async function listarMovimientos(args: { productId: string; page?: number; pageSize?: number }): Promise<Paginated<StockMovement>>;
//  orden createdAt desc · pageSize por defecto 50, máximo 100 · adminNombre resuelto con una consulta a AdminUser
```

Algoritmo de `ajustarStock` (dentro de la transacción):
1. `p = Product.findById(productId).select("stockCantidad stockMinimo").session(s)` → si no existe, `noEncontrado("Producto")`.
2. `antes = p.stockCantidad ?? 0`.
3. `despues` = `antes + cantidad` (sumar) · `antes - cantidad` (restar) · `cantidad` (fijar).
4. Si `despues < 0` → `conflicto("Stock insuficiente: hay " + antes, "SIN_STOCK")`.
5. Si `despues === antes` → devolver sin escribir nada (no se crean movimientos de 0).
6. `Product.updateOne({ _id, stockCantidad: antes }, { $set: { stockCantidad: despues, stock: estadoDeStock(despues, p.stockMinimo ?? 5) } }).session(s)`. Si `modifiedCount !== 1` → lanzar un error para que la transacción reintente (otro proceso cambió el stock entre la lectura y la escritura).
7. `StockMovement.create([{ productId, tipo, cantidad: despues - antes, stockAntes: antes, stockDespues: despues, motivo, orderId, adminId }], { session: s })`.

```ts
// server/validation/inventory.schema.ts
export const ajusteStockSchema = z.object({
  productId: objectId,
  modo: z.enum(["sumar", "restar", "fijar"]),
  cantidad: z.coerce.number().int().min(0).max(999999),
  motivo: z.string().trim().max(200).optional(),
}).strict().refine((d) => d.modo !== "fijar" || (d.motivo ?? "").length >= 3, { path: ["motivo"], message: "Indica el motivo del ajuste" });
```

| Endpoint | Permiso | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/admin/inventory/adjust` | `inventario.editar` | `ajusteStockSchema` | `{ stockAntes, stockDespues, stock }` |
| `GET /api/admin/inventory/movements?productId=&page=&pageSize=` | `inventario.ver` | query | `Paginated<StockMovement>` |
| `PUT /api/products/[id]` | `catalogo.editar` | sin cambios de forma | sin cambios de forma |

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-5**: `stock` (texto) ya no se acepta del navegador; siempre lo calcula el servidor.
- **N1-3**: `StockMovement` solo se inserta; no hay `update` ni `delete` sobre esa colección en ningún archivo. La migración 002 solo rellena campos ausentes y **no recalcula `stock`** (no altera lo que hoy ve el cliente).
- **N1-1**: la tienda lee `stock` igual que antes. Riesgo real: tras esta fase, al **guardar** un producto su etiqueta se recalcula desde la cantidad; si las cantidades son estimaciones (P13), una etiqueta puede cambiar al editar. Mitigación: checklist de la sección 8 y respuesta a P13 antes de fusionar.
- **N1-8**: el modelo ejecutor no pasa `--apply`.
- **N1-6**: `PUT /api/products/[id]` mantiene entrada y salida.

## 7. Criterios de aceptación verificables

- Crear producto con cantidad 12 y mínimo 5 → `stock: "Disponible"`, y existe 1 movimiento `entrada` +12 (0 → 12).
- Crear producto con cantidad 0 → `stock: "Agotado"`, 0 movimientos.
- Editar en Inventario la cantidad de 12 a 4 → `stock: "Limitado"`, movimiento `ajuste` −8 (12 → 4) con el id del admin.
- Guardar el producto **sin cambiar** la cantidad → no se crea ningún movimiento.
- `POST …/adjust` `{ modo: "restar", cantidad: 99 }` sobre un producto con 4 → 409 `SIN_STOCK`; el producto sigue en 4; no hay movimiento.
- `POST …/adjust` `{ modo: "fijar", cantidad: 10 }` sin motivo → 400 con `fields.motivo`.
- `PUT /api/products/<id>` con `{ "stock": "Disponible" }` sobre un producto con cantidad 0 → sigue `"Agotado"`.
- Dos `POST …/adjust` `restar 3` simultáneos sobre un producto con 4 → uno responde 200 y el otro 409; el stock final es 1, nunca negativo.
- `grep -rn "StockMovement\.\(update\|delete\|findOneAndUpdate\|findByIdAndUpdate\)" server` → vacío.
- Migración 002 en simulación: imprime cuántos productos cambiaría y no escribe.
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Simulé la 002: el número de productos afectados es el que esperaba (idealmente 0 o muy pocos). La apliqué en desarrollo.
- [ ] Fase 00 completa. **Comparar las etiquetas de stock de la tienda con las capturas de referencia: no debe haber cambiado ninguna** por el solo hecho de desplegar.
- [ ] Crear un producto con cantidad 10: en la tienda aparece disponible (antes de esta fase nacía "Agotado").
- [ ] En Inventario, bajar un producto a 0 → en la tienda aparece agotado. Subirlo → vuelve.
- [ ] Botón "Movimientos": veo los cambios que acabo de hacer, con mi nombre.
- [ ] Editar el nombre de un producto sin tocar el stock → su etiqueta no cambia.
- [ ] Promociones: su selector de stock sigue igual (no cambia en esta fase).

## 9. Plan de reversa

1. `git revert` del commit de fusión: vuelve el selector manual y la escritura directa de stock.
2. La colección `stockmovements` se conserva (no molesta al código anterior).
3. Los campos rellenados por la 002 se quedan; el respaldo está en `backups/`.
4. Los productos creados o editados durante la fase conservan un `stock` coherente con su cantidad: no requieren corrección.

## 10. Qué NO tocar en esta fase

- `models/Promotion.ts` y el stock de promociones (D-23).
- Descuento de stock por pedidos (`descontarPorPedido`, fase 17).
- Los componentes públicos que muestran la etiqueta de stock.
- La exportación CSV de inventario.

## 11. Modelo recomendado

**Modelo superior (Opus)** para `inventory.service.ts` y los cambios de `product.service.ts` (transacciones y concurrencia). El resto (formulario, modal, migración) puede hacerlo **Sonnet** en la misma rama. En todo caso, **revisión del dueño** del servicio y de la salida simulada de la 002 antes de fusionar.
