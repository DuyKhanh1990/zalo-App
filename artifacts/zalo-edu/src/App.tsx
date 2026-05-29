import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Schedule from "@/pages/schedule";
import Homework from "@/pages/homework";
import Grades from "@/pages/grades";
import Invoices from "@/pages/invoices";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import OnboardingPage from "@/pages/onboarding";
import { AuthContext, useAuthState } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

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

/**
 * Listens for two signals to refetch data:
 * 1. Standard browser visibilitychange (web / background tab)
 * 2. ZMP appShow event fired when user returns to the Zalo Mini App
 */
function DataRefreshWatcher() {
  const qc = useQueryClient();

  useEffect(() => {
    function refetchAll() {
      qc.invalidateQueries();
    }

    // Standard browser signal
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refetchAll();
    });

    // ZMP lifecycle — fires when mini app comes back to foreground
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

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/schedule" />} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/homework" component={Homework} />
        <Route path="/grades" component={Grades} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/my-space/calendar" component={Schedule} />
        <Route path="/my-space/assignments" component={Homework} />
        <Route path="/my-space/score-sheet" component={Grades} />
        <Route path="/my-space/invoices" component={Invoices} />
        <Route component={NotFound} />
      </Switch>
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
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
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
