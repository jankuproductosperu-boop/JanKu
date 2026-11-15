# Fase 16b · Entrega: delivery gratis por producto, puntos de entrega y envío a provincia

> **PROPUESTA pendiente de aprobación del dueño.** Redactada a partir de lo que pidió el dueño en la sesión de la fase 17. Hasta que la apruebe no se escribe código. Sustituye lo que D-33 decía sobre el envío.

> ⚠️ **Riesgo medio-alto:** cambia `crearPedido` (fase 15, N1-5) y añade un modelo nuevo.

## 1. Objetivo y por qué va en este orden

Hoy el checkout dice que el delivery en Huancayo es siempre gratis y ofrece "Recojo en tienda" y "Envío a otra ciudad". El negocio funciona distinto:

- El delivery en Huancayo es gratis **solo** si el carrito incluye al menos un producto marcado con "🚚 Delivery gratis Huancayo" (campo `deliveryHuancayo`, ya existe). Si no, se cobra un adicional que se coordina por WhatsApp.
- En lugar de "recojo en tienda" hay **puntos de entrega** que el dueño administra desde el panel. Sin costo adicional.
- "Envío a otra ciudad" pasa a llamarse **"Envío a provincia"** y pide menos datos.

Va **después de la fase 17** (que mantiene `order.service` y las pantallas de pedidos que aquí se amplían) y **antes** de encender el checkout en producción. Con el interruptor `NEXT_PUBLIC_CHECKOUT_ENABLED` apagado nada de esto es visible para los clientes (salvo los textos de `/carrito`, ver pregunta Q1).

## 2. Prerrequisitos

- Fases 15, 16 y 17 fusionadas.
- Respuesta a las preguntas abiertas de la sección 10.
- Rama: `fase-16b-entrega`.

## 3. Decisiones propuestas (pasan a `03-decisiones.md` al aprobar)

- **D-71 · Delivery gratis por carrito.** Con método `delivery_huancayo`: si **algún** ítem de tipo producto tiene `deliveryHuancayo` verdadero → `costoEnvio = 0`, `envioPorCoordinar = false`. Si ninguno → `costoEnvio = 0` y `envioPorCoordinar = true` (mensaje: "Se cobrará un adicional por el delivery; te avisaremos el costo por WhatsApp"). Las **promociones nunca cuentan** como gratis (confirmado por el dueño). La regla se evalúa en el **servidor** (N1-5); el navegador solo la muestra. Se interpreta igual que la tienda (`ProductCard`: valor verdadero).
- **D-72 · Puntos de entrega.** Entidad administrable (`DeliveryPoint`). Elegir uno = método `punto_entrega`: sin costo ni aviso de adicional. El pedido guarda una **copia** del punto (nombre, dirección, referencia, horario) para que editarlo después no cambie pedidos antiguos. Nunca se borran: se desactivan (N1-3). `recojo` se conserva en el enum solo para pedidos antiguos y ya no se ofrece.
- **D-73 · Envío a provincia.** Datos: departamento (lista cerrada de 25: 24 departamentos + Callao), provincia y ciudad (texto libre). Sin dirección ni referencia. Aviso fijo: "La agencia de envío, tu DNI y el resto de datos los coordinamos por WhatsApp." Sigue siendo `envioPorCoordinar = true` (D-33).

