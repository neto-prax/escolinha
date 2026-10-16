# 📚 Purple Edu — Central de Documentação do Sistema (doc/)

Seja bem-vindo à central oficial de documentação do **Purple Edu** (também denominado *Colégio Interagir ERP* ou *Connect School Hub*). 

Este diretório reúne todos os manuais técnicos, arquiteturais, operacionais e de negócio que explicam de forma exaustiva o funcionamento da plataforma de gestão escolar SaaS.

---

## 🧭 Mapa de Navegação da Documentação

A documentação foi dividida em guias temáticos especializados para facilitar a leitura e manutenção, além de contar com a compilação integral unificada:

| Arquivo | Descrição Principal | Tópicos Cobertos |
| :--- | :--- | :--- |
| [**`DOCUMENTACAO_COMPLETA.md`**](./DOCUMENTACAO_COMPLETA.md) | **Manual Geral Unificado** | Visão 360º de todo o sistema em um único documento exaustivo. |
| [**`MANUAL_COMPLETO_MODULO_WHATSAPP.md`**](./MANUAL_COMPLETO_MODULO_WHATSAPP.md) | **Manual Especializado WhatsApp** | **Manual dedicado à parte**: Gateways WA-AKG (Docker), Uazapi, Evolution, Webhooks, Mídias e Chatbots. |
| [**`01_ARQUITETURA_E_TECNOLOGIA.md`**](./01_ARQUITETURA_E_TECNOLOGIA.md) | **Arquitetura & Engenharia** | Stack técnica, RBAC, isolamento multi-tenant, hybrid storage, multi-sedes e regras de AGENTS.md. |
| [**`02_BANCO_DE_DADOS_E_SERVICOS.md`**](./02_BANCO_DE_DADOS_E_SERVICOS.md) | **Banco de Dados & Backend** | Modelagem PostgreSQL no Supabase, RLS, 12 Edge Functions, Migrations e Storage Buckets. |
| [**`03_MODULO_PEDAGOGICO.md`**](./03_MODULO_PEDAGOGICO.md) | **Gestão Pedagógica** | Diário de classe, frequência real, planos de aula BNCC, detecção de atrasos, médias, boletins e calendário escolar A4. |
| [**`04_MODULO_FINANCEIRO.md`**](./04_MODULO_FINANCEIRO.md) | **Módulo Financeiro & Cobrança** | Mensalidades, carnês, inadimplência, régua WhatsApp, Pix dinâmico EMV, boletos (Cora/Asaas/Sicoob/Bradesco) e DRE. |
| [**`05_SECRETARIA_E_ALUNOS.md`**](./05_SECRETARIA_E_ALUNOS.md) | **Secretaria & Alunos** | Cadastro 360º, Wizard de Matrícula, transferência em lote, zerar unidade, contratos dinâmicos e declarações. |
| [**`06_COMUNICACAO_E_WHATSAPP.md`**](./06_COMUNICACAO_E_WHATSAPP.md) | **WhatsApp & Comunicação** | Central de mensagens, WhatsAppInboxProvider, gateways (WA-AKG Baileys, Uazapi, Evolution), mídias permanentes e gatilhos. |
| [**`07_COMERCIAL_E_CRM.md`**](./07_COMERCIAL_E_CRM.md) | **Comercial & CRM** | Funil de vendas Kanban, agendamento de visitas, captação de leads, conversão em matrícula e painel do vendedor. |
| [**`08_ESTOQUE_CANTINA_E_ADMINISTRATIVO.md`**](./08_ESTOQUE_CANTINA_E_ADMINISTRATIVO.md) | **Estoque, Cantina & RH** | Almoxarifado, grade de uniformes, PDV de cantina com baixa imediata, colaboradores, cargos e folha de ponto. |
| [**`09_PORTAL_FAMILIA_E_SUPERADMIN.md`**](./09_PORTAL_FAMILIA_E_SUPERADMIN.md) | **Portais & Super Admin** | Portal do Responsável (boletim, presença, 2ª via) e Painel Super Admin (SaaS multi-escola, billing e planos). |
| [**`10_GUIA_DE_INSTALACAO_E_DEPLOY.md`**](./10_GUIA_DE_INSTALACAO_E_DEPLOY.md) | **Instalação, Deploy & Ops** | Setup local, Docker Compose (WA-AKG + MySQL), variáveis de ambiente, Supabase CLI, build e resolução de problemas. |
| [**`GUIA_DE_TESTES_E_ERROS_ESPERADOS.md`**](./GUIA_DE_TESTES_E_ERROS_ESPERADOS.md) | **Testes Unitários & Erros Esperados** | **Suíte de 47 testes unitários**, Pre-commit Hook, isolamento multi-tenancy, BR Code Pix, Chatbot WhatsApp e notas pedagógicas. |

