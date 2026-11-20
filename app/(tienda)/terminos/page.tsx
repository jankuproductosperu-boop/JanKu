import type { Metadata } from "next";
import Link from "next/link";
import PaginaLegal from "@/Components/Legal/PaginaLegal";
import { LEGAL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de compra en Janku: pedidos, precios, pago, entrega, cancelación y reclamos.",
};

export default function TerminosPage() {
  return (
    <PaginaLegal
      titulo="Términos y condiciones"
      resumen={
        <p>
          Haces tu pedido en la web o por WhatsApp y nosotros te lo confirmamos por WhatsApp. No pagas en la web: el pago se
          coordina por WhatsApp. Los precios son finales, en soles. Emitimos boleta de venta electrónica.
        </p>
      }
      secciones={[
        {
          id: "quien-vende",
          titulo: "Quién vende",
          contenido: (
            <p>
              {LEGAL.nombreComercial} es el nombre comercial de {LEGAL.titular}, con RUC {LEGAL.ruc}. Somos una tienda
              virtual con sede en Huancayo, Junín, Perú. Puedes escribirnos a {LEGAL.correo} o por WhatsApp.
            </p>
          ),
        },
        {
          id: "como-se-compra",
          titulo: "Cómo se compra",
          contenido: (
            <>
              <p>
                Agregas productos al carrito y envías tu pedido desde la web o por WhatsApp. <b>El pedido es una solicitud</b>:
                la venta se concreta cuando te confirmamos por WhatsApp el stock, el precio final y la forma de entrega.
              </p>
              <p>Si un producto no tiene stock, te avisamos y no se cobra nada por él.</p>
            </>
          ),
        },
        {
          id: "precios",
          titulo: "Precios",
          contenido: (
            <>
              <p>
                Los precios están en soles y son <b>precios finales</b>: no se suma ningún impuesto adicional.
              </p>
              <p>
                El precio, los descuentos y el total válidos son los que calcula la tienda al confirmar tu pedido. Si hubiera un
                error evidente en un precio publicado, te lo diremos antes de confirmar y podrás decidir si sigues con la compra.
              </p>
            </>
          ),
        },
        {
          id: "pago",
          titulo: "Pago y comprobante",
          contenido: (
            <>
              <p>
                <b>No se paga en la web.</b> El pago se coordina por WhatsApp: Yape, Plin, transferencia o efectivo.
              </p>
              <p>
                Emitimos <b>{LEGAL.comprobante}</b>. No emitimos factura.
              </p>
            </>
          ),
        },
        {
          id: "descuentos",
          titulo: "Descuentos y cupones",
          contenido: (
            <ul>
              <li>Se puede usar un cupón por pedido.</li>
              <li>
                Si tu compra alcanza un descuento por monto y además usas un cupón, se aplica el mayor de los dos, salvo que el
                cupón indique que se suma.
              </li>
              <li>Cada cupón tiene su vigencia, su número de usos y, si corresponde, un monto mínimo de compra.</li>
            </ul>
          ),
        },
        {
          id: "entrega",
          titulo: "Entrega",
          contenido: (
            <p>
              Las formas de entrega, sus costos y cómo revisar tu producto al recibirlo están en{" "}
              <Link href="/envios">Envíos y entregas</Link>.
            </p>
          ),
        },
        {
          id: "cancelacion",
          titulo: "Cancelación",
          contenido: (
            <p>
              Puedes cancelar tu pedido sin costo <b>antes de que te lo confirmemos</b>, avisándonos por WhatsApp. Un pedido que
              no se confirma se cancela solo a las 72 horas.
            </p>
          ),
        },
        {
          id: "cambios",
          titulo: "Cambios y devoluciones",
          contenido: (
            <p>
              Lee <Link href="/cambios-y-devoluciones">Cambios, devoluciones y garantía</Link> antes de comprar.
            </p>
          ),
        },
        {
          id: "cuenta",
          titulo: "Tu cuenta",
          contenido: (
            <ul>
              <li>Para crear una cuenta o comprar debes tener {LEGAL.edadMinima} años o más.</li>
              <li>Cuida tu contraseña; nadie de la tienda te la pedirá.</li>
              <li>Puedes eliminar tu cuenta cuando quieras desde tu perfil.</li>
            </ul>
          ),
        },
        {
          id: "reclamos",
          titulo: "Consultas y reclamos",
          contenido: (
            <p>
              Escríbenos a {LEGAL.correo} o por WhatsApp. Tus datos se tratan según la{" "}
              <Link href="/privacidad">Política de privacidad</Link>.
            </p>
          ),
        },
        {
          id: "cambios-terminos",
          titulo: "Cambios en estos términos",
          contenido: <p>Podemos actualizar estos términos. Para cada pedido rige la versión publicada el día en que lo hiciste.</p>,
        },
      ]}
    />
  );
}
