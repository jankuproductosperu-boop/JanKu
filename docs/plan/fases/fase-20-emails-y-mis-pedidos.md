# Fase 20 · Correos de pedido y "Mis pedidos"

> **Alcance reducido por el dueño (2026-11-17).** Por ahora **no** se hacen los correos de pedido.
>
> **SÍ se hace:**
> - `lib/html.ts` + prueba (`escapeHtml`).
> - `server/email/auth-emails.ts`: solo aplicar `escapeHtml` a `nombre` (cuerpo y asunto), con el mismo texto y aspecto. **Sin** `plantillaBase`.
> - `server/email/send.ts`: tiempo máximo de 10 s y error tipado sin volcar la respuesta (paso 4).
> - Perfil con `telefono` (paso 7; `types/user.ts`; el campo ya existe en `models/User.ts`, así que no hay migración).
> - `/auth/pedidos` (paso 8), enlace y campo en el perfil (paso 9), `proxy.ts` (paso 10) y el caso del smoke.
>
> **NO se hace:** `server/email/layout.ts`, `server/email/order-emails.ts`, los cambios en `order.service.ts`, `ADMIN_NOTIFY_EMAIL` ni `.env.example`.
>
> Las filas, los pasos, los criterios y el checklist de correos de pedido de este archivo quedan como referencia para cuando el dueño los pida. P9 deja de bloquear esta fase.

## 1. Objetivo y por qué va en este orden

1. Enviar correo al cliente (si dejó email) cuando registra un pedido y cuando cambia a confirmado, enviado o cancelado; y un aviso al negocio por cada pedido nuevo (D-36).
2. Página "Mis pedidos" para clientes con cuenta.
3. De paso, cerrar un hueco de las plantillas actuales: insertan el nombre del usuario en el HTML sin escapar.

Va al final del bloque de pedidos porque es un complemento: el flujo ya funciona sin correos.

**Cambios visibles anunciados:** un enlace "Mis pedidos" dentro de `/auth/perfil` y un campo "Celular" en el perfil.

## 2. Prerrequisitos

- Fases 17 y 19 fusionadas.
- **Respuesta a P9**: plan de Resend y dominio remitente verificado (`FROM_EMAIL`).
- **Pasos manuales del dueño:** definir `ADMIN_NOTIFY_EMAIL` en `.env.local` y en Render (dirección que recibe los avisos de pedido nuevo). Si no se define, simplemente no se envía el aviso al negocio.
- Envío de correos reales durante las pruebas: **requiere permiso del dueño en la sesión** (N1-8) y usa direcciones suyas.
- Rama: `fase-20-emails-y-mis-pedidos`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `lib/html.ts` + `lib/__tests__/html.test.ts` | `escapeHtml` |
| Crear | `server/email/layout.ts` | `plantillaBase` |
| Crear | `server/email/order-emails.ts` | 4 correos de pedido |
| Modificar | `server/email/auth-emails.ts` | Usa `plantillaBase` y `escapeHtml`; **mismo texto y aspecto** |
| Modificar | `server/email/send.ts` | Tiempo máximo de 10 s; error tipado sin volcar la respuesta |
| Modificar | `server/services/order.service.ts` | Dispara los correos **después** de confirmar la transacción |
| Modificar | `app/api/auth-user/profile/route.ts` | `PUT` acepta `telefono`; `GET` lo devuelve |
| Modificar | `types/user.ts` | `UserProfile.telefono?: string` |
| Crear | `app/(tienda)/auth/pedidos/page.tsx` | Mis pedidos |
| Modificar | `app/(tienda)/auth/perfil/page.tsx` | Enlace "Mis pedidos" y campo "Celular" |
| Modificar | `proxy.ts` | Añadir `"/auth/pedidos"` a `PROTECTED_USER_ROUTES` y al `matcher` |
| Modificar | `.env.example` | Descomentar `ADMIN_NOTIFY_EMAIL=` |
| Modificar | `scripts/smoke.mjs` | `GET /auth/pedidos` sin cookie → redirección a `/auth/login` |

## 4. Pasos de implementación

