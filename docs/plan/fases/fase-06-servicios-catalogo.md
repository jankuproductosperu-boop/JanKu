# Fase 06 · Servicios de catálogo y rutas delgadas

## 1. Objetivo y por qué va en este orden

Sacar todas las consultas a Mongoose de los `route.ts` y de las dos páginas de servidor hacia `server/services/`, y hacer que cada escritura pase por su esquema de validación. Con esto se cierran: la asignación masiva (S3), el error al borrar categorías (C1), el índice mal escrito (C2), el registro atípico del modelo (C4), los campos sin declarar (C5) y la doble implementación de la regla de stock (M2).

**Las respuestas de la API no cambian de forma** (la proyección pública es la fase 10). La protección de las rutas sigue siendo la de `middleware.ts` (los guards llegan en la fase 08).

Va aquí porque necesita la base de la fase 05 y porque autenticación, pedidos y cupones se construyen sobre servicios.

## 2. Prerrequisitos

- Fase 05 fusionada.
- Sin pasos manuales del dueño.
- Rama: `fase-06-servicios-catalogo`.

## 3. Archivos a crear, modificar o mover

**Crear**: `server/services/product.service.ts`, `category.service.ts`, `banner.service.ts`, `promotion.service.ts`, `discount.service.ts`.

**Modificar**

| Ruta | Qué cambia |
|---|---|
| `models/Product.ts` | (a) declarar `imagenes`, `imagenPrincipal`, `tags`; (b) corregir el índice a `{ categoriaSlugs: 1, stock: 1, precio: 1 }`; (c) añadir índice `{ activo: 1, mostrarEnHome: 1 }`; (d) el hook usa `estadoDeStock()`; (e) export estándar; (f) exportar `IProduct` |
| `app/api/products/route.ts`, `[id]/route.ts`, `reorder/route.ts` | Rutas delgadas con `handle` |
| `app/api/categories/route.ts`, `[id]/route.ts` | Ídem |
| `app/api/banners/route.ts`, `[id]/route.ts` | Ídem |
| `app/api/promotions/route.ts`, `[id]/route.ts` | Ídem |
| `app/api/discounts/route.ts`, `[id]/route.ts` | Ídem |
| `app/(tienda)/producto/[slug]/page.tsx` | Usa `obtenerProductoPorSlug`; deja de importar `connectDB` y `Product` |
| `app/(tienda)/promocion/[id]/page.tsx` | Usa `obtenerPromocion` e `indiceDePromocion` |

## 4. Pasos de implementación

1. **Modelo `Product`**: aplicar (a)–(f). Para (e):
   ```ts
   const Product = (models.Product as Model<IProduct>) || model<IProduct>("Product", ProductSchema);
   export default Product;
   ```
   Dentro del hook `pre('validate')`, la búsqueda de slug repetido usa `this.constructor` en lugar de re-registrar el modelo. El bloque de stock queda: `this.stock = estadoDeStock(this.stockCantidad, this.stockMinimo ?? 5)` bajo la misma condición `typeof this.stockCantidad === "number"`. No cambiar nada más del hook.
2. **Servicios**: escribir los cinco con las firmas de la sección 5. Cada función: `await connectDB()` → consulta con `.lean()` → devolver. Las consultas, filtros y ordenamientos son **los mismos que hoy tiene cada ruta** (copiarlos, no reinventarlos).
3. **`actualizarProducto`**: conservar el recálculo actual: si `datos.stockCantidad` o `datos.stockMinimo` vienen definidos, leer los valores actuales, calcular `stock = estadoDeStock(cantidad, minimo)` y añadirlo al `$set`. Si no vienen, no tocar `stock` (deja pasar el `stock` del formulario, como hoy; cambia en la fase 13). Usar `findByIdAndUpdate(id, { $set: datos }, { new: true, runValidators: true })`.
4. **`eliminarCategoria`**: contar con `Product.countDocuments({ categoriaSlugs: categoria.slug })` (corrige C1). Si hay productos → `throw conflicto("No se puede eliminar. Hay N producto(s) asociado(s)", "CATEGORIA_CON_PRODUCTOS")`.
   > Cambia el estado HTTP de 400 a 409 en ese caso. El admin muestra `error` sin mirar el estado, así que el mensaje se ve igual.
