# Fase 13b · Variantes de producto (color, talla u otras) y base de subcategorías

> ⚠️ **ALTO RIESGO.** Toca inventario, carrito y la ficha del producto. Se ejecuta con un **modelo superior** y con **revisión del dueño** de `inventory.service.ts`, `product.service.ts` y `CartContext.tsx` antes de fusionar. Decisiones D-56, D-57 y D-60 a D-67 en `03-decisiones.md`.
>
> **Dos sesiones.** Sesión A = backend (pasos 1 a 7). Sesión B = panel y tienda (pasos 8 a 15). Punto de corte: commit tras el paso 7, con `npm test` verde.

## 1. Objetivo y por qué va en este orden

Que un producto pueda tener **variantes opcionales** (color, talla, material u otros ejes libres), cada una con su **stock propio**, y opcionalmente su precio e imagen. Un producto **sin variantes funciona exactamente como hoy**. Además se deja la **base** de subcategorías (campo opcional `padre` en categoría, sin interfaz).

Va justo después de la 13 (el inventario con movimientos ya existe y las variantes se apoyan en él) y **antes de las fases 14, 15 y 17**: el carrito, los totales, los pedidos y el descuento de stock por pedido deben nacer sabiendo que un ítem puede ser «producto + variante». Hacerlo después obligaría a reescribir pedidos.

**Cambio visible anunciado:**
- Panel: sección «Variantes» en el formulario de producto; filas por variante en Inventario; columna «Variante» en Movimientos.
- Tienda: **solo en productos con variantes** (selector de opciones en la ficha, «Desde S/ …» en la tarjeta, la variante elegida en el carrito y en el mensaje de WhatsApp). **Productos sin variantes: idénticos a hoy.**

## 2. Prerrequisitos

- Fases 13, 12e y 12f fusionadas (ya lo están).
- Sin pasos manuales ni migración: todos los campos nuevos son opcionales (N1-3). Los carritos ya guardados en el navegador de los clientes deben seguir funcionando.
- Pruebas con Cloudinary real (imágenes por variante): solo con permiso del dueño en la sesión (N1-8).
- Rama: `fase-13b-variantes`, desde `main` actualizado.
- Modelo: **superior (Opus)** para la sesión A. La sesión B puede hacerla el mismo modelo o Sonnet con revisión.

## 3. Archivos a crear, modificar o mover

### Sesión A · backend

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `lib/variantes.ts` + `lib/__tests__/variantes.test.ts` | Funciones puras (sección 5) |
| Modificar | `types/product.ts` | `ProductoOpcion`, `ProductoVariante`; `Product.opciones?`, `Product.variantes?` |
| Modificar | `types/inventory.ts` | `StockMovement.variantId?`, `varianteEtiqueta?` |
| Modificar | `types/cart.ts` | `CartItem.varianteId?`, `varianteEtiqueta?` |
| Modificar | `types/category.ts` | `Category.padre?` |
| Modificar | `models/Product.ts` | Sub-esquema `variantes` y campo `opciones` (mantener `strict: false`) |
| Modificar | `models/StockMovement.ts` | `variantId`, `varianteEtiqueta` opcionales |
| Modificar | `models/Category.ts` | `padre` opcional (String, slug de la categoría madre) |
| Modificar | `server/validation/product.schema.ts` | `opciones` y `variantes` (límites en sección 5) |
| Modificar | `server/validation/inventory.schema.ts` | `variantId` opcional en `ajusteStockSchema` y en la consulta de movimientos |
| Modificar | `server/validation/category.schema.ts` | `padre` opcional |
| Modificar | `server/services/inventory.service.ts` | `ajustarStock` acepta `variantId` |
| Modificar | `server/services/product.service.ts` | `crearProducto` y `actualizarProducto` manejan variantes dentro de la transacción |
| Modificar | `app/api/admin/inventory/adjust/route.ts` | Pasa `variantId` |

