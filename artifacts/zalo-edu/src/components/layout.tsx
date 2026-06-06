import { Calendar, BookOpen, GraduationCap, Receipt, LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Tab } from "@/App";

const ACCENT = "#7c6fd4";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "schedule", label: "Lịch học", icon: Calendar },
  { id: "homework", label: "BTVN", icon: BookOpen },
  { id: "grades", label: "Bảng điểm", icon: GraduationCap },
  { id: "invoices", label: "Hoá đơn", icon: Receipt },
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
    <div ref={ref} className="relative flex flex-col items-center justify-center h-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex flex-col items-center justify-center w-16 h-full gap-1 cursor-pointer transition-colors duration-200 border-none bg-transparent",
          open ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <UserCircle className="w-6 h-6" strokeWidth={2} style={open ? { color: ACCENT } : undefined} />
        <span className="text-[10px] font-medium leading-none">Tài khoản</span>
      </button>

      {open && (
        <div className="absolute bottom-[68px] right-0 bg-white rounded-2xl shadow-xl border border-slate-100 py-1 z-[200] min-w-[140px]">
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

export default function Layout({
  children,
  activeTab,
  onTabChange,
}: {
  children: React.ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <div className="flex justify-center min-h-screen bg-gray-100 dark:bg-gray-900 w-full overflow-hidden">
      <div className="w-full max-w-[430px] bg-background shadow-xl flex flex-col relative h-screen" style={{ height: '100svh' }}>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Portal target for fullscreen overlays (sheets, modals) */}
        <div id="sheet-root" className="absolute inset-0 z-[100] pointer-events-none" />

        {/* Bottom Tab Bar */}
        <nav
          className="absolute bottom-0 left-0 right-0 bg-background border-t flex flex-col items-stretch z-50"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="h-16 flex justify-around items-center px-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex flex-col items-center justify-center w-14 h-full gap-1 cursor-pointer transition-colors duration-200 border-none bg-transparent",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                </button>
              );
            })}
            <UserMenu />
          </div>
        </nav>
      </div>
    </div>
  );
}
