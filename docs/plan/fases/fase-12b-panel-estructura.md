# Fase 12b · Panel admin: barra lateral derecha, estilo y Resumen

> Referencia visual: [`../referencia-panel/panel-referencia-v2.html`](../referencia-panel/panel-referencia-v2.html) (ábrela en el navegador; cambia de pantalla desde el menú). **Es una referencia, no código para copiar.** Decisiones D-48 a D-54 en `03-decisiones.md`.

## 1. Objetivo y por qué va en este orden

Sustituir la barra superior de la fase 12 por una **barra lateral a la derecha**, dar al panel el estilo de la tienda (tokens de color, modo oscuro opcional) y convertir `/admin` en un **Resumen** con datos reales. Cada sección pasa a tener su propia URL.

Va justo después de la 12 porque ya dejó las pestañas como componentes aislados, y antes de la 13, 17 y 19, que añaden pantallas: así nacen ya con el estilo final.

**Cambio visible anunciado (solo panel):** nueva navegación lateral, nuevos colores y modo oscuro opcional; `/admin` pasa a ser el Resumen y el catálogo se mueve a `/admin/productos`, `/admin/categorias`, `/admin/banners`, `/admin/promociones`. El sitio público no cambia.

## 2. Prerrequisitos

- Fase 12 fusionada. Sin pasos manuales del dueño.
- Rama: `fase-12b-panel-estructura`.
- Modelo: **Sonnet**.

## 3. Archivos a crear, modificar o mover

Todo dentro de `app/(admin)/admin/` salvo indicación.

| Acción | Ruta | Qué cambia |
|---|---|---|
| Crear | `panel.css` | Tokens de color (sección 5) y reglas mínimas bajo la clase `.panel`. Se importa solo desde `layout.tsx` del panel |
| Modificar | `layout.tsx` | Envuelve con `<div className="panel">`, rejilla contenido + barra lateral derecha, `AdminTopbar` y `AdminSidebar` |
| Crear | `_components/AdminSidebar.tsx` | Menú lateral (contrato en 5). Sustituye a `AdminNav` |
| Crear | `_components/AdminTopbar.tsx` | Barra superior: "Ver tienda", botón de tema, botón ☰ (móvil) |
| Crear | `_components/useTema.ts` | Tema claro/oscuro: sigue el sistema; la elección se guarda en `localStorage` dentro de `try/catch` |
| Eliminar | `_components/AdminNav.tsx` | Queda sustituido |
| Modificar | `page.tsx` | Pasa a ser el **Resumen** (sección 4, paso 5) |
| Crear | `productos/page.tsx`, `categorias/page.tsx`, `banners/page.tsx`, `promociones/page.tsx` | Cada una renderiza su componente `*Tab` con los datos que hoy carga `page.tsx`. Ver paso 3 |
| Crear | `_components/useAdminData.ts` | Hook que carga productos, categorías, banners y promociones (el código de los `load*` actuales, sin cambios de URL) |
| Modificar | `inventario/page.tsx`, `orden/page.tsx`, `descuentos/page.tsx` | **Nada** en esta fase (se restilan en la 12d) |

No se tocan `app/api/**`, `server/**`, `Components/**` ni `next.config.ts`.

**Estructura resultante** (se respeta la de `CLAUDE.md`: todo lo del panel dentro de `app/(admin)/admin/`, componentes propios en `_components/`, imports con `@/…`, nunca `../`; `Components/` de la tienda no se toca):

```
app/(admin)/admin/
  layout.tsx            rejilla + AdminTopbar + AdminSidebar, importa panel.css
  panel.css             tokens (solo bajo .panel)
  page.tsx              Resumen
  productos/page.tsx  categorias/page.tsx  banners/page.tsx  promociones/page.tsx
  inventario/  orden/  descuentos/          (ya existen)
  _components/
    AdminSidebar.tsx  AdminTopbar.tsx  useTema.ts  useAdminSession.ts  useAdminData.ts
    ProductosTab.tsx  CategoriasTab.tsx  BannersTab.tsx  PromocionesTab.tsx
    ImageUploader.tsx  useImageUpload.ts  imageTypes.ts  BannerImageField.tsx  PromocionImageField.tsx
```

## 4. Pasos de implementación

1. `panel.css` con los tokens y modo oscuro (valores en sección 5). Fuente: la que ya carga el layout raíz (`--font-geist-sans`); **no** se añaden fuentes externas (el CSP solo permite `'self'`, N1-4).
2. `useTema.ts`, `AdminTopbar.tsx`, `AdminSidebar.tsx`. Los enlaces son `<Link>` con `aria-current="page"` en el activo.
3. `useAdminData.ts` mueve los cuatro `load*` y el `useEffect` inicial de `page.tsx`. Las cuatro páginas nuevas lo usan y pasan los datos a su `*Tab` (mismos props de la fase 12). **Cortar y pegar**: no se cambia la lógica de ningún handler.
4. `layout.tsx` con la rejilla `grid-template-columns: 1fr 252px` y, en ≤ 860 px, la barra como cajón que entra desde la **derecha**.
5. `page.tsx` = Resumen, **solo con datos reales de hoy**:
   - Tarjetas: productos activos, stock bajo o agotado, categorías activas, banners y promociones activos.
   - Lista "Stock crítico": productos con `stock` distinto de `"Disponible"`, con enlace a `/admin/productos`.
   - Accesos rápidos: Nuevo producto, Nuevo banner.
   - **No se muestran** pedidos, clientes, cupones ni visitas: no existen aún. Cada fase posterior añade su tarjeta (17 pedidos, 19 cupones, 21b visitas).