## 4. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `lib/shipping.ts` | `DEPARTAMENTOS`, `entregaGratis(items)` (pura, con pruebas) |
| Crear | `lib/__tests__/shipping.test.ts` | Pruebas de `entregaGratis` y de la lista |
| Crear | `models/DeliveryPoint.ts` | Modelo del punto de entrega |
| Modificar | `models/Order.ts` | `entrega.provincia`, `entrega.puntoEntrega` (copia), enum con `punto_entrega` (se conserva `recojo`) |
| Modificar | `types/order.ts`, `types/index.ts` | `MetodoEntrega`, campos nuevos; crear `types/deliveryPoint.ts` |
| Crear | `server/validation/deliveryPoint.schema.ts` | Esquemas del punto |
| Modificar | `server/validation/order.schema.ts` | `punto_entrega` (con `puntoEntregaId`), `provincia`, reglas por método |
| Crear | `server/services/deliveryPoint.service.ts` | Listar activos, CRUD admin (sin borrar) |
| Modificar | `server/services/order.service.ts` | Aplicar D-71/72/73 en `crearPedido`; devolver los campos nuevos en las vistas |
| Crear | `app/api/delivery-points/route.ts` | `GET` público: solo activos |
| Crear | `app/api/admin/delivery-points/route.ts`, `[id]/route.ts` | `GET`, `POST`, `PUT` (permiso `catalogo.editar`) |
| Crear | `app/(admin)/admin/puntos-entrega/page.tsx` | Lista y formulario |
| Modificar | `app/(admin)/admin/_components/AdminSidebar.tsx` | Enlace "Puntos de entrega" |
| Modificar | `app/(admin)/admin/pedidos/[id]/page.tsx` | Mostrar provincia y punto de entrega |
| Modificar | `Components/Checkout/CheckoutForm.tsx`, `app/(tienda)/checkout/page.tsx` | Opciones y textos nuevos, desplegable, aviso |
| Modificar | `app/(tienda)/pedido/[codigo]/PedidoClient.tsx` | Mostrar entrega nueva |
| Modificar | `scripts/smoke.mjs` | `GET /api/delivery-points` → 200 arreglo; `GET /api/admin/delivery-points` sin cookie → 401 |

## 5. Contratos

```ts
// lib/shipping.ts
export const DEPARTAMENTOS: readonly string[]; // 24 + "Callao"
export function entregaGratis(items: { tipo: "producto" | "promocion"; deliveryHuancayo?: boolean | null }[]): boolean;
// true si algún ítem tipo "producto" tiene deliveryHuancayo === true.

// types/deliveryPoint.ts
export type DeliveryPoint = { _id: string; nombre: string; direccion: string; referencia?: string; horario?: string; activo: boolean; orden: number };

// types/order.ts (MetodoEntrega)
export type MetodoEntrega = "delivery_huancayo" | "punto_entrega" | "envio_provincia" | "recojo"; // "recojo" solo histórico
```

Reglas de validación por método (`pedidoCrearSchema`, endpoint estricto):

| Método | Obligatorio | Prohibido / ignorado |
|---|---|---|
| `delivery_huancayo` | `direccion`; `referencia` opcional | `provincia`, `ciudad`, `departamento`, `puntoEntregaId` |
| `punto_entrega` | `puntoEntregaId` (debe existir y estar activo, si no 409 `ITEMS_NO_DISPONIBLES`-style con campo `entrega.puntoEntregaId`) | dirección y datos de provincia |
| `envio_provincia` | `departamento` (de `DEPARTAMENTOS`), `provincia`, `ciudad` | `direccion`, `referencia` |

**Textos del checkout**

| Opción | Etiqueta | Ayuda |
|---|---|---|
| `delivery_huancayo` | Delivery en Huancayo | Si el carrito califica: "Gratis". Si no: "Se cobrará un adicional por el delivery; te avisaremos el costo por WhatsApp". |
| `punto_entrega` | Puntos de entrega | "Sin costo adicional" + desplegable con los puntos activos |
| `envio_provincia` | Envío a provincia | "El costo de envío se coordina por WhatsApp" + los tres campos + el aviso de D-73 |

