import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import BudgetExecution2026 from "./pages/BudgetExecution2026";
import BudgetExplainer from "./pages/BudgetExplainer";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/budget-execution-2026"} component={BudgetExecution2026} />
      <Route path={"/budget-explainer"} component={BudgetExplainer} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route: keep the single-file HTML usable from a local file path. */}
      <Route component={Home} />
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
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