5. **`crearCategoria` / `actualizarCategoria`**: mantener la comprobación de nombre repetido (`conflicto("Ya existe una categoría con ese nombre", "DUPLICADO")`).
6. **Rutas**: reescribir cada `route.ts` con el patrón de `01-arquitectura.md` §4. Los `GET` no llevan validación. Quitar todos los `console.log` y todos los `try/catch` (los cubre `handle`).
7. **Compatibilidad de respuestas** (N1-6), comprobar una a una contra el código anterior:
   - `GET` de lista → arreglo. Excepción heredada: `GET /api/products` y `GET /api/discounts` devolvían `[]` con estado 500 si fallaba la base. Ahora un fallo devuelve `{ error }` con 500. Es compatible: `fetchWithCache` trata cualquier respuesta no-OK como lista vacía.
   - `POST` → el documento creado. Estado: **200** en productos, banners y promociones; **201** en categorías y descuentos (como hoy).
   - `PUT` → el documento actualizado.
   - `DELETE` → `{ message: "<Entidad> eliminad@ correctamente", success: true }` con los mismos textos de hoy.
   - No encontrado → 404 `{ error: "<Entidad> no encontrad@" }` (mismos textos; `noEncontrado("Producto")` produce "Producto no encontrado"; para femeninos pasar el mensaje completo con `new AppError(404, "Categoría no encontrada", "NO_ENCONTRADO")`).
8. **Páginas de servidor**: sustituir el acceso directo al modelo por el servicio. `obtenerProductoPorSlug` contiene la lógica actual de `getProduct` (código corto → slug → `_id`), sin cambios.
9. `npm run typecheck && npm run lint && npm test && npm run build && npm run smoke`.
10. Ejecutar la fase 00.

## 5. Contratos

```ts
// server/services/product.service.ts
import type { ProductAdmin, ProductInput } from "@/types";
export async function listarProductos(): Promise<ProductAdmin[]>;                        // todos, todos los campos (como hoy)
export async function obtenerProductoPorId(id: string): Promise<ProductAdmin>;           // lanza noEncontrado
export async function obtenerProductoPorSlug(slugParam: string): Promise<ProductAdmin | null>;
export async function crearProducto(datos: ProductInput): Promise<ProductAdmin>;         // usa Product.create (dispara el hook)
export async function actualizarProducto(id: string, datos: Partial<ProductInput>): Promise<ProductAdmin>;
export async function eliminarProducto(id: string): Promise<void>;
export async function reordenarProductos(contexto: string, orden: { id: string; orden: number }[]): Promise<{ actualizados: number }>;

// server/services/category.service.ts
export async function listarCategorias(): Promise<Category[]>;                           // sort { orden: 1, nombre: 1 }
export async function obtenerCategoria(id: string): Promise<Category>;
export async function crearCategoria(datos: CategoryInput): Promise<Category>;
export async function actualizarCategoria(id: string, datos: CategoryInput): Promise<Category>;
export async function eliminarCategoria(id: string): Promise<void>;

// server/services/banner.service.ts
export async function listarBannersActivos(): Promise<Banner[]>;                         // { activo: true }
export async function obtenerBanner(id: string): Promise<Banner>;
export async function crearBanner(datos: BannerInput): Promise<Banner>;
export async function actualizarBanner(id: string, datos: Partial<BannerInput>): Promise<Banner>;
export async function eliminarBanner(id: string): Promise<void>;

// server/services/promotion.service.ts
export async function listarPromocionesActivas(): Promise<Promotion[]>;                  // { activo: true }, sort { orden: 1 }
export async function obtenerPromocion(id: string): Promise<Promotion | null>;           // null si el id no es ObjectId o no existe
export async function indiceDePromocion(id: string): Promise<number>;                    // posición entre activas; 0 si no está
export async function crearPromocion(datos: PromotionInput): Promise<Promotion>;
export async function actualizarPromocion(id: string, datos: Partial<PromotionInput>): Promise<Promotion>;
export async function eliminarPromocion(id: string): Promise<void>;

// server/services/discount.service.ts
export async function listarNiveles(): Promise<DiscountTier[]>;                          // sort { montoMinimo: 1 }
export async function listarNivelesActivos(): Promise<DiscountTier[]>;                   // { activo: true }
export async function obtenerNivel(id: string): Promise<DiscountTier>;
export async function crearNivel(datos: DiscountTierInput): Promise<DiscountTier>;
export async function actualizarNivel(id: string, datos: Partial<DiscountTierInput>): Promise<DiscountTier>;
export async function eliminarNivel(id: string): Promise<void>;
```

