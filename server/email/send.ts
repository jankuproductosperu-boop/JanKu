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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error enviando email: ${error.message}`);
  }
}
