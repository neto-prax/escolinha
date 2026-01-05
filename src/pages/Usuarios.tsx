import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { UserCog } from 'lucide-react';

const Usuarios = () => (
  <div className="space-y-6">
    <PageHeader title="Usuários" description="Gerencie os usuários e permissões" />
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Gestão de usuários em desenvolvimento</p>
      </CardContent>
    </Card>
  </div>
);

export default Usuarios;