Todos devuelven objetos planos serializables: aplicar `JSON.parse(JSON.stringify(doc))` (o un helper `plano<T>()` local al servicio) sobre el resultado `.lean()` para convertir `ObjectId` y `Date` en cadenas.

Ejemplo de ruta resultante:
```ts
// app/api/products/[id]/route.ts
export const PUT = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const datos = productoActualizarSchema.parse(await req.json());
  return json(await actualizarProducto(id, datos));
});
```

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-6**: seguir el paso 7 al pie de la letra. Comparar cada respuesta con `git show main:<ruta>`.
- **N1-3**: cambiar la definición de índices en el esquema solo **añade** índices nuevos al arrancar (`autoIndex`). No se llama a `syncIndexes()` ni se borra el índice viejo.
- **N1-1**: la página de producto recibe hoy el documento completo; sigue recibiéndolo completo en esta fase.
- **N1-4**: no se quita ninguna entrada de `PROTECTED_API_ROUTES` en `middleware.ts`.
- **Riesgo propio — campos descartados**: si el admin envía un campo que el esquema no conoce, ahora se descarta en silencio. Mitigación: en el paso 2, comparar las claves de cada objeto que el admin envía (`productData`, `bannerData`, `promotionData`, cuerpo de categorías, cuerpo del inventario, cuerpo de descuentos) con su esquema y añadir las que falten.

## 7. Criterios de aceptación verificables

- `grep -rn "from \"@/models/" app` → sin resultados fuera de `app/api/auth/**` y `app/api/auth-user/**`.
- `grep -rn "connectDB" app` → solo en `app/api/auth/**` y `app/api/auth-user/**`.
- `grep -rn "console.log" app/api/products app/api/categories app/api/banners app/api/promotions app/api/discounts` → vacío.
- `grep -n "categoriaSlug\b" models/Product.ts server/services` → vacío (solo `categoriaSlugs`).
- `PUT /api/products/<id>` con cuerpo `{ "codigoUrl": "hack", "slug": "x", "_id": "…" }` (con sesión admin) → responde 200 y el producto **no** cambia esos campos.
- `POST /api/products` con `{ "nombre": "", "precio": -1 }` → 400 con `fields.nombre` y `fields.precio`.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run smoke` en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa (el sitio público debe verse idéntico).
- [ ] **Productos**: crear uno de prueba con imagen, editarlo (nombre, precio, categorías, etiquetas), comprobar que conserva sus imágenes, borrarlo.
- [ ] **Inventario** (`/admin/inventario`): cambiar cantidad, mínimo, costo, código y proveedor de un producto; la etiqueta de stock se recalcula. Poner un código que ya usa otro producto → mensaje de duplicado.
- [ ] **Orden** (`/admin/orden`): reordenar la portada y una categoría, guardar, comprobar en la tienda.
- [ ] **Categorías**: crear, editar, borrar una vacía. Intentar borrar una **con productos** → ahora debe negarse (antes lo permitía por error).
- [ ] **Banners** y **Promociones**: crear, editar, borrar uno de prueba.
- [ ] **Descuentos**: crear, activar/desactivar, editar, borrar un nivel de prueba; en la tienda el carrito refleja el cambio.
- [ ] Abrir un producto y una promoción en la tienda: cargan y la vista previa al compartir funciona.

## 9. Plan de reversa

`git revert` del commit de fusión. No hay migración de datos. Los dos índices nuevos de `products` pueden quedarse: no afectan al código anterior.

## 10. Qué NO tocar en esta fase

- `middleware.ts` y todo `app/api/auth/**`, `app/api/auth-user/**`.
- `app/api/upload/**` (fase 11).
- Ninguna página de cliente ni componente: el contrato de la API no cambia.
- No filtrar campos en los `GET` públicos (fase 10).
- No quitar `strict: false`.

## 11. Modelo recomendado

**Sonnet**, con **revisión del dueño del diff de `models/Product.ts`** antes de fusionar (es el único modelo que se toca y afecta a todos los productos). Si el ejecutor encuentra una respuesta que no puede mantener compatible, se detiene y consulta.
