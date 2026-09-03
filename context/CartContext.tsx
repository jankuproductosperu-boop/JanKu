"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";

type CartItem = {
  _id: string;
  nombre: string;
  precio: number;
  imagenUrl?: string;
  slug?: string;
  cantidad: number;
};

type DiscountTier = {
  _id: string;
  nombre: string;
  montoMinimo: number;
  tipoDescuento: "porcentaje" | "monto_fijo";
  valorDescuento: number;
  activo: boolean;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, "cantidad">) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, cantidad: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number; // subtotal, SIN descuento — se mantiene igual que antes
  isCartOpen: boolean;
  toggleCart: () => void;

  // ── Descuentos automáticos por monto (nuevo) ────────────────────────────
  nivelDescuentoAplicado: DiscountTier | null; // el descuento que se está aplicando ahora mismo, o null
  montoDescuento: number; // cuánto se descuenta, en soles
  totalFinal: number; // totalPrice - montoDescuento — esto es lo que el cliente paga de verdad
  proximoNivel: DiscountTier | null; // el siguiente descuento que aún no alcanza (para mostrar "te faltan S/X")
  montoParaProximoNivel: number; // cuánto le falta para desbloquear proximoNivel
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [nivelesDescuento, setNivelesDescuento] = useState<DiscountTier[]>([]);

  // Cargar carrito del localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem("janku-cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem("janku-cart", JSON.stringify(cart));
  }, [cart]);

  // Cargar los niveles de descuento configurados desde el admin — una vez,
  // se recalculan automáticamente contra el carrito cada vez que este cambia
  // (no hace falta volver a pedirlos, solo recalcular con lo que ya tenemos).
  useEffect(() => {
    const cargarDescuentos = async () => {
      try {
        const res = await fetch("/api/discounts");
        const data = await res.json();
        setNivelesDescuento(Array.isArray(data) ? data.filter((t: DiscountTier) => t.activo) : []);
      } catch (err) {
        console.error("Error cargando niveles de descuento:", err);
        setNivelesDescuento([]);
      }
    };
    cargarDescuentos();
  }, []);

  const addToCart = (product: Omit<CartItem, "cantidad">) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item._id === product._id);
      
      if (existingItem) {
        // Si ya existe, incrementar cantidad
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        // Si no existe, agregarlo con cantidad 1
        return [...prev, { ...product, cantidad: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  const updateQuantity = (productId: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart((prev) =>
      prev.map((item) =>
        item._id === productId ? { ...item, cantidad } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleCart = () => {
    setIsCartOpen((prev) => !prev);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  // ── Cálculo del descuento aplicable — valor derivado, se recalcula solo
  // cuando cambia el total del carrito o los niveles configurados ──────────
  const nivelDescuentoAplicado = useMemo(() => {
    const alcanzados = nivelesDescuento.filter((n) => totalPrice >= n.montoMinimo);
    if (alcanzados.length === 0) return null;
    // Siempre gana el nivel de monto mínimo más alto que sí se cumple —
    // los descuentos nunca se suman entre sí.
    return alcanzados.reduce((mejor, actual) =>
      actual.montoMinimo > mejor.montoMinimo ? actual : mejor
    );
  }, [nivelesDescuento, totalPrice]);

  const montoDescuento = useMemo(() => {
    if (!nivelDescuentoAplicado) return 0;
    if (nivelDescuentoAplicado.tipoDescuento === "porcentaje") {
      return totalPrice * (nivelDescuentoAplicado.valorDescuento / 100);
    }
    // Monto fijo — nunca descontar más de lo que hay en el carrito
    return Math.min(nivelDescuentoAplicado.valorDescuento, totalPrice);
  }, [nivelDescuentoAplicado, totalPrice]);

  const totalFinal = totalPrice - montoDescuento;

  // El próximo nivel que el cliente todavía no alcanza — útil para mostrar
  // un mensaje tipo "¡Agrega S/ 20 más y obtén 15% de descuento!"
  const proximoNivel = useMemo(() => {
    const noAlcanzados = nivelesDescuento
      .filter((n) => totalPrice < n.montoMinimo)
      .sort((a, b) => a.montoMinimo - b.montoMinimo);
    return noAlcanzados[0] || null;
  }, [nivelesDescuento, totalPrice]);

  const montoParaProximoNivel = proximoNivel ? proximoNivel.montoMinimo - totalPrice : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        toggleCart,
        nivelDescuentoAplicado,
        montoDescuento,
        totalFinal,
        proximoNivel,
        montoParaProximoNivel,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return context;
}