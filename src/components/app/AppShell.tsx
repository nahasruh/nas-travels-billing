import { Link, useLocation } from "wouter";
import {
  BadgeDollarSign,
  Building2,
  LogOut,
  LayoutDashboard,
  Search,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { APP } from "@/lib/constants";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "salesman"] },
  { href: "/sales", label: "Sales (Tickets)", icon: Ticket, roles: ["admin", "salesman"] },
  { href: "/payments", label: "Payments / Ledger", icon: BadgeDollarSign, roles: ["admin", "salesman"] },
  { href: "/agents", label: "Agents", icon: Building2, roles: ["admin"] },
  { href: "/salesmen", label: "Salesmen", icon: Users, roles: ["admin"] },
  { href: "/search", label: "Search", icon: Search, roles: ["admin", "salesman"] },
  { href: "/reports", label: "Reports", icon: Search, roles: ["admin"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut, user, role } = useAuth();

  return (
    <div className="min-h-screen grid-fade">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r border-sidebar-border bg-sidebar/70 backdrop-blur supports-[backdrop-filter]:bg-sidebar/55">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold tracking-tight">{APP.name}</div>
                <div className="text-xs text-muted-foreground">Saudi Arabia • {APP.currency} • No VAT</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
                N
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>

          <nav className="px-3 pb-6">
            {nav.filter((n) => !role || n.roles.includes(role)).map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            <div className="mt-5 px-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-sidebar-border bg-transparent"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </nav>
        </aside>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
          <div className="mx-auto w-full max-w-6xl pt-8 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <div>NAS Travels • Internal Billing</div>
              <div className="mono">{new Date().getFullYear()}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
