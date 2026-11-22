"use client";

import "./globals.css";
import { SITE } from "@/lib/siteConfig";

// Fase 27 (D-91): último recurso, si falla el propio layout raíz. Reemplaza todo el documento (por eso
// lleva <html> y <body>) y no depende de contextos, menú ni next/link. Nunca muestra el mensaje interno.

const LOGO = "https://res.cloudinary.com/janku/image/upload/v1787182642/janku-logo-oficial_gcnadm.webp";
const WHATSAPP = `https://wa.me/${SITE.whatsappPedidos}?text=${encodeURIComponent(
  "¡Hola! 👋 Tuve un problema al usar la tienda de Janku. ¿Me ayudas?",
)}`;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center px-4 antialiased">
        <title>Algo salió mal | Janku</title>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- página mínima sin next/image */}
          <img src={LOGO} alt="Janku" width={64} height={64} className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
          <p className="text-gray-600 mb-6">
            No pudimos cargar la tienda. Intenta de nuevo en unos segundos; si sigue pasando, escríbenos.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full bg-[#2C2C6C] text-white py-3 rounded-lg font-semibold hover:bg-[#241B57] transition"
            >
              Intentar de nuevo
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- sin router: recarga completa a propósito */}
            <a
              href="/"
              className="block w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Ir al inicio
            </a>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Escríbenos por WhatsApp
            </a>
          </div>
          {error.digest && <p className="text-xs text-gray-400 mt-6">Código: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
