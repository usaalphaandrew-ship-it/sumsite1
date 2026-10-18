@echo off
title AI Codehelper Local Server
echo Starting AI Codehelper Local Verification Server on Port 3200...
cd /d "%~dp0"
node server.js
pause
