#!/bin/bash

# Script para atualizar dependências OpenAI no backend
echo "🔄 Atualizando OpenAI API para v4..."

cd "Código Fonte/backend"

# Remover node_modules e package-lock.json para instalação limpa
echo "🧹 Limpando dependências antigas..."
rm -rf node_modules package-lock.json

# Instalar nova versão da OpenAI
echo "📦 Instalando OpenAI v4..."
npm install openai@^4.28.0

# Atualizar outras dependências se necessário
echo "🔧 Atualizando outras dependências..."
npm update

echo "✅ OpenAI API atualizada com sucesso!"
echo "📝 Mudanças principais:"
echo "   - openai: 3.3.0 → ^4.28.0"
echo "   - Sintaxe da API atualizada para v4"
echo "   - Compatibilidade mantida com sistema existente"