# Janku

Tienda online de Janku (jan-ku.com, Huancayo, Perú), con panel de administración en `/admin`.
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + MongoDB Atlas (Mongoose 9).
Imágenes en Cloudinary, correo con Resend, hosting en Render (despliega desde `main`).

## Requisitos

- Node 20 o superior.
- Copia las variables de entorno y rellénalas: `cp .env.example .env.local`
- Usa una base de desarrollo, no la de producción, en `MONGODB_URI` local.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local en http://localhost:3000 |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Comprobación de tipos (`tsc --noEmit`) |
| `npm test` | Pruebas unitarias (Vitest, solo `lib/`) |
| `npm run smoke` | Prueba de humo HTTP contra el servidor local (crea un pedido de prueba; límite 5 pedidos/h por IP) |

Administradores: `node scripts/admin/crear-admin.mjs` y `node scripts/admin/cambiar-password.mjs` (o la pantalla Panel → Usuarios, solo superadmin).
Migraciones: `node scripts/migrations/NNN-nombre.mjs` simula; `--apply` escribe y lo ejecuta solo el dueño.

## Variables de entorno

Solo nombres; los valores van en `.env.local` y en Render, nunca en el repositorio.

| Variable | Para qué |
|---|---|
| `MONGODB_URI` | Conexión a MongoDB Atlas |
| `JWT_SECRET` · `USER_JWT_SECRET` | Firma de las sesiones de administrador y de cliente |
| `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` | Subida de imágenes desde el panel |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | URLs de imágenes en el navegador |
| `RESEND_API_KEY` · `FROM_EMAIL` | Correos de cuenta |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio |
| `NEXT_PUBLIC_GA_ID` | Google Analytics |
| `NEXT_PUBLIC_CHECKOUT_ENABLED` | Solo `"true"` activa el checkout; se lee al construir |

Pendiente futuro: `ADMIN_NOTIFY_EMAIL` (aviso de pedido nuevo), sin uso todavía.

## Estructura

```
app/            layout raíz; (tienda)/ sitio público; (admin)/ login y panel; api/ rutas
Components/     componentes de la tienda
context/        carrito, favoritos, usuario
hooks/          hooks de React
lib/            funciones puras con pruebas (lib/__tests__/)
server/         solo servidor: db, auth, http, validation, services, email
models/         modelos Mongoose
types/          tipos compartidos
scripts/        migrations/, admin/, legacy/, smoke.mjs
public/         iconos e imagen para redes
docs/plan/      plan, decisiones y acta de cierre
proxy.ts        primer filtro de rutas protegidas
```

Detalle y reglas de trabajo: [CLAUDE.md](CLAUDE.md).

## Documentación

- [docs/plan/cierre.md](docs/plan/cierre.md): estado final, deuda pendiente y respuestas a las preguntas del plan.
- [docs/plan/README.md](docs/plan/README.md): fases y dependencias.
- [docs/plan/03-decisiones.md](docs/plan/03-decisiones.md): reglas de Nivel 1 y decisiones D-01 a D-73.
