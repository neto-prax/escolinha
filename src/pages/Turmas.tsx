import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, MoreHorizontal, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data
const classes = [
  { id: '1', name: '1º Ano A', grade: '1º Ano', shift: 'Manhã', students: 25, teacher: 'Maria Silva', status: 'active' },
  { id: '2', name: '1º Ano B', grade: '1º Ano', shift: 'Tarde', students: 23, teacher: 'Ana Costa', status: 'active' },
  { id: '3', name: '2º Ano A', grade: '2º Ano', shift: 'Manhã', students: 28, teacher: 'João Santos', status: 'active' },
  { id: '4', name: '3º Ano A', grade: '3º Ano', shift: 'Manhã', students: 26, teacher: 'Paula Lima', status: 'active' },
  { id: '5', name: '4º Ano A', grade: '4º Ano', shift: 'Manhã', students: 24, teacher: 'Carlos Souza', status: 'active' },
  { id: '6', name: '5º Ano A', grade: '5º Ano', shift: 'Manhã', students: 27, teacher: 'Fernanda Oliveira', status: 'active' },
];

const Turmas = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Turmas"
        description="Gerencie as turmas da sua escola"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Turma
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Turmas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Ativas no ano letivo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">324</div>
            <p className="text-xs text-muted-foreground">Distribuídos nas turmas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média por Turma</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27</div>
            <p className="text-xs text-muted-foreground">Alunos por turma</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar turma..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Professor(a)</TableHead>
                <TableHead className="text-center">Alunos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id} className="table-row-interactive">
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{cls.grade}</TableCell>
                  <TableCell>{cls.shift}</TableCell>
                  <TableCell>{cls.teacher}</TableCell>
                  <TableCell className="text-center">{cls.students}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="badge-success">
                      Ativa
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Ver alunos</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Encerrar turma
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Turmas;
