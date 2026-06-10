import { SidebarShell } from "@/components/layout/SidebarShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <SidebarShell>{children}</SidebarShell>;
}
