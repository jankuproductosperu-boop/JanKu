import AdminNav from "@/app/(admin)/admin/_components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (<><AdminNav /><main>{children}</main></>);
}
