# Fase 28 · Limpieza final: CSP, correos de cuenta, vista previa de imágenes, avisos de lint y documentación

> **Aprobada por el dueño (2026-11-22).** Modelo: Opus 5.5. Sigue a la 23d.

> Riesgo medio-bajo. Junta en una sola fase la deuda pequeña que quedó en `cierre.md` §4 y en la 23d. La tienda no debe verse distinta (N1-1), pero el cambio de CSP y el del carrusel de la cabecera la tocan: se cierra con la fase 00 **completa**. Sin dependencias nuevas, sin cambios en la base.

**Fuera de esta fase, por decisión del dueño (2026-11-22):** correos de pedido (confirmación al cliente y aviso al dueño; en Perú todo va por WhatsApp: se retoma solo si aparecen pedidos sin mensaje) y campo «distrito» en el envío a provincia. Quedan como pendientes en `cierre.md`.

## 1. Objetivo

| # | Qué | Hoy | Después |
|---|---|---|---|
| A | **CSP más estricta sin romper nada** | `script-src` permite `'unsafe-inline'`, que también deja pasar atributos como `onerror="…"` metidos en el HTML (el ataque XSS más común). El comentario de `next.config.ts` dice «Report-Only», pero la CSP ya bloquea | Se añade `script-src-attr 'none'`: prohíbe los manejadores en atributos sin tocar los `<script>` en línea que Next.js y Google Analytics necesitan. Se corrige el comentario. `style-src 'unsafe-inline'` se queda (React escribe atributos `style`). Quitar `'unsafe-inline'` de los scripts del todo es la Q1 |
| B | **Vista previa al subir imágenes en el panel** | Banners, promociones, popup y productos usan `URL.createObjectURL` → `blob:`, que la CSP no permite: la vista previa sale rota (la subida funciona) | La vista previa se lee como `data:` (`FileReader.readAsDataURL`), que la CSP ya permite. **No se añade `blob:` a la CSP** (N1-4). Las descargas CSV de inventario y productos siguen con `blob:` (no son imágenes; no las afecta `img-src`) |
| C | **Correos de cuenta sin `await`** (registro, reenvío de verificación, bienvenida, recuperar contraseña) | La petición espera a Resend (hasta 10 s). En recuperar contraseña, la respuesta tarda más cuando el correo existe: un atacante podría medir el tiempo y saber qué correos tienen cuenta. Si Resend falla en el registro, el cliente ve «Error en el servidor» aunque la cuenta ya se creó | El correo se envía sin esperar, con `.catch` que registra `log.error` (sin correo ni token). Todas las respuestas tardan lo mismo, exista o no la cuenta (N1-4 mejora). Mensajes y forma de respuesta iguales (N1-6). Los 5 `console.error` de esas tres rutas pasan a `log.error` |
| D | **Lint en 0 avisos** (hoy 12) | 11 `no-img-element` (3 en la tienda, 8 en el panel) y 1 `exhaustive-deps` en el carrusel de la cabecera | Los `<img>` se quedan a propósito (D-92: con `images.unoptimized`, `next/image` descarta el `srcSet`; en el panel muestran vistas previas `data:`): cada uno lleva `eslint-disable-next-line` con el motivo. El `useEffect` del carrusel recibe su dependencia (la lista es fija: no cambia el comportamiento) |
| E | **Detalle de Estadísticas** | La etiqueta «↑ 20.0 %» se parte en dos líneas en columnas estrechas | `whitespace-nowrap` en la etiqueta (`Flecha` de `estadisticas/page.tsx`); el texto «frente al periodo anterior» sigue pudiendo partirse |
| F | **Imágenes huérfanas en Cloudinary** | Imágenes subidas y luego reemplazadas o borradas en el panel siguen ocupando espacio | `scripts/cloudinary/huerfanas.mjs`: lista las imágenes de la cuenta, las compara con TODAS las URL que guarda la base (productos y variantes, banners, promociones, popup, categorías, `imagenUrl` de los pedidos y las fijas `estaticas/`) y escribe un informe en `backups/`. Solo cuenta como huérfana una imagen con más de 30 días. Con `--apply` (**solo el dueño**) las **mueve** a la carpeta `huerfanas/` de Cloudinary, sin borrar: si algo se echa en falta, se devuelve; el borrado definitivo se hace a mano desde Cloudinary. Ver Q2 |
| G | **Documentación al día** | `CLAUDE.md` no lista `scripts/backup/` ni `scripts/mapas/`, dice «12 avisos» y §7 menciona el `await` de los correos; `cierre.md` §4 tiene como pendientes cosas ya resueltas (postimg en la 27, el token `?t=` de GA, los enlaces legales del checkout en la 22a) | Se actualizan `CLAUDE.md` (§3, §4, §7), `linea-base.md`, `cierre.md` §4 (resueltas, aplazadas y las dos que quedan fuera) y `pendientes.md` |

**Paso del dueño (sin código):** si siguen en Render, quitar las variables `ADMIN_PASSWORD` y `MONGODB_DB` (ya no se usan, P18).

