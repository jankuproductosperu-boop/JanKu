"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FavoriteProduct = {
  _id: string;
  nombre: string;
  precio: number;
  imagenUrl?: string;
  slug?: string;
};

type FavoritesContextType = {
  favorites: FavoriteProduct[];
  addToFavorites: (product: FavoriteProduct) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
  favoritesCount: number;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Cargar favoritos del localStorage al montar
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("janku-favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (error) {
        console.error("Error cargando favoritos:", error);
        localStorage.removeItem("janku-favorites");
      }
    }
  }, []);

  // Guardar favoritos en localStorage cuando cambien
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("janku-favorites", JSON.stringify(favorites));
    }
  }, [favorites, isClient]);

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
    localStorage.removeItem("janku-favorites");
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