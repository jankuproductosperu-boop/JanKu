import "server-only";
// Correos del Libro de Reclamaciones (fase 22b). Todo texto que viene de la hoja pasa por escapeHtml.
// Se llaman sin await desde complaint.service: sendEmail ya tiene timeout de 10 s.
import { escapeHtml } from "@/lib/html";
import { formatearSoles } from "@/lib/money";
import type { Complaint, TipoDocumento } from "@/types";
import { sendEmail, SITE_URL } from "./send";

// Textos fijos obligatorios (sección 5 de la fase 22b). Los mismos que muestra /libro-de-reclamaciones.
const TEXTO_DEFINICIONES =
  "<b>Reclamo:</b> disconformidad relacionada con los productos o servicios. <b>Queja:</b> disconformidad no relacionada con los productos o servicios, o malestar o descontento con la atención al público.";
const TEXTO_OTRAS_VIAS =
  "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.";
const TEXTO_PLAZO =
  "El proveedor deberá dar respuesta al reclamo en un plazo no mayor a quince (15) días hábiles.";

const DOCUMENTO: Record<TipoDocumento, string> = { DNI: "DNI", CE: "Carné de extranjería", PASAPORTE: "Pasaporte" };

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" });
const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", { timeZone: "America/Lima", dateStyle: "long" });
const e = (s: string) => escapeHtml(s);
/** Conserva los saltos de línea del texto del consumidor o del administrador. */
const parrafo = (s: string) => e(s).replace(/\r?\n/g, "<br/>");

