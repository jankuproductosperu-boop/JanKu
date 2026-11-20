import { LEGAL } from "@/lib/siteConfig";

// Plantilla de las páginas legales (fase 22a). Solo presentación.

export type SeccionLegal = { id: string; titulo: string; contenido: React.ReactNode };

export default function PaginaLegal({
  titulo,
  resumen,
  secciones,
}: {
  titulo: string;
  resumen: React.ReactNode;
  secciones: SeccionLegal[];
}) {
  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-10 text-gray-800">
      <h1 className="text-2xl md:text-3xl font-bold text-[#2C2C6C]">{titulo}</h1>
      <p className="mt-1 text-sm text-gray-500">Última actualización: {LEGAL.actualizado}</p>

      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-900">
        <p className="font-semibold mb-1">En resumen</p>
        {resumen}
      </div>

      <nav aria-label="Contenido" className="mt-6">
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          {secciones.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-[#2C2C6C] hover:underline">
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        {secciones.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-[#2C2C6C] mb-2">
              {i + 1}. {s.titulo}
            </h2>
            <div className="space-y-2 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-[#2C2C6C] [&_a]:underline">
              {s.contenido}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500">
        {LEGAL.nombreComercial} es el nombre comercial de {LEGAL.titular} · RUC {LEGAL.ruc} · {LEGAL.domicilio} ·{" "}
        {LEGAL.correo}
      </p>
    </section>
  );
}
