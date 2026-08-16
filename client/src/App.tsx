import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { PendingInviteActivation } from "@/components/PendingInviteActivation";
import AdminPage from "@/pages/AdminPage";
import CalendarPage from "@/pages/CalendarPage";
import DashboardPage from "@/pages/DashboardPage";
import FinancesPage from "@/pages/FinancesPage";
import ImportPage from "@/pages/ImportPage";
import InvitePage from "@/pages/InvitePage";
import NotFound from "@/pages/NotFound";
import PlayersPage from "@/pages/PlayersPage";
import SportsPage from "@/pages/SportsPage";
import TeamPage from "@/pages/TeamPage";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/invitar/:token"} component={InvitePage} />
      <DashboardLayout>
      <Switch>
        <Route path={"/"} component={DashboardPage} />
        <Route path={"/jugadores"} component={PlayersPage} />
        <Route path={"/cuentas"} component={FinancesPage} />
        <Route path={"/calendario"} component={CalendarPage} />
        <Route path={"/competicion"} component={SportsPage} />
        <Route path={"/equipo"} component={TeamPage} />
        <Route path={"/importar"} component={ImportPage} />
        <Route path={"/administracion"} component={AdminPage} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      </DashboardLayout>
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <PendingInviteActivation />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
