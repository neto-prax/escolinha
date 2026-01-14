import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppInstancesManager } from '@/components/settings/WhatsAppInstancesManager';
import { SectorUsersManager } from '@/components/settings/SectorUsersManager';
import { AutomationSettings } from '@/components/settings/AutomationSettings';
import { FinancialSettings } from '@/components/settings/FinancialSettings';
import { Phone, Building2, Bell, Shield, Bot, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Configure as integrações e permissões do sistema"
      />

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="whatsapp" className="gap-2">
            <Phone className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Bot className="h-4 w-4" />
            Automação
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

        <TabsContent value="whatsapp" className="space-y-6">
          <WhatsAppInstancesManager />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialSettings />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <AutomationSettings />
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
