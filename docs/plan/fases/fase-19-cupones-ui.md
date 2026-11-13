# Fase 19 · Cupones (interfaz): panel y checkout

## 1. Objetivo y por qué va en este orden

Dar al negocio la pantalla para crear y administrar cupones, y al cliente el campo para usarlos en el checkout. Va después del backend (fase 18).

**Cambios visibles anunciados:** (1) enlace "Cupones" en la barra del panel; (2) en `/checkout`, un campo "¿Tienes un cupón?" (solo existe si el checkout está encendido).

**Decisión de alcance:** el cupón se introduce **solo en `/checkout`**, no en el carrito ni en el panel lateral: validar requiere al servidor y el teléfono del cliente, y así el carrito sigue funcionando sin conexión al backend.

## 2. Prerrequisitos

- Fases 16, 17 y 18 fusionadas.
- Un par de cupones de prueba en la base de desarrollo.
- Rama: `fase-19-cupones-ui`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `app/(admin)/admin/cupones/page.tsx` | Lista + formulario |
| Modificar | `app/(admin)/admin/_components/AdminNav.tsx` | Enlace "Cupones" (permiso `cupones.gestionar`), después de "Descuentos" |
| Crear | `Components/Checkout/CouponField.tsx` | Campo de cupón |
| Modificar | `app/(tienda)/checkout/page.tsx` | Estado del cupón; totales según la validación |
| Modificar | `Components/Checkout/CheckoutForm.tsx` | Incluye `cupon` en el envío; maneja errores de cupón |
| Modificar | `app/(tienda)/pedido/[codigo]/PedidoClient.tsx` | Pasa `cupon` a `OrderSummary` (el componente ya lo admite) |

## 4. Pasos de implementación

1. **Panel** `cupones/page.tsx` (cliente; tomar como modelo de estructura y estilo `descuentos/page.tsx`):
   - Carga `GET /api/admin/coupons`.
   - Tabla: código, descuento ("10 %" / "S/ 15.00", con "tope S/ X" si aplica), compra mínima, vigencia, usos (`usosActuales / usosMaximos` o `usosActuales / ∞`), acumulable (sí/no), estado.
   - Estado calculado en pantalla: "Activo", "Inactivo", "Programado" (inicio futuro), "Vencido" (fin pasado), "Agotado" (usos completos).
   - Botón "Nuevo cupón" y "Editar" → mismo formulario. Interruptor rápido activar/desactivar (`PATCH { activo }`).
   - Formulario según la sección 5. Al editar: `codigo` en solo lectura; si `usosActuales > 0`, `tipo` y `valor` deshabilitados con la nota "Este cupón ya fue usado. Para cambiar el descuento, desactívalo y crea otro."
   - Errores: `fields` bajo cada campo; 409 `DUPLICADO` → "Ya existe un cupón con ese código".
   - Botón "Generar código": 8 caracteres aleatorios del alfabeto `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`.
2. Enlace en `AdminNav`.
3. `CouponField.tsx` (sección 5).
4. `checkout/page.tsx`:
   - Estado `cupon: { codigo: string; resultado: Extract<CouponValidateResult, { valido: true }> } | null`.
   - Totales mostrados: sin cupón → los de `useCart()` (como en la fase 16). Con cupón válido → `descuentoNivel`, `descuentoCupon`, `descuentoTotal` y `total` **de la respuesta del servidor**; el resumen muestra solo los descuentos realmente aplicados según `aplicado`.
   - Si cambia el carrito (ítems o cantidades) o el teléfono mientras hay un cupón aplicado → quitar el cupón y mostrar "Vuelve a aplicar tu cupón".
5. `CheckoutForm.tsx`: añadir `cupon: cupon?.codigo` al cuerpo de `POST /api/orders`. Errores nuevos:
   - 409 con `code` que empieza por `CUPON_` → mostrar `error` junto al campo de cupón, quitar el cupón aplicado y **no** reenviar automáticamente: el cliente decide si confirma sin cupón.
   - 201 con `cuponAplicado: false` habiendo enviado cupón → seguir a la página del pedido (allí se verá el descuento por monto aplicado).
6. typecheck, lint, test, build, smoke. Ejecutar la fase 00 (interruptor apagado) y repetir el flujo de checkout con el interruptor encendido.

## 5. Contratos

**Formulario de cupón (panel)**

