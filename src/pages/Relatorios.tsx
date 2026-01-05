import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const Relatorios = () => (
  <div className="space-y-6">
    <PageHeader title="Relatórios" description="Relatórios e análises" />
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Módulo de relatórios em desenvolvimento</p>
      </CardContent>
    </Card>
  </div>
);

export default Relatorios;
