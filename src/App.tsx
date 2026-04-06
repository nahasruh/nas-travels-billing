import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAuth from "@/components/app/RequireAuth";
import AppShell from "@/components/app/AppShell";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import Salesmen from "@/pages/Salesmen";
import Sales from "@/pages/Sales";
import Payments from "@/pages/Payments";
import SearchPage from "@/pages/Search";
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
                <Route path="/agents" component={Agents} />
                <Route path="/salesmen" component={Salesmen} />
                <Route path="/sales" component={Sales} />
                <Route path="/payments" component={Payments} />
                <Route path="/search" component={SearchPage} />
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
