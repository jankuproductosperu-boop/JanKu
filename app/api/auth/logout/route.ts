  import { NextResponse } from "next/server";
  import { borrarCookieAdmin } from "@/server/auth/session";

  export async function POST() {
    try {
      await borrarCookieAdmin();

      return NextResponse.json(
        { success: true },
        {
          headers: {
            "Cache-Control": "no-store",
            "Clear-Site-Data": '"cookies"', // Limpia todas las cookies del sitio en browsers modernos
          },
        }
      );
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      return NextResponse.json(
        { error: "Error al cerrar sesión" },
        { status: 500 }
      );
    }
  }