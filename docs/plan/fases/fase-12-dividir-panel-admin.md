# Fase 12 · Dividir el panel admin y añadir navegación común

## 1. Objetivo y por qué va en este orden

`app/(admin)/admin/page.tsx` tiene 1 505 líneas: cuatro CRUD, un componente de subida, un hook y los tipos, todo en un archivo. Esta fase lo parte en componentes **sin cambiar lo que hace ni cómo se ve**, y añade una barra de navegación común a todas las páginas del panel (hoy cada página tiene su propio botón "volver").

Va aquí porque las fases 13, 17, 19 y 21 añaden pantallas y campos al panel: hacerlo sobre un archivo de 1 500 líneas es donde un modelo económico más se equivoca.

**Cambio visible anunciado:** aparece una barra superior en el panel con enlaces a Catálogo, Inventario, Orden y Descuentos, el nombre del administrador y "Cerrar sesión".

## 2. Prerrequisitos

- Fase 11 fusionada.
- Sin pasos manuales del dueño.
- Rama: `fase-12-dividir-panel-admin`.
- **Esta fase puede ocupar dos sesiones.** Punto de corte natural: tras el paso 5 (commit). La segunda sesión empieza en el paso 6.

## 3. Archivos a crear, modificar o mover

Todo dentro de `app/(admin)/admin/`.

| Acción | Ruta | Sale de `page.tsx` (líneas aprox. en `main` de hoy) |
|---|---|---|
| Crear | `_components/imageTypes.ts` | Tipo `UploadedImage` y función `getCloudinaryUrl` (≈95–118) |
| Crear | `_components/useImageUpload.ts` | Hook `useImageUpload` (≈121–190) |
| Crear | `_components/ImageUploader.tsx` | Componente `ImageUploader` (≈194–407) |
| Crear | `_components/BannerImageField.tsx` | `BannerImageField` (≈410–444) |
| Crear | `_components/PromocionImageField.tsx` | `PromocionImageField` (≈446–483) |
| Crear | `_components/BannersTab.tsx` | Estado, handlers y JSX de banners |
| Crear | `_components/PromocionesTab.tsx` | Estado, handlers y JSX de promociones |
| Crear | `_components/CategoriasTab.tsx` | Estado, handlers y JSX de categorías |
| Crear | `_components/ProductosTab.tsx` | Estado, handlers y JSX de productos |
| Crear | `_components/AdminNav.tsx` | Barra de navegación (nuevo) |
| Crear | `_components/useAdminSession.ts` | Hook que lee `/api/auth/check` (nuevo) |
| Crear | `layout.tsx` | Envuelve las páginas del panel con `AdminNav` |
| Modificar | `page.tsx` | Queda con: carga de las 4 listas, tarjetas de estadísticas, selector de pestañas y render de la pestaña activa (< 200 líneas) |
| Modificar | `inventario/page.tsx`, `orden/page.tsx`, `descuentos/page.tsx` | Quitar su enlace/botón "volver a /admin" (lo sustituye la barra). Nada más |

Los números de línea son orientativos: **localizar cada bloque por su nombre**, no por el número.

## 4. Pasos de implementación

**Regla de oro: cortar y pegar. No reescribir, no "mejorar", no renombrar variables, no cambiar clases CSS ni textos.**

1. `_components/imageTypes.ts`: mover `UploadedImage` y `getCloudinaryUrl`. `page.tsx` los importa.
2. `_components/useImageUpload.ts`, `ImageUploader.tsx`, `BannerImageField.tsx`, `PromocionImageField.tsx`: mover cada bloque con sus imports. Cada archivo empieza con `"use client";`.
3. Tras **cada** extracción: `npm run typecheck` y recargar `/admin` en el navegador.
4. `BannersTab.tsx`: mover (a) los `useState` de banners, (b) sus handlers (`handleBannerSubmit`, selección, borrado…), (c) el bloque JSX `{activeTab === "banners" && (…)}` sin la condición. Recibe props según el contrato.
5. `PromocionesTab.tsx`: ídem. **Commit** ("Extrae uploader, banners y promociones del panel").
6. `CategoriasTab.tsx`: ídem.
7. `ProductosTab.tsx`: ídem. Es la más grande; recibe además `categories`.
8. En `page.tsx` quedan: `useAuth`, los cuatro `load*`, el `useEffect` inicial, `stats`, `stockStats`, `activeTab`, la cabecera, las tarjetas, las pestañas y:
   ```tsx
   {activeTab === "products" && <ProductosTab products={products} categories={categories} onReload={loadProducts} />}
   {activeTab === "categories" && <CategoriasTab categories={categories} onReload={loadCategories} />}
   {activeTab === "banners" && <BannersTab banners={banners} categories={categories} onReload={loadBanners} />}
   {activeTab === "promotions" && <PromocionesTab promotions={promotions} onReload={loadPromotions} />}
   ```
   Si un handler de una pestaña llamaba a `loadX()` de otra entidad, se pasa como prop adicional con el mismo nombre; no se cambia el comportamiento.
9. Si alguna variable de estado se usaba desde **dos** pestañas (por ejemplo `selectedCategory` como filtro de productos), se queda donde se usa; si de verdad se comparte, se queda en `page.tsx` y baja como prop. Anotar en el reporte cada caso.
10. `useAdminSession.ts` y `AdminNav.tsx` (contratos en sección 5). `layout.tsx`:
    ```tsx
    import AdminNav from "./_components/AdminNav";
    export default function AdminLayout({ children }: { children: React.ReactNode }) {
      return (<><AdminNav /><main>{children}</main></>);
    }
    ```
