# Fase 12c · Panel admin: lista de productos y formulario en página propia

> Referencia visual: `../referencia-panel/panel-referencia-v2.html` (pantallas «Productos» y «Editar producto»). Es referencia, no código para copiar.

## 1. Objetivo y por qué va en este orden

Dar al catálogo una experiencia de panel profesional: **tabla con búsqueda, filtros, orden y paginación**, **acciones masivas** y **formulario de producto en su propia página**. Es lo que hoy cuesta más: encontrar un producto entre ~80–100 y editarlo.

Va después de la 12b (necesita la estructura y el estilo) y antes de la 13 (que cambia el campo de stock del formulario: mejor tocarlo una sola vez, ya en su página).

**Cambio visible anunciado (solo panel):** `/admin/productos` pasa a ser una tabla; crear y editar se hacen en `/admin/productos/nuevo` y `/admin/productos/[id]`.

## 2. Prerrequisitos

- Fase 12b fusionada. Sin pasos manuales del dueño.
- Rama: `fase-12c-panel-productos`. Modelo: **Sonnet**.

## 3. Archivos a crear, modificar o mover

Todo dentro de `app/(admin)/admin/`.

| Acción | Ruta | Qué cambia |
|---|---|---|
| Modificar | `productos/page.tsx` | Renderiza `ProductosLista` |
| Crear | `productos/nuevo/page.tsx` | Renderiza `ProductoForm` vacío |
| Crear | `productos/[id]/page.tsx` | Carga el producto de la lista de `useAdminData` y renderiza `ProductoForm` |
| Crear | `_components/ProductosLista.tsx` | Tabla, buscador, filtros, orden, paginación, acciones masivas |
| Crear | `_components/ProductoForm.tsx` | El formulario actual de `ProductosTab`, movido tal cual y reorganizado en tarjetas (Datos básicos · Imágenes · Publicación · Categoría) |
| Eliminar | `_components/ProductosTab.tsx` | Su contenido se reparte entre los dos nuevos |
| Modificar | `_components/AdminTopbar.tsx` | El buscador de la barra superior lleva a `/admin/productos?q=…` |

## 4. Pasos de implementación

1. `ProductoForm.tsx`: **mover** estado, handlers y campos de `ProductosTab` sin cambiar lógica, URLs ni textos de `alert`/`confirm`. Solo cambia el contenedor visual. Tras guardar o borrar: `router.push("/admin/productos")`.
2. `ProductosLista.tsx`, **todo en el navegador** (la lista ya llega completa desde `/api/admin/products`; no se añade API):
   - Búsqueda por nombre, etiquetas y código (sin distinguir mayúsculas ni tildes). El texto vive en `?q=`.
   - Filtros: categoría (por `categoriaSlugs`), estado (activo/inactivo), stock (`Disponible`/`Limitado`/`Agotado`).
   - Orden: más recientes (`createdAt`), nombre, precio.
   - Paginación de 20 (igual que hoy).
   - Columnas: miniatura, nombre, categoría, precio, estado de stock, interruptor de activo, botón Editar.
   - Acciones masivas con casillas: **Activar**, **Desactivar**, **Cambiar categoría**. Cada una llama al `PUT /api/products/[id]` existente, producto por producto, y muestra el resultado ("12 actualizados, 1 con error"). Sin endpoint nuevo.
   - Interruptor de activo por fila: `PUT /api/products/[id]` con `{ activo }`.
3. `Exportar CSV` reutiliza la función de `inventario/page.tsx` **copiándola**, sin tocar ese archivo.
4. El buscador de la barra superior hace `router.push("/admin/productos?q=" + encodeURIComponent(q))`.
5. Estilos con los tokens de la 12b; mismos estados vacíos y de carga que hoy.
6. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// _components/ProductosLista.tsx
type Props = { products: ProductAdmin[]; categories: Category[]; onReload: () => Promise<void> };
// _components/ProductoForm.tsx
type Props = { product?: ProductAdmin; categories: Category[]; onSaved: () => Promise<void> };
```

`PUT /api/products/[id]` acepta cambios parciales (`productoActualizarSchema = productoCrearSchema.partial()`, verificado). Activar/desactivar envía `{ activo }`; cambiar categoría envía `{ categorias, categoriaSlugs }` (ambos, como hace el formulario). **No** se crea ningún endpoint.

## 6. Reglas de Nivel 1 que esta fase podría romper

- **N1-1**: tienda intacta.
- **N1-5**: ninguna acción masiva envía precio, stock ni totales calculados en el navegador; solo `activo` y categoría.
- **N1-6/N1-7**: sin cambios de API ni dependencias.
- **No hacer**: añadir campos de stock o variantes al formulario (fases 13 y 13b); unificar generadores de URL de imagen; quitar `strict: false` de `Product`.

## 7. Criterios de aceptación verificables

- `grep -rn "ProductosTab" app` → sin resultados.
- `git diff main -- app/api server models` → vacío.
- Ningún archivo de `_components/` supera 600 líneas.
- Las URLs de `fetch` del formulario son las mismas que tenía `ProductosTab`.
- typecheck, lint (sin errores nuevos), test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] Buscar por nombre, por etiqueta y desde la barra superior; el filtro se conserva al recargar (`?q=`).
- [ ] Filtrar por categoría, estado y stock; ordenar; paginar.
- [ ] Seleccionar varios y **Desactivar** → desaparecen de la tienda; **Activar** → vuelven.
- [ ] Crear producto con 2 imágenes (producto de prueba), editar, cambiar la portada, borrar.
- [ ] El formulario conserva todos los campos que tenía (nombre, precio, descripciones, categorías, tags, video, WhatsApp, meta, etc.).
- [ ] En móvil, la tabla se desplaza y el formulario se usa bien.

## 9. Plan de reversa

`git revert` del commit de fusión. Sin cambios de datos ni de API.

## 10. Qué NO tocar

`inventario/page.tsx`; los generadores de URL de imagen; `ImageUploader` y `useImageUpload` (solo se importan).

## 11. Modelo recomendado

**Sonnet**, una o dos sesiones. Si las acciones masivas obligan a cambiar el esquema de validación de productos, detenerse y preguntar (no es de esta fase).
