# Acta de cierre del plan · Janku

Fecha: 2026-11-17 · Rama de cierre: `fase-21-cierre` (pendiente de fusión y de push).

El plan de las fases 01–21 queda ejecutado, con las desviaciones que se listan abajo. Este documento resume qué se hizo, qué quedó distinto y qué deuda queda.

---

## 1. Fases: fecha y commit

Fechas de commit en `main`. Casi todas se fusionaron por avance rápido (sin commit de fusión): el commit es el último de la fase. Push a GitHub (y despliegue en Render): fases 01–18 el 2026-11-15, fase 19 el 2026-11-17. Las fases 20 y 21 van en el próximo push.

| Fase | Fusión | Commit | Nota |
|---|---|---|---|
| 01 Línea base y herramientas | 2026-11-12 | `3d6f98e` | |
| 02 Tipos compartidos | 2026-11-13 | `002b6dc` | |
| 03 Reorganizar `lib/` | 2026-11-13 | `ec417ac` | |
| 04 Grupos de rutas y layouts | 2026-11-13 | `108dc4a` | |
| 05 Base HTTP y validación | 2026-11-13 | `7575493` | |
| 06 Servicios de catálogo | 2026-11-13 | `9c280ab` | |
| 07 Límite de intentos unificado | 2026-11-13 | `2ae31db` | IP corregida después, ver §2 |
| 08 Sesiones y guards | 2026-11-13 | `c049e37` | |
| 09 Roles y permisos | 2026-11-13 | `73c0fdc` | Migración 001 |
| 10 API admin y proyección pública | 2026-11-13 | `f04a8f5` | |
| 11 Subida a Cloudinary | 2026-11-13 | `186c07a` | |
| 12 Dividir panel admin | 2026-11-13 | `32603fa` | merge |
| 12b Barra lateral, estilo y Resumen | 2026-11-13 | `63b9891` | merge |
| 12c Lista y formulario de productos | 2026-11-13 | `f4f6837` | merge |
| 12d Restilo del panel | 2026-11-13 | `1bb37da` | merge |
| 12e Novedades de la semana | 2026-11-13 | `c9d3651` | merge |
| 12f Popup de oferta | 2026-11-13 | `111661a` | merge |
| 13 Inventario con movimientos | 2026-11-13 | `70487ea` | merge · migración 002 |
| — Arreglos de la revisión del panel | 2026-11-14 | `9160916` | merge, fuera de fase |
| 13b Variantes | 2026-11-14 | `a41102c` | merge |
| 14 Precios y carrito | 2026-11-14 | `86e6fd9` | |
| 15 Pedidos: backend | 2026-11-14 | `946c9bd` | Migración 003 |
| 16 Checkout (interfaz) | 2026-11-14 | `5e5a61a` | |
| 16b Entrega | 2026-11-14 | `e77d666` | |
| 17 Pedidos en el panel | 2026-11-14 | `3ed16e0` | |
| 18 Cupones: backend | 2026-11-14 | `49095f8` | Reaplica 003 |
| 19 Cupones (interfaz) | 2026-11-17 | `8703ac5` | |
| — IP del cliente detrás de Render | 2026-11-17 | `7b8317f` | fuera de fase, verificado en producción |
| 20 Correos y "Mis pedidos" (alcance reducido) | 2026-11-17 | `2df4bb8` | |
| — Quitar /nosotros | 2026-11-17 | `6e878bd` | merge, fuera de fase |
| 21 Usuarios admin y cierre | pendiente | rama `fase-21-cierre` | |

Migraciones en producción (`jankuDB`): 001, 002 y 003 al día desde el 2026-11-15.

---

## 2. Desviaciones respecto al plan

