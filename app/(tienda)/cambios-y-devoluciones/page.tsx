import type { Metadata } from "next";
import PaginaLegal from "@/Components/Legal/PaginaLegal";
import { LEGAL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Cambios, devoluciones y garantía",
  description: "Revisa tu producto al recibirlo. Cómo se atienden las fallas de fábrica y los envíos a provincia en Janku.",
};

// Política acordada con el dueño (D-77).
export default function CambiosPage() {
  return (
    <PaginaLegal
      titulo="Cambios, devoluciones y garantía"
      resumen={
        <p>
          Revisa tu producto al recibirlo: si algo no está bien, se cambia en ese momento o no se concreta la compra. No hay
          devoluciones por cambio de opinión. Las fallas de fábrica que no se veían al recibir se avisan dentro de los{" "}
          {LEGAL.plazoFallasDias} días.
        </p>
      }
      secciones={[
        {
          id: "revisa",
          titulo: "Revisa tu producto al recibirlo",
          contenido: (
            <p>
              Al recibir tu pedido, en el punto de entrega, con el delivery o en la agencia, revisa que el producto sea el que
              pediste, que esté completo y sin daños. Si algo no está bien, avísalo <b>en ese momento</b>: se cambia ahí mismo o la
              compra no se concreta y no pagas.
            </p>
          ),
        },
        {
          id: "cambio-de-opinion",
          titulo: "Cambio de opinión",
          contenido: (
            <p>
              Una vez recibido y aceptado el producto, <b>no hay devoluciones ni cambios por cambio de opinión</b>, por ejemplo por
              color, modelo o talla elegidos por ti.
            </p>
          ),
        },
        {
          id: "fallas",
          titulo: "Fallas de fábrica",
          contenido: (
            <>
              <p>
                Si el producto tiene una falla de fábrica que no se podía ver al recibirlo, avísanos por WhatsApp dentro de los{" "}
                <b>{LEGAL.plazoFallasDias} días</b> desde la entrega, con fotos o un video donde se vea la falla.
              </p>
              <p>
                Revisamos tu caso y, si corresponde, <b>cambiamos</b> el producto, lo <b>reparamos</b> o, si ya no hay stock,{" "}
                <b>te devolvemos el dinero</b> por el mismo medio con el que pagaste.
              </p>
              <p>No cubre golpes, humedad, mal uso ni daños ocurridos después de la entrega.</p>
            </>
          ),
        },
        {
          id: "provincia",
          titulo: "Envíos a provincia",
          contenido: (
            <p>
              Graba un <b>video continuo y sin cortes al abrir el paquete</b> y avísanos dentro de las{" "}
              <b>{LEGAL.plazoVideoProvinciaHoras} horas</b> si llegó dañado o incompleto. Sin ese video no podemos atender reclamos
              por daños de transporte. Si el daño es responsabilidad de la agencia, te ayudamos con el reclamo ante ella.
            </p>
          ),
        },
        {
          id: "como-pedirlo",
          titulo: "Cómo pedirlo",
          contenido: (
            <p>
              Escríbenos por WhatsApp o a {LEGAL.correo} con el código de tu pedido (empieza con <b>JK-</b>), las fotos o el video y
              una breve explicación.
            </p>
          ),
        },
        {
          id: "tus-derechos",
          titulo: "Tus derechos",
          contenido: (
            <p>
              Esta política no limita tus derechos como consumidor según el Código de Protección y Defensa del Consumidor, ni tu
              derecho a presentar un reclamo o acudir al INDECOPI.
            </p>
          ),
        },
      ]}
    />
  );
}
