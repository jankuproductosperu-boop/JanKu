import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const category = await Category.findById(id).lean();
    
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }
    
    return NextResponse.json(category);
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error al obtener categoría" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("📡 PUT /api/categories/[id] - ID:", id);
    await connectDB();
    const body = await request.json();
    console.log("📦 Datos:", body);

    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const existingCategory = await Category.findOne({ 
      nombre: body.nombre,
      _id: { $ne: id }
    });
    
    if (existingCategory) {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 400 });
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, body, { new: true }).lean();
    
    if (!updatedCategory) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    console.log("✅ Actualizada");
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("📡 DELETE /api/categories/[id] - ID:", id);
    await connectDB();

    const category = await Category.findById(id).lean();
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const productsCount = await Product.countDocuments({ categoriaSlug: category.slug });
    
    if (productsCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar. Hay ${productsCount} producto(s) asociado(s)` 
      }, { status: 400 });
    }

    await Category.findByIdAndDelete(id).lean();
    console.log("✅ Eliminada");
    return NextResponse.json({ message: "Categoría eliminada correctamente" });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 });
  }
}