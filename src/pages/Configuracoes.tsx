import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const Configuracoes = () => (
  <div className="space-y-6">
    <PageHeader title="Configurações" description="Configurações gerais do sistema" />
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Configurações em desenvolvimento</p>
      </CardContent>
    </Card>
  </div>
);

export default Configuracoes;
