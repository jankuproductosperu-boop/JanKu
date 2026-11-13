# Fase 14 · Reglas de precio compartidas y carrito robusto

## 1. Objetivo y por qué va en este orden

Mover el cálculo de subtotal, descuento por monto y total a una función pura (`lib/pricing.ts`) con pruebas, que usan **igual** el carrito del navegador y, desde la fase 15, el servidor. También: un solo generador del mensaje de WhatsApp, un solo lugar para el número de teléfono, el carrito aprende a distinguir productos de promociones y deja de romperse si `localStorage` está corrupto.

**No debe cambiar nada visible**: mismos números, mismo mensaje, mismo número.

Va justo antes de pedidos porque `crearPedido` necesita estas funciones, y la regla N1-5 exige que cliente y servidor calculen con el mismo código.

## 2. Prerrequisitos

- Fase 13 fusionada.
- **Respuesta a P10** (¿cupón y descuento por monto se acumulan?). La función de cupones se escribe aquí aunque se use en la fase 18. Por defecto: D-39.
- Rama: `fase-14-precios-y-carrito`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `lib/pricing.ts` | Funciones de precio |
| Crear | `lib/__tests__/pricing.test.ts` | Pruebas |
| Crear | `lib/siteConfig.ts` | Constantes del sitio |
| Crear | `types/coupon.ts` | Solo `CuponAplicable` por ahora; exportar en `types/index.ts` |
| Modificar | `lib/whatsapp.ts` | Añadir `construirMensajeCarrito`, `enlaceWhatsAppCarrito`; usar `siteConfig` |
| Crear | `lib/__tests__/whatsapp.test.ts` | Prueba de texto exacto |
| Modificar | `context/CartContext.tsx` | Usa `lib/pricing`; lectura segura de `localStorage`; guarda `tipo` |
| Modificar | `Components/Cart/CartSidebar.tsx` | Usa `enlaceWhatsAppCarrito`; borra su `generateWhatsAppLink` |
| Modificar | `app/(tienda)/carrito/page.tsx` | Ídem |
| Modificar | `Components/ProductCard/ProductCard.tsx`, `app/(tienda)/producto/[slug]/ProductPageClient.tsx`, `app/(tienda)/favoritos/page.tsx` | Añadir `tipo: "producto"` en su llamada a `addToCart` |
| Modificar | `app/(tienda)/promocion/[id]/PromocionPageClient.tsx`, `app/(tienda)/promociones/page.tsx` | Añadir `tipo: "promocion"` en `addToCart`; número desde `siteConfig` |
| Modificar | `Components/FloatingWhatsApp/FloatingWhatsApp.tsx`, `Components/Footer/Footer.tsx`, `app/(tienda)/contacto/page.tsx` | Número desde `siteConfig` |
| Modificar | `app/(admin)/admin/_components/ProductosTab.tsx`, `PromocionesTab.tsx` | Donde aparezca `51978339737` como texto de ayuda o valor por defecto: usar `siteConfig` |

## 4. Pasos de implementación

1. **Antes de tocar nada**, copiar a un archivo temporal el texto exacto que genera hoy `generateWhatsAppLink` para un carrito de ejemplo (2 ítems, con y sin descuento). Será el valor esperado de la prueba del paso 5.
2. `lib/siteConfig.ts`.
3. `types/coupon.ts` → `CuponAplicable`.
4. `lib/pricing.ts` y `pricing.test.ts` (casos mínimos en sección 7).
5. `lib/whatsapp.ts`: `construirMensajeCarrito` debe producir **exactamente** el texto actual (mismos emojis, saltos de línea, espacios, `toFixed(2)`). `whatsapp.test.ts` compara contra el texto del paso 1 con `toBe` (igualdad exacta).
6. `CartContext.tsx`:
   - Lectura inicial dentro de `try/catch`; aceptar solo un arreglo cuyos elementos tengan `_id` (string), `precio` (número finito ≥ 0) y `cantidad` (entero ≥ 1); descartar el resto. Si el JSON es inválido: `localStorage.removeItem("janku-cart")` y carrito vacío.
   - `addToCart` acepta `tipo` y lo guarda.
   - `updateQuantity`: limitar a un máximo de 99.
   - `nivelDescuentoAplicado`, `montoDescuento`, `totalFinal`, `proximoNivel`, `montoParaProximoNivel` se calculan con `lib/pricing`. **La forma del contexto (`CartContextType`) no cambia**: mismos nombres y tipos.
   - Sustituir el `fetch("/api/discounts")` directo por lo mismo pero dentro de `try/catch` ya existente (sin cambios de comportamiento).
