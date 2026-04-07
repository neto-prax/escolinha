

## Portal do Responsável — Plano de Implementação

Portal web onde responsáveis fazem login com email/senha e visualizam dados completos dos seus alunos, incluindo informações acadêmicas e financeiras.

### Visão Geral

```text
/portal/login  →  /portal/dashboard
                      ├── Dados do Aluno (nome, turma, foto)
                      ├── Frequência
                      ├── Notas
                      ├── Diário de Classe
                      ├── Comunicados / Calendário Escolar
                      └── Financeiro (boletos, pagamentos)
```

### Etapas

**1. Tabela de acesso do responsável (migration)**
- Criar tabela `guardian_portal_access` com campos: `id`, `guardian_id` (ref guardians), `school_id`, `email`, `user_id` (ref auth.users), `is_active`, `created_at`
- RLS: responsável vê apenas seus dados; diretores/secretários gerenciam acessos
- Isso vincula um login (auth.users) a um responsável existente na tabela `guardians`

**2. Criar role "guardian" no sistema**
- Adicionar `'guardian'` ao enum `app_role` ou usar a tabela `guardian_portal_access` para identificar o tipo de usuário sem alterar o enum
- Abordagem preferida: usar a tabela `guardian_portal_access` para evitar alterar o enum existente; no AuthContext, detectar se o usuário logado tem registro nessa tabela e redirecionar para o portal

**3. Rotas do Portal (`/portal/*`)**
- `/portal/login` — tela de login exclusiva para responsáveis (visual diferenciado)
- `/portal` — layout do portal com sidebar simplificada
- `/portal/dashboard` — visão geral dos alunos vinculados
- `/portal/aluno/:id` — detalhes do aluno (frequência, notas, diário, financeiro)
- `/portal/calendario` — calendário escolar
- `/portal/comunicados` — comunicados da escola

**4. Páginas e componentes**
- **PortalLogin**: formulário de login que redireciona para `/portal/dashboard`
- **PortalLayout**: layout limpo com header mostrando nome da escola e do responsável
- **PortalDashboard**: cards com cada aluno vinculado (nome, turma, foto, status financeiro)
- **PortalStudentDetail**: página com abas:
  - **Dados**: info básica do aluno
  - **Frequência**: tabela de presença por mês
  - **Notas**: notas por disciplina/período
  - **Diário**: entradas do diário de classe
  - **Financeiro**: boletos, status de pagamento, histórico

**5. Consultas de dados**
- Buscar `guardian_portal_access` → `guardians` → `student_guardians` → `students` para listar alunos
- Frequência: `attendance` filtrada por `student_id`
- Notas: `grades` filtrada por `student_id`
- Diário: `daily_entries` via `student_classes` → `class_id`
- Financeiro: `billing` filtrada por `student_id` ou `guardian_id`
- Calendário: `school_calendar` filtrada por `school_id`

**6. Gestão de acessos (lado admin)**
- Na página de Responsáveis existente, adicionar botão "Criar acesso ao portal" que:
  - Cria um usuário via edge function (email do responsável + senha temporária)
  - Insere registro em `guardian_portal_access`
  - Exibe credenciais para envio via WhatsApp

### Segurança
- RLS em todas as consultas: responsável só acessa dados dos seus alunos vinculados
- Portal completamente isolado do painel administrativo (`/app/*`)
- Sem acesso a dados de outros alunos ou escola

### Detalhes técnicos
- Novas migrations: 1 tabela (`guardian_portal_access`) + políticas RLS para leitura de `attendance`, `grades`, `daily_entries`, `billing`, `school_calendar` por responsáveis
- Nova edge function para criar acesso do responsável
- ~8 novos arquivos (páginas + layout + componentes do portal)

