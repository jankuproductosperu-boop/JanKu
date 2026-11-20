# Fase 23a · Panel nuevo: estructura, temas, personalizador e inventario

> **Propuesta (2026-11-20), pendiente de aprobación del dueño.** Solo frontend del panel: no toca la tienda, la API ni la base.

## 1. Objetivo

Rehacer el aspecto del panel `/admin` con una estructura de panel de administración moderno (referencia visual: capturas del dueño de un panel tipo «Velzon»), con la marca de Janku. **No se copia código, nombres, ilustraciones ni marca de esa plantilla**: se construye un panel propio con el mismo tipo de estructura (barra lateral, barra superior, tarjetas y personalizador).

Cambios visibles (solo en el panel):
- Barra lateral nueva con el logo de Janku (`public/apple-touch-icon.png`) y el texto «Janku».
- Barra superior: buscador rápido, pantalla completa, cambio claro/oscuro, campana de avisos y menú del usuario.
- Botón de engranaje que abre un **personalizador básico**.
- Tarjetas, tablas, botones y formularios con la nueva paleta en claro y oscuro.
- Inventario: la columna de acciones queda siempre visible y la barra horizontal deja de estar al fondo de la página.

## 2. Prerrequisitos y preguntas

- Fase 22b en `main`. Rama `fase-23a-panel-nuevo`.
- Sin dependencias nuevas: iconos de `lucide-react` (ya instalada).

| # | Pregunta | Por defecto |
|---|---|---|
| **Q1** | Opciones del personalizador | Tema (claro/oscuro), tamaño de barra (normal / compacta / solo iconos), color de barra (blanca / azul Janku / degradado azul-índigo), ancho (completo / centrado). Sin diseños horizontal, de dos columnas ni semi-box |
| **Q2** | ¿Qué busca el buscador de arriba? | Código `JK-…` → pedido; `LR-…` → reclamo; texto → productos por nombre. Solo navega: no hay búsqueda nueva en el servidor |
| **Q3** | ¿Qué muestra la campana? | Pedidos pendientes (si `pedidos.ver`) y reclamos por responder (si `pedidos.ver`), con los endpoints que ya existen |
| **Q4** | Bandera de idioma, carrito y "apps" de la barra superior | No se ponen |

## 3. Archivos

| Acción | Ruta | Contenido |
|---|---|---|
| Modificar | `app/(admin)/admin/panel.css` | Tokens nuevos (claro y oscuro) y variantes de barra (`data-sidebar-size`, `data-sidebar-color`, `data-layout-width`) |
| Modificar | `app/(admin)/admin/_components/AdminShell.tsx` | Aplica las preferencias como atributos `data-*` en `.panel` |
| Modificar | `app/(admin)/admin/_components/AdminSidebar.tsx` | Logo, grupos, modos compacta y solo iconos (con texto al pasar el cursor) |
| Modificar | `app/(admin)/admin/_components/AdminTopbar.tsx` | Buscador, pantalla completa, tema, campana, menú de usuario y engranaje |
| Crear | `app/(admin)/admin/_components/Personalizador.tsx` | Panel lateral con las opciones de Q1 y «Restablecer» |
| Crear | `app/(admin)/admin/_components/usePreferenciasPanel.ts` | Preferencias en `localStorage` con `useSyncExternalStore` (mismo patrón que `useTema.ts`); valores desconocidos → por defecto |
| Modificar | `app/(admin)/admin/_components/useTema.ts` | Pasa a ser parte de las preferencias, sin perder el tema ya guardado |
| Crear | `app/(admin)/admin/_components/Avisos.tsx` | Campana con contadores (Q3) |
| Crear | `app/(admin)/admin/_components/BuscadorPanel.tsx` | Buscador de Q2 |
| Modificar | `app/(admin)/admin/_components/ui.tsx` | `Chip`, `PageHeader`, tarjeta de indicador y botones con la paleta nueva |
| Modificar | `app/(admin)/admin/page.tsx` | Resumen con tarjetas de indicador nuevas (mismos datos reales, D-52) |
| Modificar | `app/(admin)/admin/inventario/page.tsx` | Tabla con alto propio y columna de acciones fija; tarjetas en móvil |
| Modificar | Pantallas del panel que usen colores sueltos en lugar de tokens | Solo clases de color, sin cambiar lógica |
| Modificar | `docs/plan/03-decisiones.md` | D-83 y D-84 |

## 4. Pasos

1. Paleta: base azul Janku `#2C2C6C`, acento índigo y verde de éxito; mismo contraste mínimo AA en claro y oscuro.
2. Preferencias por navegador (`localStorage`, envuelto en `try/catch`): sin ellas el panel se ve con los valores por defecto. No se guardan en la base.
3. Barra lateral: en «solo iconos», cada icono lleva `aria-label` y un rótulo al pasar el cursor; en móvil siempre se abre completa.
4. Inventario: el contenedor de la tabla tiene `max-height` con desplazamiento propio, la cabecera queda fija arriba y la columna «Acciones» fija a la derecha (`position: sticky`). En pantallas angostas, cada producto es una tarjeta.
5. Buscador y campana solo usan endpoints existentes y respetan permisos: si una petición da 401/403, el elemento no aparece.
6. Revisar cada pantalla del panel en claro y oscuro y en móvil.
7. Typecheck, lint, test, build, smoke y fase 00.

## 5. Decisiones nuevas

- **D-83 · Panel nuevo con preferencias por navegador.** Tema, tamaño y color de barra y ancho se guardan en el navegador de cada persona; no viajan al servidor.
- **D-84 · Sin plantilla de terceros.** La estructura se inspira en paneles comerciales, pero el código, los nombres y los recursos visuales son propios de Janku.

## 6. Reglas de Nivel 1

- **N1-1:** la tienda no cambia. Todo color nuevo vive dentro de `.panel`.
- **N1-4:** sin cambios en guards, cookies ni CSP.
- **N1-6:** no se crean ni cambian endpoints.

## 7. Criterios de aceptación

- Las preferencias sobreviven a recargar; «Restablecer» vuelve a los valores por defecto; en modo privado el panel funciona igual.
- Un `ventas` no ve en la barra ni en la campana nada que no pueda abrir.
- Inventario: con 1 366 × 768, se puede pulsar «Editar» del primer producto sin desplazarse horizontalmente.
- Sin errores de consola; typecheck, lint (0 errores), test, build y smoke en verde.

## 8. Plan de reversa

`git revert` del commit de fusión. No hay datos que deshacer; las preferencias guardadas en el navegador se ignoran.

## 9. Qué NO tocar

La tienda, la API, los servicios, los modelos y la lógica de cada pantalla.

## 10. Modelo recomendado

Sonnet. 2–3 sesiones.
