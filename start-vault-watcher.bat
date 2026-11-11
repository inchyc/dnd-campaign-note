@echo off
title D&D Obsidian Live Vault Watcher
color 0E
echo =======================================================
echo   D^&D Campaign Notes - Obsidian Live Sync Watcher
echo =======================================================
echo.
echo Starting live 2-way sync daemon with Supabase...
echo Edits made in Obsidian will automatically push to the cloud.
echo Edits made in the Web App will automatically pull to your PC.
echo.
echo Press Ctrl+C at any time to stop.
echo.
npm run vault:watch
pause
