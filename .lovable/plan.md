

## Reestruturação do Portal do Responsável

### Objetivo
Simplificar o portal para exibir apenas: **Atividades a fazer**, **Ocorrências**, **Boletos**, e no **Dashboard** mostrar **eventos e datas** do calendário escolar.

### Estrutura atual vs. nova

```text
ATUAL:                           NOVO:
/portal/dashboard (cards alunos) /portal/dashboard (eventos + datas do calendário)
/portal/aluno/:id (4 abas)      /portal/atividades (lição de casa dos alunos)
/portal/calendario               /portal/ocorrencias (registros de ocorrência)
                                 /portal/boletos (cobranças financeiras)
```

### Mudanças

**1. Migration: RLS para `psychology_records`**
- Adicionar política SELECT para responsáveis verem ocorrências dos seus alunos (tipo `ocorrencia`)
- Expressão: `student_id IN (SELECT get_guardian_student_ids(...))`

**2. Hook: novos queries em `useGuardianPortal.ts`**
- `useStudentHomework`: busca `daily_entries` (campo `homework`) das turmas dos alunos vinculados
- `useStudentOccurrences`: busca `psychology_records` onde `record_type = 'ocorrencia'` e `student_id` nos alunos do responsável

**3. Dashboard (`PortalDashboard.tsx`)**
- Remover cards de alunos
- Exibir próximos eventos do calendário escolar (feriados, reuniões, provas) em formato de lista/timeline
- Mostrar cards dos alunos vinculados de forma resumida no topo

**4. Nova página: Atividades (`PortalAtividades.tsx`)**
- Lista de atividades/lição de casa dos `daily_entries.homework` filtrados pelas turmas dos alunos
- Mostra data, turma, conteúdo da atividade

**5. Nova página: Ocorrências (`PortalOcorrencias.tsx`)**
- Lista de ocorrências do `psychology_records` (tipo `ocorrencia`)
- Mostra data, título, descrição, status

**6. Nova página: Boletos (`PortalBoletos.tsx`)**
- Migrar conteúdo financeiro do `PortalStudentDetail` para página própria
- Lista todas as cobranças de todos os alunos vinculados
- Filtro por status (pendente, pago, atrasado)

**7. Layout: atualizar navegação (`PortalLayout.tsx`)**
- Itens: Início, Atividades, Ocorrências, Boletos
- Ícones: Home, BookOpen, AlertTriangle, DollarSign

**8. Rotas (`App.tsx`)**
- Remover `/portal/aluno/:id` e `/portal/calendario`
- Adicionar `/portal/atividades`, `/portal/ocorrencias`, `/portal/boletos`

### Detalhes técnicos
- 1 migration (RLS para `psychology_records`)
- 3 novas páginas, 2 novos hooks
- Remover `PortalStudentDetail.tsx` e `PortalCalendario.tsx`
- Atualizar `PortalDashboard.tsx` e `PortalLayout.tsx`

