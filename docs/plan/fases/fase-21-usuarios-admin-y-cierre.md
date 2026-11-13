# Fase 21 · Pantalla de administradores, limpieza y cierre

## 1. Objetivo y por qué va en este orden

Cerrar el plan: (1) pantalla para que un superadmin gestione a los demás administradores (la API existe desde la fase 09); (2) limpieza de lo que quedó pendiente a propósito; (3) dejar `CLAUDE.md`, `README.md` y el propio plan reflejando el estado real del repositorio.

Va última porque documenta el resultado de todas las anteriores.

**Cambio visible anunciado:** enlace "Usuarios" en la barra del panel (solo superadmin).

## 2. Prerrequisitos

- Fases 01–20 fusionadas.
- **Respuesta a P16**: ¿se elimina `icons.icon: "/icon.png"` del layout raíz (el archivo no existe y genera un 404 en cada visita) o el dueño aporta el archivo `public/icon.png`?
- Rama: `fase-21-cierre`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `app/(admin)/admin/usuarios/page.tsx` | Gestión de administradores |
| Modificar | `app/(admin)/admin/_components/AdminNav.tsx` | Enlace "Usuarios" (permiso `admins.gestionar`), último |
| Modificar | Archivos con errores de lint de las reglas listadas en el paso 4 | Solo esas correcciones |
| Modificar | `app/layout.tsx` | Según P16 |
| Modificar | `CLAUDE.md` | Actualizar al estado final (sección 5) |
| Modificar | `README.md` | Comandos, variables, estructura y enlaces vigentes |
| Modificar | `docs/plan/linea-base.md` | Números finales |
| Crear | `docs/plan/cierre.md` | Acta de cierre (sección 5) |
| Modificar | `.env.example` | Lista final de variables |

## 4. Pasos de implementación

1. **`usuarios/page.tsx`** (cliente; estructura y estilo como `descuentos/page.tsx`):
   - `GET /api/admin/users` → tabla: usuario, nombre, correo, rol (insignia), estado, último acceso.
   - "Nuevo administrador": usuario, nombre, correo, rol (con la descripción de cada rol de la sección 5), contraseña y repetir contraseña. `POST /api/admin/users`.
   - Por fila: cambiar rol (desplegable), activar/desactivar, "Cambiar contraseña" (modal con contraseña nueva ×2). Todo por `PATCH /api/admin/users/[id]`.
   - La fila del propio usuario no ofrece cambiar rol ni desactivar (el servidor además lo impide).
   - Errores: `fields` bajo cada campo; 409 `ULTIMO_SUPERADMIN`, `NO_AUTOEDICION`, `DUPLICADO` → mostrar `error`.
   - Las contraseñas nunca se muestran, ni se guardan en estado más allá del envío; limpiar los campos tras responder.
   - Si la API responde 403 → "No tienes permiso para ver esta página".
2. Enlace en `AdminNav`.
3. **Icono (P16)**: si la respuesta es "eliminar", quitar la línea `icon: "/icon.png"` de `metadata.icons` en `app/layout.tsx`. Si el dueño aporta el archivo, no tocar el layout.
4. **Lint** — corregir **solo** estas reglas, que no cambian comportamiento:
   - `@typescript-eslint/no-unused-vars`: borrar imports y variables sin uso. En `catch (error)` sin usar → `catch {`.
   - `prefer-const`.
   - `react/no-unescaped-entities`: sustituir el carácter por su entidad (`&quot;`, `&apos;`).
   - `@typescript-eslint/no-explicit-any`: tipar con los tipos de `@/types` o `unknown` + comprobación. En `lib/cache.ts`, `CacheEntry<any>` → `CacheEntry<unknown>`.
   **No tocar** (quedan como deuda documentada): `react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`, `@next/next/no-html-link-for-pages`, `@next/next/no-img-element`. Corregirlas cambia cuándo se renderiza o cómo se navega y exige revisión visual propia.
5. **Búsqueda de restos**:
   - `grep -rn "console.log" app server Components context hooks lib` → eliminar los de depuración; los de `lib/cache.ts` se quitan (son ruido en la consola del visitante).
   - `grep -rn "TODO\|FIXME\|TEMPORAL" app server lib hooks` → resolver o listar en `cierre.md`.
   - Confirmar que no existen `server/auth/legacyLimiters.ts` ni imports de `jsonwebtoken`.
6. **Documentación**: `CLAUDE.md`, `README.md`, `.env.example`, `linea-base.md`, `cierre.md`.
7. typecheck, lint, test, build, smoke. Ejecutar la fase 00 completa, por última vez, comparando contra las capturas de referencia originales.

## 5. Contratos

**Descripción de roles** (texto de la pantalla; idéntico a D-17):

| Rol | Texto |
|---|---|
| Superadministrador | Acceso total, incluida la gestión de administradores. |
| Gestor | Catálogo, inventario, costos, pedidos, descuentos y cupones. No gestiona administradores. |
| Ventas | Ve inventario (sin costos) y gestiona pedidos. No edita catálogo, descuentos ni cupones. |

