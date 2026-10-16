---
title: "Purple Edu — Manual Completo e Exaustivo do Módulo de WhatsApp"
aliases:
  - Documentação do Módulo WhatsApp
  - Manual WhatsApp ERP Escolar
  - Guia WA-AKG Baileys Uazapi
tags:
  - whatsapp
  - mensageria
  - baileys
  - docker
  - uazapi
  - evolution-api
  - chat-multi-atendimento
  - webhooks
author: "Equipe de Engenharia Purple Edu"
version: "3.0.0"
updated: 2026-10-13
---

# 📱 Purple Edu — Manual Completo do Módulo de WhatsApp
## Central de Comunicação Multi-Atendente, Gateways e Automação Escolar

> [!IMPORTANT]
> Este manual documenta de forma especializada e independente todas as camadas do **Módulo de WhatsApp** do **Purple Edu**, abrangendo desde a orquestração de containers do gateway próprio WA-AKG (Baileys), integração com Uazapi e Evolution API, até o armazenamento perpétuo de mídias, motor de gatilhos automáticos e distribuição por departamentos escolares.

---

## 📑 Sumário

1. [Visão Geral e Objetivos do Módulo](#1-visão-geral-e-objetivos-do-módulo)
2. [Arquitetura Técnica do Módulo](#2-arquitetura-técnica-do-módulo)
   - 2.1 [Diagrama de Fluxo e Componentes](#21-diagrama-de-fluxo-e-componentes)
   - 2.2 [O Provedor de Estado Centralizado (`WhatsAppInboxProvider`)](#22-o-provedor-de-estado-centralizado-whatsappinboxprovider)
3. [Gateways e Provedores Homologados](#3-gateways-e-provedores-homologados)
   - 3.1 [Gateway Próprio WA-AKG (Next.js 15 + Baileys + MySQL)](#31-gateway-próprio-wa-akg-nextjs-15--baileys--mysql)
   - 3.2 [Provedor Uazapi API](#32-provedor-uazapi-api)
   - 3.3 [Provedor Evolution API v2](#33-provedor-evolution-api-v2)
4. [Infraestrutura Docker do WA-AKG (`docker-compose.wa-akg.yml`)](#4-infraestrutura-docker-do-wa-akg-docker-composewa-akgyml)
5. [Diretrizes Mandatórias de Engenharia (Regras de AGENTS.md)](#5-diretrizes-mandatórias-de-engenharia-regras-de-agentsmd)
   - 5.1 [Deduplicação e Persistência Única](#51-deduplicação-e-persistência-única)
   - 5.2 [Normalização e Cópia Permanente de Mídias](#52-normalização-e-cópia-permanente-de-mídias)
   - 5.3 [Verificação de Status Somente-Leitura](#53-verificação-de-status-somente-leitura)
   - 5.4 [Isolamento de Tenant por Instância da Escola](#54-isolamento-de-tenant-por-instância-da-escola)
6. [Interface do Operador e Recursos do Chat](#6-interface-do-operador-e-recursos-do-chat)
   - 6.1 [Visualização de Conversas e Lista de Contatos](#61-visualização-de-conversas-e-lista-de-contatos)
   - 6.2 [Player de Áudio Nativo para Mensagens de Voz](#62-player-de-áudio-nativo-para-mensagens-de-voz)
   - 6.3 [Visualizadores de Mídias Ricas (Fotos, Vídeos, Documentos e Stickers)](#63-visualizadores-de-mídias-ricas-fotos-vídeos-documentos-e-stickers)
   - 6.4 [Painel Lateral com Ficha Cadastral e Financeira do Aluno](#64-painel-lateral-com-ficha-cadastral-e-financeira-do-aluno)
   - 6.5 [Resolução e Encerramento de Chamados com Histórico](#65-resolução-e-encerramento-de-chamados-com-histórico)
7. [Motor de Gatilhos Inteligentes e Respostas Automáticas (Chatbot)](#7-motor-de-gatilhos-inteligentes-e-respostas-automáticas-chatbot)
   - 7.1 [Tipos de Correspondência](#71-tipos-de-correspondência)
   - 7.2 [Variáveis Dinâmicas de Interpolação](#72-variáveis-dinâmicas-de-interpolação)
   - 7.3 [Transbordo e Roteamento Automático de Setores](#73-transbordo-e-roteamento-automático-de-setores)
8. [Setorização e Controle Granular de Acesso (RBAC)](#8-setorização-e-controle-granular-de-acesso-rbac)
9. [Disparos Automatizados em Massa](#9-disparos-automatizados-em-massa)
   - 9.1 [Disparo do Diário de Classe para a Turma](#91-disparo-do-diário-de-classe-para-a-turma)
   - 9.2 [Disparos da Régua de Cobrança Financeira](#92-disparos-da-régua-de-cobrança-financeira)
10. [Referência da API do Gateway WA-AKG (`waAkgClient.ts`)](#10-referência-da-api-do-gateway-wa-akg-waakgclientts)
11. [Diagnóstico e Resolução de Problemas (Troubleshooting)](#11-diagnóstico-e-resolução-de-problemas-troubleshooting)

---

## 1. Visão Geral e Objetivos do Módulo

O WhatsApp é o principal canal de comunicação entre as escolas privadas brasileiras e as famílias de alunos. No entanto, o uso de aparelhos celulares corporativos ou pessoais gera gargalos severos:
- Conversas presas em aparelhos individuais sem visibilidade da direção.
- Risco de vazamento de informações financeiras entre setores não autorizados.
- Perda de histórico de mensagens e áudios quando aparelhos são trocados.
- Lentidão em responder dúvidas recorrentes sobre matrículas, horários e mensalidades.

O **Módulo de WhatsApp** do **Purple Edu** resolve esses desafios ao transformar uma ou mais linhas telefônicas institucionais em uma central multi-atendente integrada diretamente ao banco de dados acadêmico e financeiro do ERP.

---

## 2. Arquitetura Técnica do Módulo

### 2.1 Diagrama de Fluxo e Componentes

```mermaid
graph TB
    subgraph WhatsAppCloud["Rede WhatsApp / Meta"]
        Familia["Responsável / Aluno (App WhatsApp Oficial)"]
    end

    subgraph GatewayLayer["Camada de Gateway de Mensageria"]
        WAAKG["Container Docker: WA-AKG (Next.js 15 + Baileys)"]
        Uazapi["Provedor Externo: Uazapi API"]
        Evolution["Provedor Externo: Evolution API"]
    end

    subgraph SupabaseServerless["Serviços Backend (Supabase)"]
        WebhookFn["Edge Function: evolution-webhook / wa-akg / uazapi"]
        StorageBucket["Supabase Storage: bucket 'message-media'"]
        PostgresDB[("PostgreSQL: whatsapp_conversations & messages")]
        RealtimeChannel["Supabase Realtime (WebSocket CDC)"]
    end

    subgraph FrontendApp["Frontend Purple Edu (Navegador)"]
        InboxProvider["WhatsAppInboxProvider (Gerenciador Único de Estado)"]
        ChatView["WhatsAppChatView (Interface de Conversas)"]
        AudioPlayer["WhatsAppAudioPlayer (Player OGG/MP3)"]
        MediaModals["WhatsAppMediaModals (Lightbox & Docs)"]
        TriggersTab["WhatsAppTriggersTab (Gatilhos e Chatbots)"]
        SectorsTab["WhatsAppSectorsTab (Setores e Filas)"]
    end

    Familia <-->|Protocolo WhatsApp| GatewayLayer
    GatewayLayer -->|HTTP POST Webhook| WebhookFn
    WebhookFn -->|Upload Imediato de Bytes| StorageBucket
    WebhookFn -->|Gravação Desduplicada| PostgresDB
    PostgresDB -->|Notificação de Inserção| RealtimeChannel
    RealtimeChannel -->|Atualização Instantânea| InboxProvider
    InboxProvider --> ChatView
    ChatView --> AudioPlayer
    ChatView --> MediaModals
    ChatView -->|Envio de Texto ou Mídia| GatewayLayer
```

### 2.2 O Provedor de Estado Centralizado (`WhatsAppInboxProvider`)

Localizado em `src/hooks/useWhatsAppInbox.ts`, o `WhatsAppInboxProvider` é o único ponto de contato do frontend com a camada de dados do WhatsApp.

#### Princípios de Operação:
1. **Conexão Realtime Exclusiva**: Ao invés de cada componente abrir seu próprio canal de escuta, o provider estabelece **uma única conexão WebSocket** com a tabela `whatsapp_messages` filtrada pelo `school_id`.
2. **Atualizações Otimistas**: Quando o atendente clica em enviar mensagem, ela aparece imediatamente no chat com o status `'sending'`. Quando o gateway confirma a entrega, o status transiciona para `'sent'` ou `'delivered'`.
3. **Contadores de Não Lidas Centralizados**: Atualiza em tempo real as badges de conversas não lidas no menu lateral sem necessidade de *polling* HTTP.
4. **Resolução de Contatos com Ficha Escolar**: Cruza o número de telefone do remetente com a tabela de alunos e responsáveis, anexando dinamicamente os dados do estudante (nome, série, turma e status financeiro) à conversa.

---

## 3. Gateways e Provedores Homologados

O Purple Edu possui arquitetura desacoplada capaz de operar com três soluções distintas:

### 3.1 Gateway Próprio WA-AKG (Next.js 15 + Baileys + MySQL)
- **Tecnologia**: Baseado na biblioteca aberta `@whiskeysockets/baileys`, executando sobre Next.js 15 em Node.js 22.
- **Armazenamento de Sessão**: Utiliza banco relacional MySQL 8.0 para persistir chaves criptográficas de sessão e credenciais de auth.
- **Conexão**: Geração de QR Code padrão direto na tela do ERP ou envio de Pairing Code (código de pareamento numérico de 8 dígitos).
- **Sem Custo por Mensagem**: Opera sem taxas adicionais de terceiros.

### 3.2 Provedor Uazapi API
- **Tecnologia**: API corporativa externa de mensageria com suporte a alta concorrência.
- **Configuração**: Gerenciada em `src/components/settings/UazapiSettings.tsx`.
- **Regra de Requisições**: As checagens de status são estritamente orientadas a cache e somente-leitura.

### 3.3 Provedor Evolution API v2
- **Tecnologia**: Gateway moderno em Node.js com endpoints RESTful completos e suporte a webhooks avançados de digitação (*typing*) e confirmação de leitura (*read receipts*).
- **Edge Functions**: `supabase/functions/evolution-api` e `supabase/functions/evolution-webhook`.

---

## 4. Infraestrutura Docker do WA-AKG (`docker-compose.wa-akg.yml`)

Para hospedar o gateway próprio, o repositório inclui a orquestração oficial pronta para ambientes de desenvolvimento ou servidores dedicados (VPS):

```yaml
services:
  # Servidor do Gateway WA-AKG (Next.js 15 + Baileys)
  wa-akg:
    image: node:22-bookworm-slim
    container_name: wa-akg-gateway
    restart: unless-stopped
    working_dir: /app
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - DATABASE_URL=mysql://akg_user:akg_pass123@wa-akg-mysql:3306/wa_akg
      - AUTH_SECRET=sua-chave-secreta-jwt-32-caracteres-minimo
      - AUTH_TRUST_HOST=true
      - WEBHOOK_URL=https://eafntyicpalnyzonnrgn.supabase.co/functions/v1/evolution-webhook
    depends_on:
      wa-akg-mysql:
        condition: service_healthy
    volumes:
      - wa-akg-data:/app/data
      - wa-akg-sessions:/app/sessions

  # Banco de Dados MySQL dedicado para o WA-AKG
  wa-akg-mysql:
    image: mysql:8.0
    container_name: wa-akg-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_pass_wa_akg
      MYSQL_DATABASE: wa_akg
      MYSQL_USER: akg_user
      MYSQL_PASSWORD: akg_pass123
    ports:
      - "3307:3306"
    volumes:
      - wa-akg-mysql-data:/var/lib/mysql

volumes:
  wa-akg-data:
  wa-akg-sessions:
  wa-akg-mysql-data:
```

### Comandos de Gestão do Docker:
```bash
# Subir os containers do gateway
docker compose -f docker-compose.wa-akg.yml up -d

# Visualizar logs em tempo real do pareamento e mensagens
docker compose -f docker-compose.wa-akg.yml logs -f wa-akg

# Verificar se o banco MySQL está saudável
docker exec -it wa-akg-db mysqladmin ping -h localhost -u root -proot_pass_wa_akg
```

---

## 5. Diretrizes Mandatórias de Engenharia (Regras de AGENTS.md)

As seguintes regras foram incorporadas ao código-fonte para assegurar conformidade operacional e proteção legal das instituições:

### 5.1 Deduplicação e Persistência Única
- Todo evento de webhook recebido contém um identificador único de mensagem gerado pelo WhatsApp (`provider_message_id`).
- A tabela `whatsapp_messages` impõe um índice único composto em:
  $$\text{UNIQUE}(\texttt{school\_id}, \texttt{provider\_message\_id})$$
- Se o gateway reenviar o webhook por falha temporária de rede, o Supabase descarta a duplicidade sem criar mensagens repetidas no chat.

### 5.2 Normalização e Cópia Permanente de Mídias
> [!CAUTION]
> As URLs de fotos, áudios e vídeos entregues por gateways de WhatsApp expiram em poucas horas. É expressamente proibido salvar essas URLs efêmeras no banco de dados.

- O webhook de entrada executa o seguinte fluxo síncrono antes de persistir o registro:
  1. Identifica o tipo de mídia (`image`, `audio`, `video`, `document`, `sticker`).
  2. Efetua o download dos bytes brutos diretamente da URL do gateway.
  3. Gera um hash único baseado no timestamp e no ID da mensagem.
  4. Realiza o upload para o bucket do Supabase Storage:
     $$\texttt{message-media/\{school\_id\}/\{conversation\_id\}/\{hash\}\_\{filename\}}$$
  5. Grava no campo `media_url` exclusivamente o endereço permanente do bucket.

### 5.3 Verificação de Status Somente-Leitura
- Consultas periódicas de integridade das instâncias Uazapi e WA-AKG são configuradas para serem estritamente de leitura (`GET`), sem disparar requisições de reconfiguração de webhook ou reinicialização de conexões que poderiam derrubar a sessão ativa.

### 5.4 Isolamento de Tenant por Instância da Escola
- Cada instância de WhatsApp no gateway pertence a um único `school_id`.
- Ao receber uma mensagem recebida de um número desconhecido, o webhook resolve a escola correspondente exclusivamente pelo token da instância que recebeu a conexão, garantindo que colégios concorrentes jamais recebam mensagens um do outro.

### 5.5 Rotina de Reset do WhatsApp e Proteção Anti-Vazamento
Para permitir que sedes novas ou escolas em migração comecem com a caixa de entrada 100% limpa, o sistema implementa:
1. **Reset das Tabelas no Banco**:
   - Exclusão em cascata de mensagens e conversas vinculadas ao `school_id` (`whatsapp_messages` e `whatsapp_conversations`).
2. **Flag Anti-AutoSync (`wa_auto_sync_disabled`)**:
   - Ao executar o reset, o sistema grava no escopo da escola a flag que bloqueia a reimportação automática não solicitada dos chats do celular pareado.
   - O usuário tem o controle: para sincronizar conversas antigas do aparelho, basta clicar deliberadamente no botão **"Sincronizar"**.
3. **Eliminação de Consultas Órfãs**:
   - A query da caixa de entrada filtra estritamente por `school_id = activeSchoolId`, eliminando qualquer vazamento de conversas sem escola (`school_id IS NULL`).
4. **Ponto de Acionamento Duplo**:
   - Botão **"Zerar WhatsApp"** diretamente na tela de mensagens ([`WhatsAppChatView.tsx`](file:///home/neto/Documents/dev/escolinha/src/components/mensagens/WhatsAppChatView.tsx)).
   - Botões **"Limpar WhatsApp"** e **"RESETAR ESCOLA COMPLETA"** na Zona de Perigo ([`DangerZoneSettings.tsx`](file:///home/neto/Documents/dev/escolinha/src/components/settings/DangerZoneSettings.tsx)).

---

## 6. Interface do Operador e Recursos do Chat

A interface de atendimento foi desenvolvida em `src/components/mensagens/WhatsAppChatView.tsx`:

```mermaid
graph LR
    subgraph ChatLayout["Layout da Tela de Mensagens"]
        Col1["Coluna 1: Lista de Conversas (Filtros por Setor, Status, Busca)"]
        Col2["Coluna 2: Área de Conversa Ativa (Mensagens, Áudio, Anexos)"]
        Col3["Coluna 3: Painel Lateral 360º do Aluno (Ficha & Financeiro)"]
    end
```

### 6.1 Visualização de Conversas e Lista de Contatos
- **Filtro por Setor**: Permite alternar entre Secretaria, Financeiro, Coordenação ou Todos.
- **Filtro por Status**: `Abertas`, `Pendentes`, `Resolvidas` e `Fechadas`.
- **Busca Global**: Pesquisa instantânea por nome do pai, nome do aluno ou número de telefone.
- **Badges de Não Lidas**: Indicador visual circular com a contagem exata de mensagens pendentes.

### 6.2 Player de Áudio Nativo para Mensagens de Voz (`WhatsAppAudioPlayer.tsx`)
- Mensagens de voz enviadas pelo aplicativo WhatsApp chegam tipicamente codificadas no codec **OGG Opus**.
- O componente implementa decodificação nativa com Web Audio API:
  - Onda sonora visual interativa (Waveform).
  - Controle de velocidade de reprodução: `1x`, `1.5x` e `2x`.
  - Controle de arrasto de tempo (seek) com indicação precisa de minutos e segundos.

### 6.3 Visualizadores de Mídias Ricas (`WhatsAppMediaModals.tsx`)
- **Imagens e Fotos**: Exibição inline com cantos arredondados e modal lightbox com zoom de alta resolução ao clicar.
- **Vídeos**: Player de vídeo HTML5 integrado com suporte a MP4 e visualização em tela cheia.
- **Documentos e PDFs**: Card estruturado com ícone do arquivo, nome legível, extensão, tamanho em KB/MB e botão direto de download ou visualização em nova aba.
- **Figurinhas (Stickers)**: Renderização limpa de stickers WebP sem bordas ou fundos brancos.

### 6.4 Painel Lateral com Ficha Cadastral e Financeira do Aluno
Ao abrir qualquer conversa no chat, o atendente tem visibilidade imediata dos dados do aluno vinculado àquele telefone sem precisar sair da tela:
- **Nome do Estudante e Foto**.
- **Série, Turma e Turno** (ex.: *2º Ano B — Matutino*).
- **Nome do Responsável Legal**.
- **Termômetro Financeiro**:
  - 🟢 **Em Dia**: Sem mensalidades vencidas.
  - 🔴 **Inadimplente (X parcelas em atraso)**: Mostra os títulos pendentes com botão rápido para enviar a 2ª via Pix diretamente na conversa ativa.

### 6.5 Resolução e Encerramento de Chamados (`WhatsAppResolveModal.tsx`)
- Para garantir governança, o atendente pode formalizar o encerramento do chamado:
  - Registro de **Título do Atendimento** e **Resumo da Solução**.
  - Opção de envio de mensagem automática de encerramento para o responsável.
  - Marcação de data, hora e operador que resolveu o ticket.

---

## 7. Motor de Gatilhos Inteligentes e Respostas Automáticas (Chatbot)

O motor de gatilhos em `src/components/mensagens/WhatsAppTriggersTab.tsx` e `src/hooks/useWhatsAppTriggers.ts` permite automatizar o atendimento inicial sem intervenção humana:

### 7.1 Tipos de Correspondência (`TipoCorrespondenciaTrigger`)
1. **`exata`**: Aciona apenas se o texto da mensagem for estritamente igual à palavra-chave cadastrada (ignorando maiúsculas e minúsculas).
2. **`contem`**: Aciona se a palavra-chave estiver presente em qualquer parte do texto digitado pela família.
3. **`inicio`**: Aciona se a mensagem começar com o termo configurado.
4. **`qualquer_primeira`**: Aciona na primeira mensagem de boas-vindas enviada pelo contato quando não há chamado aberto.

### 7.2 Variáveis Dinâmicas de Interpolação
O texto da resposta automática suporta variáveis que são substituídas dinamicamente:
- `{{nome}}`: Nome do contato ou responsável cadastrado.
- `{{aluno}}`: Nome do estudante vinculado ao número.
- `{{setor}}`: Nome do setor de destino da conversa.
- `{{escola}}`: Nome fantasia da instituição de ensino.

### 7.3 Transbordo e Roteamento Automático de Setores
Além de responder, o gatilho pode reclassificar a conversa automaticamente:
- Exemplo: Quando o responsável digita *"quero 2ª via do carnê"*, o gatilho responde com a mensagem programada e **transfere o ticket automaticamente para o setor Financeiro**, notificando a equipe financeira.

---

## 8. Setorização e Controle Granular de Acesso (RBAC)

O sistema impede que conversas confidenciais sejam visualizadas por colaboradores não autorizados:

```mermaid
flowchart TD
    MsgEntrada[Mensagem Recebida no WhatsApp] --> Setor{Qual o Setor da Conversa?}

    Setor -->|Secretaria| FilaSec[Fila da Secretaria]
    Setor -->|Financeiro| FilaFin[Fila do Financeiro]
    Setor -->|Pedagogico| FilaPed[Fila da Coordenação]
    Setor -->|Diretoria| FilaDir[Fila da Direção]

    FilaSec --> PermSec{Usuário tem permissão 'secretary'?}
    FilaFin --> PermFin{Usuário tem permissão 'admin'?}
    FilaPed --> PermPed{Usuário tem permissão 'teacher/coord'?}
    FilaDir --> PermDir{Usuário tem permissão 'director'?}

    PermSec -->|Sim| AtendeSec[Visualiza e Responde no Chat]
    PermSec -->|Não| BloqueiaSec[Oculto da Lista]

    PermFin -->|Sim| AtendeFin[Visualiza e Responde no Chat]
    PermFin -->|Não| BloqueiaFin[Oculto da Lista]

    PermDir -->|Sim| AtendeDir[Visualiza Todas as Filas da Escola]
```

- A gestão de quem acessa cada setor é feita graficamente em `src/components/mensagens/WhatsAppSectorPermissionsTab.tsx`.

---

## 9. Disparos Automatizados em Massa

### 9.1 Disparo do Diário de Classe para a Turma
- Na tela de Diário de Classe (`src/pages/Pedagogico.tsx`), o professor regente pode acionar o botão **"Enviar mensagem em massa"**:
  - O sistema compila o conteúdo do dia, presença e tarefas de casa.
  - Itera sobre os responsáveis dos alunos matriculados na turma e enfileira os envios via gateway com taxa controlada para evitar bloqueios da operadora.
  - Grava o log de envio com data, hora e status de entrega.

### 9.2 Disparos da Régua de Cobrança Financeira
- No módulo Financeiro (`src/pages/Financeiro.tsx`), o motor de cobrança automatizada dispara mensagens de três categorias:
  - **Lembrete Preventivo (5 dias antes)**.
  - **Aviso no Dia do Vencimento**.
  - **Cobrança Amigável de Inadimplência** com código Pix dinâmico gerado em tempo real.

---

## 10. Referência da API do Gateway WA-AKG (`waAkgClient.ts`)

A biblioteca interna de comunicação com o container WA-AKG implementa os seguintes métodos fundamentais:

```typescript
// Assinatura do método central de chamada
export async function callWaAkg(
  action: 'status' | 'connect' | 'disconnect' | 'send-text' | 'send-media' | 'configure-webhook',
  data: Record<string, unknown> = {}
): Promise<WaAkgStandardResponse>;
```

### Principais Endpoints Mapeados no Container:

| Método | Endpoint WA-AKG | Descrição da Operação |
| :--- | :--- | :--- |
| `GET` | `/api/sessions` | Lista as sessões ativas no container Baileys. |
| `POST` | `/api/sessions` | Cria uma nova sessão nomeada vinculada à escola. |
| `POST` | `/api/sessions/{sessionId}/start` | Inicializa a conexão com os servidores do WhatsApp. |
| `GET` | `/api/sessions/{sessionId}/qr` | Retorna o payload em base64 do QR Code para leitura no app. |
| `GET` | `/api/sessions/{sessionId}` | Retorna o status de conexão (`CONNECTED`, `SCAN_QR`, `DISCONNECTED`). |
| `POST` | `/api/sessions/{sessionId}/logout` | Encerra a sessão ativa e desconecta o aparelho. |
| `POST` | `/api/messages/{sessionId}/{jid}/send` | Envia mensagem de texto simples para um número de telefone. |
| `POST` | `/api/messages/{sessionId}/{jid}/send/media` | Envia mensagem com anexo (imagem, áudio, PDF ou vídeo). |
| `POST` | `/api/sessions/{sessionId}/webhook` | Configura a URL de retorno dos webhooks no Supabase. |

---

## 11. Diagnóstico e Resolução de Problemas (Troubleshooting)

| Sintoma | Causa Mais Frequente | Como Resolver |
| :--- | :--- | :--- |
| **QR Code não carrega e dá erro 500** | O container MySQL ainda está iniciando ou não criou as tabelas de sessão. | Rodar `docker compose -f docker-compose.wa-akg.yml logs -f wa-akg-mysql` e verificar se a porta 3307 está liberada. |
| **Mensagens recebidas não chegam no chat** | A URL do webhook configurada no gateway não aponta para a Edge Function correta. | Verificar se a variável `WEBHOOK_URL` no `docker-compose.wa-akg.yml` aponta para `https://<seu-supabase>.supabase.co/functions/v1/evolution-webhook`. |
| **Áudio de voz não toca no navegador** | Formato OGG Opus não decodificado pelo reprodutor padrão do browser. | O Purple Edu utiliza o player embutido `WhatsAppAudioPlayer.tsx` que trata o stream de áudio via Web Audio API. |
| **Mídias antigas aparecem quebradas** | A mídia foi gravada utilizando a URL direta do gateway em vez do bucket do Supabase. | Certificar-se de que a Edge Function possui as chaves de acesso com permissão de escrita no bucket `message-media`. |
| **Mensagem duplicada ao receber do cliente** | Gateway retransmitiu webhook sem deduplicação. | A tabela `whatsapp_messages` possui índice de deduplicação único por `provider_message_id`. Verifique se o índice está ativo nas migrações do banco. |
| **Atendente não vê as conversas da Secretaria** | O perfil do usuário não possui vínculo com o setor na tabela `user_sectors`. | Acesse **Configurações > Setores > Permissões** e marque o setor de Secretaria para o colaborador. |

---
*Fim do Manual Completo do Módulo de WhatsApp — Purple Edu ERP.*