11. Quitar de `page.tsx` los tres botones (Inventario, Orden, Descuentos) y el botón de cerrar sesión de la cabecera, **solo después** de comprobar que la barra los ofrece. Quitar el enlace "volver" de las tres subpáginas.
12. typecheck, lint, test, build, smoke. Ejecutar la fase 00.

## 5. Contratos

```ts
// _components/ProductosTab.tsx
type Props = { products: ProductAdmin[]; categories: Category[]; onReload: () => Promise<void> };
// _components/CategoriasTab.tsx
type Props = { categories: Category[]; onReload: () => Promise<void> };
// _components/BannersTab.tsx
type Props = { banners: Banner[]; categories: Category[]; onReload: () => Promise<void> };
// _components/PromocionesTab.tsx
type Props = { promotions: Promotion[]; onReload: () => Promise<void> };
```

```ts
// _components/useAdminSession.ts
"use client";
export function useAdminSession(): { admin: AdminSession | null; cargando: boolean; puede: (p: Permiso) => boolean };
// GET /api/auth/check → usa data.admin (añadido en la fase 08). Si 401 → router.push("/login-admin").
```

```tsx
// _components/AdminNav.tsx  ("use client")
const ENLACES: { href: string; etiqueta: string; permiso?: Permiso }[] = [
  { href: "/admin", etiqueta: "Catálogo", permiso: "catalogo.editar" },
  { href: "/admin/inventario", etiqueta: "Inventario", permiso: "inventario.ver" },
  { href: "/admin/orden", etiqueta: "Orden", permiso: "catalogo.editar" },
  { href: "/admin/descuentos", etiqueta: "Descuentos", permiso: "descuentos.gestionar" },
  // fase 17: Pedidos · fase 19: Cupones · fase 21: Usuarios
];
```
- Muestra solo los enlaces cuyo permiso tiene el admin. Resalta el activo con `usePathname()`.
- A la derecha: nombre del admin, enlace "Ver tienda" (`/`, pestaña nueva) y botón "Cerrar sesión" (`POST /api/auth/logout` → `router.push("/login-admin")`; mismo comportamiento que el botón actual).
- Estilo: barra horizontal fija arriba, fondo `#2C2C6C`, texto blanco, con desplazamiento horizontal en móvil. Altura 56 px; `layout.tsx` no añade relleno extra (la barra no es `fixed`, es parte del flujo: `sticky top-0 z-30`).

`hooks/useAuth.ts` **no se elimina**: las páginas lo siguen usando.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: no afecta al sitio público. Dentro del panel, el JSX movido debe ser idéntico carácter por carácter salvo los nombres de props. Verificación: tras terminar, `git diff main --stat` debe mostrar que las líneas **eliminadas** de `page.tsx` ≈ las **añadidas** en `_components/` (± 80 líneas de imports, props y la barra nueva).
- **N1-7**: no se tocan `app/api/**`, `server/**` ni `Components/**`.
- **Comportamiento**: prohibido cambiar textos de `alert`/`confirm`, URLs de `fetch`, llamadas a `invalidateCachePattern` u orden de operaciones dentro de los handlers.

## 7. Criterios de aceptación verificables

- `wc -l "app/(admin)/admin/page.tsx"` → menos de 200.
- Ningún archivo de `_components/` supera 600 líneas.
- `grep -c "useState" "app/(admin)/admin/page.tsx"` → 6 o menos.
- `grep -rn "fetch(" "app/(admin)/admin/_components"` → las mismas URLs que había en `page.tsx` (comparar con `git show main:"app/(admin)/admin/page.tsx" | grep "fetch("`), más `/api/auth/check` y `/api/auth/logout` en la barra.
- typecheck, lint (sin errores nuevos), test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa.
- [ ] La barra superior aparece en `/admin`, `/admin/inventario`, `/admin/orden`, `/admin/descuentos`; cada enlace lleva a su página y marca la activa.
- [ ] "Cerrar sesión" desde la barra funciona. "Ver tienda" abre la tienda.
- [ ] Las tarjetas de estadísticas muestran los mismos números y al pulsarlas cambian de pestaña.
- [ ] **Productos**: crear con 2 imágenes, editar, cambiar imagen principal, filtrar por categoría, borrar.
- [ ] **Categorías**: crear, editar, borrar.
- [ ] **Banners**: crear con imagen y ubicaciones, editar, borrar.
- [ ] **Promociones**: crear con imagen, editar, borrar.
- [ ] En móvil: la barra se puede desplazar y los formularios siguen siendo usables.

## 9. Plan de reversa

`git revert` del commit de fusión. Sin cambios de datos ni de API.

## 10. Qué NO tocar en esta fase

- La lógica de ningún handler.
- `inventario/page.tsx`, `orden/page.tsx`, `descuentos/page.tsx` más allá de quitar su enlace "volver".
- No convertir nada a componentes de servidor, no introducir librerías de formularios ni de estado.
- No añadir todavía los campos de stock al formulario de producto (fase 13).

## 11. Modelo recomendado

**Sonnet**, en una o dos sesiones, con la instrucción literal "cortar y pegar". Si tras el paso 7 `typecheck` muestra más de ~15 errores encadenados por estado compartido entre pestañas, detenerse y escalar a un **modelo superior**: es señal de que el reparto de estado necesita criterio.
