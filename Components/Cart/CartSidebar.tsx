"use client";

import { useCart } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { X, Trash2, Minus, Plus, ShoppingCart, Sparkles, Tag } from "lucide-react";

export default function CartSidebar() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    totalPrice,
    isCartOpen,
    toggleCart,
    nivelDescuentoAplicado,
    montoDescuento,
    totalFinal,
    proximoNivel,
    montoParaProximoNivel,
  } = useCart();

  const generateWhatsAppLink = () => {
    if (cart.length === 0) return "#";

    let message = "¡Hola! 👋 Quiero realizar el siguiente pedido:\n\n";
    
    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.nombre}*\n`;
      message += `   💰 Precio: S/ ${item.precio.toFixed(2)}\n`;
      message += `   📦 Cantidad: ${item.cantidad}\n`;
      message += `   💵 Subtotal: S/ ${(item.precio * item.cantidad).toFixed(2)}\n\n`;
    });

    message += `Subtotal: S/ ${totalPrice.toFixed(2)}\n`;
    if (nivelDescuentoAplicado) {
      message += `🎉 Descuento aplicado (${nivelDescuentoAplicado.nombre}): -S/ ${montoDescuento.toFixed(2)}\n`;
    }
    message += `*TOTAL: S/ ${totalFinal.toFixed(2)}*\n\n`;
    message += "Deseo comprar estos productos. ¡Gracias! 😊";

    const phoneNumber = "51978339737"; // 👈 CAMBIA ESTE NÚMERO
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={toggleCart}
      />

      {/* Sidebar del carrito */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        {/* Header con colores JAN-KU */}
        <div className="bg-[#2C2C6C] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            <h2 className="text-xl font-bold">Mi Carrito</h2>
            <span className="bg-white text-[#2C2C6C] rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
              {cart.length}
            </span>
          </div>
          <button 
            onClick={toggleCart}
            className="hover:bg-white/20 p-2 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido del carrito */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart className="w-20 h-20 mb-4" />
              <p className="text-lg font-medium">Tu carrito está vacío</p>
              <p className="text-sm mt-2">¡Agrega productos para comenzar!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Aviso de descuento activo o próximo a desbloquear */}
              {nivelDescuentoAplicado ? (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-3 flex items-center gap-2 shadow-md">
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-semibold">
                    ¡Descuento aplicado! Ahorras S/ {montoDescuento.toFixed(2)}
                  </p>
                </div>
              ) : proximoNivel ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  <p className="text-xs text-indigo-800">
                    Agrega <strong>S/ {montoParaProximoNivel.toFixed(2)}</strong> más y obtén{" "}
                    <strong>
                      {proximoNivel.tipoDescuento === "porcentaje"
                        ? `${proximoNivel.valorDescuento}% de descuento`
                        : `S/ ${proximoNivel.valorDescuento.toFixed(2)} de descuento`}
                    </strong>
                  </p>
                </div>
              ) : null}

              {cart.map((item) => (
                <div 
                  key={item._id} 
                  className="bg-gray-50 rounded-lg p-3 relative border border-gray-200 hover:shadow-md transition"
                >
                  {/* Botón eliminar */}
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex gap-3">
                    {/* Imagen */}
                    <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {item.imagenUrl ? (
                        <Image
                          src={item.imagenUrl}
                          alt={item.nombre}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info del producto */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1 pr-6">
                        {item.nombre}
                      </h3>
                      <p className="text-[#2C2C6C] font-bold text-lg mb-2">
                        S/ {item.precio.toFixed(2)}
                      </p>

                      {/* Control de cantidad */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item._id, item.cantidad - 1)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded-lg flex items-center justify-center transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => updateQuantity(item._id, parseInt(e.target.value) || 1)}
                          className="w-14 text-center border-2 border-gray-300 rounded-lg font-semibold focus:border-[#2C2C6C] outline-none"
                        />
                        <button
                          onClick={() => updateQuantity(item._id, item.cantidad + 1)}
                          className="bg-[#2C2C6C] hover:bg-[#241B57] text-white w-8 h-8 rounded-lg flex items-center justify-center transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      {item.cantidad > 1 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Subtotal: <span className="font-semibold text-gray-700">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con totales y botones */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {/* Resumen de totales */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Productos ({cart.reduce((sum, item) => sum + item.cantidad, 0)})</span>
                <span>S/ {totalPrice.toFixed(2)}</span>
              </div>

              {nivelDescuentoAplicado && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Descuento ({nivelDescuentoAplicado.nombre})
                  </span>
                  <span>- S/ {montoDescuento.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>TOTAL</span>
                <span className="text-[#2C2C6C]">S/ {totalFinal.toFixed(2)}</span>
              </div>
            </div>

            {/* Botones de acción con colores JAN-KU */}
            <div className="space-y-2">
              <Link
                href="/carrito"
                onClick={toggleCart}
                className="w-full bg-white border-2 border-[#2C2C6C] text-[#2C2C6C] py-3 px-4 rounded-lg font-bold hover:bg-[#2C2C6C]/5 transition flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Ver Carrito Completo
              </Link>
              
              <a
                href={generateWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Realizar Pedido
              </a>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}