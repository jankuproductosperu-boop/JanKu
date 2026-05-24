"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

function NuevaContrasenaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [form, setForm] = useState({ password: "", confirmar: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const requisitos = [
    { label: "Al menos 8 caracteres", cumple: form.password.length >= 8 },
    { label: "Una mayúscula", cumple: /[A-Z]/.test(form.password) },
    { label: "Un número", cumple: /[0-9]/.test(form.password) },
    { label: "Las contraseñas coinciden", cumple: form.password === form.confirmar && form.confirmar.length > 0 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token inválido");
      return;
    }

    if (form.password !== form.confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth-user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });

      const data = await res.json();

      if (res.ok) {
        setExito(true);
        setTimeout(() => router.push("/auth/login"), 3000);
      } else {
        setError(data.error || "Error al restablecer contraseña");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2C2C6C]/5 to-white px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace inválido</h1>
          <p className="text-gray-600 mb-6">El enlace no es válido o ya expiró.</p>
          <Link href="/auth/recuperar-contrasena"
            className="inline-block bg-[#2C2C6C] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#241B57] transition">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2C2C6C]/5 to-white px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h1>
          <p className="text-gray-600 mb-2">Tu contraseña fue restablecida correctamente.</p>
          <p className="text-sm text-gray-500">Redirigiendo al login en unos segundos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2C2C6C]/5 to-white px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#2C2C6C] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Elige una contraseña segura</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                maxLength={200}
                required
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirmar}
                onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
                placeholder="Repite la contraseña"
                maxLength={200}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {form.password.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {requisitos.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${r.cumple ? "bg-green-500" : "bg-gray-300"}`}>
                    {r.cumple && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className={r.cumple ? "text-green-700" : "text-gray-500"}>{r.label}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !requisitos.every(r => r.cumple)}
            className="w-full bg-[#2C2C6C] text-white py-3 rounded-lg font-semibold hover:bg-[#241B57] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function NuevaContrasenaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2C2C6C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NuevaContrasenaContent />
    </Suspense>
  );
}