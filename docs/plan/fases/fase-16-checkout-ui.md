# Fase 16 · Checkout y página de pedido (interfaz)

## 1. Objetivo y por qué va en este orden

Dar al cliente la pantalla para cerrar la compra (`/checkout`) y la de confirmación (`/pedido/[codigo]`), detrás del interruptor `NEXT_PUBLIC_CHECKOUT_ENABLED` (D-27). **Con el interruptor apagado, la tienda se comporta exactamente como hoy.**

Va después del backend de pedidos (fase 15). Se puede fusionar y desplegar con el interruptor apagado; se enciende cuando la fase 17 (gestión en el panel) también esté lista.

**Cambio visible anunciado (solo con el interruptor encendido):** los botones "Realizar pedido" del carrito llevan a `/checkout` en vez de abrir WhatsApp directamente.

## 2. Prerrequisitos

- Fase 15 fusionada.
- **Respuestas a P6** (texto y opciones de entrega) y **P14** (¿qué métodos de entrega se ofrecen y con qué nombre?). Por defecto: los tres de D-33 con los textos de la sección 5.
- **Paso manual del dueño:** en local, añadir `NEXT_PUBLIC_CHECKOUT_ENABLED=true` a `.env.local` para probar. **En Render no se añade todavía** (o se añade con valor `false`): se enciende al terminar la fase 17. Recordatorio: las variables `NEXT_PUBLIC_*` se leen al construir; cambiarla en Render exige un nuevo deploy.
- Rama: `fase-16-checkout-ui`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Modificar | `lib/siteConfig.ts` | Añadir `checkoutHabilitado: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true"` |
| Crear | `app/(tienda)/checkout/page.tsx` | Página (cliente) |
| Crear | `Components/Checkout/CheckoutForm.tsx` | Formulario |
| Crear | `Components/Checkout/OrderSummary.tsx` | Resumen de ítems y totales (reutilizado en las dos páginas) |
| Crear | `app/(tienda)/pedido/[codigo]/page.tsx` | Página de servidor |
| Crear | `app/(tienda)/pedido/[codigo]/PedidoClient.tsx` | Parte interactiva (botón de WhatsApp, vaciar carrito) |
| Modificar | `Components/Cart/CartSidebar.tsx` | Botón principal condicional |
| Modificar | `app/(tienda)/carrito/page.tsx` | Botón principal condicional |
| Modificar | `scripts/smoke.mjs` | `GET /checkout` → 200; `GET /pedido/JK-000000-XXXX` → 404 |
| Modificar | `.env.example` | Descomentar `NEXT_PUBLIC_CHECKOUT_ENABLED=` |

## 4. Pasos de implementación

1. `siteConfig.checkoutHabilitado`.
2. `OrderSummary.tsx` (solo presentación; props en sección 5). Reutiliza las clases del bloque "Resumen del Pedido" de `carrito/page.tsx` para que se vea igual.
3. `CheckoutForm.tsx` (sección 5).
4. `checkout/page.tsx`:
   - Si `!SITE.checkoutHabilitado` → `router.replace("/carrito")`.
   - Si el carrito está vacío (tras cargar de `localStorage`) → mensaje "Tu carrito está vacío" con enlace a `/`.
   - Dos columnas en escritorio (formulario | resumen), una en móvil (resumen arriba, plegable).
   - Rellena nombre y email con `useUser()` si hay sesión.
5. Envío del formulario:
   - `POST /api/orders` con `{ items: cart.map(i => ({ id: i._id, cantidad: i.cantidad })), cliente, entrega, notas, website }`.
   - 201 → `router.push(`/pedido/${codigo}?t=${token}&nuevo=1`)`. **No** vaciar el carrito aquí (se vacía en la página de pedido, así un fallo de navegación no lo pierde).
   - 400 con `fields` → mostrar cada mensaje bajo su campo (`cliente.telefono`, `entrega.direccion`…).
   - 409 `SIN_STOCK` / `ITEMS_NO_DISPONIBLES` → aviso arriba listando los productos afectados (cruzar `fields` por id con el carrito para mostrar el nombre) y botón "Volver al carrito".
   - 429 → "Has hecho demasiados pedidos seguidos. Intenta más tarde o escríbenos por WhatsApp."
   - Otro error o fallo de red → "No pudimos registrar tu pedido. Inténtalo de nuevo." El botón vuelve a habilitarse.
   - Mientras envía: botón deshabilitado con "Enviando…" (evita doble pedido).
