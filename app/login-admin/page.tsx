"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertTriangle } from "lucide-react";

export default function LoginAdmin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [blockedTime, setBlockedTime] = useState<number | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/admin");
      } else {
        // ✅ Manejar bloqueo
        if (data.blocked) {
          setError(`🔒 Cuenta bloqueada por ${data.remainingTime} minutos por seguridad.`);
          setBlockedTime(data.remainingTime);
          setRemainingAttempts(0);
        } else {
          setError("❌ Contraseña incorrecta");
          setRemainingAttempts(data.remainingAttempts);
        }
      }
    } catch (err) {
      setError("❌ Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2C2C6C] via-[#241B57] to-[#1a1442] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#2C2C6C] to-[#241B57] rounded-full mb-4 shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JAN-KU Admin</h1>
          <p className="text-gray-600">Panel de Administración</p>
          <p className="text-sm text-gray-500 mt-1">Ingresa tu contraseña para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña de Administrador
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-[#2C2C6C] outline-none transition"
              required
              autoFocus
              disabled={blockedTime !== null}
            />
          </div>

          {error && (
            <div className={`border-2 px-4 py-3 rounded-lg text-sm font-medium ${
              blockedTime 
                ? "bg-red-50 border-red-300 text-red-800" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {blockedTime && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold">Cuenta bloqueada</span>
                </div>
              )}
              {error}
            </div>
          )}

          {remainingAttempts !== null && remainingAttempts > 0 && remainingAttempts < 5 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              ⚠️ Intentos restantes: <strong>{remainingAttempts}</strong>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || blockedTime !== null}
            className="w-full bg-gradient-to-r from-[#2C2C6C] to-[#241B57] text-white py-3 rounded-lg font-bold text-lg hover:from-[#241B57] hover:to-[#1a1442] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? "Verificando..." : blockedTime ? "Bloqueado" : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Acceso protegido con límite de intentos</span>
          </div>
          
          <div className="text-center">
            <a href="/" className="text-[#2C2C6C] hover:text-[#241B57] text-sm font-medium">
              ← Volver a la tienda
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}