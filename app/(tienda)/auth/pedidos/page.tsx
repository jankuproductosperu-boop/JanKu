"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ChevronRight, Package } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { etiquetaEstado, type OrderEstado } from "@/lib/orderStatus";
import { formatearSoles } from "@/lib/money";
import type { OrderPublic } from "@/types";

const INSIGNIA: Record<OrderEstado, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmado: "bg-indigo-100 text-indigo-800",
  enviado: "bg-blue-100 text-blue-800",
  entregado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-700",
};

export default function MisPedidosPage() {
  const router = useRouter();
  const { isChecking, isAuthenticated } = useUser();
  const [pedidos, setPedidos] = useState<OrderPublic[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isChecking && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isChecking, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let vigente = true;

    fetch("/api/orders/mine")
      .then(async (res) => {
        if (!vigente) return;
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data: OrderPublic[] = await res.json();
        if (vigente) setPedidos(data);
      })
      .catch(() => {
        if (vigente) setError("No pudimos cargar tus pedidos. Intenta de nuevo más tarde.");
      });

    return () => {
      vigente = false;
    };
  }, [isAuthenticated, router]);

  if (isChecking || (isAuthenticated && pedidos === null && !error)) {
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
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#2C2C6C]" />
            Mis pedidos
          </h1>
          <Link
            href="/auth/perfil"
            className="inline-flex items-center gap-1.5 text-sm text-[#2C2C6C] font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Mi perfil
          </Link>
        </div>

        {error ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        ) : pedidos && pedidos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
            <p className="text-gray-600">Aún no tienes pedidos</p>
            <Link
              href="/"
              className="inline-block bg-[#2C2C6C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#241B57] transition"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {pedidos?.map((p) => {
              const unidades = p.items.reduce((acc, it) => acc + it.cantidad, 0);
              return (
                <li key={p.codigo}>
                  <Link
                    href={`/pedido/${encodeURIComponent(p.codigo)}`}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-[#2C2C6C] tracking-wide">{p.codigo}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${INSIGNIA[p.estado]}`}>
                          {etiquetaEstado(p.estado)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString("es-PE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {" · "}
                        {unidades} {unidades === 1 ? "producto" : "productos"}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900 whitespace-nowrap">{formatearSoles(p.total)}</span>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
