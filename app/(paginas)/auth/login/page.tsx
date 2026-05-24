"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth-user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        router.push("/auth/perfil");
      } else {
        setError(data.error || "Error al iniciar sesión");
        if (data.intentosRestantes !== undefined) {
          setIntentosRestantes(data.intentosRestantes);
        }
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2C2C6C]/5 to-white px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#2C2C6C] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
          <p className="text-gray-500 text-sm mt-1">Bienvenido de nuevo a Janku</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@email.com"
                maxLength={200}
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <Link href="/auth/recuperar-contrasena" className="text-xs text-[#2C2C6C] hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Tu contraseña"
                maxLength={200}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {intentosRestantes !== null && intentosRestantes > 0 && (
                  <p className="text-xs mt-1 text-red-600">
                    Intentos restantes antes del bloqueo: {intentosRestantes}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2C2C6C] text-white py-3 rounded-lg font-semibold hover:bg-[#241B57] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/auth/registro" className="text-[#2C2C6C] font-semibold hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}