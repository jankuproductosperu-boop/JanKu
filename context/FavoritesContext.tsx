"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Product } from "@/types";
import { crearAlmacenLocal, useAlmacenLocal } from "@/hooks/useAlmacenLocal";

export type FavoriteProduct = Pick<Product, "_id" | "nombre" | "precio" | "imagenUrl" | "slug" | "codigoUrl">;

type FavoritesContextType = {
  favorites: FavoriteProduct[];
  addToFavorites: (product: FavoriteProduct) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  favoritesCount: number;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const SIN_FAVORITOS: FavoriteProduct[] = [];

// Si lo guardado está roto, se borra y se empieza sin favoritos.
function leerFavoritos(texto: string): FavoriteProduct[] {
  try {
    return JSON.parse(texto);
  } catch (error) {
    console.error("Error cargando favoritos:", error);
    localStorage.removeItem("janku-favorites");
    return SIN_FAVORITOS;
  }
}

// Favoritos en localStorage ("janku-favorites"); cada cambio se guarda al momento.
const almacenFavoritos = crearAlmacenLocal<FavoriteProduct[]>("janku-favorites", leerFavoritos, SIN_FAVORITOS);
const setFavorites = almacenFavoritos.set;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favorites = useAlmacenLocal(almacenFavoritos);

  const addToFavorites = (product: FavoriteProduct) => {
    setFavorites((prev) => {
      // Evitar duplicados
      if (prev.some((p) => p._id === product._id)) {
        return prev;
      }
      return [...prev, product];
    });
  };

  const removeFromFavorites = (productId: string) => {
    setFavorites((prev) => prev.filter((p) => p._id !== productId));
  };

  const isFavorite = (productId: string) => {
    return favorites.some((p) => p._id === productId);
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const value = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearFavorites,
    favoritesCount: favorites.length,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  }
  return context;
}