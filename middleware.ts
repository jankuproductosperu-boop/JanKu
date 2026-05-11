    import { NextResponse } from "next/server";
    import type { NextRequest } from "next/server";
    import { jwtVerify } from "jose";
    
    // Rutas API que requieren autenticación para escribir
    const PROTECTED_API_ROUTES = [
    "/api/products",
    "/api/banners",
    "/api/categories",
    "/api/promotions",
    "/api/upload",
    ];
    
    // Rutas del panel admin que requieren autenticación para ver
    const PROTECTED_PAGE_ROUTES = ["/admin"];
    
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
        // Borrar cookie inválida
        response.cookies.delete("admin-token");
        return response;
        }
    }
    
    // ── Proteger APIs de escritura ──────────────────────────────────────────
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
        } catch (error) {
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
        // Todas las rutas API excepto auth (login/logout no necesitan token)
        "/api/((?!auth).*)",
        // Página de admin
        "/admin/:path*",
    ],
    };