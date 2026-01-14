import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Send, History } from 'lucide-react';
import { BroadcastForm } from '@/components/communications/BroadcastForm';
import { BroadcastList } from '@/components/communications/BroadcastList';
import { BroadcastFormInline } from '@/components/communications/BroadcastFormInline';

const Comunicados = () => {
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados"
        description="Lista de transmissão para enviar mensagens em massa"
      >
        <Button onClick={() => setShowBroadcastModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Comunicado
        </Button>
      </PageHeader>

      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Novo Envio
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Criar Comunicado</CardTitle>
              <CardDescription>
                Selecione as turmas e escreva sua mensagem para enviar aos responsáveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BroadcastFormInline />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <BroadcastList />
        </TabsContent>
      </Tabs>

      {/* Modal para novo comunicado rápido */}
      <BroadcastForm 
        open={showBroadcastModal} 
        onOpenChange={setShowBroadcastModal} 
      />
    </div>
  );
};

export default Comunicados;
