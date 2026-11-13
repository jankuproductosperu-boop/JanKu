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