### Sesión B · panel y tienda

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `app/(admin)/admin/_components/VariantesEditor.tsx` | Editor de ejes, combinaciones y tabla de variantes |
| Modificar | `app/(admin)/admin/_components/ProductoForm.tsx` | Monta `VariantesEditor`; con variantes activas, la cantidad del producto pasa a ser el total (solo lectura) |
| Modificar | `app/(admin)/admin/_components/ProductosLista.tsx` | Muestra «N variantes» bajo el nombre |
| Modificar | `app/(admin)/admin/inventario/page.tsx` | Fila desplegable por variante con ajuste de stock (usa `/api/admin/inventory/adjust` con `variantId`) |
| Modificar | `app/(admin)/admin/_components/MovimientosModal.tsx` | Columna «Variante» |
| Modificar | `context/CartContext.tsx` | La línea del carrito se identifica por `lineaId` (sección 5) |
| Modificar | `Components/Cart/CartSidebar.tsx`, `app/(tienda)/carrito/page.tsx` | Muestran la variante bajo el nombre y la incluyen en el mensaje de WhatsApp; usan `lineaId` |
| Modificar | `app/(tienda)/producto/[slug]/ProductPageClient.tsx` | Selector de opciones; precio, stock e imagen según la variante; «Agregar» exige elegir todo |
| Modificar | `Components/ProductCard/ProductCard.tsx` | Con variantes: «Desde S/ …» si los precios difieren; el botón de carrito lleva a la ficha |
| Modificar | `lib/whatsapp.ts` | `buildWhatsAppLink` acepta `variante?` y la añade al mensaje |
| Modificar | `scripts/smoke.mjs` | `GET /api/products` sigue devolviendo un arreglo y sin `precioCosto` |
| Modificar | `docs/plan/fases/fase-14-…`, `fase-15-…`, `fase-17-…` | Nota con lo que cambia por las variantes (sección 10) — solo documentos |

No se toca: `app/api/**` salvo la ruta de ajuste; `proxy.ts`; `next.config.ts`; `Components/` salvo los dos listados; `promociones` (sin variantes).

## 4. Pasos de implementación

**Sesión A**
1. `lib/variantes.ts` y sus pruebas **primero** (son la base de todo lo demás).
2. Tipos y modelos (campos opcionales; `strict: false` de `Product` se mantiene).
3. Esquemas de validación (sección 5, límites y reglas).
4. `ajustarStock` con `variantId` (algoritmo en sección 5), dentro de la misma transacción y con escritura condicional.
5. `product.service`: al crear/editar con variantes, validar con `lib/variantes`, asignar `_id` a las nuevas, aplicar el stock de cada variante **solo** mediante `ajustarStock` (movimiento «Stock inicial» o «Edición desde el panel»), y recalcular `stockCantidad` (suma de variantes activas) y `stock` (etiqueta) al final.
6. Un producto **con variantes** rechaza `ajustarStock` sin `variantId` (409 `USA_VARIANTE`). Un producto **sin variantes** rechaza `variantId` (400).
7. Pruebas, typecheck, lint, build, smoke. **Commit y reporte de la sesión A.**

**Sesión B**
8. `VariantesEditor`: interruptor «Este producto tiene variantes»; hasta 3 opciones (nombre + valores como etiquetas); botón «Generar combinaciones»; tabla con stock, precio propio opcional, imagen (elegida entre las del producto) y activo. No hay botón de eliminar variante: solo «Desactivar».
9. `ProductoForm`: integra el editor; envía `opciones` y `variantes`; la «Cantidad en stock» del producto se muestra como total y no se edita.
10. `ProductosLista` e `inventario/page.tsx` (filas por variante) y `MovimientosModal` (columna Variante).
11. `CartContext`: `lineaId`; `addToCart` recibe `varianteId` y `varianteEtiqueta`; `removeFromCart` y `updateQuantity` operan por `lineaId`. **Compatibilidad:** los ítems ya guardados en `localStorage` (sin `varianteId`) tienen `lineaId = _id` y siguen funcionando sin migrar nada.
12. `CartSidebar` y `carrito/page.tsx`: muestran la variante y la incluyen en el mensaje de WhatsApp.
13. `ProductPageClient`: selector, precio/stock/imagen por variante, bloqueo de «Agregar» hasta elegir todas las opciones, «Agotado» por variante.
14. `ProductCard` y `lib/whatsapp.ts`.
15. Notas en las fases 14, 15 y 17. typecheck, lint, test, build, smoke. **Fase 00 completa** y checklist de la sección 8.

## 5. Contratos

