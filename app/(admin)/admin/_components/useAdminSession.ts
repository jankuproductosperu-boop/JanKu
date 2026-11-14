"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminSession, Permiso } from "@/types";

// /api/auth/check no devuelve `id`; el resto de la sesión coincide con AdminSession.
export type AdminSesionVisible = Omit<AdminSession, "id">;

export function useAdminSession(): {
  admin: AdminSesionVisible | null;
  cargando: boolean;
  puede: (p: Permiso) => boolean;
} {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSesionVisible | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    const comprobar = async () => {
      try {
        const res = await fetch("/api/auth/check");
        if (!res.ok) {
          router.push("/login-admin");
          return;
        }
        const data = await res.json();
        if (activo) setAdmin(data.admin ?? null);
      } catch {
        router.push("/login-admin");
      } finally {
        if (activo) setCargando(false);
      }
    };
    comprobar();
    return () => {
      activo = false;
    };
  }, [router]);

  const puede = (p: Permiso) => !!admin && admin.permisos.includes(p);

  return { admin, cargando, puede };
}
