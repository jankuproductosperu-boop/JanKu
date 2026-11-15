import Image from "next/image";
import { ShoppingCart, Sparkles } from "lucide-react";

type Props = {
  items: {
    nombre: string;
    /** Etiqueta de la variante elegida (fase 13b), p. ej. "Color: Negro". */
    variante?: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    imagenUrl?: string;
  }[];
  subtotal: number;
  descuentoNivel?: { nombre: string; monto: number } | null;
  cupon?: { codigo: string; monto: number } | null;
  costoEnvio: number;
  envioPorCoordinar?: boolean;
  total: number;
};

// Solo presentación. Las clases salen del bloque "Resumen del Pedido" de /carrito para que se vea igual.
export function OrderSummary({ items, subtotal, descuentoNivel, cupon, costoEnvio, envioPorCoordinar, total }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Resumen del Pedido</h2>

      <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-xs md:text-sm">
            <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
              {item.imagenUrl ? (
                <Image src={item.imagenUrl} alt={item.nombre} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-gray-300" />
                </div>
              )}
            </div>
            <span className="text-gray-600 line-clamp-2 flex-1">
              {item.nombre}
              {item.variante ? ` (${item.variante})` : ""} × {item.cantidad}
            </span>
            <span className="font-semibold text-gray-900 flex-shrink-0">S/ {item.subtotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-3 md:pt-4">
        <div className="flex justify-between text-xs md:text-sm text-gray-600 mb-2">
          <span>Subtotal</span>
          <span>S/ {subtotal.toFixed(2)}</span>
        </div>

        {descuentoNivel && descuentoNivel.monto > 0 && (
          <div className="flex justify-between text-xs md:text-sm text-green-600 font-semibold mb-2">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Descuento ({descuentoNivel.nombre})
            </span>
            <span>- S/ {descuentoNivel.monto.toFixed(2)}</span>
          </div>
        )}

        {cupon && cupon.monto > 0 && (
          <div className="flex justify-between text-xs md:text-sm text-green-600 font-semibold mb-2">
            <span>Cupón ({cupon.codigo})</span>
            <span>- S/ {cupon.monto.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
          <span>Envío</span>
          {envioPorCoordinar ? (
            <span className="font-semibold text-gray-700">Por coordinar</span>
          ) : costoEnvio > 0 ? (
            <span className="font-semibold text-gray-900">S/ {costoEnvio.toFixed(2)}</span>
          ) : (
            <span className="text-green-600 font-semibold">GRATIS</span>
          )}
        </div>

        <div className="flex justify-between text-lg md:text-xl font-bold text-gray-900">
          <span>Total</span>
          <span className="text-[#2C2C6C]">S/ {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
