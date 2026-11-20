# Fase 22a · Páginas legales, datos del titular, aviso de cookies y casillas de aceptación

> **Aprobada por el dueño el 2026-11-19.** Q1: el correo bueno es **productosjanku@gmail.com**. Q2, Q3 y Q4: por defecto. D-74 a D-78 ya están en `03-decisiones.md`.

> Los textos legales de esta fase son una base práctica hecha a partir de cómo funciona el sitio. **No son asesoría legal**: conviene que un abogado los revise una vez antes de darlos por definitivos.

## 1. Objetivo y por qué va en este orden

Cumplir lo básico que exige la ley peruana a una tienda en línea, basándose solo en lo que el sitio hace hoy:

- **Ley 29733** (protección de datos personales): aviso de privacidad que diga qué datos se piden, para qué, dónde se guardan (servidores fuera del Perú) y cómo ejercer los derechos ARCO.
- **Código de Protección y Defensa del Consumidor** (Ley 29571): identificar al proveedor (nombre, RUC, contacto), condiciones de compra claras antes de comprar, precio final, política de cambios y garantía sin cláusulas abusivas.
- **Cookies:** Google Analytics se carga solo si el visitante acepta; "Rechazar" igual de visible que "Aceptar".
- Arreglar el pendiente de la fase 16: Google Analytics podía enviar la URL del pedido con su token (`?t=`).

Va antes que la 22b (Libro de Reclamaciones) porque la 22b enlaza a estas páginas y usa los datos del titular que aquí se centralizan.

**Cambios visibles anunciados (N1-1):**
- Páginas nuevas: `/terminos`, `/privacidad`, `/cambios-y-devoluciones`, `/envios`, `/cookies`.
- Pie de página: bloque "Legal" con esos enlaces, línea con los datos del titular y "Preferencias de cookies". Redes sociales del pie corregidas (pregunta Q2).
- Aviso de cookies en la parte inferior en la primera visita.
- Casilla sin marcar en el registro y en el checkout.

## 2. Prerrequisitos y preguntas al dueño

- Fase 21 y la rama `textos-confianza` fusionadas en `main`.
- Rama: `fase-22a-legal` desde `main`.

| # | Pregunta | Por defecto |
|---|---|---|
| **Q1** | La página `/contacto` muestra **productosjanku@gmail.com**, pero el dueño indicó **jankuproductos@gmail.com** para contacto y reclamos. ¿Cuál es el correcto? | **Bloquea**: no se empieza sin respuesta |
| **Q2** | El pie enlaza a `facebook.com`, `tiktok.com`, `instagram.com`, `twitter.com` y `youtube.com` genéricos (no a las cuentas de Janku). El Navbar sí tiene las reales de Facebook y TikTok. ¿Hay cuentas reales de Instagram, X/Twitter y YouTube? | Se usan las de Facebook y TikTok del Navbar; los iconos sin cuenta real se quitan |
| **Q3** | ¿El servidor debe **rechazar** un registro o pedido sin la casilla marcada? N1-6 solo permite añadir campos opcionales a endpoints existentes. | No se rechaza: el campo es opcional en la API; la casilla la exige el formulario y el servidor guarda la fecha y la versión cuando llega |
| **Q4** | ¿Cambiar la descripción del sitio (metadatos) "…al mejor precio" por "…a precios justos"? | No se toca |

### Datos del titular (dados por el dueño el 2026-11-19)

