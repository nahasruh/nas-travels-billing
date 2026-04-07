import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAuth from "@/components/app/RequireAuth";
import RequireRole from "@/components/app/RequireRole";
import AppShell from "@/components/app/AppShell";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import Salesmen from "@/pages/Salesmen";
import Sales from "@/pages/Sales";
import Payments from "@/pages/Payments";
import SearchPage from "@/pages/Search";
import Reports from "@/pages/Reports";
import AdminUsers from "@/pages/AdminUsers";
import NotFound from "@/pages/NotFound";

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/login" component={Login} />

        <Route>
          <RequireAuth>
            <AppShell>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/agents">
                  <RequireRole allow={["admin"]}>
                    <Agents />
                  </RequireRole>
                </Route>
                <Route path="/salesmen">
                  <RequireRole allow={["admin"]}>
                    <Salesmen />
                  </RequireRole>
                </Route>
                <Route path="/sales" component={Sales} />
                <Route path="/payments" component={Payments} />
                <Route path="/search" component={SearchPage} />
                <Route path="/reports">
                  <RequireRole allow={["admin"]}>
                    <Reports />
                  </RequireRole>
                </Route>
                <Route path="/admin/users">
                  <RequireRole allow={["admin"]}>
                    <AdminUsers />
                  </RequireRole>
                </Route>
                <Route component={NotFound} />
              </Switch>
            </AppShell>
          </RequireAuth>
        </Route>
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
