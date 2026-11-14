  import { NextResponse } from "next/server";
  import { borrarCookieAdmin } from "@/server/auth/session";
  import { log } from "@/server/logger";

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
      log.error("logout_admin.error", error);
      return NextResponse.json(
        { error: "Error al cerrar sesión" },
        { status: 500 }
      );
    }
  }
