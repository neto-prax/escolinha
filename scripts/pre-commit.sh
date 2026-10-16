#!/usr/bin/env bash
# Git Pre-commit Hook - Escolinha / Purple Edu
# Executa a suite de testes unitarios e a verificacao de tipos TypeScript antes de permitir qualquer commit.

set -e

echo ""
echo "=========================================================="
echo "🛡️  GIT PRE-COMMIT HOOK: Validando qualidade e segurança..."
echo "=========================================================="

echo "🧪 1/2: Executando suite completa de testes unitários..."
node --import tsx --test 'src/tests/**/*.test.ts'
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ ERRO: Testes unitários falharam! Commit cancelado."
  echo "Por favor, corrija as falhas acima antes de commitar."
  exit 1
fi

echo ""
echo "🔍 2/2: Verificando integridade de tipos TypeScript..."
node ./node_modules/.bin/tsc --noEmit
TSC_EXIT_CODE=$?

if [ $TSC_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ ERRO: Verificação de tipos TypeScript falhou! Commit cancelado."
  exit 1
fi

echo ""
echo "✅ SUCESSO: Todos os testes passaram e nenhum erro de tipo foi detectado!"
echo "🚀 Prosseguindo com o git commit..."
echo "=========================================================="
echo ""

exit 0

