import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanTab } from '@/components/comercial/KanbanTab';
import { MetasTab } from '@/components/comercial/MetasTab';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePermissions } from '@/hooks/usePermissions';
import { TurmaConfig } from '@/types/finance';
import { Aluno } from '@/types/aluno';
import { Target, Kanban as KanbanIcon, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

import { DEFAULT_TURMAS_CONFIG } from '@/constants/turmas';

export default function Comercial() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'kanban';

  const [turmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', DEFAULT_TURMAS_CONFIG);
  const [alunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const { canAccessScreen, canAccessTab } = usePermissions();

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  // Verificação de permissões do usuário
  if (!canAccessScreen('comercial')) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Comercial & Captação"
          description="Acesso restrito ao módulo comercial."
        />
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-3">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Acesso Não Autorizado</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Você não possui permissão para visualizar o módulo Comercial. Solicite liberação ao administrador ou diretor do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showKanban = canAccessTab('comercial', 'kanban');
  const showMetas = canAccessTab('comercial', 'metas');

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Comercial & Captação"
        description="Kanban de turmas para captação de alunos, acompanhamento do funil e configuração de metas de matrícula e rematrícula."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
            {showKanban && (
              <TabsTrigger value="kanban" className="gap-2 text-xs font-semibold">
                <KanbanIcon className="h-4 w-4" />
                Kanban por Turmas
              </TabsTrigger>
            )}
            {showMetas && (
              <TabsTrigger value="metas" className="gap-2 text-xs font-semibold">
                <Target className="h-4 w-4" />
                Metas de Matrícula & Rematrícula
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {showKanban && (
          <TabsContent value="kanban" className="m-0 focus-visible:outline-none">
            <KanbanTab turmas={turmas} alunos={alunos} />
          </TabsContent>
        )}

        {showMetas && (
          <TabsContent value="metas" className="m-0 focus-visible:outline-none">
            <MetasTab turmas={turmas} alunos={alunos} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