7. `CartSidebar.tsx` y `carrito/page.tsx`: `href={enlaceWhatsAppCarrito({ items: cart, totales })}`. Borrar las dos copias de `generateWhatsAppLink`.
8. Añadir `tipo` en las cinco llamadas a `addToCart`.
9. Reemplazar los literales `51978339737`. Tras el cambio: `grep -rn "51978339737" app Components lib context` → solo `lib/siteConfig.ts`.
10. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// lib/siteConfig.ts
export const SITE = {
  nombre: "Janku",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://jan-ku.com",
  whatsappPedidos: "51978339737",
} as const;
```

```ts
// types/coupon.ts
export type CuponAplicable = {
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  topeDescuento?: number | null;
  montoMinimo: number;
  acumulable: boolean;
};
```

```ts
// lib/pricing.ts
import type { DiscountTier, CuponAplicable } from "@/types";

export type Linea = { precio: number; cantidad: number };
export type Totales = {
  subtotal: number;
  nivel: DiscountTier | null;          // nivel de descuento por monto que corresponde al subtotal
  descuentoNivel: number;              // lo que descontaría el nivel
  descuentoCupon: number;              // lo que descontaría el cupón
  aplicado: "ninguno" | "nivel" | "cupon" | "ambos";
  descuentoTotal: number;
  costoEnvio: number;
  total: number;
};

