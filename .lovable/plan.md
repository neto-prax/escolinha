# Separar os dados de cada escola

## Objetivo
Garantir que alunos, mensalidades, financeiro, estoque, funcionários, configurações e permissões nunca reaproveitem dados de outra escola no mesmo navegador.

## Alterações
- Vincular o cache do navegador ao identificador da escola, em vez de usar uma chave global compartilhada.
- Carregar primeiro os dados da escola autenticada e nunca exibir dados antigos de outra conta durante a troca de login.
- Corrigir o cache que identifica a escola para acompanhar o usuário atual e ser invalidado em toda troca de sessão.
- Manter o banco como fonte principal; dados legados sem identificação de escola não serão copiados automaticamente para evitar contaminação.
- Revisar as regras de acesso do armazenamento compartilhado e reforçá-las se necessário.

## Validação
- Alternar entre duas escolas no mesmo navegador e confirmar conjuntos independentes de dados.
- Confirmar que criar ou alterar informação em uma escola não afeta a outra.
- Validar compilação e erros do aplicativo.

## Detalhes técnicos
A correção será centralizada no mecanismo de persistência usado pelas telas, cobrindo todas as chaves existentes sem alterar cada módulo individualmente.
