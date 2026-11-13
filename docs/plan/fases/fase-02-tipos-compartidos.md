# Fase 02 · Tipos compartidos

## 1. Objetivo y por qué va en este orden

Crear la carpeta `types/` con un único tipo por entidad y eliminar las copias locales (`Product` está redeclarado en 7 archivos, `Category` en 6). Es un cambio **solo de tipos**: el JavaScript generado no cambia. Va antes de mover o reescribir código porque todas las fases siguientes importan de `@/types`.

## 2. Prerrequisitos

- Fase 01 fusionada.
- Sin pasos manuales del dueño.
- Rama: `fase-02-tipos-compartidos`.

## 3. Archivos a crear, modificar o mover

**Crear**

| Ruta | Contenido |
|---|---|
| `types/product.ts` | `StockEstado`, `Product`, `ProductAdmin`, `ProductInput` |
| `types/category.ts` | `Category`, `CategoryInput` |
| `types/banner.ts` | `BannerPosicion`, `Banner`, `BannerInput` |
| `types/promotion.ts` | `PromotionEtiqueta`, `Promotion`, `PromotionInput` |
| `types/discount.ts` | `TipoDescuento`, `DiscountTier`, `DiscountTierInput` |
| `types/cart.ts` | `CartItemTipo`, `CartItem` |
| `types/user.ts` | `SessionUser`, `UserProfile` |
| `types/api.ts` | `ApiError`, `Paginated<T>` |
| `types/index.ts` | `export * from` de todos los anteriores |

**Modificar** (borrar la declaración local `type X = {…}` e importar de `@/types`)

| Ruta | Tipos locales a reemplazar |
|---|---|
| `Components/HomeProducts/HomeProducts.tsx` | `Product`, `Banner` |
| `Components/Navbar/Navbar.tsx` | `Category` |
| `Components/ProductCard/ProductCard.tsx` | el tipo de producto de sus props, si lo declara |
| `app/(paginas)/[categoria]/page.tsx` | `Product`, `Banner`, `Category` |
| `app/(paginas)/producto/[slug]/ProductPageClient.tsx` | `Product` |
| `app/(paginas)/promocion/[id]/PromocionPageClient.tsx` | `Promotion` |
| `app/(paginas)/promociones/page.tsx` | `Promotion` |
| `app/(paginas)/favoritos/page.tsx` | tipos locales de producto, si los hay |
| `app/busqueda/page.tsx` | `Product`, `Category` |
| `app/admin/page.tsx` | `Product` → `ProductAdmin`, `Banner`, `Category`, `Promotion` (el tipo `UploadedImage` **se queda** en el archivo) |
| `app/admin/inventario/page.tsx` | `Product` → `ProductAdmin`, `Category` |
| `app/admin/orden/page.tsx` | `Product`, `Category` |
| `app/admin/descuentos/page.tsx` | `DiscountTier` (el tipo `FormState` se queda) |
| `context/CartContext.tsx` | `CartItem`, `DiscountTier` |
| `context/FavoritesContext.tsx` | `FavoriteProduct` pasa a ser `export type FavoriteProduct = Pick<Product, "_id"\|"nombre"\|"precio"\|"imagenUrl"\|"slug"\|"codigoUrl">` |
| `context/UserContext.tsx` | `UserData` → `SessionUser` |

## 4. Pasos de implementación

1. Crear los archivos de `types/` con los contratos de la sección 5.
2. Por cada archivo de la tabla "Modificar", **uno a la vez**:
   a. Leer la declaración local y compararla con el tipo compartido.
   b. Si la local tiene un campo que el compartido no tiene → **añadirlo al compartido como opcional** (no inventar: copiar nombre y tipo).
   c. Si la local marca como obligatorio un campo que en el compartido es opcional y el archivo lo usa sin comprobar → en ese archivo declarar un tipo local derivado, p. ej. `type ProductoConSlug = Product & { slug: string }`. No hacer obligatorio el campo en el compartido.
   d. Borrar la declaración local, añadir `import type { … } from "@/types";`.
   e. `npm run typecheck`. Corregir **solo** errores de tipos; nunca cambiar lógica ni JSX.
3. Prohibido resolver un error con `any`, `as any`, `@ts-ignore` o `!`. Si no se puede resolver sin eso, dejar el tipo local en ese archivo y anotarlo en el reporte final.
4. Al terminar: `git diff main -- '*.tsx' '*.ts' | grep '^[+-]' | grep -v '^[+-][+-]'` y revisar que todas las líneas cambiadas son declaraciones de tipo o imports.
5. Ejecutar la fase 00.

## 5. Contratos

Todos los `_id` son `string`; todas las fechas, `string` ISO.

