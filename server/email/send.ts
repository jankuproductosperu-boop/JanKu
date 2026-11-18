import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
export const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@jan-ku.com";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jan-ku.com";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
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
    // Sin respuesta en 10 s se aborta (TimeoutError) en vez de colgar la petición.
    signal: AbortSignal.timeout(10_000),
  });

  // Solo el código: el cuerpo de Resend puede repetir datos del envío.
  if (!response.ok) {
    throw new Error("Resend respondió " + response.status);
  }
}
