import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/siteConfig";

// Fase 27 (D-91): 404 de la tienda con la marca. Sale cuando una página llama a notFound() (producto o
// pedido inexistente). Queda dentro del layout de la tienda: menú y pie se ven como siempre.
export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false } };

const LOGO = "https://res.cloudinary.com/janku/image/upload/v1787182642/janku-logo-oficial_gcnadm.webp";
const WHATSAPP = `https://wa.me/${SITE.whatsappPedidos}?text=${encodeURIComponent(
  "¡Hola! 👋 No encontré lo que buscaba en la tienda de Janku. ¿Me ayudas?",
)}`;

export default function NotFound() {
  return (
    <section className="w-full max-w-[1000px] mx-auto px-4 py-16 md:py-24">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <Image src={LOGO} alt="Janku" width={64} height={64} className="w-16 h-16 mx-auto mb-4" />
        <p className="text-5xl font-extrabold text-[#2C2C6C] mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No encontramos esta página</h1>
        <p className="text-gray-600 mb-6">
          Puede que el enlace esté mal escrito o que el producto ya no esté disponible.
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-[#2C2C6C] text-white py-3 rounded-lg font-semibold hover:bg-[#241B57] transition"
          >
            Ir al inicio
          </Link>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
