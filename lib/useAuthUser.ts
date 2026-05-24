"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserData = {
  id: string;
  nombre: string;
  email: string;
  emailVerificado: boolean;
};

export function useAuthUser() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth-user/check");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    await fetch("/api/auth-user/logout", { method: "POST" });
    setUser(null);
    setIsAuthenticated(false);
    router.push("/auth/login");
  };

  return { user, isAuthenticated, isChecking, logout };
}