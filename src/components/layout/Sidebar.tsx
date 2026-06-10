"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Building,
  Building2,
  Award,
  Search,
  Settings,
  LayoutDashboard,
  LogOut,
  Key,
  Shield,
  Mail,
  UserCog,
  FileDown,
  Layers,
  FolderKanban,
  GraduationCap,
  Activity,
  Gauge,
} from "lucide-react";
import { useSession } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import PraxisLogo from "@/components/PraxisLogo";

const mainNav = [
  { href: "/direction", label: "Direction", icon: Gauge },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/technicians", label: "Techniciens", icon: Users },
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/certifications", label: "Certifications", icon: Award },
  { href: "/competences", label: "Competences", icon: Layers },
  { href: "/search", label: "Chercher une equipe", icon: Search },
  { href: "/projets", label: "Projets", icon: FolderKanban },
  { href: "/formation", label: "Formation", icon: GraduationCap },
  { href: "/parc", label: "Sante du parc", icon: Activity },
];

const settingsNav = [
  { href: "/settings/users", label: "Utilisateurs", icon: UserCog, adminOnly: true },
  { href: "/settings/api-keys", label: "Cles API", icon: Key, adminOnly: true },
  { href: "/settings/smtp", label: "Email / SMTP", icon: Mail, adminOnly: true },
  { href: "/settings/rgpd", label: "RGPD", icon: Shield, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useSession();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-3">
          <PraxisLogo size={40} className="rounded-xl" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Praxis</h1>
            <p className="text-xs text-slate-400">Suite Spektalis</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => window.dispatchEvent(new Event("avpool-command-open"))}
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Rechercher...</span>
            <kbd className="text-[10px] border border-slate-600 rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
          <NotificationBell />
        </div>

        {user?.role === "superadmin" && (
          <Link
            href="/superadmin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg text-sm transition-colors",
              pathname.startsWith("/superadmin")
                ? "bg-amber-600 text-[#0B1220]"
                : "text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
            )}
          >
            <Building className="w-4 h-4" />
            Tenants (super admin)
          </Link>
        )}

        {mainNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-amber-500 text-[#0B1220]"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        <a
          href="/api/export?format=csv"
          download
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <FileDown className="w-4 h-4" />
          Exporter CSV
        </a>

        {user?.role === "admin" && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Administration
              </p>
            </div>
            {settingsNav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-amber-500 text-[#0B1220]"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        {user && (
          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Deconnexion
        </button>
      </div>
    </aside>
  );
}