---

## 📁 Arquivos Históricos e Referências do Sistema

Todos os arquivos originais de especificação, planejamento e regras arquiteturais históricas foram preservados no subdiretório:

👉 [**`arquivos_legados_e_referencias/`**](./arquivos_legados_e_referencias/)
- [`README_ORIGINAL.md`](./arquivos_legados_e_referencias/README_ORIGINAL.md) — Documento original de requisitos do ERP (Connect School Hub).
- [`DOCUMENTACAO_SISTEMA_LEGADA.md`](./arquivos_legados_e_referencias/DOCUMENTACAO_SISTEMA_LEGADA.md) — Documentação prévia do sistema formatada para Obsidian.
- [`AGENTS_REGRAS_ARQUITETURA.md`](./arquivos_legados_e_referencias/AGENTS_REGRAS_ARQUITETURA.md) — Regras de arquitetura mandatórias (WhatsApp, Drive, isolamento de tenant).
- [`ROADMAP_SISTEMA.md`](./arquivos_legados_e_referencias/ROADMAP_SISTEMA.md) — Histórico de entregas e roadmap de evolução.

---

## 🎯 Visão Executiva do Projeto

O **Purple Edu** é um ERP educacional focado em instituições de ensino privado (Infantil, Fundamental I e II, Médio). Ele resolve a fragmentação de ferramentas escolares unindo:
1. **Rigor Acadêmico e Pedagógico**: Chamadas verídicas, controle de faltas, diários com bloqueio em dias não letivos e calendário oficial homologado para impressão gráfica em papel A4.
2. **Saúde Financeira e Automação de Cobrança**: Régua automática multicanal (WhatsApp e e-mail) antes e após o vencimento, reduzindo drasticamente a inadimplência com PIX instantâneo e boletos registrados.
3. **Comunicação por Setores**: Atendimento humanizado e centralizado no WhatsApp corporativo, separando conversas por departamentos (Secretaria, Financeiro, Coordenação) sem risco de vazamento de dados.
4. **Multi-Unidade Real**: Capacidade de operar matriz e filiais no mesmo painel com segregação de dados limpa e segura.

---

## 👥 Matriz Rápida de Perfis de Usuário (RBAC)

| Perfil (`AppRole`) | Pedagógico | Secretaria / Alunos | Financeiro | Mensagens WhatsApp | Administrativo / RH | Configurações Globais |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`teacher`** | ✅ Total (suas turmas) | ❌ | ❌ | ⚠️ Diário apenas | ❌ | ❌ |
| **`secretary`** | 👁️ Leitura | ✅ Total | ❌ | ✅ Setores autorizados | 👁️ Leitura | ❌ |
| **`admin`** | ❌ | 👁️ Consulta | ✅ Total | ✅ Setores autorizados | ✅ Total | ⚠️ Parcial |
| **`director`** | ✅ Total | ✅ Total | ✅ Total | ✅ Todos os setores | ✅ Total | ✅ Total |
| **`seller`** | ❌ | ❌ | ❌ | ⚠️ Comercial apenas | ❌ | ❌ |
| **`superadmin`** | 🌐 Global | 🌐 Global | 🌐 Global | 🌐 Global | 🌐 Global | 🌐 Painel SaaS Master |

---

## 🛠️ Stack Tecnológica em Resumo

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons, Recharts, date-fns.
- **Backend & Armazenamento**: Supabase (PostgreSQL, Row Level Security, Edge Functions em Deno, Storage Buckets).
- **Gateways de Mensageria**: WA-AKG (Next.js 15 + Baileys + MySQL em Docker), Uazapi API, Evolution API.
- **Gateways Bancários**: Cora Banking API, Asaas, Sicoob, Bradesco, gerador dinâmico Pix EMV standard.
- **Armazenamento de Arquivos**: Google Drive API com autorização OAuth 2.0 por escola + Supabase Storage para mídias WhatsApp.

---
*Para começar a explorar a documentação completa, acesse [DOCUMENTACAO_COMPLETA.md](./DOCUMENTACAO_COMPLETA.md) ou navegue pelos tópicos específicos numerados acima.*

