// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimización de imágenes
  images: {
    unoptimized: true,
    remotePatterns: [
      // postimg.cc retirado en la fase 27 (D-91): sus imágenes fijas viven ahora en Cloudinary
      // Cloudinary — dos entradas consolidadas en una
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // Tu CDN propio
      {
        protocol: 'https',
        hostname: 'img.jan-ku.com',
      },
      // YouTube thumbnails para videos de productos
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      // ELIMINADOS: imgur, unsplash, cdn.shopify — ya no se usan
      // con el sistema Cloudinary
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
  },

  // React Strict Mode
  reactStrictMode: true,

  // Ocultar que el sitio usa Next.js
  poweredByHeader: false,

  // Source maps desactivados en producción
  productionBrowserSourceMaps: false,

  // ── Headers de seguridad HTTP ──────────────────────────────────────────
  async headers() {
    // Fase 26c (D-93): https://challenges.cloudflare.com (Turnstile) en script-src, frame-src y connect-src.
    // Fase 28 (D-95): 'unsafe-inline' sigue en script-src porque Next.js y Google Analytics usan <script> en
    // línea (quitarlo exige un nonce y que toda la tienda se genere en cada visita); script-src-attr 'none'
    // prohíbe en cambio los manejadores en atributos (onerror="…", onclick="…"), que React nunca escribe.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://res.cloudinary.com https://img.jan-ku.com https://img.youtube.com",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://challenges.cloudflare.com",
      "frame-src https://www.youtube.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        // Aplica a todas las rutas
        source: '/(.*)',
        headers: [
          // CSP que se aplica (bloquea): lo que no está en la lista no carga.
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          // Evita que el navegador adivine el tipo de contenido
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Evita que tu sitio sea embebido en iframes (clickjacking)
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Fuerza HTTPS por 1 año en producción
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Controla qué información de referrer se envía
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Desactiva funciones del navegador que no necesitas
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Fase 26a (D-89): filtro XSS antiguo desactivado, como recomienda OWASP. Está retirado de los
          // navegadores actuales y, donde queda, puede usarse para filtrar datos. La defensa real es la CSP.
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
        ],
      },
      {
        // Sin caché para todas las APIs
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
    ];
  },
};

export default nextConfig;