import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';

const Setores = () => (
  <div className="space-y-6">
    <PageHeader title="Setores" description="Gerencie os setores e instâncias WhatsApp" />
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Layers className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Configuração de setores em desenvolvimento</p>
      </CardContent>
    </Card>
  </div>
);

export default Setores;