| Dato | Valor |
|---|---|
| Nombre comercial | Janku |
| Titular | Rodrigo Alonso Contreras Trujillo (persona natural con negocio) |
| RUC | 10610607841 |
| Régimen | Nuevo RUS: emite **solo boleta de venta electrónica**, no factura |
| Domicilio a mostrar | "Tienda virtual · Huancayo, Junín, Perú" (sin dirección física hasta que haya local) |
| Correo de contacto, privacidad y reclamos | Según Q1 |
| WhatsApp | `SITE.whatsappPedidos` (ya existe) |
| Edad mínima | 18 años |

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Modificar | `lib/siteConfig.ts` | Objeto `LEGAL` (sección 5) |
| Crear | `lib/consentimiento.ts` + `lib/__tests__/consentimiento.test.ts` | `urlSinConsulta(url)` para GA y el tipo `EstadoCookies` |
| Crear | `app/(tienda)/terminos/page.tsx` | Términos y condiciones |
| Crear | `app/(tienda)/privacidad/page.tsx` | Política de privacidad |
| Crear | `app/(tienda)/cambios-y-devoluciones/page.tsx` | Cambios, devoluciones y garantía |
| Crear | `app/(tienda)/envios/page.tsx` | Envíos y entregas |
| Crear | `app/(tienda)/cookies/page.tsx` | Política de cookies y botón para cambiar la elección |
| Crear | `Components/Legal/PaginaLegal.tsx` | Plantilla común: título, fecha de actualización, índice y secciones |
| Crear | `Components/CookieBanner/CookieBanner.tsx` | Aviso de cookies |
| Crear | `hooks/useConsentimientoCookies.ts` | Lee y guarda la elección con `crearAlmacenLocal` (clave `janku-cookies`) |
| Modificar | `Components/GoogleAnalytics/GoogleAnalytics.tsx` | Solo se carga con consentimiento; `page_location` sin consulta |
| Modificar | `app/layout.tsx` | Montar `CookieBanner` |
| Modificar | `Components/Footer/Footer.tsx` | Bloque "Legal", datos del titular, preferencias de cookies, redes (Q2) |
| Modificar | `app/(tienda)/contacto/page.tsx` | Correo según Q1 y datos del titular |
| Modificar | `app/(tienda)/auth/registro/page.tsx` | Casilla de aceptación |
| Modificar | `app/api/auth-user/register/route.ts` | Lee `aceptaTerminos` opcional y lo guarda |
| Modificar | `models/User.ts` | Campo opcional `terminos: { version, aceptadoEn }` (aditivo, sin migración) |
| Modificar | `app/(tienda)/checkout/page.tsx` o `Components/Checkout/CheckoutForm.tsx` | Casilla de aceptación y enlaces (donde está hoy el botón de enviar) |
| Modificar | `server/validation/order.schema.ts` | `aceptaTerminos: z.literal(true).optional()` |
| Modificar | `server/services/order.service.ts` | Guardar `terminosVersion` y `terminosAceptadosEn` si llegan |
| Modificar | `models/Order.ts` · `types/order.ts` | Campos opcionales anteriores (aditivos) |
| Modificar | `scripts/smoke.mjs` | Las 5 páginas nuevas responden 200 |
| Modificar | `docs/plan/03-decisiones.md` | D-74 a D-78 (sección 5) |

## 4. Pasos de implementación

1. **`LEGAL` en `lib/siteConfig.ts`** con los datos de la sección 2 y `version` = fecha de los textos (`"2026-11-20"` o la del día en que se publiquen). Todo texto legal, el pie y la 22b leen de aquí; no se repiten los datos en otros archivos.
2. **`PaginaLegal.tsx`**: componente de servidor, sin estado. Título, "Última actualización: {fecha}", secciones con `<h2>` y anclas. Mismo ancho y tipografía que `/contacto`.
3. **Las 5 páginas** con el contenido de la sección 5. Son páginas de servidor estáticas con `metadata` propia (`title`, `description`).
4. **Consentimiento de cookies**:
   - `useConsentimientoCookies()` → `{ estado: "pendiente" | "aceptadas" | "rechazadas", aceptar(), rechazar() }`. El estado del servidor es `"pendiente"` y no se pinta nada hasta que el cliente lo lee (sin desajuste de hidratación).
   - `CookieBanner`: barra inferior, texto corto ("Usamos cookies de Google Analytics para saber cómo se usa la tienda. Las necesarias para el carrito y los favoritos no se pueden desactivar."), enlace a `/cookies` y botones **Aceptar** y **Rechazar** del mismo tamaño y peso. Accesible con teclado, `role="region"` con `aria-label`. No tapa el botón flotante de WhatsApp ni el popup de oferta: si coinciden, el aviso va encima en el eje z y el popup espera a que se elija (o se muestra igual detrás; elegir en la verificación visual).
   - `GoogleAnalytics`: no renderiza nada salvo `estado === "aceptadas"`. Si pasa a `"rechazadas"`, pone `window["ga-disable-<ID>"] = true` y borra las cookies `_ga` y `_ga_*` del dominio.
   - `gtag('config', ID, { page_path: location.pathname, page_location: urlSinConsulta(location.href) })`, para que nunca se envíe `?t=`.
   - `/cookies` y el pie tienen un botón "Cambiar preferencias" que vuelve a `"pendiente"` y muestra el aviso.
