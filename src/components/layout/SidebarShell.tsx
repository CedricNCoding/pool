"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import PraxisLogo from "@/components/PraxisLogo";
import CommandPalette from "@/components/CommandPalette";

// Gère l'état replié (desktop, persisté) et l'overlay mobile de la sidebar.
export function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("praxis-sidebar-collapsed") === "1") setCollapsed(true);
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted) localStorage.setItem("praxis-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed, mounted]);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-ink-900 text-paper border-b border-[rgba(245,242,235,0.08)] shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="p-1.5 rounded-md text-paper hover:bg-[rgba(245,242,235,0.06)] transition-colors"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <PraxisLogo size={24} className="rounded-md" />
          <span className="text-sm font-semibold tracking-[-0.01em]">Praxis</span>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette />
    </div>
  );
}
