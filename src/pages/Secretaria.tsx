import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, UserPlus, FolderOpen, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Secretaria = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Secretaria"
        description="Gestão de secretaria e documentos"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <UserPlus className="h-6 w-6" />
            </div>
            <CardTitle>Matrículas</CardTitle>
            <CardDescription>
              Gerencie matrículas e rematrículas de alunos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Acessar</Button>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>
              Emissão de declarações, históricos e atestados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Acessar</Button>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <FolderOpen className="h-6 w-6" />
            </div>
            <CardTitle>Arquivos</CardTitle>
            <CardDescription>
              Gestão de documentos e arquivos dos alunos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Acessar</Button>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle>Comunicados</CardTitle>
            <CardDescription>
              Envie comunicados e avisos para responsáveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Acessar</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Secretaria;
