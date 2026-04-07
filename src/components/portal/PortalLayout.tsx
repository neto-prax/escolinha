import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGuardianPortalAccess } from '@/hooks/useGuardianPortal';
import { Loader2, GraduationCap, Home, Calendar, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PortalLayout = () => {
  const { isAuthenticated, isLoading, signOut, profile } = useAuth();
  const { data: portalAccess, isLoading: isLoadingPortal } = useGuardianPortalAccess();
  const location = useLocation();

  if (isLoading || isLoadingPortal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  if (!portalAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Acesso não autorizado</h2>
          <p className="text-muted-foreground">Sua conta não possui acesso ao portal do responsável.</p>
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </div>
      </div>
    );
  }

  const guardianName = (portalAccess.guardians as any)?.full_name || profile?.full_name || 'Responsável';

  const navItems = [
    { to: '/portal/dashboard', label: 'Início', icon: Home },
    { to: '/portal/calendario', label: 'Calendário', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Portal do Responsável</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">Olá, {guardianName}</span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 -mb-px">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
                  location.pathname === item.to
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet context={{ portalAccess }} />
      </main>
    </div>
  );
};
