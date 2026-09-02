# Corrigir tela branca no cadastro (site publicado)

## O que já foi verificado

No site publicado (`purpleedu.lovable.app`) a tela de login e **as duas etapas do formulário de cadastro** carregam normalmente: passo 1 (Dados da Escola) e passo 2 (Seus Dados) renderizam sem erro de JavaScript no console. O build atual também está OK.

Ou seja, a tela branca não está no formulário em si — ela aparece **depois de clicar em "Criar conta"**, quando o app faz login automático e navega para `/app/dashboard`. Isso ainda não foi reproduzido de ponta a ponta, então a causa exata está **não confirmada**.

## Passo 1 — Reproduzir e identificar a causa

Executar o cadastro real (com uma escola/usuário de teste descartável) num navegador controlado, capturando console e erros de tela, para ver exatamente em que ponto a tela fica branca:

- a função de cadastro retorna erro?
- o login automático ocorre?
- a página `/app/dashboard` (ou a barra lateral) quebra em tempo de execução para um usuário recém-criado?

Ao final, os dados de teste criados serão removidos.

## Passo 2 — Rede de segurança contra tela branca

Independente da causa raiz, hoje qualquer erro de renderização derruba o app inteiro e deixa a tela 100% branca, sem mensagem. Adicionar uma proteção global:

- um limite de erro (Error Boundary) em volta das rotas, mostrando uma mensagem amigável com botões "Tentar novamente" e "Voltar ao login" e registrando o erro no console;
- assim, mesmo que algo falhe no futuro, o usuário vê uma explicação em vez de tela branca.

## Passo 3 — Corrigir a causa raiz

Aplicar a correção pontual conforme o que o passo 1 mostrar. Os pontos mais prováveis a ajustar:

- limpar o cache de escola em memória logo após o cadastro/login, para o novo usuário carregar a escola correta;
- tornar o Dashboard tolerante a dados ainda vazios (usuário novo sem lançamentos, turmas, papéis ou escola carregada);
- garantir que o cadastro só navegue para o painel depois que a sessão estiver realmente ativa.

## Passo 4 — Validar

Repetir o cadastro de teste até chegar ao painel funcionando, conferir o console sem erros e depois publicar para o site ao vivo receber a correção.

## Detalhes técnicos

- Arquivos envolvidos: `src/pages/Login.tsx` (`handleSignup`), `src/pages/Dashboard.tsx`, `src/components/layout/AppLayout.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/cloudState.ts` (`resetSchoolIdCache`), novo `src/components/ErrorBoundary.tsx` montado em `src/App.tsx`.
- A função `signup-with-school` cria usuário (email já confirmado), escola, atualiza o perfil com `school_id` e insere o papel `director` — a lógica está coerente; a verificação de runtime dirá se algum desses passos falha em produção.
- Nenhuma mudança de schema é prevista.
