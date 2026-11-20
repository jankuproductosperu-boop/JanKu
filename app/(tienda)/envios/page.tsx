import type { Metadata } from "next";
import Link from "next/link";
import PaginaLegal from "@/Components/Legal/PaginaLegal";

export const metadata: Metadata = {
  title: "Envíos y entregas",
  description: "Delivery en Huancayo, puntos de entrega y envíos a provincia en Janku.",
};

// A partir de D-71, D-72 y D-73 (fase 16b). Sin plazos fijos (D-78).
export default function EnviosPage() {
  return (
    <PaginaLegal
      titulo="Envíos y entregas"
      resumen={
        <p>
          Entregamos en Huancayo por delivery o en puntos de entrega, y enviamos a provincia por agencia. El costo que no sea
          gratis y el plazo se coordinan por WhatsApp antes de confirmar tu pedido.
        </p>
      }
      secciones={[
        {
          id: "huancayo",
          titulo: "Delivery en Huancayo",
          contenido: (
            <p>
              Es <b>gratis</b> si tu pedido incluye al menos un producto con la etiqueta «Delivery gratis Huancayo». Si no, el costo
              del delivery se coordina por WhatsApp antes de confirmar tu pedido.
            </p>
          ),
        },
        {
          id: "puntos",
          titulo: "Puntos de entrega",
          contenido: <p>Recoge tu pedido sin costo en uno de nuestros puntos de entrega. Los vigentes aparecen al hacer tu pedido.</p>,
        },
        {
          id: "provincia",
          titulo: "Envíos a provincia",
          contenido: (
            <>
              <p>
                Enviamos a los 24 departamentos y al Callao por agencia. La agencia, el costo del envío y los datos de quien recoge
                (nombre y DNI) <b>se coordinan por WhatsApp</b> antes de confirmar. El costo del envío lo paga el cliente.
              </p>
            </>
          ),
        },
        {
          id: "plazos",
          titulo: "Plazos",
          contenido: (
            <p>
              El plazo de entrega se coordina al confirmar tu pedido y depende del stock y, en provincia, de la agencia. No
              prometemos un plazo fijo.
            </p>
          ),
        },
        {
          id: "al-recibir",
          titulo: "Al recibir",
          contenido: (
            <p>
              Revisa tu producto al recibirlo y, si es un envío a provincia, graba un video al abrir el paquete. Los detalles están
              en <Link href="/cambios-y-devoluciones">Cambios, devoluciones y garantía</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
