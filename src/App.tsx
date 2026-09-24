import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalAtividades from "./pages/portal/PortalAtividades";
import PortalOcorrencias from "./pages/portal/PortalOcorrencias";
import PortalBoletos from "./pages/portal/PortalBoletos";
import { PortalLayout } from "./components/portal/PortalLayout";
import Financeiro from "./pages/Financeiro";
import Administrativo from "./pages/Administrativo";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import Alunos from "./pages/Alunos";
import PainelVendedor from "./pages/PainelVendedor";
import PublicDailyReport from "./pages/PublicDailyReport";
import Pedagogico from "./pages/Pedagogico";
import Perfil from "./pages/Perfil";
import Comercial from "./pages/Comercial";
import Estoque from "./pages/Estoque";
import { useSystemBranding } from "@/hooks/useSystemBranding";

const queryClient = new QueryClient();

const BrandingInitializer = () => {
  useSystemBranding();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrandingInitializer />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Routes>

            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/report/:schoolId/:date" element={<PublicDailyReport />} />
            
            {/* Protected routes */}
            <Route path="/app" element={<AppLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pedagogico" element={<Pedagogico />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="administrativo" element={<Administrativo />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="alunos" element={<Alunos />} />
              <Route path="comercial" element={<Comercial />} />
              <Route path="vendas" element={<PainelVendedor />} />
              <Route path="perfil" element={<Perfil />} />
            </Route>
            
            {/* Portal do Responsável */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal" element={<PortalLayout />}>
              <Route path="dashboard" element={<PortalDashboard />} />
              <Route path="atividades" element={<PortalAtividades />} />
              <Route path="ocorrencias" element={<PortalOcorrencias />} />
              <Route path="boletos" element={<PortalBoletos />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
