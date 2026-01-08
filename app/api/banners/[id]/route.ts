import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Banner from "@/models/Banner";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, context: Params) {
  const { id } = await context.params;
  await connectDB();
  const banner = await Banner.findById(id).lean();
  if (!banner) {
    return NextResponse.json(
      { error: "Banner no encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(banner);
}

export async function PUT(req: Request, context: Params) {
  const { id } = await context.params;
  await connectDB();
  const body = await req.json();
  const updated = await Banner.findByIdAndUpdate(id, body, { new: true }).lean();
  if (!updated) {
    return NextResponse.json(
      { error: "Banner no encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, context: Params) {
  const { id } = await context.params;
  
  try {
    await connectDB();
    const deleted = await Banner.findByIdAndDelete(id).lean();
    
    if (!deleted) {
      return NextResponse.json(
        { error: "Banner no encontrado" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: "Banner eliminado correctamente",
      success: true 
    });
    
  } catch (error) {
    console.error("Error en DELETE banner:", error);
    return NextResponse.json(
      { error: "Error al eliminar banner" },
      { status: 500 }
    );
  }
}