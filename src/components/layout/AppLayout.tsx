import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { PlanSelectorModal } from '@/components/onboarding/PlanSelectorModal';
import { usePlatformBillingSettings } from '@/hooks/usePlatformBillingSettings';

export const AppLayout = () => {
  const { isAuthenticated, isLoading, school, roles, user, profile } = useAuth();
  const { schoolSubscriptions, markSchoolAsPaid } = usePlatformBillingSettings();

  if (isLoading) {
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
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = roles?.includes('superadmin') || user?.email === 'sport@gmail.com';
  const schoolId = school?.id || profile?.school_id;
  const currentSub = schoolId ? schoolSubscriptions[schoolId] : null;

  // Só bloqueia se houver assinatura pendente registrada e não for superadmin
  const isPendingPayment = !isSuperAdmin && currentSub?.status === 'pending';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <Topbar />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </SidebarInset>

        {isPendingPayment && schoolId && (
          <PlanSelectorModal
            isOpen={true}
            isPaywall={true}
            schoolId={schoolId}
            schoolName={school?.name || 'Sua Escola'}
            adminName={profile?.full_name || 'Diretoria'}
            adminEmail={user?.email || ''}
            onPaymentSuccess={() => {
              markSchoolAsPaid(schoolId);
            }}
          />
        )}
      </div>
    </SidebarProvider>
  );
};
