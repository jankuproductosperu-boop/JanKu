import type { Metadata } from "next";
import PaginaLegal from "@/Components/Legal/PaginaLegal";
import PreferenciasCookies from "@/Components/CookieBanner/PreferenciasCookies";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Qué cookies usa Janku y cómo cambiar tu elección.",
};

export default function CookiesPage() {
  return (
    <PaginaLegal
      titulo="Cookies"
      resumen={
        <p>
          Solo usamos cookies de medición (Google Analytics) si las aceptas. Las necesarias para tu cuenta, el carrito y los
          favoritos no se pueden desactivar porque sin ellas la tienda no funciona.
        </p>
      }
      secciones={[
        {
          id: "necesarias",
          titulo: "Necesarias",
          contenido: (
            <ul>
              <li>Sesión de tu cuenta y del panel de la tienda: para que sigas conectado.</li>
              <li>
                Carrito, favoritos y tu elección de cookies: se guardan en el almacenamiento de tu navegador, no en nuestros
                servidores.
              </li>
            </ul>
          ),
        },
        {
          id: "medicion",
          titulo: "Medición (opcionales)",
          contenido: (
            <p>
              <b>Google Analytics</b> (cookies <code>_ga</code> y <code>_ga_*</code>), solo si las aceptas. Sirven para saber qué
              páginas se visitan y mejorar la tienda. Duran lo que fija Google, hasta 2 años. Si las rechazas, no se carga Google
              Analytics y se borran las que hubiera.
            </p>
          ),
        },
        {
          id: "cambiar",
          titulo: "Cambiar tu elección",
          contenido: (
            <p>
              <PreferenciasCookies
                mostrarEstado
                className="rounded-lg border-2 border-[#2C2C6C] px-4 py-1.5 text-sm font-semibold text-[#2C2C6C]"
              />
            </p>
          ),
        },
      ]}
    />
  );
}
