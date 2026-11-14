# Fase 12e · Novedades de la semana

## 1. Objetivo y por qué va en este orden

Marcar productos como «novedad de la semana» desde el panel y mostrarlos en una sección propia de la portada y con una etiqueta «Nuevo» en su tarjeta. El producto **no se mueve de su categoría**: sigue allí y además aparece en Novedades (D-58).

Va después de la 12c (lista y formulario de productos ya en su forma final) y no depende de la 13 ni de pedidos. No choca con la fase 16: ésta solo toca carrito y checkout.

**Cambio visible anunciado (tienda):** sección «Novedades de la semana» en el inicio y etiqueta «Nuevo» en las tarjetas de producto, **solo si hay productos marcados**. Sin productos marcados, la tienda se ve exactamente igual que hoy.

## 2. Prerrequisitos

- Fases 12c y 12d fusionadas. Sin pasos manuales del dueño ni migración (campo opcional nuevo, N1-3).
- Rama: `fase-12e-novedades`. Modelo: **Sonnet**.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `lib/novedades.ts` | `esNovedad`, `fechaNuevoHasta`, `DIAS_NOVEDAD` (funciones puras) |
| Crear | `lib/__tests__/novedades.test.ts` | Pruebas del helper |
| Modificar | `models/Product.ts` | Campo opcional `nuevoHasta: Date` (`default: null`) |
| Modificar | `types/product.ts` | `nuevoHasta?: string \| null` |
| Modificar | `server/validation/product.schema.ts` | `nuevoHasta: z.iso.datetime().nullable().optional()` |
| Modificar | `Components/ProductCard/ProductCard.tsx` | Etiqueta «Nuevo» abajo a la izquierda de la imagen |
| Modificar | `Components/HomeProducts/HomeProducts.tsx` | Sección «Novedades de la semana» y exclusión de duplicados en la cuadrícula |
| Modificar | `app/(admin)/admin/_components/ProductoForm.tsx` | Casilla «Novedad de la semana» |
| Modificar | `app/(admin)/admin/_components/ProductosLista.tsx` | Acciones masivas «Marcar como novedad» / «Quitar novedad» y etiqueta «Nuevo» |

No se tocan rutas de API: `GET /api/products` ya devuelve todos los campos públicos, así que `nuevoHasta` sale solo (campo opcional añadido, N1-6) y `PUT /api/products/[id]` ya acepta cambios parciales.

## 4. Pasos de implementación

1. `lib/novedades.ts` y sus pruebas. `esNovedad` = `nuevoHasta` es una fecha válida posterior a ahora.
2. Modelo, tipo y esquema de validación (campos opcionales; el modelo mantiene `strict: false`).
3. `ProductCard`: si `esNovedad(product)`, etiqueta «Nuevo» (abajo a la izquierda; arriba a la izquierda están los favoritos, arriba a la derecha el stock, abajo a la derecha el carrito).
4. `HomeProducts`: sección «Novedades de la semana» (máx. 8, las más recientes primero) justo antes de la primera cuadrícula; los productos que ya salen allí no se repiten en la cuadrícula normal. Sin novedades, no se dibuja nada.
5. Formulario: casilla «Novedad de la semana». Marcarla guarda `nuevoHasta` = ahora + 7 días; si el producto ya era novedad se conserva su fecha; desmarcarla guarda `null`.
6. Lista: acciones masivas y etiqueta «Nuevo» (tabla y vista de iconos).
7. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// lib/novedades.ts
export const DIAS_NOVEDAD = 7;
export function esNovedad(p: { nuevoHasta?: string | null }, ahora?: number): boolean;
export function fechaNuevoHasta(ahora?: number, dias?: number): string; // ISO UTC
```

## 6. Reglas de Nivel 1 que esta fase podría romper

- **N1-1**: el cambio público está anunciado y solo aparece con productos marcados. Verificar que, sin ninguno marcado, portada y tarjetas son idénticas a las de la fase 00.
- **N1-3**: campo aditivo; sin migración ni índices.
- **N1-5**: `nuevoHasta` no afecta a precios ni stock.
- **N1-6**: solo se añade un campo opcional a una respuesta existente.

## 7. Criterios de aceptación verificables

- `npm test` incluye y pasa `novedades.test.ts`.
- `git diff main -- app/api` → vacío.
- typecheck, lint (sin errores nuevos), test, build y smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00: sin novedades marcadas, la portada y las tarjetas se ven igual que antes.
- [ ] Editar un producto → marcar «Novedad de la semana» → guardar → aparece en la sección «Novedades de la semana» del inicio y con la etiqueta «Nuevo» (también en su página de categoría).
- [ ] Reabrir el producto: la casilla sigue marcada y muestra hasta qué fecha.
- [ ] Desmarcar → desaparece de Novedades y pierde la etiqueta; sigue en su categoría.
- [ ] En la lista: seleccionar varios → «Marcar como novedad» y «Quitar novedad».
- [ ] Un producto que ya estaba en la cuadrícula del inicio y se marca como novedad sale una sola vez (en Novedades).
- [ ] En móvil, la sección y la etiqueta se ven bien.

## 9. Plan de reversa

`git revert` del commit de fusión. El campo `nuevoHasta` queda guardado en los documentos pero nadie lo lee (N1-3: no se borran campos).

## 10. Qué NO tocar

Orden de productos (`ordenHome`, `ordenPorCategoria`); la lógica de stock y precios; `scripts/smoke.mjs`.

## 11. Modelo recomendado

**Sonnet**, una sesión.
