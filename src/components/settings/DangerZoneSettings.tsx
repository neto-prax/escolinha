import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Users, Briefcase, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export const DangerZoneSettings = () => {
  const handleClearAlunos = () => {
    if (confirm('Tem certeza que deseja apagar TODOS os alunos, enturmações e mensalidades geradas? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem('escolinha_alunos');
      localStorage.removeItem('escolinha_mensalidades');
      toast.success('Todos os alunos foram apagados com sucesso.');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleClearColaboradores = () => {
    if (confirm('Tem certeza que deseja apagar TODOS os colaboradores e seus históricos de ocorrências? Esta ação não pode ser desfeita.')) {
      // Caso os colaboradores venham a ser salvos no localStorage no futuro
      localStorage.removeItem('escolinha_funcionarios');
      localStorage.removeItem('escolinha_colaboradores');
      toast.success('Todos os colaboradores foram apagados com sucesso.');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleClearFinanceiro = () => {
    if (confirm('Tem certeza que deseja apagar TODOS os extratos financeiros, lançamentos, caixas e orçamentos? Esta ação não pode ser desfeita.')) {
      const keysToRemove = [
        'escolinha_lancamentos',
        'escolinha_lancamentos_v2',
        'escolinha_caixas',
        'escolinha_orcamentos',
        'escolinha_salarios',
        'escolinha_cartoes'
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      toast.success('Todos os dados financeiros foram apagados com sucesso.');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleClearAll = () => {
    if (confirm('ATENÇÃO: Você está prestes a apagar TODOS os dados da escola (Alunos, Colaboradores, Financeiro, Turmas e Configurações). Deseja continuar?')) {
      const promptText = prompt('Digite "APAGAR TUDO" para confirmar a exclusão de todos os dados:');
      if (promptText === 'APAGAR TUDO') {
        // Limpa tudo que começa com 'escolinha_'
        const keysToKeep = []; // Se precisar manter alguma chave
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('escolinha_') && !keysToKeep.includes(key)) {
            localStorage.removeItem(key);
            i--; // Ajusta o índice pois o array do localStorage diminuiu
          }
        }
        toast.success('ESCOLA RESETADA. Todos os dados foram apagados com sucesso.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error('Operação cancelada. O texto digitado não confere.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Zona de Perigo (Limpar Dados da Escola)</CardTitle>
          </div>
          <CardDescription>
            Estas ações são irreversíveis. Ao apagar os dados, eles não poderão ser recuperados. 
            Tenha certeza absoluta antes de prosseguir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-background">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Apagar todos os Alunos
              </div>
              <p className="text-sm text-muted-foreground">Remove todos os alunos, enturmações e boletos/mensalidades.</p>
            </div>
            <Button variant="destructive" onClick={handleClearAlunos} className="whitespace-nowrap">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Alunos
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-background">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Apagar todos os Colaboradores
              </div>
              <p className="text-sm text-muted-foreground">Remove todos os funcionários, cargos e ocorrências registrados.</p>
            </div>
            <Button variant="destructive" onClick={handleClearColaboradores} className="whitespace-nowrap">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Colaboradores
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-background">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Apagar Extratos Financeiros
              </div>
              <p className="text-sm text-muted-foreground">Remove todos os lançamentos de entrada/saída, salários, orçamentos e caixas.</p>
            </div>
            <Button variant="destructive" onClick={handleClearFinanceiro} className="whitespace-nowrap">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Financeiro
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-destructive/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  RESETAR ESCOLA COMPLETA
                </div>
                <p className="text-sm text-destructive/80 font-medium">
                  Apaga absolutamente TODOS os dados: alunos, colaboradores, financeiro, turmas e configurações locais.
                </p>
              </div>
              <Button variant="destructive" size="lg" onClick={handleClearAll} className="whitespace-nowrap shadow-md">
                <Trash2 className="mr-2 h-5 w-5" />
                APAGAR TUDO
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};
