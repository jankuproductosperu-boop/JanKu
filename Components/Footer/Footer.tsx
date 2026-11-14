import Link from "next/link";
import { SITE } from "@/lib/siteConfig";

export default function Footer() {
  return (
    <footer className="w-full bg-[#21275A] text-white pt-16 pb-6 px-6 relative">
      
      {/* CONTENEDOR */}
      <div
        className="
          max-w-7xl mx-auto 
          grid grid-cols-1 md:grid-cols-4 
          gap-12 
          text-center md:text-left
        "
      >
        {/* Columna 1 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Jan-Ku</h2>
          <p className="text-sm leading-relaxed">
            Tu tienda online de confianza en Perú
            <br />Perú
          </p>
        </div>

        {/* Enlaces Rápidos */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-gray-300">
                Inicio
              </Link>
            </li>
            <li>
              <Link href="/promociones" className="hover:text-gray-300">
                Promociones
              </Link>
            </li>
            <li>
              <Link href="/nosotros" className="hover:text-gray-300">
                Sobre Nosotros
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="hover:text-gray-300">
                Contáctanos
              </Link>
            </li>
          </ul>
        </div>

        {/* Columna 3 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Escríbenos</h3>

          <ul className="space-y-2 text-sm">
            <li>📍 Huancayo, Perú</li>
            <li>📞 +51 970 189 208</li>
            <li>Asesor de ventas: 960 668 851</li>
            <li>📧 productos@janku.com</li>
          </ul>

          <a
            href={`https://wa.me/${SITE.whatsappPedidos}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md mt-4 text-sm transition"
          >
            WhatsApp
          </a>
        </div>

        {/* Redes sociales */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Síguenos</h3>

          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                TikTok
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                X / Twitter
              </a>
            </li>
            <li>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                YouTube
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Línea divisoria */}
      <hr className="border-gray-400/30 mt-12 mb-4" />

      {/* Derechos */}
      <p className="text-center text-xs text-gray-300">
        © 2025 Janku - Todos los derechos reservados
      </p>
    </footer>
  );
}
