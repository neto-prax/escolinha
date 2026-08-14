import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppInstancesManager } from '@/components/settings/WhatsAppInstancesManager';
import { SectorUsersManager } from '@/components/settings/SectorUsersManager';
import { AutomationSettings } from '@/components/settings/AutomationSettings';
import { FinancialSettings } from '@/components/settings/FinancialSettings';
import { DailyReportSettings } from '@/components/settings/DailyReportSettings';
import { UazapiSettings } from '@/components/settings/UazapiSettings';
import { Phone, Building2, Bell, Shield, Bot, CreditCard, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Configuracoes = ({ hideHeader = false }: { hideHeader?: boolean }) => {
  const { user } = useAuth();

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
          description="Configure as integrações e permissões do sistema"
        />
      )}

      <Tabs defaultValue={isSuperAdmin ? 'uazapi' : 'whatsapp'} className="space-y-6">
        <TabsList className="flex-wrap">
          {isSuperAdmin && (
            <TabsTrigger value="uazapi" className="gap-2">
              <Phone className="h-4 w-4" />
              WhatsApp (Uazapi)
            </TabsTrigger>
          )}

          <TabsTrigger value="whatsapp" className="gap-2">
            <Phone className="h-4 w-4" />
            Instâncias
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Bot className="h-4 w-4" />
            Automação
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4" />
            Relatório diário
          </TabsTrigger>
          <TabsTrigger value="sectors" className="gap-2">

            <Building2 className="h-4 w-4" />
            Setores
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {isSuperAdmin && (
          <TabsContent value="uazapi" className="space-y-6">
            <UazapiSettings />
          </TabsContent>
        )}


        <TabsContent value="whatsapp" className="space-y-6">
          <WhatsAppInstancesManager />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialSettings />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <AutomationSettings />
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <DailyReportSettings />
        </TabsContent>


        <TabsContent value="sectors" className="space-y-6">
          <SectorUsersManager />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configure as notificações do sistema</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Em desenvolvimento
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Configure as opções de segurança</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Em desenvolvimento
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
