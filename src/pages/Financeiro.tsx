import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertTriangle, FileText } from 'lucide-react';

const Financeiro = () => (
  <div className="space-y-6">
    <PageHeader title="Financeiro" description="Gestão financeira da escola" />
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[
        { icon: DollarSign, title: 'Mensalidades', desc: 'Geração e baixa de mensalidades' },
        { icon: AlertTriangle, title: 'Inadimplência', desc: 'Controle de atrasos e cobranças' },
        { icon: TrendingUp, title: 'Lançamentos', desc: 'Receitas e despesas' },
        { icon: FileText, title: 'Relatórios', desc: 'Relatórios financeiros' },
      ].map((item) => (
        <Card key={item.title} className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <item.icon className="h-6 w-6" />
            </div>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Acessar</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Financeiro;
