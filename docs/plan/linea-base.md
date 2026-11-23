# Línea base · Fase 01

Fecha: 2026-11-12 · Commit de partida: 71e5e74 (rama `fase-01-linea-base`)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 1 archivo, 1 prueba, pasa |
| `npm run lint` | **40 errores**, 38 avisos |
| `npm run build` | Compila sin errores |
| `npm run smoke` | 23 comprobaciones, todas OK |

## Lint por regla

| Severidad | Regla | Cantidad |
|---|---|---:|
| error | @typescript-eslint/no-require-imports | 21 |
| error | @typescript-eslint/no-explicit-any | 7 |
| error | @next/next/no-html-link-for-pages | 5 |
| error | react-hooks/set-state-in-effect | 4 |
| error | react/no-unescaped-entities | 2 |
| error | prefer-const | 1 |
| aviso | @typescript-eslint/no-unused-vars | 24 |
| aviso | @next/next/no-img-element | 12 |
| aviso | react-hooks/exhaustive-deps | 2 |

**Referencia de N1-10:** ninguna fase puede superar 40 errores de lint.

---

## Actualización · Fase 03

Fecha: 2026-11-13 · Rama `fase-03-reorganizar-lib`

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 1 archivo, 1 prueba, pasa |
| `npm run lint` | **18 errores**, 29 avisos (antes 40 / 38) |
| `npm run build` | Compila sin errores |

Los 21 errores de `no-require-imports` desaparecen (scripts a `scripts/legacy/`, excluido del lint). Un error más desaparece: `react-hooks/set-state-in-effect` baja de 4 a 3 al borrar el `ImageUploader.tsx` muerto.

**Referencia de N1-10 desde ahora:** ninguna fase puede superar 18 errores de lint.

---

## Cierre · Fase 21

Fecha: 2026-11-17 · Rama `fase-21-cierre`

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 15 archivos, 253 pruebas, pasan |
| `npm run lint` | **3 errores**, 12 avisos (antes 40 / 38 en la fase 01) |
| `npm run build` | Compila sin errores (15 s en local) |
| `npm run smoke` | 57 comprobaciones, todas OK (2026-11-19) |

### Lint por regla

| Severidad | Regla | Cantidad | Dónde |
|---|---|---:|---|
| error | react-hooks/set-state-in-effect | 3 | `app/(tienda)/busqueda/page.tsx`, `context/CartContext.tsx`, `context/FavoritesContext.tsx` |
| aviso | @next/next/no-img-element | 11 | Componentes de la tienda y del panel |
| aviso | react-hooks/exhaustive-deps | 1 | `Components/Header/Header.tsx` |

`no-unused-vars`, `prefer-const`, `no-unescaped-entities`, `no-explicit-any`, `no-require-imports` y `no-html-link-for-pages`: **0**.

**Referencia de N1-10 desde ahora:** ninguna tarea puede superar 3 errores de lint.

---

## Actualización · react-hooks/set-state-in-effect

Fecha: 2026-11-19 · Rama `lint-set-state-in-effect` (pedido del dueño, después de la fase 21)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 15 archivos, 253 pruebas, pasan |
| `npm run lint` | **0 errores**, 12 avisos (11 `no-img-element`, 1 `exhaustive-deps`) |
| `npm run build` | Compila sin errores |

Carrito y favoritos leen `localStorage` con `useSyncExternalStore` (`hooks/useAlmacenLocal.ts`); la búsqueda calcula la lista filtrada con `useMemo`.

**Referencia de N1-10 desde ahora:** 0 errores de lint.

---

## Actualización · Fase 28

Fecha: 2026-11-22 · Rama `fase-28-limpieza`

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 errores |
| `npm test` | 24 archivos, 392 pruebas, pasan |
| `npm run lint` | **0 errores, 0 avisos** |
| `npm run build` | Compila sin errores |
| `npm run smoke` | 94 comprobaciones, todas OK |

Los 11 `no-img-element` se quedan a propósito con `eslint-disable-next-line` y su motivo (D-92, D-95); el `exhaustive-deps` del carrusel se corrigió.

**Referencia de N1-10 desde ahora:** 0 errores y 0 avisos de lint.
