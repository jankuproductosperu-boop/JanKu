"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, MailCheck } from "lucide-react";
import { Suspense } from "react";

// Estados:
// "cargando"   -> comprobando si el token es válido (GET, no verifica)
// "listo"      -> token válido, esperando que el usuario confirme (botón)
// "verificando"-> el usuario hizo clic, esperando respuesta del POST
// "exito"      -> cuenta verificada
// "error"      -> token inválido / expirado / error de servidor
function VerificarContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // El estado inicial ya refleja si hay token o no — así evitamos llamar
  // setState de forma síncrona dentro del useEffect para ese caso.
  const [estado, setEstado] = useState<"cargando" | "listo" | "verificando" | "exito" | "error">(
    token ? "cargando" : "error"
  );
  const [mensaje, setMensaje] = useState(token ? "" : "Token inválido o faltante");
  const [nombre, setNombre] = useState("");

  // Solo COMPRUEBA el token al cargar — no verifica la cuenta todavía.
  // El efecto ahora solo hace trabajo async (fetch); no llama setState
  // de forma síncrona en su cuerpo.
  useEffect(() => {
    if (!token) return;

    let cancelado = false;

    const comprobar = async () => {
      try {
        const res = await fetch(`/api/auth-user/verify-email?token=${token}`);
        const data = await res.json();
        if (cancelado) return;
        if (res.ok && data.valido) {
          setEstado("listo");
          setNombre(data.nombre || "");
        } else {
          setEstado("error");
          setMensaje(data.error || "Error al comprobar el enlace");
        }
      } catch {
        if (!cancelado) {
          setEstado("error");
          setMensaje("Error de conexión");
        }
      }
    };

    comprobar();

    return () => {
      cancelado = true;
    };
  }, [token]);

  // Solo aquí, con un clic explícito del usuario, se verifica de verdad
  const confirmarVerificacion = async () => {
    setEstado("verificando");
    try {
      const res = await fetch("/api/auth-user/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2C2C6C]/5 to-white px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {estado === "cargando" && (
          <>
            <Loader2 className="w-16 h-16 text-[#2C2C6C] mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900">Comprobando tu enlace...</h1>
          </>
        )}

        {estado === "listo" && (
          <>
            <MailCheck className="w-16 h-16 text-[#2C2C6C] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {nombre ? `¡Hola, ${nombre}!` : "Confirma tu email"}
            </h1>
            <p className="text-gray-600 mb-6">
              Haz clic en el botón para confirmar y activar tu cuenta.
            </p>
            <button
              onClick={confirmarVerificacion}
              className="inline-block bg-[#2C2C6C] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#241B57] transition"
            >
              Confirmar mi cuenta
            </button>
          </>
        )}

        {estado === "verificando" && (
          <>
            <Loader2 className="w-16 h-16 text-[#2C2C6C] mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900">Verificando...</h1>
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