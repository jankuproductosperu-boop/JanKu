import Link from "next/link";
import { LEGAL, SITE } from "@/lib/siteConfig";
import PreferenciasCookies from "@/Components/CookieBanner/PreferenciasCookies";

const ENLACES_LEGALES = [
  { href: "/terminos", texto: "Términos y condiciones" },
  { href: "/privacidad", texto: "Política de privacidad" },
  { href: "/cambios-y-devoluciones", texto: "Cambios y devoluciones" },
  { href: "/envios", texto: "Envíos y entregas" },
  { href: "/cookies", texto: "Cookies" },
];

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
            <li>📧 {LEGAL.correo}</li>
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
                href="https://www.facebook.com/jankuproductos/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/@jankuproductos"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                TikTok
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Línea divisoria */}
      <hr className="border-gray-400/30 mt-12 mb-4" />

      {/* Legal */}
      <nav aria-label="Información legal" className="max-w-7xl mx-auto mb-4">
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-300">
          {ENLACES_LEGALES.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="hover:text-white underline-offset-2 hover:underline">
                {e.texto}
              </Link>
            </li>
          ))}
          <li>
            <PreferenciasCookies className="hover:text-white underline-offset-2 hover:underline" />
          </li>
        </ul>
      </nav>

      <p className="max-w-7xl mx-auto mb-3 text-center text-xs text-gray-300">
        {LEGAL.nombreComercial} es el nombre comercial de {LEGAL.titular} · RUC {LEGAL.ruc} · {LEGAL.domicilio} ·{" "}
        <a href={`mailto:${LEGAL.correo}`} className="hover:text-white">
          {LEGAL.correo}
        </a>
      </p>

      {/* Derechos */}
      <p className="text-center text-xs text-gray-300">
        © 2025 Janku - Todos los derechos reservados
      </p>
    </footer>
  );
}