5. **Pie de página**:
   - Bloque "Legal": Términos y condiciones · Política de privacidad · Cambios y devoluciones · Envíos y entregas · Cookies · Preferencias de cookies.
   - Línea final: "Janku es el nombre comercial de {titular} · RUC {ruc} · Tienda virtual · Huancayo, Junín · {correo}".
   - Redes según Q2.
6. **Casillas** (sin marcar por defecto; el botón de enviar queda deshabilitado hasta marcarla, con el texto de ayuda visible):
   - Registro: "Tengo 18 años o más y acepto los [Términos y condiciones] y la [Política de privacidad]."
   - Checkout: "Acepto los [Términos y condiciones] y la [Política de cambios y devoluciones], y que mis datos se usen para gestionar mi pedido según la [Política de privacidad]. Tengo 18 años o más."
   - Enlaces en pestaña nueva para no perder el carrito ni el formulario.
   - Se envía `aceptaTerminos: true`; el servidor guarda `LEGAL.version` y la fecha del servidor. Nunca la fecha del navegador.
7. **Contacto**: correo según Q1 y la línea de datos del titular.
8. Typecheck, lint, test, build, smoke y fase 00.

## 5. Contratos

### `LEGAL` (lib/siteConfig.ts)

```ts
export const LEGAL = {
  nombreComercial: "Janku",
  titular: "Rodrigo Alonso Contreras Trujillo",
  ruc: "10610607841",
  domicilio: "Tienda virtual · Huancayo, Junín, Perú",
  correo: "<según Q1>",
  comprobante: "boleta de venta electrónica",
  edadMinima: 18,
  plazoFallasDias: 3,
  plazoVideoProvinciaHoras: 24,
  version: "2026-11-20",
} as const;
```

### Contenido mínimo de cada página

Texto en español, de tú, frases cortas. Cada página empieza con un resumen de 3–4 líneas.

**`/terminos` · Términos y condiciones**
1. Quién vende: datos de `LEGAL`. Janku es una tienda virtual.
2. Cómo se compra: el cliente arma su carrito y envía el pedido por la web o por WhatsApp. **El pedido es una solicitud**: la venta se concreta cuando Janku confirma por WhatsApp el stock, el precio final y la entrega. Si no hay stock, se avisa y no se cobra nada.
3. Precios: en soles, **precio final**; no se suma ningún impuesto. El precio y los descuentos válidos son los que calcula la tienda al confirmar. Un error evidente de precio se corrige antes de confirmar.
4. Pago: **no se paga en la web**. Se coordina por WhatsApp: Yape, Plin, transferencia o efectivo. Comprobante: boleta de venta electrónica; **no se emite factura**.
5. Descuentos y cupones: un cupón por pedido; con el descuento por monto se aplica el mayor, salvo cupones marcados como acumulables; vigencia, usos y monto mínimo según cada cupón.
6. Entrega: remite a `/envios`.
7. Cancelación: el cliente puede cancelar sin costo **antes de que Janku confirme** el pedido, avisando por WhatsApp. Un pedido sin confirmar se cancela solo a las 72 horas.
8. Cambios y devoluciones: remite a `/cambios-y-devoluciones`.
9. Cuenta: mayores de 18 años; el cliente cuida su contraseña; puede eliminar su cuenta desde su perfil.
10. Reclamos: correo de `LEGAL` y Libro de Reclamaciones (enlace en la 22b).
11. Cambios en estos términos: rige la versión publicada el día del pedido.

