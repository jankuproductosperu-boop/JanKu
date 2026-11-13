// api/products/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import Product from "@/models/Product";

export async function GET() {
  try {
    console.log("📡 GET /api/products - Iniciando...");
    
    await connectDB();
    console.log("✅ MongoDB conectado");
    
    const products = await Product.find().lean().exec();
    console.log(`📦 Productos encontrados: ${products.length}`);
    
    // ✅ ASEGURAR que siempre devuelve un array
    return NextResponse.json(Array.isArray(products) ? products : []);
    
  } catch (error) {
    console.error("❌ Error en GET products:", error);
    
    // ✅ Devolver array vacío en caso de error
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.log("📡 POST /api/products - Iniciando...");
    
    await connectDB();
    const body = await req.json();
    
    console.log("📦 Datos recibidos:", body);
    
    const product = await Product.create(body);
    console.log("✅ Producto creado");
    
    // ✅ Devolver el producto directamente
    return NextResponse.json(product);
    
  } catch (error) {
    console.error("❌ Error en POST product:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}