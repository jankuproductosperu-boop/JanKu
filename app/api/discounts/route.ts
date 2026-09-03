import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DiscountTier from "@/models/DiscountTier";

export async function GET() {
  try {
    await connectDB();
    const tiers = await DiscountTier.find().sort({ montoMinimo: 1 }).lean();
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Error al obtener descuentos:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    if (
      !body.nombre ||
      body.montoMinimo === undefined ||
      body.valorDescuento === undefined
    ) {
      return NextResponse.json(
        { error: "Nombre, monto mínimo y valor del descuento son obligatorios" },
        { status: 400 }
      );
    }

    const nuevo = await DiscountTier.create(body);
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    console.error("Error al crear descuento:", error);
    return NextResponse.json({ error: "Error al crear el descuento" }, { status: 500 });
  }
}