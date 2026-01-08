"use client";

import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";

export default function FloatingCartButton() {
  const { totalItems, toggleCart } = useCart();

  return (
    <button
      onClick={toggleCart}
      className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-30 flex items-center justify-center group"
      aria-label="Abrir carrito"
    >
      <ShoppingCart className="w-7 h-7" />
      
      {/* Badge con cantidad */}
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-bounce">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}

      {/* Efecto de pulso */}
      <span className="absolute inset-0 rounded-full bg-indigo-600 animate-ping opacity-20" />
    </button>
  );
}