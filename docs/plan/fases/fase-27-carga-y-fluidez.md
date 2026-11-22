# Fase 27 · Carga y fluidez

> **Aprobada por el dueño (2026-11-21).** Modelo: Sonnet 5.5 para los esqueletos y las páginas de error; Opus 5.5 para el inicio generado en el servidor.

> Riesgo bajo-medio. Cambia lo que se ve **mientras carga** y en las páginas de error (lo pide la fase, N1-1). La página ya cargada se ve igual.

## 1. Objetivo

| # | Qué | Efecto |
|---|---|---|
| R1 | **Esqueletos de carga** (`loading.tsx`) para inicio, categoría, producto, Mis pedidos y el detalle del pedido | Al tocar un enlace se ve al instante la forma de la página (bloques grises que laten) en vez de quedarse quieta la anterior |
| R2 | **`not-found.tsx` y `error.tsx` con la marca Janku** | 404 y errores con logo, texto en español y botones a Inicio y WhatsApp |
| R3 | **Inicio generado en el servidor** | Las novedades y la cuadrícula llegan en el HTML; antes se pedían desde el navegador. Mismo contenido y orden: se comprueba con el script de la fase 24 |
| R5 | **Imágenes fijas de postimg.cc a Cloudinary** | Una fuente menos y las imágenes optimizadas. El dueño sube las imágenes (o autoriza la subida) y se cambian las URL |

## 2. Archivos

`app/(tienda)/loading.tsx`, `app/(tienda)/[categoria]/loading.tsx`, `app/(tienda)/producto/[slug]/loading.tsx`, `app/(tienda)/auth/pedidos/loading.tsx`, `app/(tienda)/pedido/[codigo]/loading.tsx`, `app/(tienda)/not-found.tsx`, `app/(tienda)/error.tsx`, `app/global-error.tsx`, `Components/Esqueletos/*` (nuevo), `app/(tienda)/page.tsx`, `Components/HomeProducts/HomeProducts.tsx`, los archivos que usan URL de postimg.cc (se listan al empezar), `next.config.ts` y la CSP solo si al final ya no queda ninguna imagen en postimg, smoke y D-91.

Sin dependencias nuevas.

## 3. Verificación

Comparación de la fase 24 (inicio idéntico), Lighthouse antes y después en celular (local), fase 00 completa con capturas de cada esqueleto.
