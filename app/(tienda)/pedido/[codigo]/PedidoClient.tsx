"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, XCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { etiquetaEstado } from "@/lib/orderStatus";
import { enlaceWhatsAppPedido } from "@/lib/whatsapp";
import { OrderSummary } from "@/Components/Checkout/OrderSummary";
import type { MetodoEntrega, OrderPublic } from "@/types";

const ETIQUETA_ENTREGA: Record<MetodoEntrega, string> = {
  delivery_huancayo: "Delivery en Huancayo",
  recojo: "Recojo en tienda",
  envio_provincia: "Envío a otra ciudad",
};

// Los ítems del pedido guardan la imagen como public_id o URL completa, igual que la base.
function urlImagen(valor?: string): string | undefined {
  if (!valor || !valor.trim()) return undefined;
  return valor.startsWith("http") ? valor : getCloudinaryUrl(valor, { width: 80, height: 80 });
}

const fechaLima = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });

export function PedidoClient({ pedido, token, nuevo }: { pedido: OrderPublic; token?: string; nuevo: boolean }) {
  const router = useRouter();
  const { clearCart } = useCart();
  const [esNuevo] = useState(nuevo); // el encabezado no cambia cuando se limpia la URL
  const [copiado, setCopiado] = useState(false);
  const limpiado = useRef(false);

  // Pedido recién creado: se vacía el carrito una sola vez y se quita `nuevo` de la URL (se conserva `t`).
  useEffect(() => {
    if (!nuevo || limpiado.current) return;
    limpiado.current = true;
    clearCart();
    router.replace(`/pedido/${encodeURIComponent(pedido.codigo)}${token ? `?t=${encodeURIComponent(token)}` : ""}`);
  }, [nuevo, clearCart, router, pedido.codigo, token]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pedido.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sin portapapeles: el código sigue visible para copiarlo a mano
    }
  }

  const cancelado = pedido.estado === "cancelado";
  const e = pedido.entrega;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {esNuevo ? "¡Pedido registrado!" : `Pedido ${pedido.codigo}`}
        </h1>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl md:text-3xl font-mono font-bold text-[#2C2C6C] tracking-wide">
              {pedido.codigo}
            </span>
            <button
              type="button"
              onClick={copiar}
              className="inline-flex items-center gap-1.5 text-sm text-[#2C2C6C] border border-[#2C2C6C]/30 rounded-lg px-3 py-1.5 hover:bg-[#2C2C6C]/5 transition"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                cancelado ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {etiquetaEstado(pedido.estado)}
            </span>
          </div>

          {cancelado ? (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex gap-2">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>Este pedido fue cancelado. Si crees que es un error, escríbenos por WhatsApp.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-700">Último paso: escríbenos para coordinar el pago y la entrega.</p>
              <a
                href={enlaceWhatsAppPedido({ codigo: pedido.codigo, total: pedido.total, nombre: pedido.cliente.nombre })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-green-600 text-white py-3 md:py-4 px-6 rounded-lg font-bold text-base md:text-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Coordinar por WhatsApp
              </a>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <OrderSummary
            items={pedido.items.map((i) => ({
              nombre: i.nombre,
              variante: i.varianteEtiqueta,
              cantidad: i.cantidad,
              precioUnitario: i.precioUnitario,
              subtotal: i.subtotal,
              imagenUrl: urlImagen(i.imagenUrl),
            }))}
            subtotal={pedido.subtotal}
            descuentoNivel={pedido.descuentoNivel}
            cupon={pedido.cupon}
            costoEnvio={pedido.costoEnvio}
            envioPorCoordinar={pedido.envioPorCoordinar}
            total={pedido.total}
          />

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Entrega y contacto</h2>
              <dl className="text-sm space-y-2 text-gray-700">
                <div>
                  <dt className="font-semibold">Entrega</dt>
                  <dd>{ETIQUETA_ENTREGA[e.metodo]}</dd>
                </div>
                {e.direccion && (
                  <div>
                    <dt className="font-semibold">Dirección</dt>
                    <dd>
                      {e.direccion}
                      {e.referencia ? ` (${e.referencia})` : ""}
                    </dd>
                  </div>
                )}
                {(e.ciudad || e.departamento) && (
                  <div>
                    <dt className="font-semibold">Ciudad</dt>
                    <dd>{[e.ciudad, e.departamento].filter(Boolean).join(", ")}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-semibold">Nombre</dt>
                  <dd>{pedido.cliente.nombre}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Celular</dt>
                  <dd>{pedido.cliente.telefono}</dd>
                </div>
                {pedido.cliente.email && (
                  <div>
                    <dt className="font-semibold">Correo</dt>
                    <dd className="break-all">{pedido.cliente.email}</dd>
                  </div>
                )}
                {pedido.notasCliente && (
                  <div>
                    <dt className="font-semibold">Notas</dt>
                    <dd>{pedido.notasCliente}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Seguimiento</h2>
              <ol className="border-l-2 border-gray-200 ml-2 space-y-3">
                {pedido.historial.map((h, i) => (
                  <li key={i} className="pl-4 relative">
                    <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-[#2C2C6C]" />
                    <p className="font-semibold text-gray-800 text-sm">{etiquetaEstado(h.estado)}</p>
                    <p className="text-xs text-gray-500" suppressHydrationWarning>
                      {fechaLima(h.fecha)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p>Guarda este enlace para consultar tu pedido.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-[#2C2C6C] font-medium hover:text-[#241B57]">
            <ArrowLeft className="w-4 h-4" />
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
