import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

type ReorderBody = {
  context: string; // "home" o el slug de una categoría
  orden: { id: string; orden: number }[];
};

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = (await req.json()) as ReorderBody;

    if (!body?.context || !Array.isArray(body.orden) || body.orden.length === 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const esHome = body.context === "home";

    const operaciones = body.orden.map(({ id, orden }) => {
      if (esHome) {
        return {
          updateOne: {
            filter: { _id: id },
            update: { $set: { ordenHome: orden } },
          },
        };
      }
      // Clave dinámica dentro del Map — MongoDB soporta notación de punto
      // para actualizar una sola clave de un mapa sin tocar las demás.
      return {
        updateOne: {
          filter: { _id: id },
          update: { $set: { [`ordenPorCategoria.${body.context}`]: orden } },
        },
      };
    });

    const resultado = await Product.bulkWrite(operaciones);

    return NextResponse.json({
      success: true,
      actualizados: resultado.modifiedCount ?? operaciones.length,
    });
  } catch (error) {
    console.error("❌ Error guardando orden de productos:", error);
    return NextResponse.json(
      { error: "Error al guardar el orden" },
      { status: 500 }
    );
  }
}