```ts
// types/product.ts
export type ProductoOpcion = { nombre: string; valores: string[] };          // p. ej. { nombre: "Color", valores: ["Negro","Rosado"] }
export type ProductoVariante = {
  _id: string;                              // id estable del sub-documento (lo usan carrito, pedidos y movimientos)
  combinacion: Record<string, string>;      // { Color: "Negro", Talla: "M" }; usa SOLO nombres y valores de `opciones`
  stockCantidad: number;
  precio?: number;                          // si falta, hereda el del producto
  imagen?: string;                          // public_id de Cloudinary, uno de los del producto
  sku?: string;
  activo: boolean;
};
// Product: opciones?: ProductoOpcion[]; variantes?: ProductoVariante[]
// "Tiene variantes" = variantes existe y tiene al menos 1 elemento.
```

```ts
// lib/variantes.ts  (puras; sin react, next ni server)
export function tieneVariantes(p: { variantes?: unknown[] }): boolean;
export function etiquetaVariante(combinacion: Record<string, string>, orden?: string[]): string; // "Color: Negro · Talla: M"
export function combinaciones(opciones: ProductoOpcion[]): Record<string, string>[];            // producto cartesiano
export function validarVariantes(opciones: ProductoOpcion[], variantes: Pick<ProductoVariante, "combinacion">[]): string | null; // mensaje de error o null
export function stockTotal(variantes: Pick<ProductoVariante, "stockCantidad" | "activo">[]): number;       // suma de las ACTIVAS
export function precioDeVariante(precioProducto: number, v?: { precio?: number }): number;
export function precioDesde(p: { precio: number; variantes?: ProductoVariante[] }): { precio: number; varia: boolean }; // mínimo entre activas; varia = hay precios distintos
export function lineaId(productoId: string, varianteId?: string): string;                         // varianteId ? `${productoId}:${varianteId}` : productoId
```

**Límites y reglas de validación** (`product.schema.ts`):
- Máx. **3 opciones**, **20 valores** por opción, **100 variantes**; nombres y valores de 1 a 40 caracteres, sin repetirse dentro de una opción.
- Cada variante usa exactamente las opciones declaradas y valores que existan; **no se repiten combinaciones**.
- `precio` ≥ 0 con 2 decimales (`redondear2`); `stockCantidad` entero ≥ 0.
- `opciones` y `variantes` van juntos: uno sin el otro → 400.

**Algoritmo de `ajustarStock` con `variantId`** (misma transacción y sesión que hoy):
1. Leer el producto (`variantes`, `stockCantidad`, `stockMinimo`). Si no tiene esa variante → 404. Si la variante está inactiva → 409 `VARIANTE_INACTIVA` (solo para `restar`/`pedido`).
2. `antes` = stock de la variante; `despues` = `stockResultante(modo, antes, cantidad)`; `< 0` → 409 `SIN_STOCK`; igual → no escribe.
3. `totalNuevo` = `stockTotal` con la variante ya cambiada.
4. Escritura **condicional**: `Product.updateOne({ _id, variantes: { $elemMatch: { _id: variantId, stockCantidad: antes } } }, { $set: { "variantes.$.stockCantidad": despues, stockCantidad: totalNuevo, stock: estadoDeStock(totalNuevo, minimo) } })`. `modifiedCount !== 1` → 409 `STOCK_CAMBIO` (la transacción reintenta).
5. Movimiento con `variantId` y `varianteEtiqueta` (la etiqueta se **guarda** en el movimiento: si luego se renombra el valor, el historial no cambia).

**Línea del carrito** (`context/CartContext.tsx`): `CartItem` gana `varianteId?` y `varianteEtiqueta?`. Toda operación del carrito usa `lineaId(_id, varianteId)`. `precio` del ítem = `precioDeVariante(...)`. Los ítems antiguos (sin `varianteId`) no se tocan.

