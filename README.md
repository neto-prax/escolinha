# Connect School Hub

Crie um ERP SaaS para gestão escolar completa chamado “Interagir ERP”, com visual claro (light theme), design moderno, minimalista, acessível, com layout administrativo profissional (sidebar + topbar), foco em usabilidade e rapidez. O sistema deve ter controle de acesso por perfil (RBAC) e permissões por setor.

1) Visual / UX (tema claro)

Tema claro como padrão (branco/cinza claro), com bom contraste e acessibilidade

Componentes com bordas suaves, sombras leves, espaçamento consistente

Layout:

Topbar: nome da escola, busca global, notificações, avatar do usuário

Sidebar: navegação por módulos (mostra apenas o que o usuário tem permissão)

Estilo semelhante a ERPs modernos (painéis, cards, tabelas com filtros, paginação)

Responsivo: desktop/tablet/mobile

2) Perfis (login) e permissões

Implementar login com 4 tipos de usuário:

Professora

Secretaria

Administrativo

Diretora

Regras de acesso:

Professora

Acessa apenas módulo Pedagógico

Vê apenas turmas vinculadas a ela

Pode lançar: atividades, presença, notas, observações, planejamento

Quando clicar em Diário, pode enviar mensagem em massa para alunos/responsáveis da turma dela

Não acessa financeiro/administrativo nem inbox por setor

Secretaria

Vê cadastros e rotinas de secretaria (alunos, matrículas, documentos)

Vê o módulo Mensagens apenas dos setores cadastrados a ela

Não tem acesso ao financeiro

Administrativo

Acesso às páginas Administrativas e Financeiras

Vê o módulo Mensagens apenas dos setores cadastrados a ele no WhatsApp

Não altera dados pedagógicos (apenas leitura em alguns relatórios, se necessário)

Diretora

Acesso total a tudo (super admin)

Pode gerenciar usuários, setores, permissões, instâncias do WhatsApp, configurações da escola

Além disso, cada usuário (exceto diretora) tem lista de setores autorizados para filtrar o módulo de Mensagens.

3) Módulos obrigatórios do ERP (escopo)
A) Pedagógico (Professora e Diretora)

Turmas, disciplinas, alunos por turma

Planejamento semanal/mensal

Registro de atividades

Notas e frequência

Relatórios por turma e aluno

B) Diário (Professora)

Tela “Diário” com:

Seleção de turma (somente turmas vinculadas)

Campos:

Conteúdo/atividade do dia

Presença

Tarefa de casa

Observações

Botão: “Enviar mensagem em massa”

Envia para todos os alunos/responsáveis daquela turma

Salva log do envio (data, turma, conteúdo, total enviado, status)

C) Secretaria (Secretaria e Diretora)

Cadastro de alunos e responsáveis

Matrícula/rematrícula

Emissão de documentos (declarações, histórico, atestados)

Gestão de turmas (criar/encerrar)

Comunicação interna básica (avisos)

D) Administrativo e Financeiro (Administrativo e Diretora)

Mensalidades: gerar, editar, baixar

Inadimplência: lista, status, régua de cobrança

Cobrança via WhatsApp (templates)

Plano de contas e lançamentos

Relatórios financeiros (mensal, por turma, por período)

Contratos e termos (registro e anexos)

E) Mensagens (WhatsApp por Setores)

Um módulo “Mensagens” com visão tipo inbox:

Conversas organizadas por setor

Filtros: setor, status, período, aluno/responsável, turma

Regras:

Secretaria só vê conversas dos setores atribuídos a ela

Administrativo só vê conversas dos setores atribuídos a ele

Diretora vê tudo

Professora não vê a inbox geral (apenas histórico do que enviou no Diário e mensagens vinculadas à turma, se a regra permitir)

4) Integração WhatsApp via Evolution API

Cada Setor pode estar ligado a uma instância do Evolution:

evolution_instance

whatsapp_number

setor_nome

O sistema deve suportar:

Disparo em massa do Diário via Evolution

Recebimento de mensagens (webhook do Evolution) e distribuição por setor

Logs: mensagens enviadas/recebidas, falhas, reenvio

5) Modelo de dados (tabelas sugeridas)

Criar banco (Supabase/Postgres) com tabelas:

schools

users (role: teacher, secretary, admin, director)

sectors (nome, evolution_instance, whatsapp_number)

user_sectors (user_id, sector_id)

classes (turmas)

teacher_classes (teacher_id, class_id)

students

guardians

student_class (student_id, class_id)

daily_entries (class_id, teacher_id, conteudo, tarefa, observacoes, data)

broadcast_logs (daily_entry_id, class_id, total, status, sent_at)

whatsapp_conversations (sector_id, student_id/guardian_id, last_message_at, status)

whatsapp_messages (conversation_id, direction, type, body, media_url, created_at)

billing (mensalidades)

payments

finance_ledger (lancamentos)

6) Rotas/páginas mínimas

/ Landing (captação para escolas)

/login

/app/dashboard

/app/pedagogico

/app/diario

/app/turmas

/app/alunos

/app/secretaria

/app/mensagens

/app/setores

/app/administrativo

/app/financeiro

/app/relatorios

/app/configuracoes

/app/usuarios (somente diretora)

7) Segurança e autorização (obrigatório)

Middleware por role para proteger rotas

Filtros de acesso:

Professora: somente turmas dela

Secretaria/Admin: somente setores atribuídos

Diretora: tudo

Auditoria simples: log de ações críticas (criar cobrança, excluir registro, enviar em massa)

8) Integração com n8n (webhooks)

Criar endpoints no app que encaminham para n8n:

POST /api/leads → captura escola interessada (landing)

POST /api/diario/enviar → envia payload do disparo em massa

POST /api/evolution/webhook → recebe eventos do Evolution e encaminha

POST /api/cobranca/enviar → disparo de cobrança para inadimplentes

Formato do envio do Diário:

{
  "school_id": "uuid",
  "class_id": "uuid",
  "teacher_id": "uuid",
  "message": "texto final",
  "recipients": [
    { "name": "Responsável", "phone": "55..." }
  ],
  "sector": "Pedagógico"
}

9) Landing Page (captação)

Home pública para captar novas escolas:

Hero + CTA “Solicitar demonstração”

Seção de benefícios (gestão + WhatsApp + financeiro)

Depoimentos e planos

Formulário enviando lead para /api/leads

10) Entregável final

Gerar o projeto completo com:

UI tema claro

RBAC funcional

Páginas principais com tabelas, filtros e formulários

Integrações via webhooks prontas para n8n + Evolution

Dados mock e estrutura real no banco

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://escolinha.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/70b11e52-1389-486c-8cc4-406f6ee79634).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
