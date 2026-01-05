import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Calendar, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

const Pedagogico = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedagógico"
        description="Gestão pedagógica completa"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <ClipboardList className="h-6 w-6" />
            </div>
            <CardTitle>Diário de Classe</CardTitle>
            <CardDescription>
              Registre o conteúdo diário, presença e observações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/app/diario">
              <Button className="w-full">Acessar</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <Calendar className="h-6 w-6" />
            </div>
            <CardTitle>Planejamento</CardTitle>
            <CardDescription>
              Crie e gerencie seus planejamentos semanais e mensais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Em breve</Button>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <BookOpen className="h-6 w-6" />
            </div>
            <CardTitle>Notas e Avaliações</CardTitle>
            <CardDescription>
              Lançamento de notas e acompanhamento do desempenho
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Em breve</Button>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <CardTitle>Relatórios Pedagógicos</CardTitle>
            <CardDescription>
              Relatórios de desempenho por turma e aluno
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Em breve</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pedagogico;