| Dónde | Qué se hizo distinto | Por qué |
|---|---|---|
| Fases 12b–12f, 13b, 16b | Fases añadidas al plan original | Pedidas por el dueño (D-48 a D-73) |
| Fase 12b en adelante | `AdminNav.tsx` sustituido por `AdminSidebar.tsx`; las fases 17, 19 y 21 añadieron su enlace allí aunque su texto decía `AdminNav` | Lo previó la 12b |
| Fase 07 → 2026-11-17 | La IP del cliente ya no sigue D-19 (`cf-connecting-ip` primero): se lee `x-forwarded-for` por la derecha, saltando IPs privadas de Render y su borde de Cloudflare (`lib/clientIp.ts`) | `jan-ku.com` está en "DNS only"; ajustado con datos reales del log de producción |
| Revisión del panel (2026-11-14) | Límite de login admin también por cuenta; promociones inactivas → 404 público; borrar producto con movimientos → 409; `stockEsperado` en el PUT de producto | Decisiones del dueño tras la revisión |
| Fase 13b | Cantidad exacta de stock fuera de la API pública (D-68); variantes no se omiten al guardar (D-69); retoque visual del panel (D-70) | Pedido del dueño |
| Fase 16b | `recojo` se rechaza en el esquema; se usan puntos de entrega (D-72) | Decisión del dueño |
| Fase 18–19 | `validate` de cupones primero sin `varianteId` (18) y después con él (19) | Aprobado por el dueño en la 19 |
| Fase 20 | Alcance reducido: sin correos de pedido (`layout.ts`, `order-emails.ts`, `ADMIN_NOTIFY_EMAIL`). Sí: `escapeHtml` en correos de cuenta, timeout de Resend, celular en el perfil, "Mis pedidos" | Decisión del dueño (2026-11-17) |
| Fuera de fase | Página `/nosotros` eliminada, con sus enlaces del Navbar (escritorio y móvil) y del Footer. `/nosotros` responde 404, sin redirección. La imagen sigue en Cloudinary | Orden del dueño (2026-11-17) |
| Fase 21 · lint | El paso 4 no tuvo nada que corregir: las reglas `no-unused-vars`, `prefer-const`, `no-unescaped-entities` y `no-explicit-any` ya estaban a 0 (las limpiaron fases anteriores; `lib/cache.ts` ya usaba `CacheEntry<unknown>` y no tenía `console.log`) | — |
| Fase 21 · `console.log` | Los dos de `register` y `verify-email` pasan a `log.info` sin IP ni correo. Queda el de `server/logger.ts`: es la salida del propio logger, no un resto de depuración, así que el grep del criterio 5 devuelve esa única línea | Convención de logs |
| Fase 21 · P16 | Se quitó `icon: "/icon.png"` de `metadata.icons`, pero la premisa de C9 era falsa: `app/icon.png` existe desde el primer commit y Next lo sirve en `/icon.png` (no había 404). Next sigue generando el `<link rel="icon">` desde el archivo, así que no cambia nada visible | Respuesta del dueño: eliminar |
| Fase 21 · Usuarios | Al cambiar la contraseña propia, el modal pide también la actual y, al guardar, lleva a `/login-admin` | El servidor exige `passwordActual` y cierra todas las sesiones |

---

## 3. Línea base inicial vs. final

| Medida | Fase 01 (2026-11-12) | Cierre (2026-11-17) |
|---|---|---|
| Typecheck | 0 errores | 0 errores |
| Pruebas | 1 archivo, 1 prueba | 15 archivos, 253 pruebas |
| Build | compila | compila (15 s en local) |
| Smoke | 23 comprobaciones | 57 comprobaciones, todas OK |
| Lint: errores / avisos | 40 / 38 | **0 / 12** |

| Regla de lint | Inicial | Final |
|---|---:|---:|
| error · @typescript-eslint/no-require-imports | 21 | 0 |
| error · @typescript-eslint/no-explicit-any | 7 | 0 |
| error · @next/next/no-html-link-for-pages | 5 | 0 |
| error · react-hooks/set-state-in-effect | 4 | 0 |
| error · react/no-unescaped-entities | 2 | 0 |
| error · prefer-const | 1 | 0 |
| aviso · @typescript-eslint/no-unused-vars | 24 | 0 |
| aviso · @next/next/no-img-element | 12 | 11 |
| aviso · react-hooks/exhaustive-deps | 2 | 1 |

Detalle por archivo en `linea-base.md`.

---

## 4. Deuda que queda

| Severidad | Qué | Nota |
|---|---|---|
| ✅ Resuelta | `react-hooks/set-state-in-effect` (3 errores): `busqueda/page.tsx`, `CartContext.tsx`, `FavoritesContext.tsx` | Corregida el 2026-11-19 en la rama `lint-set-state-in-effect` (`useSyncExternalStore` y `useMemo`) |
| 🟢 Baja | `react-hooks/exhaustive-deps` (1), `@next/next/no-img-element` (11) | Corregirlas cambia render o carga de imágenes: requiere verificación visual propia |
| 🟢 Baja | `@next/next/no-html-link-for-pages` | Hoy a 0; se mantiene en la lista de reglas que no se corrigen sin revisión visual |
| 🟠 Media | Catálogo público resuelto en el navegador (M6): cada página descarga todos los productos | Paginación y filtros en servidor fuera del plan |
| 🟠 Media | CSP con `'unsafe-inline'` (S13) | Fuera del plan |
| 🟢 Baja | CSP sin `blob:` en `img-src`: la vista previa temporal al subir imagen en el panel se bloquea | `pendientes.md`; la imagen subida se ve bien |
| 🟢 Baja | `strict: false` en `Product` (D-05) | Se mantiene a propósito |
| 🟢 Baja | Colecciones e índices obsoletos conservados: `loginblocks`, `userloginblocks`, índice `categoriaSlug_1_stock_1_precio_1` | N1-3: no se borran |
| 🟢 Baja | Sin limpieza de imágenes huérfanas en Cloudinary (incluida la de `/nosotros`) | |
| 🟠 Media | Sin pasarela de pago | El pago se coordina por WhatsApp |
| 🟠 Media | Correos de pedido no hechos (confirmación al cliente, aviso al dueño, `ADMIN_NOTIFY_EMAIL`) | Fase 20 recortada; el archivo de la fase queda como referencia |
| 🟢 Baja | Los correos de cuenta se envían con `await` dentro de la petición de registro y verificación (con timeout de 10 s desde la fase 20) | Comportamiento heredado |
| 🟢 Baja | `GoogleAnalytics.tsx` podría enviar `page_location` con `?t=` (token del pedido) | Revisar antes de encender el checkout en producción |
| 🟢 Baja | Imágenes fijas en `postimg.cc` | Fuera del plan |
| 🟢 Baja | Sin política de privacidad ni términos enlazados en el checkout (Ley 29733) | P20, pendiente del dueño |

