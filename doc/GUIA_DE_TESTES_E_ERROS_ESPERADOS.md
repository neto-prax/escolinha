# 🧪 Guia de Testes Unitários & Erros Esperados — Escolinha / Purple Edu

Este documento descreve detalhadamente a arquitetura de testes automatizados do sistema **Purple Edu (Escolinha)**, a cobertura de cada suíte de testes unitários, a execução obrigatória pré-commit e o catálogo de **erros e falhas esperadas** que cada teste protege e previne.

---

## 📑 Sumário

1. [Arquitetura de Testes & Runner](#1-arquitetura-de-testes--runner)
2. [Fluxo Automatizado de Pre-Commit](#2-fluxo-automatizado-de-pre-commit)
3. [Como Executar os Testes](#3-como-executar-os-testes)
4. [Mapeamento das Suítes de Teste](#4-mapeamento-das-suítes-de-teste)
5. [Suíte 1: Isolamento Multi-Tenancy & Sedes](#5-suíte-1-isolamento-multi-tenancy--sedes)
6. [Suíte 2: Geradores de Pagamento & Pix EMV (BR Code)](#6-suíte-2-geradores-de-pagamento--pix-emv-br-code)
7. [Suíte 3: Motor de Gatilhos & Chatbot WhatsApp](#7-suíte-3-motor-de-gatilhos--chatbot-whatsapp)
8. [Suíte 4: Cálculos Acadêmicos & Critérios de Avaliação](#8-suíte-4-cálculos-acadêmicos--critérios-de-avaliação)
9. [Matriz Geral de Riscos & Erros Prevenidos](#9-matriz-geral-de-riscos--erros-prevenidos)

---

## 1. Arquitetura de Testes & Runner

A suíte de testes foi concebida para oferecer **altíssima velocidade de execução**, **independência de rede** e **zero dependências externas pesadas**:

- **Runner Oficial**: Node.js 22 Native Test Runner (`node:test`) integrado com o módulo de asserções estritas (`node:assert/strict`).
- **Loader de TypeScript**: `tsx` (`--import tsx`), permitindo execução direta e imediata de arquivos `.ts` sem necessidade de etapa prévia de build ou compilação intermediária.
- **Tempo de Execução**: Inferior a **2 segundos** para a suíte inteira com 47 testes.
- **Tipagem Estrita**: Verificação simultânea de tipos via `tsc --noEmit` para garantir conformidade estrita da base de código.

---

## 2. Fluxo Automatizado de Pre-Commit

Para garantir que **nenhum código quebrado, sem tipagem ou com regressão de regras de negócio seja versionado no Git**, foi configurado um interceptor nativo do Git em `.git/hooks/pre-commit` e mantido no repositório em `scripts/pre-commit.sh`.

```
                  ┌───────────────────────────────┐
                  │       git commit -m "..."     │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │     .git/hooks/pre-commit         │
                └─────────────────┬─────────────────┘
                                  │
                   Etapa 1: npm test (47 testes)
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
             [ Sucesso ]                     [ Falha ❌ ]
                  │                               │
                  │                               ▼
                  │                    Commit CANCELADO pelo Git
                  │                    Nenhuma alteração é salva
                  ▼
         Etapa 2: tsc --noEmit
                  │
          ┌───────┴───────┐
          ▼               ▼
     [ Sucesso ]     [ Falha ❌ ]
          │               │
          │               ▼
          │         Commit CANCELADO por erro de tipo
          ▼
   Commit Concluído! 🚀
```

### Instalação / Restauração do Hook em Novos Ambientes
Se clonar o repositório em outra máquina ou container, ative o hook com:
```bash
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## 3. Como Executar os Testes

| Ação | Comando | Descrição |
| :--- | :--- | :--- |
| **Executar Todos os Testes** | `npm test` | Roda os 47 testes unitários de todas as suítes |
| **Validação Pré-Commit Completa** | `npm run precommit` | Roda testes + checagem de tipos `tsc --noEmit` |
| **Suíte Específica: Multi-tenancy** | `node --import tsx --test src/tests/multiTenancyIsolation.test.ts` | Testa chaves e isolamento de sedes |
| **Suíte Específica: Pix / Financeiro** | `node --import tsx --test src/tests/paymentGenerators.test.ts` | Testa BR Code, CRC16 e chaves |
| **Suíte Específica: Chatbot WhatsApp** | `node --import tsx --test src/tests/whatsappTriggers.test.ts` | Testa gatilhos e templates |
| **Suíte Específica: Notas Pedagógicas** | `node --import tsx --test src/tests/academicCalculations.test.ts` | Testa médias e status |
| **Modo Contínuo / Watch** | `node --import tsx --test --watch 'src/tests/**/*.test.ts'` | Reexecuta testes ao salvar arquivos |

---

## 4. Mapeamento das Suítes de Teste

| Arquivo de Teste | Módulo Testado | Quantidade de Testes | Áreas Críticas |
| :--- | :--- | :---: | :--- |
| [`src/tests/multiTenancyIsolation.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/multiTenancyIsolation.test.ts) | `src/lib/cloudState.ts`<br>`src/hooks/useSedes.ts` | **9 testes** | Namespace por escola, chave isolada, blindagem de dados legados e novas sedes |
| [`src/tests/paymentGenerators.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/paymentGenerators.test.ts) | `src/utils/paymentGenerators.ts` | **15 testes** | Padrão EMV BACEN, CRC16 CCITT, normalização DICT, saneamento de TxID |
| [`src/tests/whatsappTriggers.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/whatsappTriggers.test.ts) | `src/hooks/useWhatsAppTriggers.ts` | **11 testes** | Correspondência (exata, contém, início), precedência de prioridade, templates dinâmicos |
| [`src/tests/academicCalculations.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/academicCalculations.test.ts) | `src/utils/academicCalculations.ts`<br>`src/components/pedagogico/NotasTab.tsx` | **12 testes** | Média aritmética, ponderada, somatória, arredondamento half-up, aprovação/exame |
| **TOTAL** | | **47 testes** | |

---

## 5. Suíte 1: Isolamento Multi-Tenancy & Sedes

**Arquivo**: [`src/tests/multiTenancyIsolation.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/multiTenancyIsolation.test.ts)  
**Objetivo**: Garantir isolamento criptográfico e lógico entre diferentes escolas (tenants) e entre unidades/sedes pertencentes à mesma escola.

### Cenários Testados
1. Geração de chave de persistência de nuvem com namespace por escola (`s_<schoolId>_<key>`).
2. Impossibilidade de colisão entre chaves de escolas diferentes com mesmo nome de recurso.
3. Visão consolidada global (`todas`): exibe registros de todas as sedes.
4. Vínculo explícito de sede (`itemSedeId`): garante acesso apenas ao proprietário legítimo.
5. Vínculo por nome de unidade escolar ou código de unidade (com normalização e insensibilidade a maiúsculas/espaços).
6. **Regra de Blindagem de Nova Sede**: Uma sede recém-criada deve iniciar com **0 registros herdados**, rejeitando dados legados da Matriz.

### ⚠️ Erros Esperados & Riscos Prevenidos

| Teste | Comportamento Esperado / Cenário de Falha | Erro Prevenido no Sistema |
| :--- | :--- | :--- |
| **Vazamento Cross-Tenant em Chaves** | `keySchoolA !== keySchoolB` | **Vazamento de dados entre escolas**: Impede que a Escola B leia dados em cache ou sobrescreva configurações da Escola A. |
| **Tentativa de Acesso a Registro de Outra Sede** | `checkItemInActiveSede({ itemSedeId: 'sul', activeSedeId: 'norte' }) === false` | **Contaminação de dados entre filiais**: Um operador logado na filial Zona Norte não pode ver alunos ou caixa da filial Zona Sul. |
| **Herança Indevida em Nova Sede** | `checkItemInActiveSede({ itemSedeId: undefined, activeSedeId: 'nova-sede' }) === false` | **Vazamento de dados legados**: Uma sede recém-criada antes de sua migração formal não pode exibir dados órfãos da Matriz original. |
| **Conflito de Unidade Incompatível** | `checkItemInActiveSede({ itemUnidadeNome: 'Zona Sul', activeSedeId: 'norte' }) === false` | **Falsa associação por rótulo textual**: Garante que erros de digitação não vinculem itens à sede errada. |

---

## 6. Suíte 2: Geradores de Pagamento & Pix EMV (BR Code)

**Arquivo**: [`src/tests/paymentGenerators.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/paymentGenerators.test.ts)  
**Objetivo**: Garantir conformidade estrita com o padrão internacional EMV e com as especificações do **Banco Central do Brasil (BACEN)** para o BR Code e DICT.

### Cenários Testados
1. Cálculo polinomial CRC16 CCITT (0xFFFF) retornando 4 caracteres hexadecimais em caixa alta.
2. Limpeza ASCII de acentos e caracteres não permitidos pelas câmaras bancárias (Febraban).
3. Normalização DICT: e-mails minúsculos, UUIDs em caixa baixa, CPFs numéricos (11 dígitos), CNPJs numéricos (14 dígitos), telefones em padrão internacional E.164 (`+55...`).
4. Geração de payload PIX Copia e Cola contendo tags mandatórias:
   - Tag 00 (`000201`), Tag 01 (`010211`), Tag 26 (`0014br.gov.bcb.pix`), Tag 52 (`0000`), Tag 53 (`986`), Tag 54 (valor com 2 decimais), Tag 58 (`BR`), Tag 59 (nome truncado em 25 chars), Tag 60 (cidade truncada em 15 chars), Tag 62 (TxID saneado), Tag 63 (cabeçalho 6304 + checksum).
5. Saneamento do identificador de transação (`txid`).

### ⚠️ Erros Esperados & Riscos Prevenidos

| Teste | Comportamento Esperado / Cenário de Falha | Erro Prevenido no Sistema |
| :--- | :--- | :--- |
| **Checksum CRC16 Inválido** | `pix` termina obrigatoriamente com `6304[0-9A-F]{4}` | **Rejeição em Bancos**: Se o CRC16 divergir em 1 bit, bancos como Nubank, Itaú e Banco do Brasil rejeitam o pagamento com erro "Código Pix Inválido". |
| **Confusão entre Telefone e CPF** | `(75) 99876-5432` deve virar `+5575998765432`, e não ser confundido com CPF por ter traço | **Transferência para Destinatário Errado**: Impede que um telefone seja enviado como CPF numérico no DICT. |
| **Overflow de Tamanho no Nome/Cidade** | Tag 59 limitada a 25 bytes; Tag 60 limitada a 15 bytes | **Quebra de Parsing TLV**: Nomes longos de razão social poderiam desalinhar os deslocamentos de bytes do payload EMV. |
| **Caracteres Especiais no TxID** | `FATURA #123-ABC@2026` é purificado para `FATURA123ABC2026` | **Falha de Conciliação Bancária**: Caracteres como `#`, `@`, `-` travam a conciliação automática via webhook do gateway. |
| **Pix sem Valor (Valor Aberto)** | Omite tag 54 quando valor for 0 | **Erro de Pagador no App**: Permite que doações ou mensalidades de valor editável não fiquem travadas em R$ 0,00. |

---

## 7. Suíte 3: Motor de Gatilhos & Chatbot WhatsApp

**Arquivo**: [`src/tests/whatsappTriggers.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/whatsappTriggers.test.ts)  
**Objetivo**: Garantir que o robô de atendimento automático processe mensagens recebidas com precisão, respeitando regras de prioridade e evitando falsos positivos.

### Cenários Testados
1. Sanitização fonética com conversão para minúsculas, remoção de acentos e diacríticos.
2. Modo de correspondência **Exata (`exata`)**: aceita apenas mensagem idêntica à palavra-chave.
3. Modo de correspondência **Contém (`contem`)**: aceita palavras-chave em qualquer posição da mensagem.
4. Modo de correspondência **Início (`inicio`)**: aceita somente se a mensagem começar com a palavra-chave.
5. **Precedência de Prioridade**: Gatilhos com prioridade numérica menor (1, 2) disparam antes dos de prioridade maior (10), mesmo que ambos correspondam.
6. **Bloqueio de Gatilhos Inativos**: Gatilhos marcados com `ativo: false` nunca são disparados.
7. Tratamento de mensagens vazias ou com espaços em branco.
8. Interpolação de variáveis dinâmicas: `{{nome}}`, `{{aluno}}`, `{{escola}}`, `{{setor}}`, com aplicação de fallbacks caso o contexto esteja incompleto.

### ⚠️ Erros Esperados & Riscos Prevenidos

| Teste | Comportamento Esperado / Cenário de Falha | Erro Prevenido no Sistema |
| :--- | :--- | :--- |
| **Falso Positivo em Gatilho Exato** | `"Gostaria de saber a matricula"` **NÃO** pode ativar gatilho exato de `"matricula"` | **Atendimento Robótico Inconveniente**: Impede que uma dúvida complexa seja respondida por uma resposta curta de menu pré-programada. |
| **Falso Disparo em Gatilho de Início** | `"Qual o horário?"` **NÃO** dispara gatilho de início configurado para `"horario"` | **Desvio de Fluxo Indesejado**: Garante que o robô só assuma mensagens que iniciam expressamente pelo comando. |
| **Conflito de Disparo Simultâneo** | Mensagem com 2 intenções dispara a de prioridade mais alta | **Comportamento Não-Determinístico**: Evita corrida ou oscilação entre respostas automáticas para o mesmo cliente. |
| **Disparo de Gatilho Desativado** | `ativo: false` retorna `{ matched: false }` | **Execução de Campanhas Expiradas**: Impede que mensagens promocionais antigas ou inativadas continuem sendo disparadas. |
| **Placeholders Vazios na Mensagem** | Substitui `{{aluno}}` por `"seu filho(a)"` caso contexto não informe o nome | **Mensagem Quebrada ao Pai**: Evita mensagens amadoras contendo tags literais `{{aluno}}` ou `undefined`. |

---

## 8. Suíte 4: Cálculos Acadêmicos & Critérios de Avaliação

**Arquivo**: [`src/tests/academicCalculations.test.ts`](file:///home/neto/Documents/dev/escolinha/src/tests/academicCalculations.test.ts)  
**Objetivo**: Garantir que as notas e médias escolares dos alunos sejam calculadas com precisão matemática estrita, sem distorções de ponto flutuante do JavaScript, e classificadas com exatidão segundo o regulamento pedagógico.

### Cenários Testados
1. Média aritmética simples padrão: `(n1 + n2) / 2`.
2. **Arredondamento Half-Up Preciso**: Garantia de que valores limítrofes (ex: `7.35`) sejam arredondados para cima (`7.4`) utilizando `Number.EPSILON`, impedindo que imprecisões binárias penalizem o aluno.
3. Média ponderada com pesos padrão (Prova: 6, Trabalho: 4): `(n1*6 + n2*4) / 10`.
4. Média ponderada com pesos customizados pela instituição (ex: Prova: 7, Trabalho: 3).
5. Modalidade somatória: soma direta de pontos.
6. Entradas inválidas, nulas, zeradas ou `NaN`: tratadas com segurança sem lançar exceção.
7. Proteção contra divisão por zero em casos de pesos configurados como 0.
8. Classificação de situação acadêmica do aluno:
   - `media >= 7.0`: **Aprovado Direto** (`aprovado`).
   - `4.0 <= media < 7.0`: **Recuperação / Exame** (`recuperacao`).
   - `media < 4.0`: **Reprovado** (`reprovado`).
9. Classificação com notas limiares exatas (ex: `6.9`, `7.0`, `3.9`, `4.0`, `0.0`, `10.0`).
10. Formatação textual de rótulos em português para a interface do usuário.

### ⚠️ Erros Esperados & Riscos Prevenidos

| Teste | Comportamento Esperado / Cenário de Falha | Erro Prevenido no Sistema |
| :--- | :--- | :--- |
| **Truncamento de Ponto Flutuante IEEE 754** | `(7.3 + 7.4) / 2 = 7.35` deve resultar em `7.4` e nunca em `7.3` | **Injustiça Pedagógica / Questionamento de Pais**: Impede que um aluno perda a média ou fique em recuperação por limitação técnica do JavaScript (`(7.35).toFixed(1)` resulta em `"7.3"` se não houver compensação epsilon). |
| **Divisão por Zero em Pesos Inválidos** | Pesos `{ prova: 0, trabalho: 0 }` retornam `0` e não `NaN` ou `Infinity` | **Travamento de Relatório de Boletim**: Impede que um erro de preenchimento na coordenação quebre a tela de boletins da turma. |
| **Classificação Incorreta nas Fronteiras** | Nota `6.9` resulta em `recuperacao`; Nota `7.0` resulta em `aprovado` | **Aprovação Indevida de Aluno Abaixo da Média**: Garante cumprimento estrito do regimento escolar. |
| **Nota 3.9 classificada como Reprovação** | `3.9` não pode ter acesso à recuperação se o corte mínimo de exame for `4.0` | **Quebra de Regra de Conselho de Classe**: Alunos com média crítica são devidamente direcionados para retenção. |
| **Entradas Nulas ou Indefinidas** | `calculateMedia(undefined, 8.0)` retorna `4.0` | **Erro de Runtime em Lote**: Permite processar cadernos de notas mesmo quando um aluno faltou a uma das provas. |

---

## 9. Matriz Geral de Riscos & Erros Prevenidos

A tabela a seguir resume o mapeamento entre os testes unitários e os riscos de negócio/técnicos neutralizados na aplicação:

```
┌─────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Módulo / Domínio                │ Risco Crítico Neutralizado pelo Teste                  │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Multi-Tenancy & Sedes           │ • Vazamento de dados confidenciais entre escolas       │
│                                 │ • Exibição de dados históricos em novas filiais        │
│                                 │ • Colisão de chaves de cache local                     │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Pagamentos & Pix EMV            │ • Rejeição de Pix por checksum CRC16 inválido          │
│                                 │ • Envio para chave errada por confusão telefone/CPF    │
│                                 │ • Payload corrompido por quebra de tamanho TLV         │
│                                 │ • Quebra de conciliação por caracteres especiais       │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ WhatsApp & Chatbot              │ • Respostas automáticas em contexto impróprio          │
│                                 │ • Falsos positivos em correspondências parciais        │
│                                 │ • Ativação de campanhas/gatilhos desativados           │
│                                 │ • Envio de mensagens com tags vazias {{...}}           │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Notas & Médias Acadêmicas       │ • Erros de arredondamento prejudicando alunos          │
│                                 │ • Falhas de boletim por divisão por zero / NaN         │
│                                 │ • Falhas de classificação em notas limiares de corte   │
└─────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

> **Desenvolvido para Purple Edu (Escolinha)**  
> *Qualidade de software, isolamento multi-tenant e segurança em primeiro lugar.*

