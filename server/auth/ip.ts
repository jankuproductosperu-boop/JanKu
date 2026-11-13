import "server-only";

export function obtenerIP(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return ip.replace(/[^0-9a-fA-F.:]/g, "").slice(0, 45);
}