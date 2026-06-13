"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Building,
  Building2,
  Award,
  Search,
  LayoutDashboard,
  LogOut,
  Key,
  Shield,
  Mail,
  UserCog,
  Layers,
  FolderKanban,
  GraduationCap,
  Activity,
  Gauge,
  HelpingHand,
  CircleUser,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  CalendarDays,
  CalendarOff,
  HardHat,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Grid3x3,
  ClipboardCheck,
  MessagesSquare,
  FileText,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import PraxisLogo from "@/components/PraxisLogo";

type NavItem = { href: string; label: string; icon: LucideIcon };

const mainNav: NavItem[] = [
  { href: "/direction", label: "Direction", icon: Gauge },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/technicians", label: "Techniciens", icon: Users },
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/certifications", label: "Certifications", icon: Award },
  { href: "/competences", label: "Competences", icon: Layers },
  { href: "/search", label: "Chercher une equipe", icon: Search },
  { href: "/renforts", label: "Renforts", icon: HelpingHand },
  { href: "/projets", label: "Projets", icon: FolderKanban },
  { href: "/formation", label: "Formation", icon: GraduationCap },
  { href: "/parc", label: "Sante de l'equipe", icon: Activity },
];

const planningNav: NavItem[] = [
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/absences", label: "Absences", icon: CalendarOff },
];

const securiteNav: NavItem[] = [
  { href: "/epi", label: "EPI & materiel", icon: HardHat },
  { href: "/securite", label: "Consignes securite", icon: ShieldCheck },
  { href: "/duerp", label: "DUERP", icon: ShieldAlert },
  { href: "/renouvellements", label: "Habilitations", icon: RefreshCw },
  { href: "/memoire", label: "Memoire technique", icon: FileText },
];

const rhNav: NavItem[] = [
  { href: "/matrice", label: "Matrice competences", icon: Grid3x3 },
  { href: "/campagnes", label: "Campagnes eval.", icon: ClipboardCheck },
  { href: "/entretiens", label: "Entretiens", icon: MessagesSquare },
];

