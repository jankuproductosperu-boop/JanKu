import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOptionalUser } from "@/server/auth/guards";
import { AppError } from "@/server/http/errors";
import { obtenerPedidoPublico } from "@/server/services/order.service";
import { PedidoClient } from "./PedidoClient";

// El enlace lleva un token de acceso: no se indexa, no se cachea y no se envía como referer.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ t?: string | string[]; nuevo?: string | string[] }>;
};

export default async function PedidoPage({ params, searchParams }: Props) {
  const { codigo } = await params;
  const { t, nuevo } = await searchParams;
  const token = typeof t === "string" ? t : undefined;

  const usuario = await getOptionalUser();
  let pedido;
  try {
    pedido = await obtenerPedidoPublico(codigo, { token, userId: usuario?.id });
  } catch (err) {
    // "No existe" y "sin acceso" son lo mismo: 404. Cualquier otro fallo sigue su camino normal.
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }

  return <PedidoClient pedido={pedido} token={token} nuevo={nuevo === "1"} />;
}
