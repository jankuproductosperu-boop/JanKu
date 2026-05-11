  import { NextResponse } from "next/server";
  import { cookies } from "next/headers";

  export async function POST() {
    try {
      const cookieStore = await cookies();

      // Borrar la cookie correcta (antes borraba "admin-auth" que no existe)
      cookieStore.delete("admin-token");

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