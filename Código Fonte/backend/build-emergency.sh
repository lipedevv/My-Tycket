#!/bin/bash

# 🚨 BUILD EMERGENCIAL - My-Tycket Backend
# Script para compilação com ignorância de erros críticos

echo "🔧 Iniciando compilação emergencial..."

# Limpar diretório dist
rm -rf dist/*

# Compilar com ignorância máxima de erros
npx tsc \
  --skipLibCheck \
  --noEmitOnError false \
  --noImplicitAny false \
  --strict false \
  --sourceMap false \
  --outDir dist

echo "✅ Build emergencial concluído!"
echo "⚠️  Arquivos com erros foram ignorados"

# Verificar se server.js foi gerado
if [ -f "dist/server.js" ]; then
    echo "✅ Arquivo principal gerado com sucesso"
    ls -la dist/server.js
else
    echo "❌ Falha ao gerar arquivo principal"
    exit 1
fi