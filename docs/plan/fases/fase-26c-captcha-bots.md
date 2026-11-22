# Fase 26c · Captcha invisible contra bots (Cloudflare Turnstile)

> **Aprobada por el dueño (2026-11-21).** Modelo: Opus 5.5.

> Riesgo medio: si falla, se puede bloquear el checkout. Se activa solo cuando existen las dos claves; sin ellas todo funciona como hoy.

## 1. Objetivo

Frenar pedidos, cuentas, reclamos y correos de recuperación hechos por bots que cambian de IP, sin molestar a las personas. Turnstile es gratis y casi siempre invisible.

## 2. Lo que hace el dueño

1. En Cloudflare → Turnstile → «Add site»: dominio `jan-ku.com` (y `localhost` para probar), modo **Managed**.
2. Copiar la *site key* y la *secret key* en Render como `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` (y en `.env.local` para probar). Nunca pegarlas en el chat.

## 3. Preguntas al dueño

| # | Pregunta | Por defecto |
|---|---|---|
| Q1 | ¿Dónde? | Registro, checkout, Libro de Reclamaciones y recuperar contraseña. No en el login, que ya tiene bloqueo por intentos |
| Q2 | ¿Qué pasa si Cloudflare no responde? | Registro, reclamos y recuperación: se rechaza con un mensaje para reintentar. **Checkout: se acepta** con el límite por IP de siempre, para no perder ventas |

## 4. Enfoque

- `Components/Turnstile.tsx` (cliente): carga el script de Cloudflare solo en esas páginas y entrega el token al formulario.
- `server/auth/turnstile.ts`: verifica el token con `siteverify` (timeout de 3 s) y la IP del cliente; nunca registra el token.
- Cada ruta llama a la verificación después del límite por IP y antes de tocar la base. Campo nuevo **opcional** `turnstileToken` en los cuerpos (N1-6). Sin claves configuradas, la verificación se salta.
- CSP: se añade `https://challenges.cloudflare.com` a `script-src`, `frame-src` y `connect-src`. Es el único cambio y no relaja nada de lo existente (N1-4).

## 5. Archivos

`Components/Turnstile.tsx` (nuevo), `server/auth/turnstile.ts` (nuevo), `next.config.ts` (CSP), `Components/Checkout/CheckoutForm.tsx`, `app/(tienda)/auth/registro/page.tsx`, `app/(tienda)/auth/recuperar*` (la página que exista), `app/(tienda)/libro-de-reclamaciones/**`, sus rutas `app/api/orders`, `app/api/auth-user/register`, `app/api/auth-user/forgot-password`, `app/api/complaints`, sus esquemas, smoke, `CLAUDE.md` §8 (nombres de variables) y D-90.

## 6. Verificación

En local con las claves de prueba que publica Cloudflare (una que siempre aprueba y otra que siempre rechaza); smoke sin claves (todo igual que hoy); fase 00.