export function calcularSubtotal(lineas: Linea[]): number;
export function elegirNivel(niveles: DiscountTier[], subtotal: number): DiscountTier | null;
export function descuentoDeNivel(nivel: DiscountTier | null, subtotal: number): number;
export function proximoNivel(niveles: DiscountTier[], subtotal: number): { nivel: DiscountTier; falta: number } | null;
export function descuentoDeCupon(cupon: CuponAplicable, base: number): number;
export function calcularTotales(args: { lineas: Linea[]; niveles: DiscountTier[]; cupon?: CuponAplicable | null; costoEnvio?: number }): Totales;
```

Reglas (todas las salidas pasan por `redondear2`):
- `calcularSubtotal` = Σ `precio × cantidad`.
- `elegirNivel`: entre los niveles con `activo === true` y `subtotal >= montoMinimo`, el de **mayor `montoMinimo`**. Ninguno → `null`. *(Regla actual de `CartContext`.)*
- `descuentoDeNivel`: `porcentaje` → `subtotal × valor / 100`; `monto_fijo` → `min(valor, subtotal)`.
- `proximoNivel`: el nivel activo de menor `montoMinimo` que cumpla `subtotal < montoMinimo`; `falta = montoMinimo − subtotal`.
- `descuentoDeCupon(cupon, base)`: si `base < cupon.montoMinimo` → 0. `porcentaje` → `base × valor / 100`, limitado a `topeDescuento` si existe. `monto_fijo` → `min(valor, base)`.
- `calcularTotales`:
  - Sin cupón: `aplicado` = `"nivel"` si `descuentoNivel > 0`, si no `"ninguno"`.
  - Con cupón **no acumulable**: `descuentoCupon = descuentoDeCupon(cupon, subtotal)`. Se aplica **el mayor**; en empate gana el nivel. `aplicado` = `"nivel"` o `"cupon"` (o `"ninguno"` si ambos son 0). `descuentoTotal` = el mayor.
  - Con cupón **acumulable**: `descuentoCupon = descuentoDeCupon(cupon, subtotal − descuentoNivel)` — el mínimo de compra del cupón se evalúa contra el **subtotal original**. `descuentoTotal = descuentoNivel + descuentoCupon`; `aplicado` = `"ambos"` si los dos > 0.
  - `descuentoTotal` nunca supera `subtotal`. `total = (subtotal − descuentoTotal) + (costoEnvio ?? 0)`.
  - `descuentoNivel` y `descuentoCupon` siempre informan lo que **cada uno daría**, aunque no se aplique (sirve para explicar al cliente por qué "ganó" uno).

```ts
// lib/whatsapp.ts  (añadidos)
export function construirMensajeCarrito(args: { items: { nombre: string; precio: number; cantidad: number }[]; totales: Totales }): string;
export function enlaceWhatsAppCarrito(args: { items: …; totales: Totales }): string;   // "#" si items está vacío
export function buildWhatsAppLink(numero, nombre, urlRelativa): string;                // existente, sin cambios
```

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: (a) el mensaje de WhatsApp es idéntico (prueba de igualdad exacta); (b) los importes mostrados son los mismos: hoy el porcentaje no se redondea antes de `toFixed(2)`; `redondear2` da el mismo resultado visible; (c) `CartContextType` no cambia, así que ningún componente que use `useCart()` necesita cambios.
- **N1-6**: los carritos ya guardados en `localStorage` (sin `tipo`) siguen cargando: `tipo` es opcional.
- **N1-5**: esta función es la que usará el servidor; no se le añaden atajos "solo cliente".

## 7. Criterios de aceptación verificables

`pricing.test.ts` cubre al menos:
- Subtotal de `[{10.10, 3}, {0.20, 1}]` = `30.50`.
- Niveles `[100→10 %, 200→15 %]`: subtotal 99.99 → sin nivel; 100 → 10.00; 250 → 37.50 (gana el de 200).
- Nivel inactivo se ignora.
- Nivel `monto_fijo` de 50 con subtotal 30 → descuento 30, total 0.
- `proximoNivel` con subtotal 80 → nivel de 100, `falta: 20`; con subtotal 300 → `null`.
- Cupón 20 % tope 15 sobre 100 → 15. Cupón con `montoMinimo` 150 sobre 100 → 0.
- No acumulable: nivel da 10, cupón da 15 → `aplicado: "cupon"`, `descuentoTotal: 15`. Nivel 15, cupón 15 → `"nivel"`.
- Acumulable: subtotal 200, nivel 10 % (20), cupón 10 % → cupón sobre 180 = 18; `descuentoTotal: 38`; `"ambos"`.
- `total` nunca negativo; con `costoEnvio: 12` se suma al final.

Además:
- `whatsapp.test.ts`: igualdad exacta con el texto capturado en el paso 1, con y sin descuento.
- `grep -rn "generateWhatsAppLink" app Components` → vacío.
- `grep -rn "51978339737" app Components context` → vacío.
- En el navegador: `localStorage.setItem("janku-cart", "{roto")` y recargar → la tienda carga con el carrito vacío, sin pantalla de error.
- typecheck, lint, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa, con atención a todo lo del carrito.
- [ ] Mi carrito de antes de actualizar **sigue ahí** tras desplegar.
- [ ] Añadir un producto y una promoción: ambos aparecen; cantidades y totales correctos.
- [ ] Comparar el mensaje de WhatsApp con uno anterior: mismo formato, mismos importes.
- [ ] Probar un carrito justo por debajo y justo por encima de un nivel de descuento: los avisos y el total coinciden con lo de antes.
- [ ] El botón flotante de WhatsApp, el pie y la página de contacto abren el mismo número de siempre.

## 9. Plan de reversa

`git revert` del commit de fusión. Los carritos guardados con el campo `tipo` son compatibles con el código anterior (lo ignora). Sin cambios de datos en servidor.

## 10. Qué NO tocar en esta fase

- No crear la página de checkout ni llamar a `/api/orders` (fases 15–16).
- No añadir campo de cupón al carrito (fase 19).
- No cambiar el diseño del carrito.
- `FavoritesContext` (salvo nada) y `UserContext`.

## 11. Modelo recomendado

**Sonnet**, con una condición: las pruebas de `pricing.test.ts` se escriben **antes** que la implementación y el dueño (o un modelo superior) revisa que los casos de la sección 7 están todos. Es código de dinero, pero puro y totalmente especificado.
