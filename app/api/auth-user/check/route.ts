import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SECURITY_HEADERS } from "@/lib/authUtils";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("user-token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.USER_JWT_SECRET!)
    );

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: payload.userId,
          nombre: payload.nombre,
          email: payload.email,
        },
      },
      { headers: SECURITY_HEADERS }
    );
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}