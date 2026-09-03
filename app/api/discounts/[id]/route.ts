import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DiscountTier from "@/models/DiscountTier";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, context: Params) {
  const { id } = await context.params;
  await connectDB();
  const tier = await DiscountTier.findById(id).lean();
  if (!tier) {
    return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 });
  }
  return NextResponse.json(tier);
}

export async function PUT(req: Request, context: Params) {
  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    const updated = await DiscountTier.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al actualizar descuento:", error);
    return NextResponse.json({ error: "Error al actualizar el descuento" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: Params) {
  try {
    const { id } = await context.params;
    await connectDB();
    const deleted = await DiscountTier.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ message: "Descuento eliminado correctamente", success: true });
  } catch (error) {
    console.error("Error al eliminar descuento:", error);
    return NextResponse.json({ error: "Error al eliminar el descuento" }, { status: 500 });
  }
}