**`/privacidad` · Política de privacidad**
1. Responsable: datos de `LEGAL`.
2. Qué datos y para qué:
   - Cuenta: nombre, correo, contraseña (cifrada, nadie la puede leer) y celular → crear la cuenta, iniciar sesión, mostrar "Mis pedidos", enviar correos de verificación y recuperación.
   - Pedido: nombre, celular, correo opcional, dirección y referencia (Huancayo), punto de entrega o departamento, provincia y ciudad (provincia), notas → preparar, entregar y coordinar el pedido.
   - Navegación: carrito y favoritos se guardan **en tu navegador**, no en nuestros servidores. Google Analytics solo si aceptas cookies.
   - Seguridad: dirección IP para limitar intentos de acceso y abuso.
   - No pedimos DNI en la web para comprar. En envíos a provincia, la agencia exige nombre y DNI de quien recoge: se coordinan por WhatsApp. El Libro de Reclamaciones también pide documento, porque la ley lo exige (ver 22b).
3. Con quién se comparten (encargados) y **transferencia internacional**: Render (servidores), MongoDB Atlas (base de datos), Resend (envío de correos), Google Analytics (medición, solo con consentimiento), Cloudinary (imágenes de productos; no recibe datos de clientes). Varios están **fuera del Perú** (principalmente Estados Unidos). WhatsApp (Meta) recibe lo que el cliente decide enviar por ese canal. No se venden ni se ceden datos para publicidad.
4. Cuánto tiempo: cuenta hasta que la elimines; pedidos y comprobantes el tiempo que exige la normativa tributaria y de consumo, aunque elimines tu cuenta.
5. Derechos ARCO (acceso, rectificación, cancelación, oposición): por correo a `LEGAL.correo`, indicando nombre y el dato a revisar; respuesta dentro de los plazos de ley. Si no estás conforme, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.
6. Menores: la tienda es para mayores de 18 años.
7. Seguridad: conexión cifrada, contraseñas cifradas, acceso restringido al panel.
8. Cambios en la política: se publica la fecha de la última versión.

**`/cambios-y-devoluciones` · Cambios, devoluciones y garantía** (acordado con el dueño el 2026-11-19)
1. **Revisa tu producto al recibirlo**, en el punto de entrega, con el delivery o en la agencia. Si algo no está bien (producto equivocado, golpeado o incompleto), avisa en ese momento: se cambia ahí mismo o la compra no se concreta y no pagas.
2. **No hay devoluciones ni cambios por cambio de opinión** (color, modelo o talla elegidos por ti) una vez recibido y aceptado el producto.
3. **Fallas de fábrica que no se veían al recibir:** avisa por WhatsApp dentro de los **3 días** desde la entrega, con fotos o un video de la falla. Revisamos el caso y, si corresponde, lo **cambiamos**, lo **reparamos** o, si ya no hay stock, **te devolvemos el dinero** por el mismo medio de pago. No cubre golpes, humedad, mal uso ni daños después de la entrega.
4. **Envíos a provincia:** graba un **video continuo al abrir el paquete**, sin cortes, y avisa dentro de las **24 horas** si llegó dañado o incompleto. Sin ese video no podemos atender reclamos por daños de transporte. Si el daño es de la agencia, te ayudamos con el reclamo ante ella.
5. Cómo pedirlo: WhatsApp o `LEGAL.correo`, con el código de pedido (`JK-…`).
6. Esta política no limita tus derechos como consumidor ni tu derecho a usar el Libro de Reclamaciones o acudir a INDECOPI.

> El punto 6 y el punto 3 son los que evitan que la política sea una cláusula abusiva (Código del Consumidor): no se pueden excluir los defectos que no se veían al recibir.

**`/envios` · Envíos y entregas** (a partir de D-71, D-72 y D-73)
1. **Delivery en Huancayo:** gratis si tu pedido incluye al menos un producto con la etiqueta "Delivery gratis Huancayo"; si no, el costo se coordina por WhatsApp antes de confirmar.
2. **Puntos de entrega:** sin costo; los vigentes se muestran en el checkout.
3. **Envío a provincia:** a los 24 departamentos y el Callao, por agencia. El costo del envío y la agencia **se coordinan por WhatsApp** antes de confirmar, y los paga el cliente. Para el envío se pide nombre y DNI de quien recoge en la agencia, por WhatsApp.
4. Plazos: se coordinan al confirmar; dependen del stock y de la agencia. **No se promete un plazo fijo.**
5. Revisión al recibir y video de desempaque: remite a `/cambios-y-devoluciones`.

