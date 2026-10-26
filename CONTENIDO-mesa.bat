@echo off
cd /d "%~dp0"
start "" http://localhost:4747/mesa/contenido.html
node mesa\contenido-server.cjs
