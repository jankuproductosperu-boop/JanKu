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
  try {
    const { id } = await context.params;
    await connectDB();
    const body = await req.json();

    // ── Recalcular automáticamente el estado de stock ────────────────────────
    // findByIdAndUpdate NO dispara el hook pre('validate') del modelo (eso solo
    // pasa con .save()), así que si el body trae cambios de inventario,
    // recalculamos aquí mismo el texto Disponible/Limitado/Agotado — sin
    // importar si la edición vino de la tabla de inventario o de otro lado.
    if (body.stockCantidad !== undefined || body.stockMinimo !== undefined) {
      const actual = await Product.findById(id).select("stockCantidad stockMinimo").lean();
      const cantidad = body.stockCantidad !== undefined
        ? Number(body.stockCantidad)
        : (actual?.stockCantidad ?? 0);
      const minimo = body.stockMinimo !== undefined
        ? Number(body.stockMinimo)
        : (actual?.stockMinimo ?? 5);

      if (cantidad <= 0) {
        body.stock = "Agotado";
      } else if (cantidad <= minimo) {
        body.stock = "Limitado";
      } else {
        body.stock = "Disponible";
      }
    }

    const updated = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
  } catch (error: unknown) {
    // ── Código duplicado (índice único de "codigo") ─────────────────────────
    const err = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (err?.code === 11000) {
      const campo = err.keyPattern ? Object.keys(err.keyPattern)[0] : "campo";
      const nombreCampo = campo === "codigo" ? "código" : campo === "slug" ? "nombre/slug" : campo;
      return NextResponse.json(
        { error: `Ya existe otro producto con ese mismo ${nombreCampo}. Usa uno diferente.` },
        { status: 400 }
      );
    }

    console.error("❌ Error en PUT product:", error);
    return NextResponse.json(
      { error: "Error al actualizar el producto" },
      { status: 500 }
    );
  }
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