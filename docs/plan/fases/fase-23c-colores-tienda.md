# Fase 23c · Colores de la tienda: botones y cajas con la paleta de Janku

> **Propuesta (2026-11-20), pendiente de aprobación del dueño.** Cambia lo que ven los clientes (N1-1): se anuncia aquí y se cierra con la fase 00 completa.

## 1. Objetivo

Hoy hay botones y cajas con degradados de colores que no son de la marca (morado-rosa, verde-esmeralda, índigo-morado, naranja, rojo). Ejemplos señalados por el dueño: en `/favoritos`, la caja de abajo y el botón de agregar; en `/carrito`, la caja «listo para comprar». Esta fase deja una sola paleta en toda la tienda:

| Uso | Color |
|---|---|
| Principal (botones, cajas destacadas) | Azul Janku `#2C2C6C`; al pasar el cursor `#241B57` |
| Fondo suave de caja | `#2C2C6C` al 5 % sobre blanco |
| WhatsApp y éxito | Verde plano `green-600` (sin degradado) |
| Avisos y errores | Ámbar y rojo planos, solo para estado |

## 2. Archivos

| Acción | Ruta | Qué cambia |
|---|---|---|
| Modificar | `app/(tienda)/favoritos/page.tsx` | Caja final y botones |
| Modificar | `app/(tienda)/carrito/page.tsx` | Caja «listo para comprar» y botones |
| Modificar | `Components/Cart/CartSidebar.tsx` | Botones y totales |
| Modificar | `Components/BenefitsSection/BenefitsSection.tsx` | Iconos de beneficios: un solo tono |
| Modificar | `app/(tienda)/promociones/page.tsx` · `app/(tienda)/promocion/[id]/PromocionPageClient.tsx` | Cajas y botones |
| Revisar | Resto de `app/(tienda)/**` y `Components/**` con `bg-gradient-to-*` | Solo si usa colores fuera de la tabla |

Solo clases de Tailwind: sin cambiar textos, estructura, enlaces ni lógica.

## 3. Pasos

1. Listar con `grep` cada degradado y botón con color fuera de la tabla; anotar archivo y línea.
2. Sustituir por la paleta; mantener los degradados que ya son azul Janku (por ejemplo, los fondos `from-[#2C2C6C]/5`).
3. Comprobar contraste AA del texto sobre cada color nuevo.
4. Fase 00 completa con capturas antes y después de cada pantalla tocada.

## 4. Criterios de aceptación

- `grep -rn "from-\(purple\|pink\|orange\|red\|emerald\|yellow\)-" Components app/(tienda)` sin resultados (salvo los que el dueño decida conservar).
- Mismos textos, enlaces y flujo de WhatsApp (N1-1).
- typecheck, lint, test, build y smoke en verde.

## 5. Modelo recomendado

Sonnet. 1 sesión.
