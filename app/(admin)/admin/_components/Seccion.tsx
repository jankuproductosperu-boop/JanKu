import { PageHeader } from "@/app/(admin)/admin/_components/ui";

export default function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <PageHeader titulo={titulo} />
      {children}
    </div>
  );
}
