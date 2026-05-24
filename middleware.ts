import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Rutas API que requieren autenticación de ADMIN para escribir
const PROTECTED_API_ROUTES = [
  "/api/products",
  "/api/banners",
  "/api/categories",
  "/api/promotions",
  "/api/upload",
];

// Rutas del panel admin que requieren autenticación de ADMIN para ver
const PROTECTED_PAGE_ROUTES = ["/admin"];

// Rutas de usuario que requieren sesión de usuario
const PROTECTED_USER_ROUTES = ["/auth/perfil"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestMethod = request.method;

  // ── Proteger páginas del admin ──────────────────────────────────────────
  const isAdminPage = PROTECTED_PAGE_ROUTES.some((r) => pathname.startsWith(r));
  if (isAdminPage) {
    const token = request.cookies.get("admin-token")?.value;
    if (!token) {
      const loginUrl = new URL("/login-admin", request.url);
      return NextResponse.redirect(loginUrl);
    }
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    } catch {
      const loginUrl = new URL("/login-admin", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("admin-token");
      return response;
    }
  }

  // ── Proteger páginas de usuario ─────────────────────────────────────────
  const isUserPage = PROTECTED_USER_ROUTES.some((r) => pathname.startsWith(r));
  if (isUserPage) {
    const token = request.cookies.get("user-token")?.value;
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.USER_JWT_SECRET!));
    } catch {
      const loginUrl = new URL("/auth/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("user-token");
      return response;
    }
  }

  // ── Proteger APIs de escritura del admin ────────────────────────────────
  const isProtectedApi = PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r));
  const isWriteMethod = ["POST", "PUT", "DELETE", "PATCH"].includes(requestMethod);

  if (isProtectedApi && isWriteMethod) {
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado — se requiere autenticación" },
        { status: 401 }
      );
    }

    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    } catch {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/((?!auth).*)",
    "/admin/:path*",
    "/auth/perfil/:path*",
  ],
};