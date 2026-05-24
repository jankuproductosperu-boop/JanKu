"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type UserData = {
  id: string;
  nombre: string;
  email: string;
  emailVerificado: boolean;
};

type UserContextType = {
  user: UserData | null;
  isAuthenticated: boolean;
  isChecking: boolean;
  setUser: (user: UserData | null) => void;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth-user/check");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    await fetch("/api/auth-user/logout", { method: "POST" });
    setUser(null);
    // Limpiar favoritos del localStorage al cerrar sesión (opcional)
    // localStorage.removeItem("janku-favorites");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isChecking,
        setUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser debe usarse dentro de UserProvider");
  return context;
}