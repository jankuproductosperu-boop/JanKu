import type { Metadata } from "next";
import Link from "next/link";
import PaginaLegal from "@/Components/Legal/PaginaLegal";
import { LEGAL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos personales usa Janku, para qué, dónde se guardan y cómo ejercer tus derechos.",
};

export default function PrivacidadPage() {
  return (
    <PaginaLegal
      titulo="Política de privacidad"
      resumen={
        <p>
          Usamos solo los datos que necesitamos para tu cuenta y tus pedidos. No los vendemos ni los usamos para publicidad.
          Se guardan en servicios en la nube, varios fuera del Perú. Puedes pedir verlos, corregirlos o borrarlos escribiendo a{" "}
          {LEGAL.correo}.
        </p>
      }
      secciones={[
        {
          id: "responsable",
          titulo: "Responsable",
          contenido: (
            <p>
              El responsable de tus datos es {LEGAL.titular} ({LEGAL.nombreComercial}), RUC {LEGAL.ruc}, {LEGAL.domicilio}.
              Contacto: {LEGAL.correo}. Esta política se basa en la Ley N.º 29733, Ley de Protección de Datos Personales, y su
              reglamento.
            </p>
          ),
        },
        {
          id: "datos",
          titulo: "Qué datos usamos y para qué",
          contenido: (
            <ul>
              <li>
                <b>Cuenta:</b> nombre, correo, contraseña (guardada cifrada: nadie puede leerla) y celular. Para crear tu cuenta,
                iniciar sesión, mostrarte tus pedidos y enviarte los correos de verificación y de recuperación de contraseña.
              </li>
              <li>
                <b>Pedido:</b> nombre, celular, correo (opcional), y según la entrega: dirección y referencia en Huancayo, el punto
                de entrega elegido, o departamento, provincia y ciudad para provincia; y tus notas. Para preparar, coordinar y
                entregar tu pedido.
              </li>
              <li>
                <b>Envíos a provincia:</b> la agencia exige nombre y DNI de quien recoge. No los pedimos en la web: se coordinan
                por WhatsApp.
              </li>
              <li>
                <b>Navegación:</b> el carrito y los favoritos se guardan en tu propio navegador, no en nuestros servidores. Google
                Analytics solo se usa si aceptas las cookies de medición (ver <Link href="/cookies">Cookies</Link>).
              </li>
              <li>
                <b>Seguridad:</b> tu dirección IP, para limitar intentos de acceso y evitar abusos.
              </li>
            </ul>
          ),
        },
        {
          id: "terceros",
          titulo: "Con quién se comparten y dónde se guardan",
          contenido: (
            <>
              <p>Usamos estos servicios para que la tienda funcione. Solo reciben lo necesario para su tarea:</p>
              <ul>
                <li>
                  <b>Render</b>: aloja la web.
                </li>
                <li>
                  <b>MongoDB Atlas</b>: base de datos donde se guardan las cuentas y los pedidos.
                </li>
                <li>
                  <b>Resend</b>: envía los correos de la cuenta (recibe tu nombre y tu correo).
                </li>
                <li>
                  <b>Google Analytics</b>: estadísticas de visitas, solo si aceptas las cookies.
                </li>
                <li>
                  <b>Cloudinary</b>: guarda las imágenes de los productos; no recibe datos de clientes.
                </li>
                <li>
                  <b>WhatsApp (Meta)</b>: recibe lo que tú decides enviarnos por ese canal.
                </li>
              </ul>
              <p>
                Varios de estos servicios guardan la información <b>fuera del Perú</b>, principalmente en Estados Unidos. Al usar
                la tienda aceptas esa transferencia internacional, que se hace solo para las finalidades de esta política.
              </p>
              <p>No vendemos ni cedemos tus datos a nadie para publicidad.</p>
            </>
          ),
        },
        {
          id: "plazo",
          titulo: "Cuánto tiempo los guardamos",
          contenido: (
            <ul>
              <li>Los datos de tu cuenta, hasta que la elimines desde tu perfil.</li>
              <li>
                Los pedidos y sus comprobantes, el tiempo que exigen las normas tributarias y de protección al consumidor, aunque
                elimines tu cuenta.
              </li>
            </ul>
          ),
        },
        {
          id: "derechos",
          titulo: "Tus derechos",
          contenido: (
            <>
              <p>
                Puedes ejercer tus derechos de <b>acceso, rectificación, cancelación y oposición</b> (derechos ARCO) escribiendo a{" "}
                {LEGAL.correo} con tu nombre y el dato que quieres revisar. Te responderemos dentro de los plazos de ley.
              </p>
              <p>
                También puedes corregir tus datos y eliminar tu cuenta tú mismo desde <Link href="/auth/perfil">tu perfil</Link>.
                Si no estás conforme con nuestra respuesta, puedes acudir a la Autoridad Nacional de Protección de Datos
                Personales.
              </p>
            </>
          ),
        },
        {
          id: "menores",
          titulo: "Menores de edad",
          contenido: <p>La tienda es para mayores de {LEGAL.edadMinima} años. No recogemos a sabiendas datos de menores.</p>,
        },
        {
          id: "seguridad",
          titulo: "Seguridad",
          contenido: (
            <p>
              La web usa conexión cifrada, las contraseñas se guardan cifradas y el acceso al panel de la tienda está restringido a
              las personas autorizadas.
            </p>
          ),
        },
        {
          id: "cambios",
          titulo: "Cambios en esta política",
          contenido: <p>Si la actualizamos, cambiará la fecha de arriba.</p>,
        },
      ]}
    />
  );
}