**API**: `GET /api/products` y `GET /api/products/[id]` devuelven `opciones` y `variantes` (campos opcionales añadidos; no se quita ni renombra nada, N1-6). Las variantes no contienen costos ni proveedor. `POST /api/admin/inventory/adjust` acepta `variantId` opcional.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: productos sin variantes idénticos a hoy. Verificar con la fase 00 y que `ProductCard`/ficha no cambian si `variantes` no existe.
- **N1-3**: campos y colecciones nuevos solo aditivos; no se borran variantes (solo se desactivan); `StockMovement` sigue siendo solo de inserción.
- **N1-5**: el servidor es la fuente de verdad del stock y del precio por variante. El cliente nunca envía `stock` ni `stockCantidad` total; el total lo calcula el servidor. (El descuento de pedidos y el recálculo de precios por variante llegan en las fases 15 y 17, pero esta fase deja los datos y `lineaId` listos.)
- **N1-6**: solo se añaden campos opcionales a respuestas existentes.
- **N1-7**: solo los archivos listados; si el carrito exige tocar más, detenerse y preguntar.
- **N1-8**: sin `push`, sin scripts contra la base, sin llamadas reales a Cloudinary sin permiso.
- **No hacer**: quitar `strict: false` de `Product`; escribir `stockCantidad` de una variante con un `update` directo; unificar generadores de URL de imagen; añadir dependencias.

## 7. Criterios de aceptación verificables

- `npm test` con las pruebas de `lib/variantes.ts`: `combinaciones` (producto cartesiano y orden estable), `validarVariantes` (combinación repetida, valor inexistente, opción faltante), `stockTotal` (ignora inactivas), `precioDesde`, `lineaId`.
- Crear producto con opción `Color` (Negro, Rosado) y stock 10 y 9 → producto con `stockCantidad: 19`, etiqueta correcta y **2 movimientos** `entrada` «Stock inicial», cada uno con su `variantId`.
- `ajustarStock` `{ productId, variantId, modo: "restar", cantidad: 3 }` sobre una variante con 4 → quedan 1; el total del producto baja 3; 1 movimiento con la etiqueta de la variante.
- Dos `restar 3` simultáneos sobre una variante con 4 → uno 200 y uno 409; stock final 1; total coherente; nunca negativo.
- `ajustarStock` sin `variantId` sobre un producto con variantes → 409 `USA_VARIANTE`; con `variantId` sobre uno sin variantes → 400.
- Editar el producto sin cambiar el stock de ninguna variante → 0 movimientos nuevos.
- `PUT /api/products/<id>` con una combinación repetida → 400 con mensaje claro; con `stock: "Disponible"` → ignorado.
- `GET /api/products` sigue siendo un arreglo, sin `precioCosto` ni `proveedor`, y productos sin variantes salen **sin** claves nuevas añadidas por el servidor.
- Carrito antiguo: con un ítem guardado en `localStorage` en formato viejo, la página del carrito lo muestra y permite cambiar cantidad y quitarlo.
- `grep -rn "variantes" Components/ProductCard` solo aparece dentro de condiciones que evitan cambiar el comportamiento sin variantes.
- `git diff main -- next.config.ts proxy.ts` → vacío. typecheck, lint (sin errores nuevos), test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa: la tienda se ve **igual** (ningún producto tiene variantes todavía).
- [ ] Crear un producto de prueba con variantes (Color: Negro, Rosado; stock 10 y 9, uno con precio propio). En Inventario aparece con filas por variante y total 19.
- [ ] «Movimientos» del producto: veo las dos entradas «Stock inicial» con la variante.
- [ ] En la tienda: la tarjeta dice «Desde S/ …» si los precios difieren; el botón de carrito me lleva a la ficha.
- [ ] En la ficha: no puedo agregar sin elegir opción; al elegir cambia precio, stock e imagen; una variante agotada sale «Agotado».
- [ ] Agrego Negro y Rosado: son **dos líneas** distintas en el carrito, con la variante visible. El mensaje de WhatsApp las incluye.
- [ ] Un producto **sin** variantes se agrega y se comporta igual que antes. Un carrito que ya tenía productos de antes del cambio sigue funcionando.
- [ ] Bajar el stock de una variante a 0 en Inventario → la ficha la marca «Agotado»; si todas llegan a 0, el producto sale «Agotado».
- [ ] Desactivar una variante: desaparece de la ficha pero se conserva su historial.
- [ ] En móvil, el selector de opciones se usa bien.
- [ ] **Desactivar** el producto de prueba al terminar (ya no se puede borrar: tiene historial de stock y responde 409, ver revisión del 2026-11-14).

## 9. Plan de reversa

`git revert` del commit de fusión. Los campos `opciones`, `variantes`, `variantId` y `padre` quedan en los documentos pero nadie los lee (N1-3: no se borran). Un carrito con `lineaId` vuelve a leerse por `_id`; un cliente con una variante en el carrito vería esa línea como el producto base hasta vaciarla (impacto bajo).

