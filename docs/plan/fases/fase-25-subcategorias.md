# Fase 25 · Subcategorías (interfaz en el panel y en la tienda)

> **Propuesta (2026-11-20), pendiente de aprobación del dueño.** Retoma D-57/D-67: el campo `Category.padre` ya existe en la base desde la fase 13b, pero sin interfaz ni uso público.

> ⚠️ **Riesgo medio:** cambia lo que ven los clientes en la página de categoría y en el menú (lo pide la fase, N1-1). Sin subcategorías creadas, la tienda se ve **exactamente igual** que hoy. Se verifica con la fase 00 completa.

## 1. Objetivo

Que puedas crear subcategorías (por ejemplo *Hogar → Cocina*, *Hogar → Baño*) y que el cliente las use para encontrar productos más rápido, sin cambiar las URLs que ya existen.

## 2. Preguntas al dueño

| # | Pregunta | Por defecto |
|---|---|---|
| **Q1** | ¿Cuántos niveles? | **Uno**: categoría → subcategoría. Una subcategoría no puede tener hijas. |
| **Q2** | ¿Dirección de la subcategoría? | **`/cocina`**, igual que cualquier categoría (las URLs no cambian y la ruta `[categoria]` ya la sirve). Arriba se ve *Hogar › Cocina*. |
| **Q3** | ¿La página de *Hogar* muestra también los productos de *Cocina* y *Baño*? | **Sí**: la madre reúne los suyos y los de sus hijas, sin repetir. |
| **Q4** | ¿Cómo se ven en la tienda? | En la página de la madre, una fila de botones bajo el título: **Todo · Cocina · Baño**. En el menú del Navbar solo salen las categorías madre (las hijas no se mezclan con ellas). |
| **Q5** | ¿El orden manual de productos? | Cada subcategoría tiene su propio orden en `/admin/orden`, como cualquier categoría. En la madre, primero los ordenados de la madre y luego el resto. |

## 3. Enfoque

**Datos.** No hay migración: `padre` (slug de la madre) ya existe y es opcional. Un producto se asigna a la subcategoría como hoy se asigna a una categoría (`categoriaSlugs`). Base solo aditiva (N1-3).

**Reglas (puras, en `lib/categorias.ts`, con pruebas):**
- `hijasDe(slug, categorias)`: subcategorías activas de una madre, por `orden`.
- `esMadreValida(slug, padre, categorias)`: la madre existe, no es ella misma y no es a su vez una hija (Q1).
- `slugsDeCategoria(slug, categorias)`: la categoría y sus hijas, para filtrar productos (Q3).

**Servidor.**
- `category.schema`: `padre` ya se valida como slug; el servicio rechaza con 400 una madre inválida y no deja convertir en hija a una categoría que ya tiene hijas.
- `product.service` → filtro `categoria`: usa `slugsDeCategoria`. Sin subcategorías el resultado es idéntico al de hoy (se comprueba con el script de comparación de la fase 24).
- `GET /api/categories`: misma forma; `padre` ya viaja (campo opcional, N1-6).

**Panel** (`CategoriasTab`): selector «Categoría madre (opcional)» en el formulario; en la lista, las hijas aparecen sangradas bajo su madre. Al desactivar una madre se avisa de que sus hijas siguen activas.

**Tienda.**
- `[categoria]/page.tsx`: carga la categoría, sus hijas y, si es hija, el nombre de la madre para la ruta *Hogar › Cocina* y los metadatos.
- `CategoriaClient.tsx`: fila de botones de subcategoría (enlaces a `/cocina`), solo si la categoría tiene hijas.
- `Navbar.tsx`: lista solo las categorías sin `padre`.
- Búsqueda: su filtro por categoría no cambia en esta fase.

## 4. Archivos

- `lib/categorias.ts` (nuevo) y `lib/__tests__/categorias.test.ts` (nuevo)
- `server/services/category.service.ts`
- `server/services/product.service.ts` (solo el filtro `categoria`)
- `app/(admin)/admin/_components/CategoriasTab.tsx`
- `app/(tienda)/[categoria]/page.tsx` y `app/(tienda)/[categoria]/CategoriaClient.tsx`
- `Components/Navbar/Navbar.tsx`
- `app/(admin)/admin/orden/page.tsx` (solo si hace falta mostrar las hijas con su madre)
- `scripts/smoke.mjs` (comprueba que `/api/categories` sigue siendo un arreglo y que `?categoria=` responde igual)
- `docs/plan/03-decisiones.md` (D-88), `docs/plan/02-datos.md` (uso de `padre`)

Sin dependencias nuevas.

## 5. Riesgos y cómo se controlan

| Riesgo | Control |
|---|---|
| Que la tienda cambie sin subcategorías | Todo se activa solo si existe alguna categoría con `padre`; comparación de la fase 24 antes y después |
| Ciclos o niveles de más | `esMadreValida` en el servidor, con pruebas |
| Un producto repetido en la madre | Filtro por conjunto de slugs, sin duplicar |
| Menú con categorías huérfanas | Una hija cuya madre está inactiva no sale en el menú y su página sigue funcionando |

## 6. Verificación

`typecheck`, `lint` (0 errores), `test`, `build`, una ejecución del smoke y la fase 00. Prueba manual: crear *Hogar → Cocina* en janku-dev, asignar 2 productos, ver `/hogar` (botones y productos) y `/cocina` (ruta *Hogar › Cocina*), y luego quitar la madre y comprobar que todo vuelve a verse como antes.

## 7. Modelo recomendado

Sonnet; una sesión.
