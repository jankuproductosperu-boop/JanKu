import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Promotion from "@/models/Promotion";

export async function GET() {
  try {
    await connectDB();
    const promotions = await Promotion.find({ activo: true }).sort({ orden: 1 }).lean();
    return NextResponse.json(promotions);
  } catch (error) {
    console.error("Error en GET promotions:", error);
    return NextResponse.json(
      { error: "Error al obtener promociones" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const promotion = await Promotion.create(body);
    return NextResponse.json(promotion);
  } catch (error) {
    console.error("Error en POST promotion:", error);
    return NextResponse.json(
      { error: "Error al crear promoción" },
      { status: 500 }
    );
  }
}