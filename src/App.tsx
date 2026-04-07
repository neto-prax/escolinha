import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Turmas from "./pages/Turmas";
import Alunos from "./pages/Alunos";
import Diario from "./pages/Diario";
import Pedagogico from "./pages/Pedagogico";
import Psicologia from "./pages/Psicologia";
import Secretaria from "./pages/Secretaria";
import Mensagens from "./pages/Mensagens";
import Financeiro from "./pages/Financeiro";
import Administrativo from "./pages/Administrativo";
import Relatorios from "./pages/Relatorios";
import Setores from "./pages/Setores";
import Configuracoes from "./pages/Configuracoes";
import Usuarios from "./pages/Usuarios";
import CRMMatriculas from "./pages/CRMMatriculas";
import Responsaveis from "./pages/Responsaveis";
import Contatos from "./pages/Contatos";
import Comunicados from "./pages/Comunicados";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            
            {/* Protected routes */}
            <Route path="/app" element={<AppLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="turmas" element={<Turmas />} />
              <Route path="alunos" element={<Alunos />} />
              <Route path="diario" element={<Diario />} />
              <Route path="pedagogico" element={<Pedagogico />} />
              <Route path="psicologia" element={<Psicologia />} />
              <Route path="secretaria" element={<Secretaria />} />
              <Route path="mensagens" element={<Mensagens />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="administrativo" element={<Administrativo />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="setores" element={<Setores />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="crm-matriculas" element={<CRMMatriculas />} />
              <Route path="responsaveis" element={<Responsaveis />} />
              <Route path="contatos" element={<Contatos />} />
              <Route path="comunicados" element={<Comunicados />} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
