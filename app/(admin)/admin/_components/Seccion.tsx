export default function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">{titulo}</h1>
      {children}
    </div>
  );
}
