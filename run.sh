#!/bin/bash

# Muda o diretório atual para a exata pasta do plugin
cd "$(dirname "$0")"

# Executa o script Python repassando o arquivo temporário do OpenUtau
python main.py "$@"

# Se o Python der erro ou não for encontrado, pausa a tela para você conseguir ler
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERRO CRITICO] O Python falhou, não está instalado no PATH, ou houve um erro grave."
    read -p "Pressione [Enter] para continuar..."
fi
