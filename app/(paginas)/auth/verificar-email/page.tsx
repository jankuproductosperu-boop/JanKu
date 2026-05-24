"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Suspense } from "react";

function VerificarContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [estado, setEstado] = useState<"cargando" | "exito" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setMensaje("Token inválido o faltante");
      return;
    }

    const verificar = async () => {
      try {
        const res = await fetch(`/api/auth-user/verify-email?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setEstado("exito");
          setMensaje(data.message);
        } else {
          setEstado("error");
          setMensaje(data.error || "Error al verificar");
        }
      } catch {
        setEstado("error");
        setMensaje("Error de conexión");
      }
    };

    verificar();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2C2C6C]/5 to-white px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {estado === "cargando" && (
          <>
            <Loader2 className="w-16 h-16 text-[#2C2C6C] mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900">Verificando tu email...</h1>
          </>
        )}
        {estado === "exito" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">¡Email verificado!</h1>
            <p className="text-gray-600 mb-6">{mensaje}</p>
            <Link href="/auth/login"
              className="inline-block bg-[#2C2C6C] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#241B57] transition">
              Ir al login
            </Link>
          </>
        )}
        {estado === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Error al verificar</h1>
            <p className="text-gray-600 mb-6">{mensaje}</p>
            <Link href="/auth/registro"
              className="inline-block bg-[#2C2C6C] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#241B57] transition">
              Registrarse de nuevo
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#2C2C6C]" />
      </div>
    }>
      <VerificarContent />
    </Suspense>
  );
}