function marco(titulo: string, cuerpo: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">JANKU · Libro de Reclamaciones</h1>
      </div>
      <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 8px 8px; color: #333;">
        <h2 style="color: #2C2C6C; margin-top: 0;">${e(titulo)}</h2>
        ${cuerpo}
      </div>
    </div>`;
}

function fila(etiqueta: string, valor: string): string {
  return `<tr><td style="padding: 4px 8px 4px 0; color: #777; vertical-align: top; white-space: nowrap;">${e(etiqueta)}</td><td style="padding: 4px 0;">${valor}</td></tr>`;
}

function tabla(filas: string[]): string {
  return `<table style="border-collapse: collapse; font-size: 14px; margin: 0 0 16px;">${filas.join("")}</table>`;
}

/** Copia completa de la hoja para el consumidor. */
export async function enviarCopiaReclamo(h: Complaint): Promise<void> {
  const p = h.proveedor;
  const c = h.consumidor;
  const r = h.representante;
  const tipo = h.tipo === "reclamo" ? "Reclamo" : "Queja";

  const cuerpo = `
    <p>Registramos tu hoja de reclamación. Guarda este correo como constancia.</p>
    ${tabla([
      fila("Código", `<b>${e(h.codigo)}</b>`),
      fila("Fecha", e(fechaHora(h.createdAt))),
      fila("Responderemos a más tardar el", `<b>${e(fecha(h.fechaLimite))}</b>`),
    ])}
    <h3 style="color: #2C2C6C; margin-bottom: 4px;">Proveedor</h3>
    ${tabla([
      fila("Nombre comercial", e(p.nombreComercial)),
      fila("Titular", e(p.titular)),
      fila("RUC", e(p.ruc)),
      fila("Domicilio", e(p.domicilio)),
      fila("Correo", e(p.correo)),
    ])}
    <h3 style="color: #2C2C6C; margin-bottom: 4px;">1. Tus datos</h3>
    ${tabla([
      fila("Nombre", e(c.nombre)),
      fila(DOCUMENTO[c.tipoDocumento], e(c.numeroDocumento)),
      fila("Domicilio", e(c.domicilio)),
      fila("Celular", e(c.telefono)),
      fila("Correo", e(c.email)),
      ...(r
        ? [fila("Padre, madre o apoderado", `${e(r.nombre)} · ${e(DOCUMENTO[r.tipoDocumento])} ${e(r.numeroDocumento)}`)]
        : []),
    ])}
    <h3 style="color: #2C2C6C; margin-bottom: 4px;">2. Producto o servicio</h3>
    ${tabla([
      fila("Tipo", h.bien.tipo === "producto" ? "Producto" : "Servicio"),
      fila("Descripción", parrafo(h.bien.descripcion)),
      ...(h.bien.montoReclamado !== undefined ? [fila("Monto reclamado", e(formatearSoles(h.bien.montoReclamado)))] : []),
      ...(h.pedidoCodigo ? [fila("Pedido", e(h.pedidoCodigo))] : []),
    ])}
    <h3 style="color: #2C2C6C; margin-bottom: 4px;">3. Detalle: ${tipo}</h3>
    <p style="font-size: 14px;"><b>Detalle:</b><br/>${parrafo(h.detalle)}</p>
    <p style="font-size: 14px;"><b>Pedido del consumidor:</b><br/>${parrafo(h.pedidoConsumidor)}</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    <p style="font-size: 13px; color: #555;">${TEXTO_DEFINICIONES}</p>
    <p style="font-size: 13px; color: #555;">${TEXTO_OTRAS_VIAS}</p>
    <p style="font-size: 13px; color: #555;">${TEXTO_PLAZO}</p>`;

  await sendEmail({
    to: c.email,
    subject: `Hoja de reclamación ${h.codigo} — Janku`,
    html: marco(`Hoja de reclamación ${h.codigo}`, cuerpo),
  });
}

/** Aviso a la tienda (LEGAL.correo copiado en la hoja). Sin DNI, domicilio ni datos de contacto. */
export async function enviarAvisoReclamo(h: Complaint): Promise<void> {
  const enlace = `${SITE_URL}/admin/reclamos/${encodeURIComponent(h._id)}`;
  const cuerpo = `
    <p>Se registró una hoja nueva en el Libro de Reclamaciones.</p>
    ${tabla([
      fila("Código", `<b>${e(h.codigo)}</b>`),
      fila("Tipo", h.tipo === "reclamo" ? "Reclamo" : "Queja"),
      fila("Fecha", e(fechaHora(h.createdAt))),
      fila("Responder a más tardar el", `<b>${e(fecha(h.fechaLimite))}</b>`),
    ])}
    <div style="text-align: center; margin: 24px 0;">
      <a href="${e(enlace)}" style="background: #2C2C6C; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver en el panel</a>
    </div>`;

  await sendEmail({
    to: h.proveedor.correo,
    subject: `Nueva hoja de reclamación ${h.codigo}`,
    html: marco(`Nueva hoja ${h.codigo}`, cuerpo),
  });
}

/** Respuesta de la tienda al consumidor. */
export async function enviarRespuestaReclamo(h: Complaint): Promise<void> {
  if (!h.respuesta) throw new Error("La hoja no tiene respuesta");
  const cuerpo = `
    <p>Hola ${e(h.consumidor.nombre)}, esta es nuestra respuesta a tu hoja de reclamación.</p>
    ${tabla([
      fila("Código", `<b>${e(h.codigo)}</b>`),
      fila("Registrada el", e(fechaHora(h.createdAt))),
      fila("Fecha de respuesta", e(fechaHora(h.respuesta.fecha))),
    ])}
    <p style="font-size: 14px; background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px;">${parrafo(h.respuesta.texto)}</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    <p style="font-size: 13px; color: #555;">${TEXTO_OTRAS_VIAS}</p>
    <p style="font-size: 12px; color: #999;">${e(h.proveedor.nombreComercial)} · ${e(h.proveedor.titular)} · RUC ${e(h.proveedor.ruc)} · ${e(h.proveedor.correo)}</p>`;

  await sendEmail({
    to: h.consumidor.email,
    subject: `Respuesta a tu hoja de reclamación ${h.codigo} — Janku`,
    html: marco(`Respuesta a la hoja ${h.codigo}`, cuerpo),
  });
}
