@echo off
:: Muda o diretório atual para a exata pasta do plugin
cd /d "%~dp0"

:: Executa o script Python repassando o arquivo temporário do OpenUtau
python main.py %*

:: Se o Python der erro ou não for encontrado, pausa a tela para você conseguir ler
if %errorlevel% neq 0 (
echo.
echo [ERRO CRITICO] O Python falhou, não esta instalado no PATH do Windows, ou houve um erro grave.
pause
)
