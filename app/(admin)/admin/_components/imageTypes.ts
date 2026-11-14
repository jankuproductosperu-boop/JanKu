// Tipos y helpers compartidos por los uploaders de imágenes del panel.

// Tipo compartido para el uploader de imágenes
export type UploadedImage = {
  public_id: string;
  secure_url: string;
  isMain?: boolean;
  previewUrl?: string;
  file?: File;
  status: "pending" | "done" | "error";
};

// HELPER – genera URL Cloudinary con f_auto,q_auto
// ─────────────────────────────────────────────────────────────────────────────

export function getCloudinaryUrl(publicIdOrUrl: string, width?: number): string {
  if (!publicIdOrUrl) return "";
  if (publicIdOrUrl.startsWith("http")) return publicIdOrUrl; // URL legacy o ya completa
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const t = width ? `f_auto,q_auto,w_${width}` : "f_auto,q_auto";
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}/${publicIdOrUrl}`;
}
