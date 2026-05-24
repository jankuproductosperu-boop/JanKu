import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SECURITY_HEADERS } from "@/lib/authUtils";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("user-token");
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