**`/cookies` · Cookies**
- Necesarias (no se pueden desactivar): sesión de cuenta y del panel; carrito, favoritos y la propia elección de cookies se guardan en el almacenamiento del navegador.
- Medición (opcionales): Google Analytics (`_ga`, `_ga_*`), solo si aceptas. Para qué: saber qué páginas se visitan. Duración: la que fija Google (hasta 2 años).
- Botón "Cambiar preferencias".

### Decisiones nuevas (se pasan a `03-decisiones.md` al aprobar)

- **D-74 · Datos del titular en un solo sitio** (`LEGAL` en `lib/siteConfig.ts`). Janku se presenta como nombre comercial de una persona natural con RUC 10, tienda virtual, solo boleta.
- **D-75 · Google Analytics solo con consentimiento**, sin consulta en `page_location`. Rechazar es tan fácil como aceptar.
- **D-76 · Aceptación de términos** con casilla sin marcar; la API la acepta como campo opcional (N1-6) y guarda versión y fecha del servidor.
- **D-77 · Política de cambios:** revisión al recibir, sin devoluciones por cambio de opinión, 3 días para fallas de fábrica no visibles, video de desempaque y 24 h en provincia.
- **D-78 · Sin plazos de entrega fijos** en textos públicos.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1:** solo cambian el pie, las casillas, el aviso de cookies y las páginas nuevas (anunciados). El flujo de WhatsApp no cambia. Verificación visual completa.
- **N1-2:** ningún valor de `.env`; el ID de GA se sigue leyendo de `NEXT_PUBLIC_GA_ID`.
- **N1-3:** campos nuevos opcionales en `User` y `Order`; sin migración ni índices.
- **N1-4:** el CSP no se toca (GA ya está permitido). El aviso de cookies no relaja nada.
- **N1-6:** `aceptaTerminos` es opcional; ninguna respuesta cambia de forma.

## 7. Criterios de aceptación verificables

- Primera visita: aparece el aviso; en la pestaña de red **no** hay peticiones a `googletagmanager.com` ni `google-analytics.com` hasta pulsar "Aceptar".
- "Rechazar" → no carga GA; recargar no vuelve a mostrar el aviso; "Cambiar preferencias" lo vuelve a mostrar.
- Con GA aceptado, abrir `/pedido/JK-…?t=…` → el evento enviado no contiene `t=`.
- Registro y checkout no se pueden enviar sin marcar la casilla; con la casilla marcada, el usuario o pedido nuevo guarda `version` y fecha.
- El pie muestra titular, RUC, "Tienda virtual" y correo en escritorio y móvil.
- Las 5 páginas responden 200 (smoke) y se leen bien en móvil.
- `grep -rn "10610607841" app Components lib` → solo `lib/siteConfig.ts`.
- typecheck, lint (0 errores), test, build y smoke en verde.

## 8. Checklist de pruebas manuales para el dueño

- [ ] Fase 00 completa.
- [ ] Leer las 5 páginas; confirmar que describen cómo trabajas de verdad.
- [ ] Primera visita en ventana privada: aviso, aceptar, rechazar, cambiar preferencias.
- [ ] Registro con y sin casilla; pedido con y sin casilla.
- [ ] Pie en el móvil.
- [ ] (Tuyo, fuera del código) inscribir el banco de datos de clientes ante la Autoridad Nacional de Protección de Datos Personales.
- [ ] (Recomendado) revisión de los textos por un abogado.

## 9. Plan de reversa

`git revert` del commit de fusión. Los campos opcionales que se hayan guardado en `User` y `Order` se quedan (N1-3) y no afectan a nada.

## 10. Qué NO tocar en esta fase

- El Libro de Reclamaciones (fase 22b).
- El CSP, las cookies de sesión y los límites de intentos.
- El flujo y el texto del mensaje de WhatsApp.
- Accesibilidad general (texto alternativo, contraste, teclado) y licencias de fotos: propuesta aparte (22c).
- Dependencias: no se instala ninguna librería de cookies.

## 11. Modelo recomendado

**Sonnet** para todo. Revisión del dueño de los textos antes de fusionar.
