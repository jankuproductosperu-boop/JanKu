import "server-only";
// server/email/auth-emails.ts
import { escapeHtml } from "@/lib/html";
import { sendEmail, SITE_URL } from "./send";

// ── Email de verificación ─────────────────────────────────────────────────────

export async function enviarEmailVerificacion(email: string, nombre: string, token: string) {
  const enlace = `${SITE_URL}/auth/verificar-email?token=${token}`;
  const nombreHtml = escapeHtml(nombre);

  await sendEmail({
    to: email,
    subject: "Verifica tu cuenta en Janku",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">JANKU</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2C2C6C;">Hola ${nombreHtml} 👋</h2>
          <p style="color: #555;">Gracias por registrarte en Janku. Verifica tu email haciendo clic en el botón:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${enlace}" 
               style="background: #2C2C6C; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verificar mi cuenta
            </a>
          </div>
          <p style="color: #999; font-size: 13px;">Este enlace expira en 24 horas.</p>
          <p style="color: #999; font-size: 13px;">Si no creaste esta cuenta, ignora este email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            Si el botón no funciona, copia este enlace:<br/>
            <a href="${enlace}" style="color: #2C2C6C; word-break: break-all;">${enlace}</a>
          </p>
        </div>
      </div>
    `,
  });
}

// ── Email de reset de contraseña ──────────────────────────────────────────────

export async function enviarEmailResetPassword(email: string, nombre: string, token: string) {
  const enlace = `${SITE_URL}/auth/nueva-contrasena?token=${token}`;
  const nombreHtml = escapeHtml(nombre);

  await sendEmail({
    to: email,
    subject: "Restablecer contraseña — Janku",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">JANKU</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2C2C6C;">Hola ${nombreHtml} 🔒</h2>
          <p style="color: #555;">Recibimos una solicitud para restablecer tu contraseña.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${enlace}" 
               style="background: #2C2C6C; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #999; font-size: 13px;">⚠️ Este enlace expira en <strong>15 minutos</strong> y solo se puede usar una vez.</p>
          <p style="color: #999; font-size: 13px;">Si no solicitaste esto, ignora este email. Tu contraseña no cambiará.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            Si el botón no funciona, copia este enlace:<br/>
            <a href="${enlace}" style="color: #2C2C6C; word-break: break-all;">${enlace}</a>
          </p>
        </div>
      </div>
    `,
  });
}

// ── Email de bienvenida tras verificar ───────────────────────────────────────

export async function enviarEmailBienvenida(email: string, nombre: string) {
  const nombreHtml = escapeHtml(nombre);
  await sendEmail({
    to: email,
    subject: `¡Bienvenido a Janku, ${nombre}! 🎉`, // el asunto es texto plano: no se escapa,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">JANKU</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2C2C6C;">¡Tu cuenta está verificada! 🎉</h2>
          <p style="color: #555;">Hola ${nombreHtml}, ya puedes disfrutar de todas las ventajas de Janku.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${SITE_URL}" 
               style="background: #2C2C6C; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Ir a la tienda
            </a>
          </div>
        </div>
      </div>
    `,
  });
}
// ── Fase 26b: aviso de inicio de sesión en el panel desde una IP nueva ─────────

const ROL_VISIBLE: Record<string, string> = { superadmin: "Superadministrador", gestor: "Gestor", ventas: "Ventas" };

/**
 * `esPropio`: va al propio administrador; si no, a un superadmin que vigila la cuenta de otro.
 * La IP solo viaja en el correo: en la base se guarda su HMAC.
 */
export async function enviarAvisoAccesoNuevo(
  email: string,
  d: { nombre: string; username: string; rol: string; ip: string; fecha: Date; esPropio: boolean },
) {
  const fecha = d.fecha.toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" });
  const quien = d.esPropio
    ? "Se inició sesión en tu cuenta del panel desde una IP que no habías usado antes."
    : `Se inició sesión en la cuenta de <strong>${escapeHtml(d.nombre)}</strong> (${escapeHtml(d.username)}, ${escapeHtml(ROL_VISIBLE[d.rol] ?? d.rol)}) desde una IP que no había usado antes.`;
  const queHacer = d.esPropio
    ? "Si fuiste tú, no tienes que hacer nada. Si no fuiste tú, cambia tu contraseña en el panel y avisa al superadministrador."
    : "Si no lo esperabas, desactiva esa cuenta o cámbiale la contraseña en Usuarios: eso cierra sus sesiones.";

  await sendEmail({
    to: email,
    subject: "Nuevo inicio de sesión en el panel de Janku",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">JANKU</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2C2C6C;">Nuevo inicio de sesión 🔐</h2>
          <p style="color: #555;">${quien}</p>
          <table style="color: #555; font-size: 14px; margin: 20px 0;">
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Fecha</strong></td><td>${escapeHtml(fecha)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>IP</strong></td><td>${escapeHtml(d.ip)}</td></tr>
          </table>
          <p style="color: #555;">${queHacer}</p>
          <p style="color: #999; font-size: 13px;">Este aviso se envía una sola vez por cada IP nueva.</p>
        </div>
      </div>
    `,
  });
}