## 2. Enfoque

- **A:** una línea en `next.config.ts`. Antes de cerrar, buscar en el código atributos `on…=` dentro de HTML en texto (`grep`) y recorrer la tienda y el panel con la consola abierta: ninguna violación de CSP nueva (Turnstile, YouTube, GA, carrito, checkout, mapa de Estadísticas). El smoke gana una comprobación: la CSP incluye `script-src-attr 'none'`.
- **B:** un helper local en cada campo de imagen (o uno compartido en `_components/`) que devuelve una promesa con el `data:`; `ImageUploader` deja de llamar a `revokeObjectURL` en las vistas previas. La imagen que se sube sigue siendo el `File` original: no cambia lo que llega a Cloudinary.
- **C:** `enviarEmail…(…).catch((e) => log.error("auth.correo_fallido", e, { tipo }))` sin `await`. Render es un servidor Node que sigue vivo tras responder, así que el envío termina igual. El reenvío para cuentas sin verificar ya existe (registrarse otra vez con el mismo correo).
- **F:** script Node sobre la API de Cloudinary con las credenciales de `.env.local` (solo nombres de variables en la salida, N1-2), siguiendo el patrón de las migraciones: simula por defecto, informe en `backups/`, idempotente. Lee la base, no escribe en ella (N1-3). **Llama a Cloudinary de verdad: solo lo ejecuta el dueño** (N1-8); el ejecutor solo lo prueba con datos simulados o en seco.

## 3. Preguntas al dueño

| # | Pregunta | Por defecto |
|---|---|---|
| Q1 | ¿Quitar del todo `'unsafe-inline'` de los scripts con un *nonce* por petición? Exige que **todas** las páginas de la tienda se generen en cada visita (hoy muchas se sirven ya hechas: carrito, promociones, contacto, legales…): más carga en Render y algo más de espera al abrir cada página, y más riesgo de romper algo. La protección extra es poca, porque la tienda no pinta HTML escrito por usuarios (solo el fragmento fijo de Google Analytics) | **No.** Se hace A (`script-src-attr 'none'`), que bloquea el ataque más común sin coste. Se anota en D-95 por si un día cambia |
| Q2 | Imágenes huérfanas: ¿el script mueve a `huerfanas/` (reversible) o borra directamente? | Mueve; el borrado definitivo lo haces tú desde Cloudinary cuando quieras |
| Q3 | Si Resend falla al registrarse, el cliente verá «Te enviamos un email» (hoy ve «Error en el servidor» aunque la cuenta se creó) y podrá pedir otro registrándose de nuevo. ¿De acuerdo? | Sí; el fallo queda en el log |

## 4. Archivos

`next.config.ts` · `scripts/smoke.mjs` (una comprobación) · `app/(admin)/admin/_components/BannerImageField.tsx`, `ImageUploader.tsx`, `PopupForm.tsx`, `PromocionImageField.tsx`, `BannersTab.tsx`, `CategoriasTab.tsx`, `ProductosLista.tsx`, `PromocionesTab.tsx` · `Components/BenefitsSection/BenefitsSection.tsx`, `Components/Header/Header.tsx`, `Components/Navbar/Navbar.tsx` (solo comentarios de lint y la dependencia del efecto) · `app/api/auth-user/register/route.ts`, `forgot-password/route.ts`, `verify-email/route.ts` · `app/(admin)/admin/estadisticas/page.tsx` (una clase) · `scripts/cloudinary/huerfanas.mjs` (nuevo) · `CLAUDE.md`, `docs/plan/linea-base.md`, `docs/plan/cierre.md`, `docs/plan/pendientes.md`, `docs/plan/03-decisiones.md` (D-95).

Sin dependencias nuevas. Sin cambios en la base, en las rutas ni en las respuestas.

## 5. Verificación

- `typecheck`, `test`, `build` en verde; **`lint` con 0 errores y 0 avisos** (nueva línea base).
- Smoke (una sola ejecución) con la comprobación nueva de la CSP.
- Consola del navegador sin violaciones de CSP en: inicio, categoría, producto (con video de YouTube), carrito, checkout (con Turnstile), registro, recuperar contraseña, Libro de Reclamaciones y en el panel (Estadísticas con mapa, subir imagen de banner, promoción, popup y producto).
- Vista previa visible al elegir imagen en los cuatro formularios del panel; la imagen subida a Cloudinary es la misma de antes.
- Registro, reenvío y recuperar contraseña en `janku-dev`: mismos mensajes, el correo llega (lo prueba el dueño: llama a Resend de verdad); con el correo inexistente, recuperar contraseña tarda lo mismo que con uno real.
- Carrusel de la cabecera igual que antes (cambia solo y con las flechas).
- `huerfanas.mjs` en seco: informe con el número de imágenes, las referenciadas y las candidatas; el dueño decide si ejecuta `--apply`.
- Fase 00 completa (la CSP afecta a toda la tienda).

Respuestas del dueño (2026-11-22): Q1–Q3 por defecto. Decisión D-95.
