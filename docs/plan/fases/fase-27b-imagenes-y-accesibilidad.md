# Fase 27b · Imágenes a su tamaño y accesibilidad

> **Aprobada por el dueño (2026-11-22).** Modelo: Opus 5.5. Va antes de la 26c (Turnstile), que queda para el final.

> Riesgo bajo. La tienda se ve igual salvo R4 (colores de las etiquetas de stock), que el dueño aprueba con una captura antes de cerrar (N1-1).

Parte de lo que dejó Lighthouse al cerrar la fase 27. Medianas de 3 corridas en el inicio, celular, Lighthouse 13.5.0 por terminal: rendimiento 72, LCP 5,0 s, TBT 360 ms, accesibilidad 88. El elemento más grande (LCP) es la imagen del popup "Oferta".

## 1. Objetivo

| # | Qué | Efecto |
|---|---|---|
| R1 | **Popup "Oferta" sin espera de imagen.** La imagen empieza a bajar en cuanto llega `/api/popup`, durante la pausa de 800 ms que ya existe, y se pide a Cloudinary al tamaño en que se muestra (unos 420 px; 840 px en pantallas densas) | El popup sale a la misma hora pero ya completo; baja el LCP. Mismo momento, mismo aspecto, mismo comportamiento al cerrar |
| R2 | **Imágenes de Cloudinary a su tamaño de pantalla.** Una función pura nueva, `lib/imagenCloudinary.ts`, pone `w_<ancho>` (y `f_auto,q_auto` si faltan) en las URL `res.cloudinary.com/.../image/upload/...`; las demás URL quedan igual. Se usa como `loader` de `next/image` (con `unoptimized={false}` solo en esas imágenes) o para armar el `srcSet` de las `<img>` | El celular baja la versión pequeña de los banners del inicio (hoy de 800×450 para mostrarlos a unos 243 px), del carrusel de la cabecera (de 1280×320 para unos 464 px), de la imagen de beneficios y del popup. Lighthouse estima ~550 KiB de ahorro |
| R3 | **Nombres accesibles** (`aria-label`) en los botones y enlaces que solo tienen icono: la lupa del buscador, el menú ☰, las flechas del carrusel de categorías, el corazón (favoritos) y el carrito, también en el menú del celular si allí son solo icono | Los lectores de pantalla dicen "Buscar", "Abrir menú", "Carrito"… No cambia nada a la vista |
| R4 | **Contraste de las etiquetas de stock y de "Delivery gratis"** en `ProductCard`. Propuesta: Disponible `green-500`→`green-700`; Limitado `yellow-500` con texto blanco → `yellow-400` con texto oscuro; Agotado `red-500`→`red-600`; "Delivery gratis" `green-600`→`green-700` | Se leen bien al sol y con baja visión. **Cambio visible**: el dueño lo aprueba o elige otros tonos con la captura |
| R5 | **Área táctil de la lupa del buscador** de al menos 24×24 px, con relleno que no mueve el diseño | Más fácil de tocar en el celular |
| R6 | **Documentos.** CLAUDE.md §8 deja de nombrar postimg.cc (sin uso desde la fase 27); D-92 en `03-decisiones.md` (por qué un loader de Cloudinary sin activar la optimización de Next) | La guía refleja el estado real |

**Fuera de esta fase** (se anota, no se toca):
- El 401 de `/api/auth-user/check` sin sesión: Lighthouse lo cuenta como error, pero cambiarlo rompe el contrato (N1-6).
- `eval()` bloqueado por la CSP en `npm run dev`: relajar la CSP va contra N1-4, aunque sea solo en desarrollo.
- El texto "Más información" del aviso de cookies: cambiar el texto visible no compensa.
- Las imágenes de `ProductCard`: ya piden `w_400` y CLAUDE.md prohíbe unificar su generador de URL con el del panel.
- Mostrar el popup más tarde o quitarlo: es decisión comercial, no técnica.

## 2. Archivos

`lib/imagenCloudinary.ts` (nuevo) y `lib/__tests__/imagenCloudinary.test.ts` (nuevo), `Components/OfferPopup/OfferPopup.tsx`, `Components/HomeProducts/HomeProducts.tsx`, `Components/Header/Header.tsx`, `Components/BenefitsSection/BenefitsSection.tsx`, `Components/Navbar/Navbar.tsx`, `Components/ProductCard/ProductCard.tsx` (solo colores de R4), `CLAUDE.md` (§8), `docs/plan/03-decisiones.md` (D-92).

Sin dependencias nuevas. Sin cambios en la API, la base ni la CSP (las URL siguen en `res.cloudinary.com`). Cada ancho nuevo crea en Cloudinary una versión derivada la primera vez que alguien la pide; son pocas y entran en el plan actual.

## 3. Verificación

- Pruebas de `imagenCloudinary`: URL con y sin transformaciones, con versión (`v123/`), URL que no son de Cloudinary (quedan igual) y vacías.
- Lighthouse por terminal (3 corridas, inicio, celular), si el dueño da permiso, comparado con el cierre de la fase 27: rendimiento 72, LCP 5,0 s, TBT 360 ms, accesibilidad 88. Se espera que bajen el LCP y el peso total y que la accesibilidad suba de 88.
- Fase 00 completa, con captura de las etiquetas de stock (antes y después) para R4.
