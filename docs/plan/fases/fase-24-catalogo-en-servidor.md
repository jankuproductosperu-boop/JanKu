# Fase 24 · Catálogo resuelto en el servidor (rendimiento y SEO)

> **Propuesta (2026-11-20), pendiente de aprobación del dueño.** Deuda M6 de `cierre.md`. No urge mientras el catálogo sea chico; conviene antes de que pase de unos 300–500 productos o si se quiere mejorar el posicionamiento en Google.

> ⚠️ **Riesgo medio-alto:** toca las páginas públicas más visitadas. Mismo aspecto y mismas URLs (N1-1); se verifica con fase 00 completa.

## 1. Objetivo

Hoy cada página de la tienda (inicio, categoría, búsqueda, ficha, favoritos, carrito, checkout) descarga **todos** los productos desde `/api/products` y filtra en el navegador. Con un catálogo grande la tienda se vuelve lenta en celulares y Google ve páginas casi vacías al indexar.

Esta fase:
- Genera en el servidor las páginas de categoría y de producto, con sus títulos y descripciones para Google.
- Pide al servidor solo lo necesario: una categoría paginada, una búsqueda, los productos de favoritos o del carrito por id.
- Añade `sitemap.xml` y `robots.txt` (hoy fuera del plan) y datos estructurados de producto.

## 2. Preguntas al dueño

| # | Pregunta | Por defecto |
|---|---|---|
| **Q1** | ¿Paginación con números o «cargar más»? | «Cargar más», 24 por vez |
| **Q2** | ¿Cuánto puede tardar un cambio del panel en verse en la tienda? | Hasta 60 s (revalidación) |
| **Q3** | ¿Incluir `sitemap.xml`, `robots.txt` y datos estructurados? | Sí |

## 3. Enfoque (se detalla al aprobar)

- `GET /api/products` sigue devolviendo el arreglo completo igual que hoy (N1-6). Se **añaden** parámetros opcionales (`categoria`, `q`, `ids`, `page`, `pageSize`): sin parámetros, la respuesta no cambia.
- Las páginas leen del servicio en el servidor (sin `fetch` a la propia API) y pasan al cliente solo lo que se ve.
- La proyección pública no cambia: sin costos, sin stock exacto (D-68).
- Índices: los que ya existen (`categoriaSlugs`, `activo`); si hace falta uno nuevo, migración 005 que simula por defecto.

## 4. Riesgos y cómo se controlan

| Riesgo | Control |
|---|---|
| Que algo se vea distinto | Fase 00 completa, capturas antes/después por página |
| Datos viejos en caché | Revalidación de 60 s (Q2) y revalidación al guardar en el panel |
| Fuga de campos internos | Misma proyección pública y las pruebas del smoke que ya buscan `precioCosto` y `stockCantidad` |
| Carga en la base | Consultas con índice y paginadas; menos datos que hoy |

## 5. Modelo recomendado

**Superior** para servicios, rutas y caché; Sonnet para las páginas. 2–3 sesiones.