6. `rm AdminNav.tsx` y revisar que nada lo importe.
7. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

**Menú lateral** (`AdminSidebar.tsx`). Solo se muestran los enlaces cuyo permiso tiene el admin:

```ts
const MENU: { grupo?: string; href: string; etiqueta: string; permiso?: Permiso }[] = [
  { href: "/admin", etiqueta: "Resumen" },
  { grupo: "Catálogo", href: "/admin/productos", etiqueta: "Productos", permiso: "catalogo.editar" },
  { href: "/admin/categorias", etiqueta: "Categorías", permiso: "catalogo.editar" },
  { href: "/admin/inventario", etiqueta: "Inventario", permiso: "inventario.ver" },
  { href: "/admin/orden", etiqueta: "Orden", permiso: "catalogo.editar" },
  { grupo: "Marketing", href: "/admin/descuentos", etiqueta: "Descuentos", permiso: "descuentos.gestionar" },
  { href: "/admin/promociones", etiqueta: "Promociones", permiso: "catalogo.editar" },
  { href: "/admin/banners", etiqueta: "Banners", permiso: "catalogo.editar" },
  // fase 13b/16b: Novedades · 16c: Popup · 17: Pedidos · 19: Cupones · 21: Usuarios · 21b: Estadísticas
];
```

Al pie: nombre y rol del admin y botón "Cerrar sesión" (`POST /api/auth/logout` → `/login-admin`, con el mismo `confirm` actual).

**Tokens** (claro / oscuro). Derivados de la tienda: `#2C2C6C` es el azul de su navbar y footer (89 usos) y `indigo-600` (`#4F46E5`) su acento.

| Token | Claro | Oscuro |
|---|---|---|
| `--bg` / `--surface` | `#F3F4FA` / `#FFFFFF` | `#12142B` / `#1B1F42` |
| `--ink` / `--muted` / `--line` | `#1B1E3A` / `#5F648A` / `#E4E6F2` | `#ECEEFF` / `#9A9FC9` / `#2D325F` |
| `--navy` (barra lateral) | `#2C2C6C` | `#161A3E` |
| `--accent` / `--accent-soft` | `#4F46E5` / `#E9E8FC` | `#8B85FF` / `#2A2D63` |
| `--ok` / `--warn` / `--bad` (+ `-soft`) | ver `referencia-panel/panel-referencia-v2.html` | ídem |

Los tokens viven bajo `.panel`; **no** se tocan `app/globals.css` ni estilos de la tienda (N1-1).

## 6. Reglas de Nivel 1 que esta fase podría romper

- **N1-1**: el CSS del panel debe quedar acotado a `.panel`. Verificación: abrir la tienda tras el cambio y comparar con las capturas de la fase 00.
- **N1-4**: sin fuentes externas, sin tocar el CSP, el menú no sustituye a `requireAdmin` (los handlers ya validan permisos; ocultar un enlace no es seguridad).
- **N1-6/N1-7**: sin cambios de API; sin dependencias nuevas.
- **Comportamiento**: prohibido cambiar textos de `alert`/`confirm`, URLs de `fetch` o el orden de operaciones en los handlers movidos.
- **N1-9**: carpeta `Components/` intacta.

## 7. Criterios de aceptación verificables

- `grep -rn "AdminNav" app` → sin resultados.
- `grep -rn "fonts.googleapis" app` → sin resultados.
- `git diff main -- next.config.ts app/globals.css Components` → vacío.
- `wc -l "app/(admin)/admin/page.tsx"` → menos de 200.
- typecheck, lint (sin errores nuevos), test, build, smoke en verde. `GET /admin/productos` sin cookie redirige a `/login-admin`.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa (la tienda se ve igual).
- [ ] Barra lateral a la derecha en escritorio; en móvil se abre con ☰ desde la derecha y se cierra al elegir un enlace.
- [ ] Cada enlace lleva a su página y marca la activa. Con un usuario `ventas` solo aparecen los enlaces que le tocan.
- [ ] Botón de tema: cambia a oscuro y recuerda la elección al recargar.
- [ ] Resumen: los números coinciden con lo que hay (productos activos, stock crítico).
- [ ] Productos, categorías, banners y promociones: crear, editar y borrar funciona igual que antes.
- [ ] Cerrar sesión desde la barra y `/admin` redirige al login.

## 9. Plan de reversa

`git revert` del commit de fusión. Sin cambios de datos ni de API.

## 10. Qué NO tocar

La lógica de los handlers; los estilos internos de las pestañas (los restila la 12c/12d); `/login-admin`; la tienda.

## 11. Modelo recomendado

**Sonnet**, una sesión. Si el typecheck encadena más de ~15 errores al mover los `load*` a `useAdminData`, detenerse y escalar.
