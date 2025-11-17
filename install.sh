#!/bin/bash

# WhatiTicket Plus - Script de Instalação Rápida
# Redireciona para o instalador unificado

echo "🚀 WhatiTicket Plus - Iniciando Instalação"
echo "=========================================="

# Verificar se o instalador unificado existe
INSTALLER_PATH="$(dirname "$0")/Instalador/install_unificado"

if [[ ! -f "$INSTALLER_PATH" ]]; then
    echo "❌ Instalador não encontrado em: $INSTALLER_PATH"
    echo "Por favor, verifique se o arquivo existe."
    exit 1
fi

# Dar permissão de execução se necessário
if [[ ! -x "$INSTALLER_PATH" ]]; then
    echo "🔧 Dando permissão de execução ao instalador..."
    chmod +x "$INSTALLER_PATH"
fi

# Executar o instalador unificado
echo "📋 Redirecionando para o instalador unificado..."
echo ""
exec "$INSTALLER_PATH" "$@"