6. `pedido/[codigo]/page.tsx` (servidor): lee `params.codigo` y `searchParams.t`; `usuario = await getOptionalUser()`; llama a `obtenerPedidoPublico(codigo, { token: t, userId: usuario?.id })`; si lanza → `notFound()`. `export const metadata = { robots: { index: false } }` y `export const dynamic = "force-dynamic"`.
7. `PedidoClient.tsx`: si `nuevo=1` → `clearCart()` una vez y quita `nuevo` de la URL con `router.replace` (conservando `t`). Muestra el contenido de la sección 5.
8. Botones del carrito, en ambos archivos:
   ```tsx
   {SITE.checkoutHabilitado ? (
     <Link href="/checkout" onClick={…cerrar panel si aplica} className="…mismas clases del botón verde…">Realizar Pedido</Link>
   ) : (
     <a href={enlaceWhatsAppCarrito(…)} …>…botón actual sin cambios…</a>
   )}
   ```
   Con el interruptor encendido el botón conserva tamaño y posición, pero usa el color de marca (`bg-[#2C2C6C]`) y **sin** el icono de WhatsApp (ya no abre WhatsApp).
9. typecheck, lint, test, build (dos veces: con y sin la variable), smoke. Ejecutar la fase 00 **con el interruptor apagado** y repetir el bloque del carrito **con el interruptor encendido**.

## 5. Contratos

```tsx
// Components/Checkout/OrderSummary.tsx
type Props = {
  items: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number; imagenUrl?: string }[];
  subtotal: number;
  descuentoNivel?: { nombre: string; monto: number } | null;
  cupon?: { codigo: string; monto: number } | null;
  costoEnvio: number;
  envioPorCoordinar?: boolean;
  total: number;
};
```

**Campos de `CheckoutForm`** (todos con `<label>` visible y `autocomplete` adecuado):

| Campo | Control | Regla en el navegador | Envía |
|---|---|---|---|
| Nombre completo | texto | obligatorio, 2–100 | `cliente.nombre` |
| Celular (WhatsApp) | `tel`, `inputMode="numeric"` | 9 dígitos que empiezan en 9 (`normalizarTelefono`) | `cliente.telefono` |
| Correo (opcional) | `email` | formato | `cliente.email` |
| ¿Cómo quieres recibirlo? | 3 opciones tipo radio | obligatorio | `entrega.metodo` |
| Dirección | texto | obligatorio salvo "recojo" | `entrega.direccion` |
| Referencia (opcional) | texto | máx. 200 | `entrega.referencia` |
| Ciudad, Departamento | texto | solo y obligatorios en "provincia" | `entrega.ciudad`, `entrega.departamento` |
| Notas para tu pedido (opcional) | área de texto | máx. 500, con contador | `notas` |
| *(oculto)* `website` | `input` fuera de pantalla, `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden` | debe quedar vacío | `website` |

Opciones de entrega y textos:

| Valor | Etiqueta | Texto de ayuda |
|---|---|---|
| `delivery_huancayo` | Delivery en Huancayo | Gratis |
| `recojo` | Recojo en tienda | Te indicamos el punto de recojo por WhatsApp |
| `envio_provincia` | Envío a otra ciudad | El costo de envío se coordina por WhatsApp |

Bajo el botón "Confirmar pedido": *"Al confirmar, registramos tu pedido y te llevamos a WhatsApp para coordinar el pago y la entrega. Aún no se realiza ningún cobro."*

El resumen de `/checkout` se calcula en el navegador con `useCart()` (mismos valores que el carrito). El total definitivo es el que devuelve el servidor y se muestra en `/pedido/[codigo]`.