1. `lib/html.ts` + prueba.
2. `server/email/layout.ts`: extraer el HTML común de los tres correos actuales (cabecera azul `#2C2C6C` con "JANKU", cuerpo gris claro, botón, pie).
3. Reescribir `auth-emails.ts` sobre `plantillaBase`. Comparar el HTML generado antes y después para un caso de ejemplo: solo deben diferir espacios en blanco y el escapado de `nombre`.
4. `send.ts`: `AbortSignal.timeout(10_000)`; si la respuesta no es OK, lanzar `new Error("Resend respondió " + response.status)` (sin incluir el cuerpo de la respuesta ni la clave).
5. `order-emails.ts` (sección 5).
6. `order.service.ts`: función interna
   ```ts
   function notificar(tarea: () => Promise<void>, evento: string, codigo: string) {
     void tarea().catch((e) => log.error("email.fallo", e, { evento, codigo }));
   }
   ```
   Llamadas, **siempre después** de que la escritura/transacción haya terminado bien y **sin `await`**:
   - `crearPedido` → `enviarPedidoRecibido` (si hay email) y `enviarAvisoNuevoPedido` (si existe `ADMIN_NOTIFY_EMAIL`).
   - `confirmarPedido`, `marcarEnviado`, `cancelarPedido` → `enviarCambioEstado` (si hay email). `marcarEntregado` no envía correo.
   - `cancelarPedido` por caducidad (`actor === null`) **sí** avisa al cliente.
7. Perfil: `PUT` acepta `telefono` (cadena vacía para borrar, o un valor que pase `normalizarTelefono`; si no pasa → 400 con `fields.telefono`). `GET` añade `telefono` al `select`.
8. `auth/pedidos/page.tsx` (cliente): `GET /api/orders/mine`; lista de tarjetas (código, fecha, estado con insignia, nº de ítems, total) que enlazan a `/pedido/<codigo>` (sin token: el dueño con sesión tiene acceso). Estado vacío: "Aún no tienes pedidos" + enlace a la tienda. Si responde 401 → `router.push("/auth/login")`.
9. `perfil/page.tsx`: botón/enlace "Mis pedidos" junto al encabezado y campo "Celular" en el formulario de datos, con el mismo estilo que los campos existentes.
10. `proxy.ts`: proteger `/auth/pedidos`.
11. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// lib/html.ts
export function escapeHtml(s: string): string;   // & < > " '  →  &amp; &lt; &gt; &quot; &#39;

// server/email/layout.ts
export function plantillaBase(args: { titulo: string; cuerpoHtml: string; boton?: { texto: string; url: string }; pieHtml?: string }): string;

