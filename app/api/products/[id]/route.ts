import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// ------------------ GET ------------------
export async function GET(req: Request, context: Params) {
  const { id } = await context.params;
  await connectDB();
  const product = await Product.findById(id).lean();
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(product);
}

// ------------------ PUT ------------------
export async function PUT(req: Request, context: Params) {
  const { id } = await context.params;
  await connectDB();
  const body = await req.json();
  const updated = await Product.findByIdAndUpdate(id, body, { new: true }).lean();
  if (!updated) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(updated);
}

// ------------------ DELETE ------------------
export async function DELETE(req: Request, context: Params) {
  const { id } = await context.params;
  
  console.log("🔴 DELETE llamado con ID:", id);
  
  try {
    await connectDB();
    console.log("✅ Conectado a MongoDB");
    
    const deleted = await Product.findByIdAndDelete(id).lean();
    console.log("📦 Resultado delete:", deleted);
    
    if (!deleted) {
      console.log("❌ Producto no encontrado");
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    
    console.log("✅ Producto eliminado correctamente");
    return NextResponse.json({ 
      message: "Producto eliminado correctamente",
      success: true 
    });
    
  } catch (error) {
    console.error("💥 Error en DELETE:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}