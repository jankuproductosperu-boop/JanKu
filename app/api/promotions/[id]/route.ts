import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Promotion from "@/models/Promotion";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, context: Params) {
  const { id } = await context.params;
  await connectDB();
  const promotion = await Promotion.findById(id).lean();
  if (!promotion) {
    return NextResponse.json(
      { error: "Promoción no encontrada" },
      { status: 404 }
    );
  }
  return NextResponse.json(promotion);
}

export async function PUT(req: Request, context: Params) {
  const { id } = await context.params;
  await connectDB();
  const body = await req.json();
  const updated = await Promotion.findByIdAndUpdate(id, body, { new: true }).lean();
  if (!updated) {
    return NextResponse.json(
      { error: "Promoción no encontrada" },
      { status: 404 }
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, context: Params) {
  const { id } = await context.params;
  
  try {
    await connectDB();
    const deleted = await Promotion.findByIdAndDelete(id).lean();
    
    if (!deleted) {
      return NextResponse.json(
        { error: "Promoción no encontrada" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: "Promoción eliminada correctamente",
      success: true 
    });
    
  } catch (error) {
    console.error("Error en DELETE promotion:", error);
    return NextResponse.json(
      { error: "Error al eliminar promoción" },
      { status: 500 }
    );
  }
}