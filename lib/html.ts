const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa & < > " ' para insertar texto en HTML (cuerpo o atributo entre comillas). */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}
