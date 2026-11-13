// lib/useAuth.ts
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push("/login-admin");
        }
      } catch (error) {
        router.push("/login-admin");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isAuthenticated, isChecking };
}