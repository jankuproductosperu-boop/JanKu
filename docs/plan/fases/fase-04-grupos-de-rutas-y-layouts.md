# Fase 04 · Grupos de rutas y layouts separados

## 1. Objetivo y por qué va en este orden

Hoy `app/layout.tsx` envuelve **todo** con el Navbar, el Footer, el carrito flotante y un `padding-top` de 150 px, incluido el panel de administración. Esta fase separa dos zonas con grupos de ruta: `(tienda)` con el aspecto actual y `(admin)` sin la decoración de la tienda. **Las URLs no cambian** (los paréntesis no forman parte de la URL).

Va después de la fase 03 (para no mezclar dos tandas de movimientos) y antes de crear páginas nuevas (`/checkout`, `/admin/pedidos`), que ya nacerán en su grupo.

**Cambio visible anunciado:** el panel admin deja de mostrar el menú, el pie, el botón de WhatsApp y el carrito de la tienda. El sitio público queda idéntico.

## 2. Prerrequisitos

- Fase 03 fusionada.
- Sin pasos manuales del dueño.
- Rama: `fase-04-grupos-de-rutas`.

## 3. Archivos a crear, modificar o mover

**Mover con `git mv`**

| De | A |
|---|---|
| `app/(paginas)/` (carpeta completa) | `app/(tienda)/` |
| `app/page.tsx` | `app/(tienda)/page.tsx` |
| `app/busqueda/page.tsx` | `app/(tienda)/busqueda/page.tsx` |
| `app/login-admin/page.tsx` | `app/(admin)/login-admin/page.tsx` |
| `app/admin/` (carpeta completa) | `app/(admin)/admin/` |

**Crear**

| Ruta | Contenido |
|---|---|
| `app/(tienda)/layout.tsx` | Navbar, contenedor con `pt-[150px]`, FloatingWhatsApp, FloatingCartButton, CartSidebar, Footer |
| `app/(admin)/layout.tsx` | Contenedor mínimo, sin decoración de tienda; `metadata.robots = { index: false, follow: false }` |

**Modificar**

| Ruta | Qué cambia |
|---|---|
| `app/layout.tsx` | Se queda con: `<html>`, `<body>` con las fuentes, `GoogleAnalytics`, `ErrorBoundary`, y los tres providers envolviendo `{children}`. Se quitan Navbar, Footer, FloatingWhatsApp, FloatingCartButton, CartSidebar y el `div.pt-[150px]`. El objeto `metadata` no se toca |

## 4. Pasos de implementación

1. Mover las carpetas con `git mv`. En Windows, si `git mv "app/(paginas)" "app/(tienda)"` falla por archivos abiertos, cerrar el servidor de desarrollo y borrar `.next/` antes de reintentar.
2. Crear `app/(tienda)/layout.tsx` (es un componente de servidor, sin `"use client"`):
   ```tsx
   import Navbar from "@/Components/Navbar/Navbar";
   import Footer from "@/Components/Footer/Footer";
   import CartSidebar from "@/Components/Cart/CartSidebar";
   import FloatingCartButton from "@/Components/Cart/FloatingCartButton";
   import FloatingWhatsApp from "@/Components/FloatingWhatsApp/FloatingWhatsApp";

   export default function TiendaLayout({ children }: { children: React.ReactNode }) {
     return (
       <>
         <Navbar />
         <div className="pt-[150px]">{children}</div>
         <FloatingWhatsApp />
         <FloatingCartButton />
         <CartSidebar />
         <Footer />
       </>
     );
   }
   ```
3. Reducir `app/layout.tsx`: el `<body>` queda
   ```tsx
   <GoogleAnalytics />
   <ErrorBoundary>
     <UserProvider>
       <CartProvider>
         <FavoritesProvider>{children}</FavoritesProvider>
       </CartProvider>
     </UserProvider>
   </ErrorBoundary>
   ```
   Mantener exactamente las mismas clases del `<body>` y el mismo `lang="es"`.