**Contenido de `/pedido/[codigo]`:**
1. Encabezado: "¡Pedido registrado!" (si `nuevo=1`) o "Pedido {codigo}".
2. Código grande y copiable; estado con `etiquetaEstado`.
3. **Botón principal verde "Coordinar por WhatsApp"** → `enlaceWhatsAppPedido({ codigo, total, nombre })`, pestaña nueva. Texto: "Último paso: escríbenos para coordinar el pago y la entrega."
4. `OrderSummary` con los datos del pedido.
5. Datos de entrega y contacto.
6. Línea de tiempo simple con `historial`.
7. Aviso: "Guarda este enlace para consultar tu pedido." y enlace "Seguir comprando".
8. Si `estado === "cancelado"`: aviso rojo y sin botón de WhatsApp de coordinación.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: con la variable ausente o distinta de `"true"`, el diff funcional del carrito es cero: se renderiza exactamente la rama `else`, que es el JSX actual sin modificar. `/checkout` redirige a `/carrito`.
- **N1-5**: el formulario envía solo ids y cantidades; nunca precios.
- **N1-4**: la página de pedido no se indexa, no se cachea y devuelve 404 sin token válido. El token no se guarda en `localStorage` ni se envía a Analytics: comprobar que `Components/GoogleAnalytics` no registra la URL con parámetros; si lo hace (envío automático de `page_location`), **reportarlo al dueño** como riesgo sin modificar el componente.
- **N1-7**: no se cambia el CSP (todo es mismo origen).

## 7. Criterios de aceptación verificables

- Sin la variable: `GET /checkout` redirige a `/carrito` en el navegador; el botón del carrito abre `wa.me` como hoy.
- Con la variable: flujo completo producto → carrito → checkout → pedido → WhatsApp.
- Enviar con el teléfono `12345` → error bajo el campo, sin petición al servidor.
- Doble clic rápido en "Confirmar pedido" → un solo pedido en la base.
- Abrir `/pedido/<codigo>` sin `?t=` en ventana privada → 404. Con sesión del cliente que lo hizo → se ve.
- Recargar `/pedido/<codigo>?t=…` → sigue mostrándose; el carrito ya está vacío.
- El total de `/pedido/…` coincide con el del resumen de `/checkout`.
- `npm run build` con y sin la variable termina bien.
- typecheck, lint, test, smoke en verde.

## 8. Checklist de pruebas manuales para mí

**Con el interruptor APAGADO**
- [ ] Fase 00 completa: todo igual que siempre, el botón abre WhatsApp.

**Con el interruptor ENCENDIDO (en local)**
- [ ] Carrito → "Realizar pedido" → `/checkout`.
- [ ] Dejar campos vacíos → mensajes claros bajo cada campo.
- [ ] Elegir "Recojo en tienda" → desaparece la dirección. "Envío a otra ciudad" → aparecen ciudad y departamento y el aviso de costo por coordinar.
- [ ] Confirmar → llego a la página del pedido, con código, resumen correcto y carrito vacío.
- [ ] "Coordinar por WhatsApp" abre el chat con el código y el total.
- [ ] En móvil (390 px): el formulario es cómodo; el teclado numérico aparece en el celular.
- [ ] Con sesión iniciada: nombre y correo vienen rellenos.
- [ ] Poner en el carrito más unidades de las que hay en stock → al confirmar, aviso de stock insuficiente con el nombre del producto.
- [ ] Los textos de entrega son los que quiero (P14).

## 9. Plan de reversa

Nivel 1 (inmediato, sin código): poner `NEXT_PUBLIC_CHECKOUT_ENABLED=false` en Render y redeployar → vuelve el flujo de WhatsApp.
Nivel 2: `git revert` del commit de fusión. Los pedidos ya creados permanecen en la base.

## 10. Qué NO tocar en esta fase

- `server/**` y `app/api/**` (si falta algo del backend, se reporta; no se parchea aquí).
- El resto del carrito (cantidades, avisos de descuento, diseño).
- Campo de cupón (fase 19). Enlace "Mis pedidos" (fase 20).
- `next.config.ts`.

## 11. Modelo recomendado

**Sonnet.** Interfaz con contratos definidos y un interruptor que limita el riesgo.
