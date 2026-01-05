import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, FileText, Settings } from 'lucide-react';

const Administrativo = () => (
  <div className="space-y-6">
    <PageHeader title="Administrativo" description="Gestão administrativa" />
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[
        { icon: Users, title: 'Funcionários', desc: 'Gestão de colaboradores' },
        { icon: FileText, title: 'Contratos', desc: 'Gestão de contratos' },
        { icon: Settings, title: 'Configurações', desc: 'Configurações administrativas' },
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

export default Administrativo;
