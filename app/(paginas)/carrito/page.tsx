"use client";

import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft } from "lucide-react";

export default function CarritoPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();

  const generateWhatsAppLink = () => {
    if (cart.length === 0) return "#";

    let message = "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n";
    
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.nombre}*\n`;
      message += `   💰 Precio: S/ ${item.precio.toFixed(2)}\n`;
      message += `   📦 Cantidad: ${item.cantidad}\n`;
      message += `   💵 Subtotal: S/ ${(item.precio * item.cantidad).toFixed(2)}\n\n`;
    });

    message += `*TOTAL: S/ ${totalPrice.toFixed(2)}*\n\n`;
    message += "Deseo comprar estos productos. ¡Gracias! 😊";

    const phoneNumber = "51970189208"; // 👈 CAMBIA ESTE NÚMERO
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Responsive */}
        <div className="mb-6 md:mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[#2C2C6C] hover:text-[#241B57] font-medium mb-4 transition text-sm md:text-base"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Seguir comprando
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-[#2C2C6C]" />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
                Mi Carrito
              </h1>
              <span className="bg-[#2C2C6C] text-white rounded-full px-2 md:px-3 py-1 text-xs md:text-sm font-bold">
                {cart.length}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2 transition self-start sm:self-auto"
              >
                <Trash2 className="w-4 h-4" />
                Vaciar carrito
              </button>
            )}
          </div>
        </div>

        {cart.length === 0 ? (
          // Carrito vacío - Responsive
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-12 text-center">
            <ShoppingCart className="w-16 h-16 md:w-24 md:h-24 text-gray-300 mx-auto mb-4 md:mb-6" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">
              Tu carrito está vacío
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">
              ¡Descubre nuestros productos y agrega tus favoritos!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#2C2C6C] text-white px-6 md:px-8 py-2 md:py-3 rounded-lg font-bold hover:bg-[#241B57] transition text-sm md:text-base"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lista de productos */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <div 
                  key={item._id}
                  className="bg-white rounded-xl shadow-md p-3 md:p-6 hover:shadow-lg transition"
                >
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-6">
                    {/* Imagen */}
                    <div className="w-full sm:w-24 md:w-32 h-32 sm:h-24 md:h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {item.imagenUrl ? (
                        <Image
                          src={item.imagenUrl}
                          alt={item.nombre}
                          width={128}
                          height={128}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 md:gap-4 mb-2">
                        <Link
                          href={`/producto/${item.slug || item._id}`}
                          className="font-bold text-gray-900 text-base md:text-lg hover:text-[#2C2C6C] transition line-clamp-2"
                        >
                          {item.nombre}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-red-500 hover:text-red-700 transition flex-shrink-0"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <p className="text-xl md:text-2xl font-bold text-[#2C2C6C] mb-3 md:mb-4">
                        S/ {item.precio.toFixed(2)}
                      </p>

                      {/* Control de cantidad */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3">
                        <span className="text-xs md:text-sm text-gray-600 font-medium">Cantidad:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item._id, item.cantidad - 1)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition"
                          >
                            <Minus className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => updateQuantity(item._id, parseInt(e.target.value) || 1)}
                            className="w-14 md:w-16 text-center border-2 border-gray-300 rounded-lg font-bold text-base md:text-lg focus:border-[#2C2C6C] outline-none py-1.5 md:py-2"
                          />
                          <button
                            onClick={() => updateQuantity(item._id, item.cantidad + 1)}
                            className="bg-[#2C2C6C] hover:bg-[#241B57] text-white w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition"
                          >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm md:text-base text-gray-600">Subtotal:</span>
                          <span className="text-lg md:text-xl font-bold text-gray-900">
                            S/ {(item.precio * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen del pedido - Responsive */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 lg:sticky lg:top-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                  Resumen del Pedido
                </h2>

                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  {cart.map((item) => (
                    <div key={item._id} className="flex justify-between text-xs md:text-sm gap-2">
                      <span className="text-gray-600 line-clamp-1 flex-1">
                        {item.nombre} × {item.cantidad}
                      </span>
                      <span className="font-semibold text-gray-900 flex-shrink-0">
                        S/ {(item.precio * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-3 md:pt-4 mb-4 md:mb-6">
                  <div className="flex justify-between text-xs md:text-sm text-gray-600 mb-2">
                    <span>Subtotal</span>
                    <span>S/ {totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                    <span>Delivery Huancayo</span>
                    <span className="text-green-600 font-semibold">GRATIS</span>
                  </div>
                  <div className="flex justify-between text-lg md:text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-[#2C2C6C]">S/ {totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Botones - Responsive */}
                <div className="space-y-2 md:space-y-3">
                  <a
                    href={generateWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 text-white py-3 md:py-4 px-4 md:px-6 rounded-lg font-bold text-base md:text-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span className="hidden sm:inline">Realizar Pedido</span>
                    <span className="sm:hidden">Pedir por WhatsApp</span>
                  </a>

                  <Link
                    href="/"
                    className="w-full bg-white border-2 border-[#2C2C6C] text-[#2C2C6C] py-3 md:py-4 px-4 md:px-6 rounded-lg font-bold text-base md:text-lg hover:bg-[#2C2C6C]/5 transition flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">Seguir Comprando</span>
                    <span className="sm:hidden">Seguir</span>
                  </Link>
                </div>

                {/* Info adicional - Responsive */}
                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2 md:gap-3">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                    </svg>
                    <div>
                      <p className="font-bold text-green-700 text-xs md:text-sm">
                        Envío gratis en Huancayo
                      </p>
                      <p className="text-[10px] md:text-xs text-green-600 mt-1">
                        Tu pedido llegará sin costo adicional
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}