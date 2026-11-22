"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, ShieldCheck } from "lucide-react";

export default function LoginAdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  // Fase 26b: segundo paso (código de la app o de rescate).
  const [paso2, setPaso2] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [usarRescate, setUsarRescate] = useState(false);
  const router = useRouter();

  const mostrarError = (data: { error?: string; remainingAttempts?: number; blocked?: boolean; remainingTime?: number }) => {
    setError(data.error || "Error al iniciar sesión");
    if (data.remainingAttempts !== undefined) setRemainingAttempts(data.remainingAttempts);
    if (data.blocked) setError(`Bloqueado por ${data.remainingTime} minutos`);
  };

  const volverAlPaso1 = (mensaje = "") => {
    setPaso2(false);
    setCodigo("");
    setUsarRescate(false);
    setRemainingAttempts(null);
    setError(mensaje);
  };

  const enviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await response.json();
      setCodigo("");
      if (response.ok) {
        if (typeof data.codigosRescateRestantes === "number") {
          window.alert(
            `Entraste con un código de rescate. Te quedan ${data.codigosRescateRestantes}. ` +
              "Genera códigos nuevos en Seguridad si te quedan pocos."
          );
        }
        router.push("/admin");
      } else if (data.code === "2FA_VENCIDA") {
        volverAlPaso1(data.error);
      } else {
        mostrarError(data);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.requiere2fa) {
        setPassword("");
        setRemainingAttempts(null);
        setPaso2(true);
      } else if (response.ok) {
        router.push("/admin");
      } else {
        mostrarError(data);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Panel Administrativo</h1>
          <p className="text-gray-600 mt-2">
            {paso2 ? "Verificación en dos pasos" : "Ingresa tus credenciales"}
          </p>
        </div>

        {paso2 ? (
          <form onSubmit={enviarCodigo} className="space-y-6">
            <div>
              <label htmlFor="codigo-2fa" className="block text-sm font-medium text-gray-700 mb-2">
                {usarRescate ? "Código de rescate" : "Código de 6 dígitos de tu app"}
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="codigo-2fa"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition font-mono tracking-widest"
                  placeholder={usarRescate ? "ABCDE-23456" : "123456"}
                  inputMode={usarRescate ? "text" : "numeric"}
                  autoComplete="one-time-code"
                  maxLength={usarRescate ? 11 : 7}
                  required
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsarRescate((v) => !v);
                  setCodigo("");
                }}
                className="mt-2 text-sm text-indigo-600 hover:underline"
              >
                {usarRescate ? "Usar el código de la app" : "¿No tienes el celular? Usa un código de rescate"}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">{error}</p>
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <p className="text-red-600 text-sm mt-1">Intentos restantes: {remainingAttempts}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-lg font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : "Verificar"}
            </button>
            <button
              type="button"
              onClick={() => volverAlPaso1()}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Volver
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">{error}</p>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="text-red-600 text-sm mt-1">
                      Intentos restantes: {remainingAttempts}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-lg font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          🔒 Sistema protegido con autenticación segura
        </p>
      </div>
    </div>
  );
}