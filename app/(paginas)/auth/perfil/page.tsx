"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, MapPin, LogOut, Save, AlertCircle, CheckCircle, ShoppingBag, Heart, Trash2, X } from "lucide-react";
import { useUser } from "@/context/UserContext";

type Perfil = {
  nombre: string;
  email: string;
  emailVerificado: boolean;
  direccion?: {
    calle?: string;
    ciudad?: string;
    departamento?: string;
    codigoPostal?: string;
  };
  createdAt: string;
};

export default function PerfilPage() {
  const router = useRouter();
  const { isChecking, isAuthenticated, logout, setUser } = useUser();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    calle: "",
    ciudad: "",
    departamento: "",
    codigoPostal: "",
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  // ── Eliminar cuenta ──────────────────────────────────────────────────────
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [passwordEliminar, setPasswordEliminar] = useState("");
  const [errorEliminar, setErrorEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isChecking, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const cargarPerfil = async () => {
      try {
        const res = await fetch("/api/auth-user/profile");
        if (res.ok) {
          const data = await res.json();
          setPerfil(data.user);
          setForm({
            nombre: data.user.nombre || "",
            calle: data.user.direccion?.calle || "",
            ciudad: data.user.direccion?.ciudad || "",
            departamento: data.user.direccion?.departamento || "",
            codigoPostal: data.user.direccion?.codigoPostal || "",
          });
        }
      } catch {
        setError("Error cargando perfil");
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [isAuthenticated]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito(false);
    setGuardando(true);

    try {
      const res = await fetch("/api/auth-user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          direccion: {
            calle: form.calle,
            ciudad: form.ciudad,
            departamento: form.departamento,
            codigoPostal: form.codigoPostal,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPerfil(data.user);
        setExito(true);
        setTimeout(() => setExito(false), 3000);
      } else {
        setError(data.error || "Error al guardar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setGuardando(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // ── Eliminar cuenta ──────────────────────────────────────────────────────
  const handleEliminarCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEliminar("");

    if (!passwordEliminar) {
      setErrorEliminar("Debes ingresar tu contraseña");
      return;
    }

    setEliminando(true);
    try {
      const res = await fetch("/api/auth-user/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordEliminar }),
      });

      const data = await res.json();

      if (res.ok) {
        // La cookie ya se borró en el servidor — limpiamos el estado local también
        setUser(null);
        router.push("/");
      } else {
        setErrorEliminar(data.error || "No se pudo eliminar la cuenta");
        setEliminando(false);
      }
    } catch {
      setErrorEliminar("Error de conexión");
      setEliminando(false);
    }
  };

  const cancelarEliminar = () => {
    setMostrarEliminar(false);
    setPasswordEliminar("");
    setErrorEliminar("");
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#2C2C6C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2C2C6C]/5 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-[#2C2C6C] rounded-2xl p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{perfil?.nombre}</h1>
              <p className="text-white/70 text-sm">{perfil?.email}</p>
              {perfil?.emailVerificado && (
                <span className="inline-flex items-center gap-1 text-green-300 text-xs mt-1">
                  <CheckCircle className="w-3 h-3" /> Email verificado
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>

        {/* Links rápidos */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/favoritos"
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Mis favoritos</p>
              <p className="text-xs text-gray-500">Ver guardados</p>
            </div>
          </Link>
          <Link href="/carrito"
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#2C2C6C]" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Mi carrito</p>
              <p className="text-xs text-gray-500">Ver productos</p>
            </div>
          </Link>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#2C2C6C]" />
            Mis datos
          </h2>

          <form onSubmit={handleGuardar} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                maxLength={100}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
              />
            </div>

            {/* Email — solo lectura */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400 font-normal">(no editable)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={perfil?.email || ""}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2C2C6C]" />
                Dirección de entrega
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.calle}
                  onChange={(e) => setForm({ ...form, calle: e.target.value })}
                  placeholder="Calle y número"
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                    placeholder="Ciudad"
                    maxLength={100}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={form.departamento}
                    onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                    placeholder="Departamento"
                    maxLength={100}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={form.codigoPostal}
                  onChange={(e) => setForm({ ...form, codigoPostal: e.target.value })}
                  placeholder="Código postal (opcional)"
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C2C6C] focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Mensajes */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {exito && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Cambios guardados correctamente
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-[#2C2C6C] text-white py-3 rounded-lg font-semibold hover:bg-[#241B57] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>

        {/* Miembro desde */}
        {perfil?.createdAt && (
          <p className="text-center text-xs text-gray-400">
            Miembro desde {new Date(perfil.createdAt).toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}

        {/* ── Zona de peligro — eliminar cuenta ──────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-red-100 p-6">
          <h2 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Zona de peligro
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Al eliminar tu cuenta se borrarán permanentemente tus datos de perfil y dirección.
            Esta acción no se puede deshacer.
          </p>

          {!mostrarEliminar ? (
            <button
              onClick={() => setMostrarEliminar(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar mi cuenta
            </button>
          ) : (
            <form onSubmit={handleEliminarCuenta} className="space-y-3 bg-red-50/50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-red-800 font-medium">
                  Ingresa tu contraseña para confirmar que quieres eliminar tu cuenta permanentemente.
                </p>
                <button
                  type="button"
                  onClick={cancelarEliminar}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                type="password"
                value={passwordEliminar}
                onChange={(e) => setPasswordEliminar(e.target.value)}
                placeholder="Tu contraseña"
                maxLength={200}
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm bg-white"
              />

              {errorEliminar && (
                <div className="flex items-center gap-2 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorEliminar}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={eliminando}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
                >
                  {eliminando ? "Eliminando..." : "Sí, eliminar mi cuenta permanentemente"}
                </button>
                <button
                  type="button"
                  onClick={cancelarEliminar}
                  disabled={eliminando}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition text-sm disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}