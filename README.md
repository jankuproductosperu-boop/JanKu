# Janku

Tienda online de Janku (jan-ku.com, Huancayo, Perú).
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + MongoDB Atlas.
Imágenes en Cloudinary, correo con Resend, hosting en Render.

## Requisitos

- Node 20 o superior.
- Copia las variables de entorno y rellénalas: `cp .env.example .env.local`

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local en http://localhost:3000 |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Comprobación de tipos (`tsc --noEmit`) |
| `npm test` | Pruebas unitarias (Vitest, solo `lib/`) |
| `npm run smoke` | Prueba de humo HTTP contra el servidor local (solo lecturas) |

## Plan de reestructuración

El repositorio se está reestructurando por fases. Ver [docs/plan/README.md](docs/plan/README.md).
