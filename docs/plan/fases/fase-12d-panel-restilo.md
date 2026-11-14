# Fase 12d · Panel admin: restilo de las demás pantallas

> Referencia visual: `../referencia-panel/panel-referencia-v2.html`. Es referencia, no código para copiar.

## 1. Objetivo y por qué va en este orden

Aplicar los tokens y el estilo de tarjetas, tablas, botones y chips de la 12b a las pantallas que aún tienen el estilo viejo: **categorías, banners, promociones, inventario, orden y descuentos**. Solo cambia la apariencia.

Va antes de la 13 porque ésta modifica la pantalla de Inventario: mejor que ya tenga el estilo final.

**Cambio visible anunciado (solo panel):** colores, tarjetas y botones nuevos en esas seis pantallas. Cambia además la ubicación de acciones solo donde el diseño de referencia lo muestra (ej. chips de estado en lugar de texto plano).

## 2. Prerrequisitos

- Fases 12b y 12c fusionadas. Sin pasos manuales del dueño.
- Rama: `fase-12d-panel-restilo`. Modelo: **Sonnet**.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Modificar | `app/(admin)/admin/_components/CategoriasTab.tsx` | Solo clases CSS |
| Modificar | `app/(admin)/admin/_components/BannersTab.tsx` | Solo clases CSS |
| Modificar | `app/(admin)/admin/_components/PromocionesTab.tsx` | Solo clases CSS |
| Modificar | `app/(admin)/admin/_components/BannerImageField.tsx`, `PromocionImageField.tsx`, `ImageUploader.tsx` | Solo clases CSS |
| Modificar | `app/(admin)/admin/_components/ProductoForm.tsx` | Solo clases CSS (grises y blancos a tokens) para que el formulario también funcione en modo oscuro. Sin tocar campos ni lógica |
| Modificar | `app/(admin)/admin/_components/Seccion.tsx`, `ProductosLista.tsx` | Usan `PageHeader`, `Switch` y `Chip` |
| Modificar | `app/(admin)/admin/inventario/page.tsx`, `orden/page.tsx`, `descuentos/page.tsx` | Solo clases CSS |
| Crear | `app/(admin)/admin/_components/useTema.ts` | Tema claro/oscuro: sigue el sistema; la elección se guarda en `localStorage` dentro de `try/catch`. Pone `data-theme` en `.panel` |
| Modificar | `app/(admin)/admin/_components/AdminTopbar.tsx`, `AdminShell.tsx`, `panel.css` | Botón ◐ de tema; los tokens oscuros ya existen |
| Crear | `app/(admin)/admin/_components/ui.tsx` | Piezas visuales repetidas: `Chip`, `Switch`, `PageHeader`. Solo presentación, sin lógica. (`Card` se descartó: el aspecto de tarjeta se logra con las mismas clases de tokens) |

## 4. Pasos de implementación

1. `ui.tsx` con los tres componentes (clases basadas en tokens de `panel.css`).
2. Pantalla por pantalla, en este orden, con commit y comprobación visual tras cada una: Categorías → Banners → Promociones → Inventario → Orden → Descuentos.
3. En cada pantalla, mapeo **solo de clases**: `bg-white` → `bg-[var(--surface)]`, grises de texto → `--ink`/`--muted`, bordes grises → `--line`, fondos degradados de página fuera. `Chip`, `Switch` y `PageHeader` se usan donde el reemplazo es 1 a 1 (lista de productos y cabecera de sección). **No tocar** handlers, estado, `fetch`, textos de `alert`/`confirm` ni lógica de cálculo (márgenes, orden, tramos).
4. Colores sueltos (naranja, rosa, morado y sus degradados por pestaña) pasan a `indigo`, el acento de la tienda; los semánticos (verde, ámbar, rojo) se conservan solo para estados.
5. Añadir `useTema` y el botón ◐ **al final**, cuando las seis pantallas ya usan tokens. Revisar contraste en claro y oscuro (texto sobre fondo ≥ 4.5:1).
6. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```tsx
// _components/ui.tsx
export function Card(props: { titulo?: string; ayuda?: string; children: React.ReactNode }): JSX.Element;
export function Chip(props: { tono: "ok" | "aviso" | "malo" | "acento"; children: React.ReactNode }): JSX.Element;
export function Switch(props: { activo: boolean; onChange: (v: boolean) => void; etiqueta: string }): JSX.Element;
export function PageHeader(props: { titulo: string; subtitulo?: string; acciones?: React.ReactNode }): JSX.Element;
```

## 6. Reglas de Nivel 1 que esta fase podría romper

- **N1-1**: tienda intacta.
- **Comportamiento**: el diff de cada archivo solo debe mostrar cambios en `className` y en el marcado envolvente. Verificación: `git diff main --word-diff` no muestra cambios en funciones.
- **No hacer**: tocar `Components/`, `app/api/**`, `server/**`; unificar generadores de URL de imagen; añadir librerías de UI.

## 7. Criterios de aceptación verificables

- `grep -rnE "(from|to|bg)-(orange|pink|purple)-[0-9]+" "app/(admin)/admin/inventario" "app/(admin)/admin/orden" "app/(admin)/admin/descuentos"` → sin resultados; en `_components/` solo los íconos de colores del Resumen (`page.tsx`), que son deliberados.
- `git diff main -- app/api server models Components` → vacío.
- typecheck, lint (sin errores nuevos), test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] Recorre las seis pantallas en claro y oscuro: texto legible, sin elementos descolocados.
- [ ] Categorías, banners y promociones: crear, editar, borrar.
- [ ] Inventario: filtros, edición de stock y costo, exportar CSV igual que antes.
- [ ] Orden: reordenar y guardar. Descuentos: crear, editar y borrar un tramo.
- [ ] En móvil las seis pantallas se usan bien.

## 9. Plan de reversa

`git revert` del commit de fusión. Sin cambios de datos ni de API.

## 10. Qué NO tocar

Lógica de cualquier pantalla; `/login-admin`; el formulario de producto (12c).

## 11. Modelo recomendado

**Sonnet**, una o dos sesiones. Punto de corte natural: tras Promociones.
