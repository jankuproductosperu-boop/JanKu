"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import type { CartItem, DiscountTier } from "@/types";
import { lineaId } from "@/lib/variantes";
import { calcularTotales, proximoNivel as calcularProximoNivel } from "@/lib/pricing";

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: Omit<CartItem, "cantidad">) => void;
  // Reciben el id de la LÍNEA: lineaId(item._id, item.varianteId). Sin variante es el _id de siempre (D-63).
  removeFromCart: (linea: string) => void;
  updateQuantity: (linea: string, cantidad: number) => void;
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

// Acepta solo ítems con _id (texto), precio (número finito ≥ 0) y cantidad (entero ≥ 1); descarta el resto.
// Si el JSON es inválido o no es un arreglo, borra la clave y devuelve un carrito vacío.
function leerCarritoGuardado(texto: string): CartItem[] {
  try {
    const datos: unknown = JSON.parse(texto);
    if (!Array.isArray(datos)) throw new Error("no es un arreglo");
    return datos.filter((x): x is CartItem => {
      if (typeof x !== "object" || x === null) return false;
      const i = x as Record<string, unknown>;
      return (
        typeof i._id === "string" &&
        typeof i.precio === "number" && Number.isFinite(i.precio) && i.precio >= 0 &&
        typeof i.cantidad === "number" && Number.isInteger(i.cantidad) && i.cantidad >= 1
      );
    });
  } catch {
    try {
      localStorage.removeItem("janku-cart");
    } catch {
      // nada que hacer
    }
    return [];
  }
}

const MAX_CANTIDAD = 99;

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [nivelesDescuento, setNivelesDescuento] = useState<DiscountTier[]>([]);

  // Cargar carrito del localStorage al iniciar. Un JSON roto o con ítems inválidos nunca rompe la tienda.
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("janku-cart");
      if (savedCart) setCart(leerCarritoGuardado(savedCart));
    } catch {
      // localStorage no disponible: se sigue con el carrito vacío
    }
  }, []);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    try {
      localStorage.setItem("janku-cart", JSON.stringify(cart));
    } catch {
      // sin almacenamiento: el carrito sigue funcionando en memoria
    }
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

  // Cada línea se identifica por producto + variante: Negro y Rosado son dos líneas distintas.
  // Los ítems guardados antes de las variantes (sin varianteId) tienen lineaId = _id y siguen igual.
  const idDe = (item: Pick<CartItem, "_id" | "varianteId">) => lineaId(item._id, item.varianteId);

  const addToCart = (product: Omit<CartItem, "cantidad">) => {
    setCart((prev) => {
      const linea = idDe(product);
      const existingItem = prev.find((item) => idDe(item) === linea);
      
      if (existingItem) {
        // Si ya existe, incrementar cantidad
        return prev.map((item) =>
          idDe(item) === linea
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        // Si no existe, agregarlo con cantidad 1
        return [...prev, { ...product, cantidad: 1 }];
      }
    });
  };

  const removeFromCart = (linea: string) => {
    setCart((prev) => prev.filter((item) => idDe(item) !== linea));
  };

  const updateQuantity = (linea: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(linea);
      return;
    }
    
    setCart((prev) =>
      prev.map((item) =>
        idDe(item) === linea ? { ...item, cantidad: Math.min(cantidad, MAX_CANTIDAD) } : item
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
  // Subtotal, descuento por monto y total salen de lib/pricing: la misma función que usará el servidor (N1-5).
  const totales = useMemo(() => calcularTotales({ lineas: cart, niveles: nivelesDescuento }), [cart, nivelesDescuento]);
  const totalPrice = totales.subtotal;
  const nivelDescuentoAplicado = totales.nivel;
  const montoDescuento = totales.descuentoTotal;
  const totalFinal = totales.total;

  // El próximo nivel que el cliente todavía no alcanza — útil para mostrar "¡Agrega S/ 20 más y obtén 15% de descuento!"
  const siguiente = useMemo(() => calcularProximoNivel(nivelesDescuento, totalPrice), [nivelesDescuento, totalPrice]);
  const proximoNivel = siguiente ? siguiente.nivel : null;
  const montoParaProximoNivel = siguiente ? siguiente.falta : 0;

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