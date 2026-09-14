import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppInstancesManager } from '@/components/settings/WhatsAppInstancesManager';
import { SectorUsersManager } from '@/components/settings/SectorUsersManager';
import { AutomationSettings } from '@/components/settings/AutomationSettings';
import { FinancialSettings } from '@/components/settings/FinancialSettings';
import { DailyReportSettings } from '@/components/settings/DailyReportSettings';
import { UazapiSettings } from '@/components/settings/UazapiSettings';
import { DangerZoneSettings } from '@/components/settings/DangerZoneSettings';
import { AdministrativoSettings } from '@/components/settings/AdministrativoSettings';
import { Phone, Building2, CreditCard, FileText, Briefcase, Settings2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useState, useEffect } from 'react';

const Configuracoes = ({ hideHeader = false }: { hideHeader?: boolean }) => {
  const { user } = useAuth();
  const { canAccessTab } = usePermissions();

  const canAccessGeral = canAccessTab('configuracoes', 'geral');
  const canAccessWhatsapp = canAccessTab('configuracoes', 'whatsapp');
  const canAccessFinanceiro = canAccessTab('configuracoes', 'financeiro');
  const canAccessPedagogico = canAccessTab('configuracoes', 'pedagogico');
  const canAccessAdministrativo = canAccessTab('configuracoes', 'administrativo');

  const availableTabs = [
    canAccessGeral && 'geral',
    canAccessWhatsapp && 'whatsapp',
    canAccessFinanceiro && 'financeiro',
    canAccessPedagogico && 'pedagogico',
    canAccessAdministrativo && 'administrativo',
  ].filter(Boolean) as string[];

  const [activeTab, setActiveTab] = useState(availableTabs[0] || 'geral');

  useEffect(() => {
    if (!availableTabs.includes(activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="Configurações"
          description="Gerencie as configurações da escola divididas por módulos"
        />
      )}

      {availableTabs.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          Nenhuma seção de configuração disponível com suas permissões atuais.
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1 border border-slate-200">
            {canAccessGeral && (
              <TabsTrigger value="geral" className="gap-2 px-4 py-2 font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                <Settings2 className="h-4 w-4" />
                Geral
              </TabsTrigger>
            )}

            {canAccessWhatsapp && (
              <TabsTrigger value="whatsapp" className="gap-2 px-4 py-2 font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                <Phone className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            )}

            {canAccessFinanceiro && (
              <TabsTrigger value="financeiro" className="gap-2 px-4 py-2 font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                <CreditCard className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
            )}

            {canAccessPedagogico && (
              <TabsTrigger value="pedagogico" className="gap-2 px-4 py-2 font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4" />
                Pedagógico
              </TabsTrigger>
            )}

            {canAccessAdministrativo && (
              <TabsTrigger value="administrativo" className="gap-2 px-4 py-2 font-medium text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                <Briefcase className="h-4 w-4" />
                Administrativo
              </TabsTrigger>
            )}
          </TabsList>

        {/* 1. GERAL */}
        <TabsContent value="geral" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <SectorUsersManager />
            <AutomationSettings />
            <DangerZoneSettings />
          </div>
        </TabsContent>

        {/* 2. WHATSAPP */}
        <TabsContent value="whatsapp" className="space-y-6">
          {isSuperAdmin && <UazapiSettings />}
          <WhatsAppInstancesManager />
        </TabsContent>

        {/* 3. FINANCEIRO */}
        <TabsContent value="financeiro" className="space-y-6">
          <FinancialSettings />
        </TabsContent>

        {/* 4. PEDAGÓGICO */}
        <TabsContent value="pedagogico" className="space-y-6">
          <DailyReportSettings />
        </TabsContent>

        {/* 5. ADMINISTRATIVO */}
        <TabsContent value="administrativo" className="space-y-6">
          <AdministrativoSettings />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
};

export default Configuracoes;