**Propuestas sin fase:** 21b visitas (D-55, `propuestas-panel.md`); interfaz de subcategorías (D-57/D-67); campo distrito en envío a provincia.

---

## 5. Respuestas finales a P0–P25

| # | Respuesta final |
|---|---|
| P0 | Se aprobaron las 10 reglas N1 propuestas; están literalmente en `CLAUDE.md` |
| P1 | Sí hay base de desarrollo separada (`janku-dev`); producción es `jankuDB` |
| P2 | Render despliega al hacer push a `main`; sin staging. Las ramas las fusiona el modelo ejecutor solo con aprobación explícita del dueño, sin pull requests |
| P3 | `jan-ku.com` en "DNS only" (sin proxy de Cloudflare). La IP se toma de `x-forwarded-for` por la derecha (`lib/clientIp.ts`), verificado en producción el 2026-11-17 |
| P4 | Sí, los inactivos se ocultan en la tienda (fase 10) |
| P5 | Sin pasarela. Métodos: Yape, Plin, transferencia, efectivo y otro |
| P6 | Sustituida por D-71/72/73 (fase 16b): delivery gratis en Huancayo si algún producto lo tiene marcado; puntos de entrega; envío a provincia "por coordinar" |
| P7 | Por defecto: las promociones no descuentan stock (D-23) |
| P8 | Solo celulares de Perú (D-34) |
| P9 | Pospuesta con los correos de pedido (fase 20 reducida) |
| P10 | Se aplica el mayor; cada cupón puede marcarse "acumulable" (D-39) |
| P11 | No se exige cuenta; sin sesión el límite por cliente va por celular (D-42) |
| P12 | Por defecto: no se aceptan GIF (jpeg, png, webp y avif) |
| P13 | Las cantidades antiguas eran estimaciones; el dueño indicó que no importa |
| P14 | Delivery Huancayo, puntos de entrega y envío a provincia; "recojo" no se ofrece (16b) |
| P15 | 72 h; la caducidad se ejecuta al abrir Panel → Pedidos |
| P16 | Eliminar `icon: "/icon.png"` del layout (hecho en la fase 21; ver §2: no había 404) |
| P17 | `scripts/create-admin.js` quedó obsoleto en la fase 09; los administradores se crean con `scripts/admin/` o Panel → Usuarios. **Sin confirmación registrada** de que se cambió la contraseña antigua: confírmalo |
| P18 | Por defecto: `ADMIN_PASSWORD` y `MONGODB_DB` no figuran en `.env.example`; retirarlas de Render queda a cargo del dueño |
| P19 | No se pide DNI ni RUC |
| P20 | No se enlaza nada; pendiente del dueño (§4) |
| P21 | El stock se descuenta al confirmar (D-31) |
| P22 | Solo cupones generales |
| P23 | Tres roles (superadmin, gestor, ventas); en producción hay dos superadmins |
| P24 | Modelo superior en las fases de alto riesgo |
| P25 | Se añadieron 12b–12f, 13b y 16b, y se quitó `/nosotros`; 21b queda como propuesta |

---

## 6. Verificación del cierre

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 253 pruebas, pasan |
| `npm run lint` | 0 errores, 12 avisos (tras `lint-set-state-in-effect`) |
| `npm run build` | Compila; incluye `/admin/usuarios` |
| `grep -rn "console.log" app server Components context hooks lib` | Solo `server/logger.ts` (ver §2) |
| `server/auth/legacyLimiters.ts` e imports de `jsonwebtoken` | No existen |
| `npm run smoke` | 57 comprobaciones, todas OK (2026-11-19) |
| Fase 00 completa y checklist §8 de la fase 21 | Pendiente: dueño |
