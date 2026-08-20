// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimización de imágenes
  images: {
    // ✅ Se quitó "unoptimized: true" — ahora Next.js SÍ comprime, convierte
    // a WebP/AVIF y genera tamaños responsivos automáticamente para
    // cualquier imagen servida con <Image />. Requiere el paquete "sharp"
    // instalado (npm install sharp) para funcionar en producción.
    remotePatterns: [
      // Mantenido para el logo del negocio
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
      {
        protocol: 'https',
        hostname: 'postimg.cc',
      },
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
    return [
      {
        // Aplica a todas las rutas
        source: '/(.*)',
        headers: [
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
          // Protección XSS básica para browsers antiguos
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
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