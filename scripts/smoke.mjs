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

// Fase 27 (D-91): página de 404 de la tienda servida en streaming (200, noindex y el texto de la marca).
const noEncontradoEnStreaming = (res, texto) => {
  const base = esHtml(res);
  if (base !== true) return base;
  if (!/<meta name="robots" content="noindex"/.test(texto)) return "falta <meta name=\"robots\" content=\"noindex\">";
  return texto.includes("No encontramos esta página") ? true : "no muestra la página de 404 de la tienda";
};

const paginas = [
  "/", "/promociones", "/carrito", "/favoritos", "/busqueda?q=a", "/contacto",
  "/terminos", "/privacidad", "/cambios-y-devoluciones", "/envios", "/cookies",
  "/auth/login", "/auth/registro", "/auth/recuperar-contrasena", "/login-admin",
  "/libro-de-reclamaciones", // Fase 22b
];

// Las fases siguientes solo añaden elementos a este arreglo.
const CHECKS = [
  ...paginas.map((ruta) => ({ nombre: `GET ${ruta}`, metodo: "GET", ruta, espera: esHtml })),
  { nombre: "GET /admin (sin cookie)", metodo: "GET", ruta: "/admin", espera: redirige("/login-admin") },
  { nombre: "GET /auth/perfil (sin cookie)", metodo: "GET", ruta: "/auth/perfil", espera: redirige("/auth/login") },
  // Fase 20
  { nombre: "GET /auth/pedidos (sin cookie)", metodo: "GET", ruta: "/auth/pedidos", espera: redirige("/auth/login") },
  ...["products", "categories", "banners", "promotions", "discounts"].map((n) => ({
    nombre: `GET /api/${n}`, metodo: "GET", ruta: `/api/${n}`, espera: esArregloJson,
  })),
  { nombre: "POST /api/products (sin cookie)", metodo: "POST", ruta: "/api/products", cuerpo: {}, espera: estado(401) },
  { nombre: "DELETE /api/upload/delete (sin cookie)", metodo: "DELETE", ruta: "/api/upload/delete", espera: estado(401) },
  { nombre: "GET /api/auth/check (sin cookie)", metodo: "GET", ruta: "/api/auth/check", espera: estado(401) },
  { nombre: "GET /api/auth-user/check (sin cookie)", metodo: "GET", ruta: "/api/auth-user/check", espera: estado(401) },
  { nombre: "Cabeceras de seguridad en GET /", metodo: "GET", ruta: "/", espera: cabeceras },
  // Fase 27 (D-91): el inicio llega con sus productos en el HTML y un producto inexistente muestra el 404 de la tienda.
  {
    nombre: "GET / trae productos en el HTML", metodo: "GET", ruta: "/",
    espera: (res, texto) => (esHtml(res) === true && texto.includes('href="/producto/') ? true : "el HTML del inicio no trae enlaces de producto"),
  },
  { nombre: "GET /producto/no-existe-zzzzzzzz", metodo: "GET", ruta: "/producto/no-existe-zzzzzzzz", espera: (res, texto) => noEncontradoEnStreaming(res, texto) },
  // Campos vacíos se rechazan antes de registrarIntento: no consume intentos.
  { nombre: "POST /api/auth/login con {}", metodo: "POST", ruta: "/api/auth/login", cuerpo: {}, espera: estado(400) },
  // Fase 26a: cuerpos con tipos equivocados responden 400 (antes podían terminar en 500). No gastan límites.
  { nombre: "POST /api/auth/login con [] (400)", metodo: "POST", ruta: "/api/auth/login", cuerpo: [], espera: estado(400) },
  { nombre: "POST /api/auth-user/forgot-password email arreglo (400)", metodo: "POST", ruta: "/api/auth-user/forgot-password", cuerpo: { email: ["a@b.co"] }, espera: estado(400) },
  { nombre: "POST /api/auth-user/reset-password token arreglo (400)", metodo: "POST", ruta: "/api/auth-user/reset-password", cuerpo: { token: ["x"], password: "x" }, espera: estado(400) },
  { nombre: "POST /api/auth-user/verify-email token número (400)", metodo: "POST", ruta: "/api/auth-user/verify-email", cuerpo: { token: 5 }, espera: estado(400) },
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
  // Fase 10
  ...["products", "banners", "promotions"].map((n) => ({
    nombre: `GET /api/admin/${n} (sin cookie)`, metodo: "GET", ruta: `/api/admin/${n}`, espera: estado(401),
  })),
  // Fase 11
  { nombre: "GET /api/popup (público)", metodo: "GET", ruta: "/api/popup", espera: estado(200) },
  { nombre: "GET /api/admin/popup (sin cookie)", metodo: "GET", ruta: "/api/admin/popup", espera: estado(401) },
  { nombre: "PUT /api/admin/popup (sin cookie)", metodo: "PUT", ruta: "/api/admin/popup", cuerpo: {}, espera: estado(401) },
  { nombre: "GET /api/admin/inventory/movements (sin cookie)", metodo: "GET", ruta: "/api/admin/inventory/movements?productId=000000000000000000000000", espera: estado(401) },
  { nombre: "POST /api/admin/inventory/adjust (sin cookie)", metodo: "POST", ruta: "/api/admin/inventory/adjust", cuerpo: {}, espera: estado(401) },
  { nombre: "POST /api/upload (sin cookie)", metodo: "POST", ruta: "/api/upload", cuerpo: {}, espera: estado(401) },
  {
    nombre: "GET /api/products sin precioCosto ni proveedor", metodo: "GET", ruta: "/api/products",
    espera: (res, texto) => {
      const base = esArregloJson(res, texto);
      if (base !== true) return base;
      const fugas = ["\"precioCosto\"", "\"proveedor\""].filter((c) => texto.includes(c));
      return fugas.length ? `el cuerpo contiene ${fugas.join(", ")}` : true;
    },
  },
  // Fase 13b (D-68): la cantidad exacta de stock es secreta
  {
    nombre: "GET /api/products sin stockCantidad ni stockMinimo", metodo: "GET", ruta: "/api/products",
    espera: (res, texto) => {
      const base = esArregloJson(res, texto);
      if (base !== true) return base;
      const fugas = ["\"stockCantidad\"", "\"stockMinimo\"", "\"precioCosto\"", "\"sku\""].filter((c) => texto.includes(c));
      return fugas.length ? `el cuerpo contiene ${fugas.join(", ")}` : true;
    },
  },
  {
    nombre: "POST /api/admin/inventory/adjust con variantId (sin cookie)", metodo: "POST",
    ruta: "/api/admin/inventory/adjust", cuerpo: { variantId: "000000000000000000000000" }, espera: estado(401),
  },
  // Fase 15: solo peticiones que deben ser rechazadas (no crea pedidos).
  // Ojo: POST /api/orders cuenta 1 intento del límite de 5/h por IP aunque el cuerpo sea inválido.
  { nombre: "POST /api/orders con {}", metodo: "POST", ruta: "/api/orders", cuerpo: {}, espera: estado(400) },
  { nombre: "GET /api/orders/JK-000000-XXXX?t=x", metodo: "GET", ruta: "/api/orders/JK-000000-XXXX?t=x", espera: estado(404) },
  { nombre: "GET /api/orders/mine (sin cookie)", metodo: "GET", ruta: "/api/orders/mine", espera: estado(401) },
  // Fase 16: /checkout responde 200 (con el interruptor apagado redirige en el navegador a /carrito).
  { nombre: "GET /checkout", metodo: "GET", ruta: "/checkout", espera: esHtml },
  // Fase 17: la administración de pedidos exige sesión.
  { nombre: "GET /api/admin/orders (sin cookie)", metodo: "GET", ruta: "/api/admin/orders", espera: estado(401) },
  { nombre: "GET /api/admin/orders/000000000000000000000000 (sin cookie)", metodo: "GET", ruta: "/api/admin/orders/000000000000000000000000", espera: estado(401) },
  { nombre: "PATCH /api/admin/orders/000000000000000000000000 (sin cookie)", metodo: "PATCH", ruta: "/api/admin/orders/000000000000000000000000", cuerpo: {}, espera: estado(401) },
  { nombre: "POST /api/admin/orders/expire (sin cookie)", metodo: "POST", ruta: "/api/admin/orders/expire", cuerpo: {}, espera: estado(401) },
  // Fase 27 (D-91): con el esqueleto de carga la página se envía en streaming, así que un pedido inexistente
  // (o sin acceso) responde 200 con la página de 404 y noindex, en vez del estado 404.
  { nombre: "GET /pedido/JK-000000-XXXX (sin token)", metodo: "GET", ruta: "/pedido/JK-000000-XXXX", espera: (res, texto) => noEncontradoEnStreaming(res, texto) },
  // Fase 16b: puntos de entrega. El público devuelve un arreglo; el admin exige sesión.
  { nombre: "GET /api/delivery-points", metodo: "GET", ruta: "/api/delivery-points", espera: esArregloJson },
  { nombre: "GET /api/admin/delivery-points (sin cookie)", metodo: "GET", ruta: "/api/admin/delivery-points", espera: estado(401) },
  { nombre: "POST /api/admin/delivery-points (sin cookie)", metodo: "POST", ruta: "/api/admin/delivery-points", cuerpo: {}, espera: estado(401) },
  {
    nombre: "PUT /api/admin/delivery-points/000000000000000000000000 (sin cookie)", metodo: "PUT",
    ruta: "/api/admin/delivery-points/000000000000000000000000", cuerpo: {}, espera: estado(401),
  },
  // Fase 18: cupones. Ojo: validate cuenta 1 intento del límite de 10 / 10 min por IP aunque el cuerpo sea inválido.
  { nombre: "POST /api/coupons/validate con {}", metodo: "POST", ruta: "/api/coupons/validate", cuerpo: {}, espera: estado(400) },
  { nombre: "GET /api/admin/coupons (sin cookie)", metodo: "GET", ruta: "/api/admin/coupons", espera: estado(401) },
  // Fase 19: validate acepta varianteId; un producto inexistente llega a resolverItems (409), no a la validación (400).
  {
    nombre: "POST /api/coupons/validate con varianteId (producto inexistente)", metodo: "POST", ruta: "/api/coupons/validate",
    cuerpo: { codigo: "PRUEBA", items: [{ id: "000000000000000000000000", varianteId: "000000000000000000000000", cantidad: 1 }] },
    espera: estado(409),
  },
  // Fase 22b: Libro de Reclamaciones. Ojo: el POST cuenta 1 intento del límite de 5/h por IP aunque el cuerpo sea inválido.
  { nombre: "POST /api/complaints con {}", metodo: "POST", ruta: "/api/complaints", cuerpo: {}, espera: estado(400) },
  { nombre: "GET /api/admin/complaints (sin cookie)", metodo: "GET", ruta: "/api/admin/complaints", espera: estado(401) },
  { nombre: "GET /api/admin/complaints/000000000000000000000000 (sin cookie)", metodo: "GET", ruta: "/api/admin/complaints/000000000000000000000000", espera: estado(401) },
  {
    nombre: "PATCH /api/admin/complaints/000000000000000000000000 (sin cookie)", metodo: "PATCH",
    ruta: "/api/admin/complaints/000000000000000000000000", cuerpo: {}, espera: estado(401),
  },
  // Fase 23b: estadísticas de Google Analytics, solo superadmin.
  { nombre: "GET /api/admin/analytics (sin cookie)", metodo: "GET", ruta: "/api/admin/analytics", espera: estado(401) },
  { nombre: "GET /api/admin/analytics/realtime (sin cookie)", metodo: "GET", ruta: "/api/admin/analytics/realtime", espera: estado(401) },
  // Fase 24: catálogo filtrado en el servidor (misma forma: arreglo) y páginas para Google.
  ...["?ids=000000000000000000000000", "?categoria=no-existe", "?home=1", "?relacionados=000000000000000000000000"].map((q) => ({
    nombre: `GET /api/products${q} (arreglo, sin campos privados)`,
    metodo: "GET",
    ruta: `/api/products${q}`,
    espera: (res, texto) => {
      const base = esArregloJson(res, texto);
      if (base !== true) return base;
      const fugas = ['"precioCosto"', '"proveedor"', '"stockCantidad"'].filter((c) => texto.includes(c));
      return fugas.length ? `el cuerpo contiene ${fugas.join(", ")}` : true;
    },
  })),
  { nombre: "GET /api/products?ids=malo (400)", metodo: "GET", ruta: "/api/products?ids=malo", espera: estado(400) },
  { nombre: "GET /categoria-que-no-existe (página, 200)", metodo: "GET", ruta: "/categoria-que-no-existe", espera: esHtml },
  { nombre: "GET /sitemap.xml", metodo: "GET", ruta: "/sitemap.xml", espera: estado(200) },
  { nombre: "GET /robots.txt", metodo: "GET", ruta: "/robots.txt", espera: estado(200) },
  // Fase 26b: verificación en dos pasos. Sin cookie admin-2fa no se cuenta ningún intento.
  { nombre: "POST /api/auth/login/2fa (sin cookie)", metodo: "POST", ruta: "/api/auth/login/2fa", cuerpo: { codigo: "000000" }, espera: estado(401) },
  { nombre: "GET /admin/seguridad (sin cookie)", metodo: "GET", ruta: "/admin/seguridad", espera: redirige("/login-admin") },
  { nombre: "GET /api/admin/seguridad (sin cookie)", metodo: "GET", ruta: "/api/admin/seguridad", espera: estado(401) },
  ...["iniciar", "confirmar", "desactivar", "codigos-rescate"].map((n) => ({
    nombre: `POST /api/admin/seguridad/${n} (sin cookie)`, metodo: "POST", ruta: `/api/admin/seguridad/${n}`, cuerpo: {}, espera: estado(401),
  })),
  // Fase 26c (D-93): Turnstile. La CSP deja cargar el script y el iframe de Cloudflare.
  {
    nombre: "CSP permite Turnstile (script-src y frame-src)", metodo: "GET", ruta: "/",
    espera: (res) => {
      const csp = res.headers.get("content-security-policy") || "";
      const falta = ["script-src", "frame-src"].filter((d) => {
        const directiva = csp.split(";").map((x) => x.trim()).find((x) => x.startsWith(d + " ")) || "";
        return !directiva.includes("https://challenges.cloudflare.com");
      });
      return falta.length ? `falta https://challenges.cloudflare.com en ${falta.join(", ")}` : true;
    },
  },
  // Fase 28 (D-95): sin manejadores de eventos en atributos HTML.
  {
    nombre: "CSP prohíbe manejadores en atributos (script-src-attr 'none')", metodo: "GET", ruta: "/",
    espera: (res) => {
      const csp = res.headers.get("content-security-policy") || "";
      const directiva = csp.split(";").map((x) => x.trim()).find((x) => x.startsWith("script-src-attr ")) || "";
      return directiva === "script-src-attr 'none'" ? true : `esperado script-src-attr 'none', recibido «${directiva}»`;
    },
  },
  // turnstileToken es un campo opcional nuevo (N1-6): no rompe los cuerpos de siempre. Un correo inválido
  // responde el 200 genérico antes de los límites: no gasta intentos.
  {
    nombre: "POST /api/auth-user/forgot-password acepta turnstileToken (200)", metodo: "POST", ruta: "/api/auth-user/forgot-password",
    cuerpo: { email: "no-es-correo", turnstileToken: "x" }, espera: estado(200),
  },
  // El esquema estricto del reclamo no lo trata como campo desconocido. Ojo: cuenta 1 intento del límite de 5/h por IP.
  {
    nombre: "POST /api/complaints con solo turnstileToken (400 sin campo desconocido)", metodo: "POST", ruta: "/api/complaints",
    cuerpo: { turnstileToken: "x" },
    espera: (res, texto) => {
      if (res.status !== 400) return `esperado 400, recibido ${res.status}`;
      let fields = {};
      try {
        fields = JSON.parse(texto).fields || {};
      } catch {
        return "el cuerpo no es JSON";
      }
      const raros = Object.entries(fields).filter(([k, v]) => k === "" || String(v).includes("turnstileToken"));
      return raros.length ? "el esquema rechaza turnstileToken como campo desconocido" : true;
    },
  },
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
