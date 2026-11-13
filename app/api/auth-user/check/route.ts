import { NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/server/http/respond";
import { getOptionalUser } from "@/server/auth/guards";

export async function GET() {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        emailVerificado: user.emailVerificado,
      },
    },
    { headers: SECURITY_HEADERS }
  );
}