Cómo sabe el checkout si el carrito califica: lee los productos públicos que la tienda ya usa (`/api/products`, con la caché de `lib/cache`) y aplica `entregaGratis`. Es solo para mostrar; el servidor decide (D-71).

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: el sitio público no cambia con el interruptor apagado, **salvo** el texto fijo de `/carrito` (Q1), que hoy afirma "GRATIS" para todo.
- **N1-3**: modelo nuevo y campos nuevos; nada se borra ni se renombra. `recojo` se conserva. Los puntos se desactivan, no se eliminan. Sin migración.
- **N1-4**: el endpoint admin exige `requireAdmin("catalogo.editar")`; el público solo devuelve activos y campos públicos.
- **N1-5**: el navegador no envía costos ni "gratis"; solo `puntoEntregaId`. El servidor relee el punto y los productos.
- **N1-6**: `POST /api/orders` conserva ruta, método y respuesta; los campos nuevos son opcionales o dependen del método nuevo.
- **N1-7**: se tocan archivos de las fases 15, 16 y 17 porque esta fase los amplía; es la lista de arriba.

## 7. Criterios de aceptación verificables

- Carrito solo con productos **sin** `deliveryHuancayo` + delivery en Huancayo: el pedido guardado queda con `costoEnvio 0` y `envioPorCoordinar true`; el checkout muestra el aviso.
- Carrito mezclado (uno con y otros sin): `envioPorCoordinar false` (gratis).
- Carrito con solo promociones + delivery: `envioPorCoordinar true`.
- `punto_entrega` con un punto activo: se guarda la copia; si el punto se desactiva o no existe → 409 con el campo.
- `envio_provincia` con departamento fuera de la lista → 400 con `fields`.
- Enviar `direccion` en `envio_provincia` → 400 (el esquema es estricto).
- Editar un punto después **no** cambia el pedido ya hecho.
- El punto que se crea o edita en el panel aparece en el checkout sin recargar el servidor (sin caché que lo retenga).
- typecheck, lint (sin errores nuevos), test, build y smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Panel → Puntos de entrega: crear, editar, desactivar. El checkout muestra solo los activos.
- [ ] Marcar y desmarcar "Delivery gratis Huancayo" en productos de prueba y ver el aviso o "Gratis" según el carrito.
- [ ] Pedido a un punto de entrega: sale en `/pedido/...` y en el detalle del panel.
- [ ] Envío a provincia: el desplegable trae los 25; los textos son los que quiero.
- [ ] Fase 00 con el interruptor apagado.

## 9. Plan de reversa

`git revert` de la fusión. Los pedidos hechos con los métodos nuevos quedan en la base con campos que el código viejo ignora. Interruptor del checkout apagado en Render.

## 10. Preguntas (resueltas salvo la última)

Respondidas por el dueño:

- **Q1 · Sí.** `/carrito` dice hoy "Delivery Huancayo GRATIS" y "Envío gratis en Huancayo" para cualquier carrito. Se ajusta: gratis solo si el carrito califica (`entregaGratis`); si no, "El costo del delivery se coordina por WhatsApp". Es el único cambio al sitio público de esta fase.
- **Q2 · Enterado.** El campo `deliveryHuancayo` viene marcado por defecto; el dueño desmarcará los productos que no ofrezcan delivery gratis.
- **Q3 · Solo departamentos.** El desplegable lleva únicamente departamentos (24 + Callao, sin "Lima Provincias"). Los demás datos del destino los escribe el cliente.

Pendiente de confirmar con el dueño: ¿además de **provincia** y **ciudad** quiere un campo **distrito**? Por defecto: solo departamento (desplegable), provincia y ciudad (D-73).

## 11. Qué NO tocar

- Cupones, correos, "Mis pedidos" (fases 18–20).
- `ajustarStock`, `descontarPorPedido` y las transiciones de estado (fase 17).
- El mensaje de WhatsApp del pedido y el botón de WhatsApp directo del carrito.

## 12. Modelo recomendado

**Modelo superior (Opus)** para `order.service.ts` y `order.schema.ts` (reglas del servidor, N1-5). **Sonnet** para el modelo y servicio de puntos, el panel, el checkout y los textos. Una sesión por bloque, sin mezclar con otras fases (N1-7).
