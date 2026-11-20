import Link from "next/link";
import { Phone, Facebook, Mail, BookOpen } from "lucide-react";
import { LEGAL, SITE } from "@/lib/siteConfig";

export default function ContactSection() {
  return (
    <section className="bg-[#2C2C6C] py-16 px-4">
      <div className="max-w-5xl mx-auto text-white text-center mb-12">
        <h2 className="text-3xl font-semibold">Contacto</h2>
        <div className="w-24 h-1 bg-white mx-auto mt-2"></div>
        <p className="mt-4 text-sm opacity-90">
          Puedes contactarnos por WhatsApp, llamada telefónica, mensaje de texto,
          o mensaje al correo electrónico.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card izquierda */}
        <div className="bg-white text-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-center">
            Contáctanos
          </h3>

          <div className="space-y-6">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${SITE.whatsappPedidos}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 hover:opacity-80 transition"
            >
              <Phone className="w-10 h-10 text-green-500" />
              <div>
                <p className="font-semibold">+51 978339737</p>
                <p className="text-sm text-gray-500">+51 960668851</p>
              </div>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/jankuproductos"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 hover:opacity-80 transition"
            >
              <Facebook className="w-10 h-10 text-blue-600" />
              <p className="font-semibold">Janku Facebook</p>
            </a>

            {/* Email */}
            <a
              href={`mailto:${LEGAL.correo}`}
              className="flex items-center gap-4 hover:opacity-80 transition"
            >
              <Mail className="w-10 h-10 text-red-500" />
              <p className="font-semibold">{LEGAL.correo}</p>
            </a>
          </div>
        </div>

        {/* Card derecha */}
        <div className="bg-white text-gray-800 rounded-xl shadow-lg p-6 flex flex-col justify-center gap-4">
          <p className="font-semibold text-center mb-4">
            Cualquier consulta no dude en comunicarse con nosotros
          </p>

          <div className="bg-gray-200 rounded-lg py-3 text-center font-medium">
            Atención desde las 8am hasta las 10pm
          </div>

          <div className="bg-gray-200 rounded-lg py-3 text-center font-medium">
            Comuníquese a los números visibles al lado
          </div>

          <div className="bg-gray-200 rounded-lg py-3 text-center font-medium">
            Productos nuevos cada semana
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 text-center">
        <Link
          href="/libro-de-reclamaciones"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#2C2C6C] hover:bg-gray-100 transition"
        >
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          Libro de Reclamaciones
        </Link>
      </div>

      <p className="max-w-5xl mx-auto mt-4 text-center text-xs text-white/80">
        {LEGAL.nombreComercial} es el nombre comercial de {LEGAL.titular} · RUC {LEGAL.ruc} · {LEGAL.domicilio}
      </p>
    </section>
  );
}
