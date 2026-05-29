import { Link, useLocation } from "wouter";
import { Calendar, BookOpen, GraduationCap, Receipt, LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

const ACCENT = "#7c6fd4";

const TABS = [
  { href: "/schedule", label: "Lịch học", icon: Calendar },
  { href: "/homework", label: "BTVN", icon: BookOpen },
  { href: "/grades", label: "Bảng điểm", icon: GraduationCap },
  { href: "/invoices", label: "Hoá đơn", icon: Receipt },
];

function UserMenu() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/60 active:bg-white/40"
      >
        <UserCircle size={24} style={{ color: ACCENT }} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-[200] min-w-[140px]">
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors rounded-2xl"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex justify-center min-h-screen bg-gray-100 dark:bg-gray-900 w-full overflow-hidden">
      <div className="w-full max-w-[430px] bg-background shadow-xl flex flex-col relative h-screen" style={{ height: '100svh' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-b border-slate-100 bg-background z-40">
          <span className="text-base font-black" style={{ color: ACCENT }}>Easyedu</span>
          <UserMenu />
        </div>

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-hidden"
        >
          {children}
        </main>

        {/* Portal target for fullscreen overlays (sheets, modals) */}
        <div id="sheet-root" className="absolute inset-0 z-[100] pointer-events-none" />

        {/* Bottom Tab Bar — auto-raises above device nav bar via safe-area-inset-bottom */}
        <nav
          className="absolute bottom-0 left-0 right-0 bg-background border-t flex flex-col items-stretch z-50"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
        <div className="h-16 flex justify-around items-center px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}>
                <div className={cn(
                  "flex flex-col items-center justify-center w-16 h-full gap-1 cursor-pointer transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )} data-testid={`tab-${tab.href.replace('/', '')}`}>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
        </nav>
      </div>
    </div>
  );
}