**`CLAUDE.md` final** — secciones obligatorias, en este orden:
1. Qué es el proyecto (5 líneas) y stack con versiones.
2. Comandos (`dev`, `build`, `typecheck`, `lint`, `test`, `smoke`).
3. **Reglas de Nivel 1**, copiadas literalmente de `docs/plan/03-decisiones.md`.
4. Mapa de carpetas (árbol de 2 niveles) y la regla de dependencias (`server/` nunca desde cliente; `lib/` puro).
5. Cómo añadir un endpoint (los 4 pasos del `route.ts`), una entidad (modelo → tipo → esquema → servicio → ruta) y una migración (`_runner.mjs`, simulación primero).
6. Convenciones (idioma, nombres, errores, respuestas de API).
7. Qué **no** hacer (lista corta: no renombrar `Components/`, no `syncIndexes`, no escribir `stock` a mano, no calcular precios en el cliente, no `await` en envíos de correo…).
8. Variables de entorno (solo nombres) y servicios externos.
9. Punteros: `docs/plan/` para el porqué de cada decisión.

Máximo ~200 líneas: es un documento de consulta rápida, no una copia del plan.

**`docs/plan/cierre.md`**:
- Tabla fase → fecha de fusión → commit.
- Desviaciones respecto al plan (qué se hizo distinto y por qué).
- Línea base inicial vs. final (errores y avisos de lint por regla, número de pruebas, tiempo de build).
- Deuda que queda, con severidad: las 4 reglas de lint no corregidas; catálogo público resuelto en el navegador (M6); CSP con `'unsafe-inline'` (S13); `strict: false` en `Product` (D-05); colecciones e índices obsoletos conservados (`loginblocks`, `userloginblocks`, índice `categoriaSlug_1_stock_1_precio_1`); sin limpieza de imágenes huérfanas en Cloudinary; sin pasarela de pago.
- Respuestas finales a las preguntas P0–P25 de `docs/plan/README.md`.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-1**: las correcciones de lint permitidas no alteran el render. Quitar `console.log` de `lib/cache.ts` no cambia nada visible. El cambio del icono solo se hace con la respuesta a P16.
- **N1-7**: "limpieza" no es licencia para refactorizar. Solo las cuatro reglas listadas y los `console.log`.
- **N1-2**: `CLAUDE.md`, `README.md` y `.env.example` contienen solo nombres de variables.
- **N1-4**: la pantalla de usuarios no guarda ni muestra contraseñas; la autoridad sigue siendo la API.

## 7. Criterios de aceptación verificables

- Un superadmin crea un admin `ventas` desde la pantalla; ese admin entra y ve solo "Inventario" y "Pedidos" en la barra.
- Cambiarle el rol a `gestor` → su sesión se cierra; al volver a entrar ve Catálogo, Inventario, Orden, Descuentos, Pedidos, Cupones.
- Intentar desactivarse a uno mismo o degradar al último superadmin → mensaje de error, sin cambio.
- `npm run lint`: 0 errores de `no-unused-vars`, `prefer-const`, `no-unescaped-entities`, `no-explicit-any`. El total de errores restantes coincide con lo declarado en `cierre.md`.
- `grep -rn "console.log" app server Components context hooks lib` → vacío.
- `CLAUDE.md` contiene las 10 reglas N1 con el mismo texto que `03-decisiones.md`.
- El árbol de `README.md`/`CLAUDE.md` coincide con `ls` real de la raíz.
- typecheck, test, build, smoke en verde.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 **completa y minuciosa**, contra las capturas del primer día. Las únicas diferencias son las anunciadas en las fases 04, 10, 11, 12, 13, 16, 19 y 20.
- [ ] Panel → Usuarios: crear, cambiar rol, cambiar contraseña, desactivar un admin de prueba.
- [ ] Entrar con cada rol y comprobar qué ve y qué puede hacer.
- [ ] Leí `CLAUDE.md` y `cierre.md` y reflejan la realidad.
- [ ] Recorrido final de compra en producción: producto → carrito → checkout con cupón → pedido → WhatsApp → correo → confirmar en el panel → stock descontado.

## 9. Plan de reversa

`git revert` del commit de fusión. La pantalla de usuarios desaparece (la API permanece). Las correcciones de lint y la documentación se revierten sin efecto en datos.

## 10. Qué NO tocar en esta fase

- Las cuatro reglas de lint excluidas.
- Dependencias (no actualizar versiones "para dejarlo al día").
- Borrar modelos, colecciones o índices obsoletos (N1-3).
- Cualquier mejora nueva: se anota en `cierre.md` como propuesta.

## 11. Modelo recomendado

**Sonnet** para la pantalla y la limpieza. Para redactar `CLAUDE.md` y `cierre.md`, **un modelo superior** si se quiere una revisión crítica de coherencia entre el plan y lo realmente construido; si no, Sonnet con revisión del dueño.
