import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Banner from "@/models/Banner";

export async function GET() {
  try {
    await connectDB();
    const banners = await Banner.find({ activo: true }).lean();
    return NextResponse.json(banners);
  } catch (error) {
    console.error("Error en GET banners:", error);
    return NextResponse.json(
      { error: "Error al obtener banners" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const banner = await Banner.create(body);
    return NextResponse.json(banner);
  } catch (error) {
    console.error("Error en POST banner:", error);
    return NextResponse.json(
      { error: "Error al crear banner" },
      { status: 500 }
    );
  }
}