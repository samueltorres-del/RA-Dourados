@echo off
title RA Dourados - Sistema + Internet
color 0B

echo ==========================================================
echo         SISTEMA RA DOURADOS - INICIALIZADOR
echo ==========================================================
echo.
echo [1/2] Ligando o Servidor do Banco de Dados / Node.js...
:: Inicia o servidor Node na mesma janela (em plano de fundo)
start /B node server.js
echo Aguardando o servidor ligar...
timeout /t 3 >nul

echo.
echo [2/2] Estabelecendo o Tunel Privado para a Internet...
echo Mantenha esta janela PRETA aberta para o sistema funcionar!
echo.

:tuneloop
echo Conectando na web (o link final aparecera abaixo)...
:: O ServerAliveInterval envia "pulsos" para manter a conexao viva por muito tempo.
ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run

echo.
echo [AVISO] A conexao com a internet oscilou.
echo Reiniciando o sistema de forma automatica em 5 segundos...
echo.
timeout /t 5 >nul
goto tuneloop
