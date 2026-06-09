"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Monitor,
  Users,
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
} from "lucide-react";
import { useSession } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/technicians", label: "Techniciens", icon: Users },
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/certifications", label: "Certifications", icon: Award },
  { href: "/competences", label: "Competences", icon: Layers },
  { href: "/search", label: "Chercher une equipe", icon: Search },
  { href: "/projets", label: "Projets", icon: FolderKanban },
  { href: "/formation", label: "Formation", icon: GraduationCap },
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
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">AV Pool</h1>
            <p className="text-xs text-slate-400">Techniciens AV</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {mainNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-blue-600 text-white"
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
                      ? "bg-blue-600 text-white"
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
