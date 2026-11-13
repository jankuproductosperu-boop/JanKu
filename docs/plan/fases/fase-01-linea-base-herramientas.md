# Fase 01 · Línea base y herramientas

## 1. Objetivo y por qué va en este orden

Dejar listas las herramientas que usan todas las fases siguientes (comprobación de tipos, pruebas unitarias, prueba de humo, validación) y registrar el estado de partida. **No cambia ningún comportamiento de la aplicación.** Va primero porque sin ella ninguna fase puede demostrar que "cerró en verde" (N1-10).

## 2. Prerrequisitos

- El dueño tomó las capturas de referencia (fase 00, sección 2).
- **Paso manual del dueño:** decidir qué hacer con el cambio sin confirmar de `next.config.ts` (confirmarlo o descartarlo) para empezar con el árbol limpio.
- Rama: `fase-01-linea-base` desde `main`.

## 3. Archivos a crear, modificar o mover

| Acción | Ruta | Qué cambia |
|---|---|---|
| Modificar | `package.json` | Scripts nuevos, dependencias (ver pasos 1–3) |
| Modificar | `package-lock.json` | Lo regenera `npm install` |
| Crear | `vitest.config.ts` | Configuración de pruebas |
| Crear | `lib/__tests__/humo.test.ts` | Una prueba trivial que demuestra que Vitest corre |
| Crear | `scripts/smoke.mjs` | Prueba de humo HTTP (contrato en fase 00, sección 5) |
| Crear | `.env.example` | Nombres de variables, sin valores |
| Modificar | `.gitignore` | Añadir `backups/` y `!.env.example` |
| Modificar | `eslint.config.mjs` | Ignorar `scripts/legacy/**`, `backups/**`, `docs/**` |
| Crear | `docs/plan/linea-base.md` | Resultados medidos de typecheck, lint, test, build |
| Modificar | `README.md` | Reemplazar la plantilla por instrucciones reales (ver paso 9) |

## 4. Pasos de implementación

1. En `package.json` → `scripts`, dejar exactamente:
   ```json
   "dev": "next dev",
   "build": "next build",
   "start": "next start",
   "lint": "eslint",
   "typecheck": "tsc --noEmit",
   "test": "vitest run",
   "test:watch": "vitest",
   "smoke": "node scripts/smoke.mjs"
   ```
2. Instalar: `npm install zod@^4 server-only` y `npm install -D vitest@^3`.
3. Desinstalar lo que nadie importa: `npm uninstall express cors mongodb @types/express @types/cors`. Antes, confirmar con una búsqueda que ningún archivo fuera de `node_modules` importa `express`, `cors` ni `from "mongodb"`. **No** tocar `dotenv`, `sharp`, `jsonwebtoken`, `ts-node` (se usan o se usarán).
4. Alinear `eslint-config-next` con la versión de `next` instalada: `npm install -D eslint-config-next@16.2.11`.
5. Crear `vitest.config.ts`:
   ```ts
   import { defineConfig } from "vitest/config";
   import path from "node:path";
   export default defineConfig({
     test: { environment: "node", include: ["lib/**/*.test.ts"] },
     resolve: { alias: { "@": path.resolve(__dirname, ".") } },
   });
   ```
6. Crear `lib/__tests__/humo.test.ts` con un único `expect(1 + 1).toBe(2)`.
7. Crear `scripts/smoke.mjs` según el contrato de la sección 5. Sin dependencias: usa `fetch` nativo de Node con `redirect: "manual"`.
8. Crear `.env.example` con una línea `NOMBRE=` por cada variable, agrupadas con comentarios: `MONGODB_URI`, `JWT_SECRET`, `USER_JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `RESEND_API_KEY`, `FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`. Añadir comentadas (para fases futuras): `# NEXT_PUBLIC_CHECKOUT_ENABLED=`, `# ADMIN_NOTIFY_EMAIL=`. **No abrir ni copiar `.env.local`**; la lista sale de `docs/plan/00-diagnostico.md`.
9. Reescribir `README.md`: qué es el proyecto (3 líneas), requisitos (Node 20+), `cp .env.example .env.local`, tabla de comandos, y enlace a `docs/plan/README.md`.
10. `.gitignore`: añadir `backups/` y, justo después de la línea `.env*`, la línea `!.env.example`.
11. `eslint.config.mjs`: añadir a `globalIgnores` las entradas `"scripts/legacy/**"`, `"backups/**"`, `"docs/**"`.
12. Ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y escribir en `docs/plan/linea-base.md`: fecha, commit, y para cada comando el resultado y los números (errores y avisos de lint desglosados por regla). **Este archivo es la referencia de N1-10.**
13. Ejecutar la fase 00.

## 5. Contratos

`scripts/smoke.mjs`:
- Lee `process.env.SMOKE_BASE_URL`, por defecto `http://localhost:3000`.
- Ejecuta en serie las comprobaciones de la tabla de `fase-00-verificacion-visual.md` sección 5.
- Imprime una línea por comprobación: `OK  GET /` o `FALLO  GET /admin  esperado 307→/login-admin, recibido 200`.
- Si el servidor no responde, imprime "No hay servidor en <url>. Arranca `npm run dev` primero." y sale con código 1.
- Código de salida: 0 si todo pasa, 1 si algo falla.
- Estructura interna: un arreglo `CHECKS = [{ nombre, metodo, ruta, cuerpo?, espera: (res, texto) => true | "motivo" }]` para que las fases siguientes solo añadan elementos.

## 6. Reglas de Nivel 1 que esta fase podría romper y cómo evitarlo

- **N1-2**: `.env.example` se escribe a mano desde el diagnóstico. No se lee `.env.local`.
- **N1-7**: solo se instalan/desinstalan los paquetes nombrados en los pasos 2–4.
- **N1-1**: si tras desinstalar paquetes el build falla, se reinstala el paquete causante y se reporta; no se "arregla" código.

## 7. Criterios de aceptación verificables

- `npm run typecheck` → 0 errores.
- `npm test` → 1 prueba, pasa.
- `npm run build` → termina bien.
- `npm run smoke` con el servidor local → todas las líneas `OK`.
- `npm run lint` → no más errores que antes de la fase (40). Se registran en `linea-base.md`.
- `git diff --stat main` no muestra cambios en `app/`, `Components/`, `context/`, `lib/` (salvo `lib/__tests__/humo.test.ts`), `models/` ni `middleware.ts`.
- `package.json` ya no lista `express`, `cors`, `mongodb`.

## 8. Checklist de pruebas manuales para mí

- [ ] Fase 00 completa (debe verse idéntico: no se tocó código de la aplicación).
- [ ] `.env.example` no contiene ningún valor real.
- [ ] `docs/plan/linea-base.md` existe y tiene números.

## 9. Plan de reversa

`git checkout main && git branch -D fase-01-linea-base`, luego `npm install` para restaurar `node_modules`. No hay cambios de datos ni de comportamiento.

## 10. Qué NO tocar en esta fase

- Ningún archivo de `app/`, `Components/`, `context/`, `models/`, `middleware.ts`, `next.config.ts`.
- No corregir errores de lint existentes (se reducen solos en la fase 03 y se rematan en la 21).
- No actualizar versiones de `next`, `react`, `mongoose` ni de ninguna otra dependencia no nombrada.

## 11. Modelo recomendado

**Sonnet.** Trabajo mecánico y sin decisiones.
