// Prueba de humo HTTP. Solo lecturas y peticiones que deben ser rechazadas.
// Uso: npm run smoke   (SMOKE_BASE_URL por defecto http://localhost:3000)

const BASE = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const esHtml = (res) =>
  res.status === 200 && (res.headers.get("content-type") || "").includes("text/html")
    ? true
    : `esperado 200 HTML, recibido ${res.status} ${res.headers.get("content-type")}`;

const redirige = (destino) => (res) => {
  const loc = res.headers.get("location") || "";
  const ok = [307, 308].includes(res.status) && new URL(loc, BASE).pathname === destino;
  return ok ? true : `esperado 307→${destino}, recibido ${res.status}${loc ? "→" + loc : ""}`;
};

const esArregloJson = (res, texto) => {
  if (res.status !== 200) return `esperado 200, recibido ${res.status}`;
  try {
    return Array.isArray(JSON.parse(texto)) ? true : "el cuerpo JSON no es un arreglo";
  } catch {
    return "el cuerpo no es JSON";
  }
};

const estado = (codigo) => (res) =>
  res.status === codigo ? true : `esperado ${codigo}, recibido ${res.status}`;

const cabeceras = (res) => {
  const faltan = [];
  if (!res.headers.get("content-security-policy")) faltan.push("content-security-policy");
  if ((res.headers.get("x-frame-options") || "").toUpperCase() !== "DENY") faltan.push("x-frame-options: DENY");
  if ((res.headers.get("x-content-type-options") || "").toLowerCase() !== "nosniff")
    faltan.push("x-content-type-options: nosniff");
  return faltan.length ? `faltan cabeceras: ${faltan.join(", ")}` : true;
};

const paginas = [
  "/", "/promociones", "/carrito", "/favoritos", "/busqueda?q=a", "/contacto",
  "/nosotros", "/auth/login", "/auth/registro", "/auth/recuperar-contrasena", "/login-admin",
];

// Las fases siguientes solo añaden elementos a este arreglo.
const CHECKS = [
  ...paginas.map((ruta) => ({ nombre: `GET ${ruta}`, metodo: "GET", ruta, espera: esHtml })),
  { nombre: "GET /admin (sin cookie)", metodo: "GET", ruta: "/admin", espera: redirige("/login-admin") },
  { nombre: "GET /auth/perfil (sin cookie)", metodo: "GET", ruta: "/auth/perfil", espera: redirige("/auth/login") },
  ...["products", "categories", "banners", "promotions", "discounts"].map((n) => ({
    nombre: `GET /api/${n}`, metodo: "GET", ruta: `/api/${n}`, espera: esArregloJson,
  })),
  { nombre: "POST /api/products (sin cookie)", metodo: "POST", ruta: "/api/products", cuerpo: {}, espera: estado(401) },
  { nombre: "DELETE /api/upload/delete (sin cookie)", metodo: "DELETE", ruta: "/api/upload/delete", espera: estado(401) },
  { nombre: "GET /api/auth/check (sin cookie)", metodo: "GET", ruta: "/api/auth/check", espera: estado(401) },
  { nombre: "GET /api/auth-user/check (sin cookie)", metodo: "GET", ruta: "/api/auth-user/check", espera: estado(401) },
  { nombre: "Cabeceras de seguridad en GET /", metodo: "GET", ruta: "/", espera: cabeceras },
  // Campos vacíos se rechazan antes de registrarIntento: no consume intentos.
  { nombre: "POST /api/auth/login con {}", metodo: "POST", ruta: "/api/auth/login", cuerpo: {}, espera: estado(400) },
  // Fase 08
  { nombre: "GET /api/admin/cualquier-cosa (sin cookie)", metodo: "GET", ruta: "/api/admin/cualquier-cosa", espera: estado(401) },
  {
    nombre: "PUT /api/discounts/000000000000000000000000 (sin cookie)", metodo: "PUT",
    ruta: "/api/discounts/000000000000000000000000", cuerpo: {}, espera: estado(401),
  },
  { nombre: "POST /api/products/reorder (sin cookie)", metodo: "POST", ruta: "/api/products/reorder", cuerpo: {}, espera: estado(401) },
  { nombre: "GET /api/auth-user/profile (sin cookie)", metodo: "GET", ruta: "/api/auth-user/profile", espera: estado(401) },
  // Fase 09
  { nombre: "GET /api/admin/users (sin cookie)", metodo: "GET", ruta: "/api/admin/users", espera: estado(401) },
];

async function main() {
  try {
    await fetch(BASE, { redirect: "manual" });
  } catch {
    console.error(`No hay servidor en ${BASE}. Arranca \`npm run dev\` primero.`);
    process.exit(1);
  }

  let fallos = 0;
  for (const c of CHECKS) {
    try {
      const res = await fetch(BASE + c.ruta, {
        method: c.metodo,
        redirect: "manual",
        headers: c.cuerpo ? { "content-type": "application/json" } : undefined,
        body: c.cuerpo ? JSON.stringify(c.cuerpo) : undefined,
      });
      const texto = await res.text();
      const r = c.espera(res, texto);
      if (r === true) console.log(`OK  ${c.nombre}`);
      else {
        fallos++;
        console.log(`FALLO  ${c.nombre}  ${r}`);
      }
    } catch (e) {
      fallos++;
      console.log(`FALLO  ${c.nombre}  ${e instanceof Error ? e.message : "error de red"}`);
    }
  }
  process.exit(fallos ? 1 : 0);
}

main();