4. Crear `app/(admin)/layout.tsx`:
   ```tsx
   import type { Metadata } from "next";
   export const metadata: Metadata = { robots: { index: false, follow: false } };
   export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
     return <div className="min-h-screen bg-gray-50">{children}</div>;
   }
   ```
5. Buscar imports relativos rotos por el movimiento: `grep -rn "from \"\.\./" app` y convertirlos a alias `@/`. (`app/layout.tsx` importa `../Components/Navbar/Navbar`: ese import desaparece.)
6. Borrar `.next/` y ejecutar `npm run build`. En la salida, la lista de rutas debe mostrar las **mismas rutas** que antes de la fase (comparar con el build de `docs/plan/linea-base.md`).
7. Revisar en el navegador las 4 páginas de admin: como ya no tienen 150 px de relleno arriba, comprobar que ningún encabezado queda pegado o tapado. Si alguna página admin tenía una clase que compensaba el Navbar (por ejemplo `-mt-…` o `top-[150px]` en un elemento `sticky`), **reportarla al dueño; no ajustarla** sin su visto bueno.
8. Ejecutar la fase 00.

## 5. Contratos

Rutas que deben existir tras la fase, **idénticas** a las de antes:

`/`, `/[categoria]`, `/auth/login`, `/auth/registro`, `/auth/verificar-email`, `/auth/recuperar-contrasena`, `/auth/nueva-contrasena`, `/auth/perfil`, `/busqueda`, `/carrito`, `/contacto`, `/favoritos`, `/nosotros`, `/producto/[slug]`, `/promocion/[id]`, `/promociones`, `/login-admin`, `/admin`, `/admin/descuentos`, `/admin/inventario`, `/admin/orden`, y todas las `/api/*`.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: el orden de los elementos en `(tienda)/layout.tsx` debe reproducir el del layout actual. Diferencia aceptada y única: el Footer pasa a estar dentro de los providers (antes estaba fuera); no usa ninguno, así que no cambia nada visible.
- **N1-4**: `middleware.ts` protege por URL (`/admin`, `/auth/perfil`), no por carpeta: sigue funcionando sin tocarlo. Comprobarlo con `npm run smoke` (redirecciones).
- **N1-9**: los nombres de grupo son exactamente `(tienda)` y `(admin)`, en minúsculas.

## 7. Criterios de aceptación verificables

- `npm run build`: la tabla de rutas coincide con la de la línea base (mismas rutas, ni una más ni una menos).
- `npm run smoke` en verde, incluidas las redirecciones de `/admin` y `/auth/perfil`.
- `ls app` → `(admin)`, `(tienda)`, `api`, `globals.css`, `layout.tsx` (y `favicon.ico` si existía).
- `app/layout.tsx` no importa `Navbar`, `Footer` ni nada de `Components/Cart`.
- `npm run typecheck`, `npm run lint`, `npm test` en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa. El sitio público debe verse idéntico.
- [ ] `/admin`, `/admin/inventario`, `/admin/orden`, `/admin/descuentos`: **ya no** muestran el menú ni el pie de la tienda. Se ven completas y sin huecos raros arriba.
- [ ] `/login-admin`: se ve bien sin el menú de la tienda.
- [ ] Desde `/admin`, los tres botones (Inventario, Orden, Descuentos) y sus "volver" funcionan.
- [ ] El carrito sigue conservando su contenido al navegar entre páginas de la tienda.

## 9. Plan de reversa

`git revert` del commit de fusión y borrar `.next/`. Sin cambios de datos.

## 10. Qué NO tocar en esta fase

- El contenido de ninguna página (solo se mueven).
- `middleware.ts`, `next.config.ts`, `Components/**`.
- No crear todavía la barra lateral del admin (fase 12).
- No cambiar `metadata` del layout raíz.

## 11. Modelo recomendado

**Sonnet.** Movimientos de carpetas con verificación objetiva (tabla de rutas del build).
