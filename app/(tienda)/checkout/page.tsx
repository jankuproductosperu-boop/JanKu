"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { SITE } from "@/lib/siteConfig";
import { redondear2 } from "@/lib/money";
import { fetchWithCache } from "@/lib/cache";
import { carritoConEntregaGratis } from "@/lib/shipping";
import { CheckoutForm } from "@/Components/Checkout/CheckoutForm";
import { OrderSummary } from "@/Components/Checkout/OrderSummary";
import type { MetodoEntrega, Product } from "@/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, totalPrice, nivelDescuentoAplicado, montoDescuento, totalFinal } = useCart();
  const { user, isChecking } = useUser();
  const [metodo, setMetodo] = useState<MetodoEntrega>("delivery_huancayo");

  // El carrito se lee de localStorage en un efecto del proveedor: se espera un ciclo para no mostrar «vacío» de más.
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setListo(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Interruptor apagado (D-27): el checkout no existe y todo sigue como antes.
  useEffect(() => {
    if (!SITE.checkoutHabilitado) router.replace("/carrito");
  }, [router]);

  // D-71: solo para mostrar si el delivery es gratis; el servidor vuelve a decidirlo con la base (N1-5).
  const [productosPublicos, setProductosPublicos] = useState<Product[] | null>(null);
  useEffect(() => {
    if (!SITE.checkoutHabilitado) return;
    let activo = true;
    fetchWithCache<Product[]>("/api/products").then((p) => {
      if (activo) setProductosPublicos(p);
    });
    return () => {
      activo = false;
    };
  }, []);

  if (!SITE.checkoutHabilitado || !listo || isChecking) return <div className="min-h-screen" />;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-12 text-center">
            <ShoppingCart className="w-16 h-16 md:w-24 md:h-24 text-gray-300 mx-auto mb-4 md:mb-6" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">Tu carrito está vacío</h1>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#2C2C6C] text-white px-6 md:px-8 py-2 md:py-3 rounded-lg font-bold hover:bg-[#241B57] transition text-sm md:text-base"
            >
              Explorar productos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Solo una estimación para mostrar; el total definitivo lo calcula y devuelve el servidor (N1-5).
  // null = aún no se sabe (cargando productos).
  const deliveryGratis = productosPublicos ? carritoConEntregaGratis(cart, productosPublicos) : null;
  const envioPorCoordinar =
    metodo === "envio_provincia" || (metodo === "delivery_huancayo" && deliveryGratis !== true);
  const resumen = (
    <OrderSummary
      items={cart.map((i) => ({
        nombre: i.nombre,
        variante: i.varianteEtiqueta,
        cantidad: i.cantidad,
        precioUnitario: i.precio,
        subtotal: redondear2(i.precio * i.cantidad),
        imagenUrl: i.imagenUrl,
      }))}
      subtotal={totalPrice}
      descuentoNivel={nivelDescuentoAplicado ? { nombre: nivelDescuentoAplicado.nombre, monto: montoDescuento } : null}
      costoEnvio={0}
      envioPorCoordinar={envioPorCoordinar}
      total={totalFinal}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/carrito"
          className="inline-flex items-center gap-2 text-[#2C2C6C] hover:text-[#241B57] font-medium mb-4 transition text-sm md:text-base"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          Volver al carrito
        </Link>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 md:mb-8">Finalizar pedido</h1>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Móvil: resumen plegable arriba del formulario */}
          <details className="lg:hidden bg-white rounded-xl shadow-md group">
            <summary className="flex items-center justify-between p-4 font-bold text-gray-900 cursor-pointer list-none">
              <span>
                Resumen del pedido ({cart.reduce((s, i) => s + i.cantidad, 0)})
              </span>
              <span className="flex items-center gap-2 text-[#2C2C6C]">
                S/ {totalFinal.toFixed(2)}
                <ChevronDown className="w-5 h-5 transition group-open:rotate-180" />
              </span>
            </summary>
            <div className="px-1 pb-1">{resumen}</div>
          </details>

          <div className="lg:col-span-2">
            <CheckoutForm
              metodo={metodo}
              onMetodoChange={setMetodo}
              deliveryGratis={deliveryGratis}
              nombreInicial={user?.nombre ?? ""}
              emailInicial={user?.email ?? ""}
            />
          </div>

          <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-4">{resumen}</div>
        </div>
      </div>
    </div>
  );
}