| Campo | Control | Notas |
|---|---|---|
| Código | texto, se convierte a mayúsculas al escribir | 4–20, `A-Z 0-9 -` |
| Descripción interna | texto | opcional |
| Tipo | radio: "Porcentaje" / "Monto fijo (S/)" | |
| Valor | número | `%` o `S/` según tipo |
| Tope de descuento (S/) | número | solo visible si porcentaje; vacío = sin tope → envía `null` |
| Compra mínima (S/) | número | por defecto 0 |
| Válido desde / hasta | `datetime-local` | vacío = sin límite → envía `null`. Convertir a ISO interpretando la hora local del navegador |
| Usos totales | número | vacío = ilimitado → `null` |
| Usos por cliente | número | por defecto 1 |
| Se suma al descuento por monto | casilla | por defecto desmarcada. Texto de ayuda: "Si no se marca, el cliente recibe el mayor de los dos descuentos, no ambos." |
| Activo | casilla | por defecto marcada |

```tsx
// Components/Checkout/CouponField.tsx   ("use client")
type Props = {
  items: { id: string; cantidad: number }[];
  telefono: string;                                   // tal como está en el formulario
  aplicado: { codigo: string; mensaje: string } | null;
  onAplicar: (r: Extract<CouponValidateResult, { valido: true }>) => void;
  onQuitar: () => void;
};
```
- Plegado por defecto: enlace "¿Tienes un cupón?". Al abrir: campo de texto + botón "Aplicar".
- "Aplicar" → `POST /api/coupons/validate` con `{ codigo, items, telefono }` (`telefono` solo si pasa `normalizarTelefono`).
- `valido: true` → `onAplicar(r)`; muestra una pastilla verde con el código, `r.mensaje` y un botón "Quitar".
- `valido: false` → muestra `r.mensaje` en rojo bajo el campo.
- 429 → "Demasiados intentos. Espera unos minutos."
- Fallo de red → "No pudimos validar el cupón. Inténtalo de nuevo."
- Botón deshabilitado mientras valida y si el campo está vacío.
- Si `r.aplicado === "nivel"`: la pastilla es **ámbar**, no verde, con el mensaje del servidor (el cupón no mejora el descuento que ya tiene).

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-5**: con cupón, los importes que se muestran vienen del servidor; el navegador no calcula el descuento del cupón. El total definitivo sigue siendo el que devuelve `POST /api/orders`.
- **N1-1**: carrito, panel lateral y resto de la tienda no cambian. Con el checkout apagado, esta fase no tiene ningún efecto visible para el cliente.
- **N1-4**: el campo no revela si un código existe (muestra el mensaje genérico del servidor).
- **N1-7**: no se tocan `server/**` ni `app/api/**`.

## 7. Criterios de aceptación verificables

- Crear, editar, desactivar y reactivar un cupón desde el panel; los cambios se ven en `GET /api/admin/coupons`.
- Crear con un código repetido → mensaje de duplicado, sin recargar.
- Dejar "hasta" anterior a "desde" → error bajo el campo.
- En `/checkout`: aplicar un cupón válido → el total baja exactamente `descuentoTotal` de la respuesta. Confirmar → el pedido guardado tiene ese total.
- Cambiar una cantidad en el carrito (en otra pestaña) y volver → el cupón se quita y pide reaplicar.
- Aplicar un código inventado → "Este cupón no es válido."
- Admin `ventas` no ve el enlace "Cupones" y `/admin/cupones` le muestra "No tienes permiso" (la API responde 403).
- typecheck, lint, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa con el interruptor apagado: nada cambia.
- [ ] Panel → Cupones: creé `BIENVENIDA10` (10 %, 1 uso por cliente). Aparece como "Activo".
- [ ] Checkout: lo apliqué; veo el descuento y el total nuevo; confirmé; en la página del pedido aparece el cupón.
- [ ] Repetí con el mismo celular → "Ya usaste este cupón."
- [ ] Con un carrito que ya tiene descuento por monto mayor que el cupón → me avisa que se aplica el descuento por monto.
- [ ] Creé un cupón "acumulable" y comprobé que se suman los dos.
- [ ] En el panel, el contador de usos subió; cancelé el pedido y bajó.
- [ ] El formulario de cupón es cómodo en móvil.

## 9. Plan de reversa

`git revert` del commit de fusión: desaparecen la pantalla del panel y el campo del checkout. Los cupones siguen en la base y el backend sigue aceptándolos por API. Alternativa sin código para "apagar" un cupón concreto: desactivarlo en Atlas (`activo: false`).

## 10. Qué NO tocar en esta fase

- `Components/Cart/CartSidebar.tsx` y `app/(tienda)/carrito/page.tsx`.
- `context/CartContext.tsx` (el cupón vive en el estado de `/checkout`, no en el contexto ni en `localStorage`).
- Backend de cupones y pedidos.
- La pantalla de descuentos por monto.

## 11. Modelo recomendado

**Sonnet.** Interfaz sobre contratos ya cerrados.