```ts
// types/product.ts
export type StockEstado = "Disponible" | "Limitado" | "Agotado";

export type Product = {
  _id: string;
  nombre: string;
  precio: number;
  slug?: string;
  codigoUrl?: string;
  descripcion?: string;
  descripcionCompleta?: string;
  categorias?: string[];
  categoriaSlugs?: string[];
  stock?: StockEstado;
  imagenes?: string[];          // public_id de Cloudinary
  imagenPrincipal?: string;     // public_id de la portada
  imagenUrl?: string;           // URL completa (heredado, se sigue guardando)
  imagenesAdicionales?: string[];
  videoUrl?: string;
  deliveryHuancayo?: boolean;
  mostrarEnHome?: boolean;
  envioGratis?: boolean;
  whatsappLink?: string;
  whatsappNumero?: string;
  caracteristicas?: string[];
  garantia?: string;
  tags?: string[];
  metaTitulo?: string;
  metaDescripcion?: string;
  metaImagen?: string;
  codigo?: string;
  stockCantidad?: number;
  stockMinimo?: number;
  activo?: boolean;
  ordenHome?: number;
  ordenPorCategoria?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductAdmin = Product & { precioCosto?: number; proveedor?: string };
export type ProductInput = Omit<ProductAdmin, "_id" | "slug" | "codigoUrl" | "createdAt" | "updatedAt" | "ordenHome" | "ordenPorCategoria">;
```

```ts
// types/category.ts
export type Category = { _id: string; nombre: string; slug: string; descripcion?: string; imagenUrl?: string; activo: boolean; orden?: number };
export type CategoryInput = Omit<Category, "_id" | "slug"> & { slug?: string };

// types/banner.ts
export type BannerPosicion = "top-left" | "top-right" | "middle-full" | "bottom-left" | "bottom-right";
export type Banner = { _id: string; titulo: string; imagenUrl: string; enlace?: string; posicion?: BannerPosicion; ubicaciones?: string[]; activo: boolean };
export type BannerInput = Omit<Banner, "_id">;

// types/promotion.ts
export type PromotionEtiqueta = "Combo" | "2x1" | "Descuento" | "Oferta" | "Nuevo";
export type Promotion = {
  _id: string; titulo: string; descripcion?: string; descripcionCompleta?: string;
  precio: number; precioAnterior?: number; imagenUrl: string; imagenesAdicionales?: string[];
  tipoEtiqueta: PromotionEtiqueta; stock: StockEstado; activo: boolean; orden: number;
  whatsappLink?: string; whatsappNumero?: string; caracteristicas?: string[];
  metaTitulo?: string; metaDescripcion?: string; metaImagen?: string;
};
export type PromotionInput = Omit<Promotion, "_id">;

// types/discount.ts
export type TipoDescuento = "porcentaje" | "monto_fijo";
export type DiscountTier = { _id: string; nombre: string; montoMinimo: number; tipoDescuento: TipoDescuento; valorDescuento: number; activo: boolean };
export type DiscountTierInput = Omit<DiscountTier, "_id">;

// types/cart.ts
export type CartItemTipo = "producto" | "promocion";
export type CartItem = { _id: string; nombre: string; precio: number; imagenUrl?: string; slug?: string; codigoUrl?: string; cantidad: number; tipo?: CartItemTipo };

// types/user.ts
export type SessionUser = { id: string; nombre: string; email: string; emailVerificado?: boolean };
export type UserProfile = { _id: string; nombre: string; email: string; emailVerificado: boolean; direccion?: { calle?: string; ciudad?: string; departamento?: string; codigoPostal?: string }; createdAt?: string; ultimoAcceso?: string };

// types/api.ts
export type ApiError = { error: string; code?: string; fields?: Record<string, string> };
export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };
```

`CartItem.tipo` se **declara** aquí pero nadie lo rellena todavía (lo hace la fase 14).

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: prohibido tocar JSX, clases CSS, lógica o textos. El diff debe ser solo tipos e imports (paso 4).
- **N1-7**: si un archivo fuera de la lista declara uno de estos tipos, no tocarlo; anotarlo en el reporte.

## 7. Criterios de aceptación verificables

- `npm run typecheck` → 0 errores.
- `grep -rnE "^type (Product|Category|Banner|Promotion|DiscountTier|CartItem) =" app Components context` → sin resultados (salvo los tipos derivados locales justificados en el reporte).
- No aparece ningún `any`, `@ts-ignore` ni `@ts-expect-error` nuevo: `git diff main | grep -E "^\+.*(: any|as any|@ts-)"` → vacío.
- `npm run lint`, `npm test`, `npm run build` en verde según la línea base.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa. Debe verse **idéntico**: esta fase no cambia código ejecutable.
- [ ] En `/admin`: abrir un producto para editar y guardarlo sin cambios → "Producto actualizado".

## 9. Plan de reversa

`git revert` del commit de fusión (o borrar la rama si no se fusionó). Sin cambios de datos.

## 10. Qué NO tocar en esta fase

- No mover archivos (eso es la fase 03 y 04).
- No crear tipos de pedidos, cupones ni administradores (nacen en sus fases).
- No tocar `models/*.ts`: las interfaces `IProduct`, `IUser` se quedan donde están.
- No "aprovechar" para arreglar avisos de lint.

## 11. Modelo recomendado

**Sonnet.** Refactor mecánico guiado por el compilador.
