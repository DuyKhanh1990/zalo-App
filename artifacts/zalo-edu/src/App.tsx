import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Schedule from "@/pages/schedule";
import Homework from "@/pages/homework";
import Grades from "@/pages/grades";
import Invoices from "@/pages/invoices";
import LoginPage from "@/pages/login";
import OnboardingPage from "@/pages/onboarding";
import { AuthContext, useAuthState } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export type Tab = "schedule" | "homework" | "grades" | "invoices";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes("401")) return false;
        return failureCount < 2;
      },
    },
  },
});

function parseInitialTab(): Tab {
  try {
    const path = window.location.pathname + window.location.hash + window.location.search;
    if (path.includes("homework") || path.includes("assignment") || path.includes("btvn")) return "homework";
    if (path.includes("grades") || path.includes("score") || path.includes("bang-diem")) return "grades";
    if (path.includes("invoice") || path.includes("hoa-don")) return "invoices";
  } catch {}
  return "schedule";
}

function DataRefreshWatcher() {
  const qc = useQueryClient();

  useEffect(() => {
    function refetchAll() {
      qc.invalidateQueries();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refetchAll();
    });

    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const sdk = await import("zmp-sdk");
        const onFn = (sdk as unknown as Record<string, unknown>)["on"] as
          | ((event: string, cb: () => void) => (() => void) | void)
          | undefined;
        if (typeof onFn === "function") {
          const off = onFn("appShow", refetchAll);
          if (typeof off === "function") cleanup = off;
        }
      } catch {
        // Not inside ZMP — ignore
      }
    })();

    return () => {
      document.removeEventListener("visibilitychange", refetchAll);
      cleanup?.();
    };
  }, [qc]);

  return null;
}

function AppRouter() {
  const [activeTab, setActiveTab] = useState<Tab>(parseInitialTab);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === "schedule" && <Schedule />}
      {activeTab === "homework" && <Homework />}
      {activeTab === "grades" && <Grades />}
      {activeTab === "invoices" && <Invoices />}
    </Layout>
  );
}

function AuthGate() {
  const auth = useAuthState();

  if (auth.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "#7c6fd4" }} />
      </div>
    );
  }

  if (auth.status === "onboarding") {
    return (
      <AuthContext.Provider value={auth}>
        <OnboardingPage />
      </AuthContext.Provider>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <AuthContext.Provider value={auth}>
        <LoginPage />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <AppRouter />
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <div suppressHydrationWarning>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DataRefreshWatcher />
          <AuthGate />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