## 10. Qué avisar a las fases siguientes (editar solo los documentos)

- **Fase 14 (precios y carrito):** `calcularTotales` y `construirMensajeCarrito` deben usar `lineaId`, `varianteEtiqueta` y `precioDeVariante`. `CartItem` ya trae `varianteId`.
- **Fase 15 (pedidos backend):** cada ítem del pedido guarda `varianteId` y `varianteEtiqueta`; el servidor **vuelve a leer** el precio y valida stock de la variante (N1-5); si un producto tiene variantes y el ítem no trae `varianteId` → 400.
- **Fase 17 (pedidos en el panel):** `descontarPorPedido` y `reponerPorPedido` llaman a `ajustarStock` con `variantId` cuando el ítem lo trae.
- **Pospuesto a propósito:** quitar todas las variantes de un producto; atributos por categoría; subcategorías visibles; variantes en promociones.

## 11. Qué NO tocar en esta fase

`models/Promotion.ts` y promociones; el checkout y pedidos (fases 15 a 17); `lib/pricing.ts` (fase 14); el CSP; los generadores de URL de imagen; `strict: false` de `Product`.

## 12. Modelo recomendado

**Modelo superior (Opus)** para la sesión A (transacciones, concurrencia, integridad del stock) y para `CartContext.tsx` en la sesión B. El resto de la sesión B (editor, inventario, tarjetas) puede hacerlo Sonnet en la misma rama. **Revisión del dueño** de `inventory.service.ts`, `product.service.ts` y `CartContext.tsx` antes de fusionar.

## 13. Ajustes tras la revisión del 2026-11-14 (obligatorios)

Lo fusionado en `main` ese día cambia algunas piezas en las que se apoya esta fase. Estos puntos **mandan sobre** lo escrito arriba si se contradicen.

1. **Stock pisado por variante.** Ya existe `stockEsperado` en `PUT /api/products/[id]` y `esperado` en `ajustarStock` (409 `STOCK_CAMBIO` si el stock actual no es el que vio el formulario). Con variantes: cada variante del cuerpo lleva `stockCantidad` **solo si cambió**, junto con su `stockEsperado`; el algoritmo con `variantId` compara `esperado` contra el stock **de la variante**.
2. **Nunca `$set` del arreglo con stock.** `actualizarProducto` no guarda el `stockCantidad` de las variantes tal como llega: las variantes nuevas nacen con 0 y su stock inicial entra con `ajustarStock` (movimiento «Stock inicial»); los cambios de las existentes, también por `ajustarStock`. El `$set` de `variantes` conserva el `stockCantidad` que ya tenía cada una en la base.
3. **Variantes omitidas o inventadas → 400** (D-69).
4. **Permisos por campo.** `exigirPermisosDeCampos` (en `server/auth/guards.ts`) exige `inventario.editar` también cuando el cuerpo trae `variantes`. Se añade `server/auth/guards.ts` a la lista de archivos de la sesión A.
5. **Cantidad total de solo lectura.** Con variantes, ni el formulario ni la fila de Inventario envían `stockCantidad` del producto (el servidor respondería 409 `USA_VARIANTE`). Se conserva la lógica de «solo lo que cambió» que ya tienen ambos.
6. **Borrar con historial → 409.** Un producto con movimientos no se borra (`PRODUCTO_CON_HISTORIAL`); ver el checklist.
7. **Línea base de lint:** 3 errores ya existentes (`react-hooks/set-state-in-effect` en `busqueda/page.tsx`, `CartContext.tsx` y `FavoritesContext.tsx`). Esta fase no los arregla y no debe añadir otros.
8. **Stock secreto (D-68).** La proyección pública quita `stockCantidad` y `stockMinimo`; cada variante pública lleva `stock` (etiqueta) y nunca su cantidad. `GET /api/admin/products` sigue devolviendo todo. Archivos: `server/services/product.service.ts`, `types/product.ts` y `scripts/smoke.mjs` (comprueba que `stockCantidad` no sale).
9. **Precios.** `dinero` de `server/validation/common.ts` ya redondea con `redondear2`: úsalo para el precio de la variante.
10. **Retoque visual del panel (D-70).** En la misma rama, en commits aparte: solo CSS/clases de `app/(admin)/**` y el bloque `.panel` de estilos. Sin cambiar estructura ni textos.