// server/email/order-emails.ts
export async function enviarPedidoRecibido(pedido: OrderPublic, token: string): Promise<void>;
export async function enviarCambioEstado(pedido: OrderPublic, estado: "confirmado" | "enviado" | "cancelado", detalle?: string): Promise<void>;
export async function enviarAvisoNuevoPedido(pedido: OrderPublic, idInterno: string): Promise<void>;
```

| Correo | Para | Asunto | Contenido | Botón |
|---|---|---|---|---|
| Pedido recibido | cliente | `Recibimos tu pedido {codigo} — Janku` | Saludo, tabla de ítems (nombre × cantidad, subtotal), descuentos, total, método de entrega, "Escríbenos por WhatsApp para coordinar el pago y la entrega." | "Ver mi pedido" → `{SITE_URL}/pedido/{codigo}?t={token}` |
| Confirmado | cliente | `Tu pedido {codigo} fue confirmado` | Texto breve + total | "Ver mi pedido" → `{SITE_URL}/pedido/{codigo}` (sin token) |
| Enviado | cliente | `Tu pedido {codigo} va en camino` | Texto breve + `detalle` (nota del envío) si existe | ídem |
| Cancelado | cliente | `Tu pedido {codigo} fue cancelado` | Texto breve + motivo (`detalle`) + "Si crees que es un error, escríbenos." | "Ir a la tienda" → `{SITE_URL}` |
| Nuevo pedido | `ADMIN_NOTIFY_EMAIL` | `Nuevo pedido {codigo} — S/ {total}` | Cliente, teléfono, ítems, total, entrega | "Abrir en el panel" → `{SITE_URL}/admin/pedidos/{idInterno}` |

Reglas de las plantillas:
- **Todo** valor que venga del cliente o del catálogo (`nombre`, `direccion`, `notasCliente`, nombres de producto, motivo) pasa por `escapeHtml`.
- Importes con `formatearSoles`.
- Los correos de cambio de estado **no llevan el token** (el enlace exige sesión del dueño; quien compró sin cuenta conserva el enlace con token del primer correo).
- Sin imágenes remotas de producto (evita correos pesados y bloqueos).

`PUT /api/auth-user/profile`: cuerpo actual + `telefono?: string`. Respuesta actual + `user.telefono`.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: los tres correos existentes conservan asunto, texto y diseño. El perfil solo gana un enlace y un campo.
- **N1-4**: se escapa el HTML (mejora). El token de acceso solo viaja en el primer correo, al email que el propio cliente escribió.
- **N1-2**: ni `log` ni los errores incluyen direcciones de correo completas, la clave de Resend o el token.
- **N1-8**: sin envíos reales sin permiso. Para probar sin enviar: con `RESEND_API_KEY` vacía en local, `sendEmail` falla y `log.error("email.fallo")` debe aparecer **sin que el pedido falle**.
- **N1-6**: `GET /api/orders/mine` y los endpoints de pedidos no cambian.

## 7. Criterios de aceptación verificables

- `escapeHtml('<b>"A&B"</b>')` → `&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;`.
- Registrar una cuenta con nombre `<img src=x>` → el correo de verificación muestra el texto literal, no una imagen rota.
- Con `RESEND_API_KEY` inválida en local: `POST /api/orders` responde 201 en el tiempo habitual (no espera 10 s) y el log muestra `email.fallo`.
- `grep -n "await enviar\(PedidoRecibido\|CambioEstado\|AvisoNuevoPedido\)" server/services/order.service.ts` → vacío (nunca con `await`).
- Los envíos están **fuera** de los bloques `withTransaction` (revisión visual del diff).
- `GET /auth/pedidos` sin sesión → redirige a `/auth/login`. Con sesión → lista solo los pedidos de ese usuario.
- `PUT profile` con `telefono: "123"` → 400 `fields.telefono`; con `"987654321"` → guarda `51987654321`.
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] Registro de cuenta nueva: el correo de verificación se ve igual que siempre. Igual el de "olvidé mi contraseña".
- [ ] Pedido con mi correo: me llega "Recibimos tu pedido" con ítems y total correctos; el botón abre mi pedido.
- [ ] Al correo del negocio llega "Nuevo pedido"; su botón abre el pedido en el panel.
- [ ] Confirmé, marqué enviado (con una nota) y cancelé pedidos de prueba: llegó un correo por cada cambio.
- [ ] Pedido **sin** correo: se registra normal, sin errores.
- [ ] Con sesión: `/auth/perfil` → "Mis pedidos" → veo mis pedidos y puedo abrir cada uno.
- [ ] Guardé mi celular en el perfil.
- [ ] Los correos se leen bien en el móvil y no caen en spam.

## 9. Plan de reversa

`git revert` del commit de fusión: dejan de enviarse correos de pedido; los de cuenta vuelven a su versión anterior. `User.telefono` queda en la base sin uso. Para apagar solo el aviso al negocio sin código: quitar `ADMIN_NOTIFY_EMAIL` en Render.

## 10. Qué NO tocar en esta fase

- `Components/Navbar` (no se añade "Mis pedidos" al menú: sería un cambio visible del sitio público no pedido; si el dueño lo quiere, es una tarea aparte).
- El SDK de `resend` instalado: se sigue usando `fetch`, como hoy.
- Lógica de estados, stock y cupones.
- Correos de marketing, recordatorios o carritos abandonados: fuera del plan.

## 11. Modelo recomendado

**Sonnet.** El único punto delicado (enviar fuera de la transacción y sin `await`) está especificado y tiene criterio verificable.