const settingsNav: NavItem[] = [
  { href: "/settings/users", label: "Utilisateurs", icon: UserCog },
  { href: "/settings/api-keys", label: "Cles API", icon: Key },
  { href: "/settings/smtp", label: "Email / SMTP", icon: Mail },
  { href: "/settings/odoo", label: "Odoo (Béta)", icon: Plug },
  { href: "/settings/rgpd", label: "RGPD", icon: Shield },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useSession();

  // Compteur de demandes de renfort en attente (badge).
  const [renfortCount, setRenfortCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const fetchCount = () =>
      fetch("/api/assistance/count")
        .then((r) => (r.ok ? r.json() : { pending: 0 }))
        .then((d) => alive && setRenfortCount(d.pending || 0))
        .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [pathname]);

  return (
    <aside
      className={cn(
        "bg-ink-900 text-paper flex flex-col shrink-0 border-r border-[rgba(245,242,235,0.08)] overflow-hidden relative",
        "fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-200 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:translate-x-0 md:transition-[width] md:duration-200",
        collapsed ? "md:w-[68px]" : "md:w-64"
      )}
    >
      {/* Aurore boréale des modules Spektalis */}
      <div className="aurora" aria-hidden="true">
        <div className="blob praxis" />
        <div className="blob synop" />
        <div className="blob sentinel" />
        <div className="blob vigie" />
        <div className="blob atlas" />
        <div className="blob signal" />
      </div>

      {/* Lockup brand + repli */}
      <div
        className={cn(
          "border-b border-[rgba(245,242,235,0.08)] relative z-10 flex items-center px-5 py-5 justify-between",
          collapsed && "md:px-3 md:py-4 md:justify-center"
        )}
      >
        <Link href="/dashboard" onClick={onCloseMobile} className="flex items-center gap-3 min-w-0" title={collapsed ? "Praxis" : undefined}>
          <PraxisLogo size={34} className="rounded-lg shrink-0" />
          <div className={cn("flex flex-col leading-none min-w-0", collapsed && "md:hidden")}>
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Praxis</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300 mt-1 truncate">Suite Spektalis</span>
          </div>
        </Link>
        <button
          onClick={onToggleCollapsed}
          aria-label="Replier le menu"
          className={cn("p-1.5 rounded-md text-ink-300 hover:text-paper hover:bg-[rgba(245,242,235,0.04)] transition-colors hidden md:flex", collapsed && "md:hidden")}
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
        <button onClick={onCloseMobile} aria-label="Fermer le menu" className="md:hidden p-1.5 rounded-md text-ink-300 hover:text-paper">
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      {collapsed && (
        <div className="hidden md:flex justify-center py-2 relative z-10 border-b border-[rgba(245,242,235,0.06)]">
          <button onClick={onToggleCollapsed} aria-label="Deplier le menu" className="p-1.5 rounded-md text-ink-300 hover:text-paper hover:bg-[rgba(245,242,235,0.04)] transition-colors">
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Recherche + notifications */}
      <div className={cn("relative z-10 px-3 pt-3 flex gap-2", collapsed && "md:flex-col md:items-center md:px-0")}>
        <button
          onClick={() => window.dispatchEvent(new Event("avpool-command-open"))}
          title="Rechercher (Cmd+K)"
          className={cn(
            "flex items-center gap-2 flex-1 px-3 py-2 rounded-md text-sm text-ink-300 bg-[rgba(245,242,235,0.04)] hover:bg-[rgba(245,242,235,0.08)] hover:text-paper transition-colors",
            collapsed && "md:flex-none md:w-9 md:justify-center md:px-0"
          )}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className={cn("flex-1 text-left", collapsed && "md:hidden")}>Rechercher...</span>
          <kbd className={cn("text-[10px] border border-[rgba(245,242,235,0.15)] rounded px-1.5 py-0.5", collapsed && "md:hidden")}>⌘K</kbd>
        </button>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto relative z-10">
        {user?.role === "superadmin" && (
          <NavLink item={{ href: "/superadmin", label: "Tenants (super admin)", icon: Building }} active={pathname.startsWith("/superadmin")} collapsed={collapsed} onClick={onCloseMobile} />
        )}
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)}
            collapsed={collapsed}
            onClick={onCloseMobile}
            badge={item.href === "/renforts" ? renfortCount : 0}
          />
        ))}

        {([["Planification", planningNav], ["Securite & conformite", securiteNav], ["Competences & RH", rhNav]] as const).map(([title, items]) => (
          <div key={title}>
            <div className={cn("pt-4 pb-1 px-5", collapsed && "md:hidden")}>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">{title}</p>
            </div>
            {items.map((item) => (
              <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} collapsed={collapsed} onClick={onCloseMobile} />
            ))}
          </div>
        ))}

        {user?.role === "admin" && (
          <>
            <div className={cn("pt-4 pb-1 px-5", collapsed && "md:hidden")}>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">Administration</p>
            </div>
            {settingsNav.map((item) => (
              <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} collapsed={collapsed} onClick={onCloseMobile} />
            ))}
          </>
        )}
      </nav>

      {/* Pied de menu : compte + déconnexion */}
      <div className="border-t border-[rgba(245,242,235,0.08)] py-3 relative z-10">
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-5 pb-2">
            <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-ink-300 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Link
          href="/account"
          onClick={onCloseMobile}
          title={collapsed ? "Mon compte" : undefined}
          className={cn(
            "flex items-center gap-3 w-full text-sm transition-colors px-5 py-2",
            pathname.startsWith("/account") ? "text-signal-500" : "text-ink-300 hover:text-paper",
            collapsed && "md:px-0 md:py-2.5 md:justify-center md:gap-0"
          )}
        >
          <CircleUser size={18} strokeWidth={1.5} className="shrink-0" />
          <span className={cn(collapsed && "md:hidden")}>Mon compte</span>
        </Link>
        <button
          onClick={logout}
          title={collapsed ? "Deconnexion" : undefined}
          className={cn("flex items-center gap-3 w-full text-sm text-ink-300 hover:text-paper transition-colors px-5 py-2", collapsed && "md:px-0 md:py-2.5 md:justify-center md:gap-0")}
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          <span className={cn(collapsed && "md:hidden")}>Deconnexion</span>
        </button>
      </div>

      {/* Référence Spektalis */}
      <div className={cn("px-5 py-4 border-t border-[rgba(245,242,235,0.06)] relative z-10", collapsed && "md:hidden")}>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">Module Spektalis</span>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onClick,
  badge = 0,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 text-sm transition-colors duration-[120ms] relative",
        active
          ? "bg-[rgba(232,155,44,0.10)] text-signal-500 border-l-2 border-signal-500 -ml-[2px] pl-[18px] pr-5 py-2"
          : "text-ink-200 hover:text-paper hover:bg-[rgba(245,242,235,0.04)] border-l-2 border-transparent -ml-[2px] pl-[18px] pr-5 py-2",
        collapsed && "md:px-0 md:py-2.5 md:gap-0 md:justify-center md:border-l-0 md:ml-0 md:pl-0 md:pr-0"
      )}
    >
      <span className="relative shrink-0">
        <Icon size={18} strokeWidth={1.5} />
        {badge > 0 && collapsed && (
          <span className="hidden md:block absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-signal-500 ring-2 ring-ink-900" />
        )}
      </span>
      <span className={cn("truncate", collapsed && "md:hidden")}>{item.label}</span>
      {badge > 0 && (
        <span className={cn("ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-signal-500 text-[#0B1220] text-[11px] font-semibold flex items-center justify-center", collapsed && "md:hidden")}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
