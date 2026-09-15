# Exclusão e planos de mensalidade

## Alterações
- Adicionar uma ação de excluir em cada mensalidade, com confirmação antes da remoção.
- Permitir excluir várias mensalidades selecionadas de uma vez.
- Ao excluir uma mensalidade paga, remover também o lançamento financeiro criado por essa baixa, evitando valores órfãos.
- Manter a configuração existente de planos dentro de **Configurações > Financeiro**, renomeando-a para **Planos de mensalidade** e deixando criação, edição, ativação e exclusão claras.
- Adicionar confirmação antes de excluir um plano.

## Validação
- Verificar exclusão individual e em lote, inclusive mensalidades pagas.
- Verificar criação, edição, ativação e exclusão dos planos.
- Confirmar que a aplicação continua sem erros de compilação.

## Detalhes técnicos
- As mensalidades continuarão usando a persistência por escola já existente.
- Os planos continuarão na tabela de planos por escola, respeitando as permissões atuais da área financeira.
