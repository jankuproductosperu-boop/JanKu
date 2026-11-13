import { NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/server/http/respond";
import { borrarCookieUser } from "@/server/auth/session";

export async function POST() {
  try {
    await borrarCookieUser();
    return NextResponse.json(
      { success: true },
      {
        headers: {
          ...SECURITY_HEADERS,
          "Clear-Site-Data": '"cookies"',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Error al cerrar sesión" }, { status: 500 });
  }
}