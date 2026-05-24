// lib/email.ts
// Usa Resend (resend.com) — plan gratis: 3,000 emails/mes
// npm install resend

// Si prefieres Nodemailer con Gmail, reemplaza el contenido de sendEmail()
// pero mantén las mismas funciones exportadas

// ── Instalar: npm install resend ─────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@jan-ku.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jan-ku.com";

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error enviando email: ${error.message}`);
  }
}

// ── Email de verificación ─────────────────────────────────────────────────────

export async function enviarEmailVerificacion(email: string, nombre: string, token: string) {
  const enlace = `${SITE_URL}/auth/verificar-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verifica tu cuenta en Janku",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">JANKU</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2C2C6C;">Hola ${nombre} 👋</h2>
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

  await sendEmail({
    to: email,
    subject: "Restablecer contraseña — Janku",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">JANKU</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2C2C6C;">Hola ${nombre} 🔒</h2>
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
  await sendEmail({
    to: email,
    subject: `¡Bienvenido a Janku, ${nombre}! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2C2C6C; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">JANKU</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2C2C6C;">¡Tu cuenta está verificada! 🎉</h2>
          <p style="color: #555;">Hola ${nombre}, ya puedes disfrutar de todas las ventajas de Janku.</p>
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