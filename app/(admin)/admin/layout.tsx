import AdminShell from "@/app/(admin)/admin/_components/AdminShell";
import "@/app/(admin)/admin/panel.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
