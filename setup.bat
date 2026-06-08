#!/bin/bash

# Windows batch file for setup
@echo off
echo 🚀 Kotak Neo Trading Algorithm - Setup Script
echo ============================================

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js v14+
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION%

REM Backend setup
echo.
echo 📦 Setting up Backend...
cd backend
call npm install

REM Create .env if doesn't exist
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo ⚠️  Please edit backend\.env with your Kotak Neo credentials
)

REM Frontend setup
echo.
echo 📦 Setting up Frontend...
cd ..\frontend
call npm install

echo.
echo ✅ Setup Complete!
echo.
echo Next steps:
echo 1. Edit backend\.env with your Kotak Neo API credentials
echo 2. Run: cd backend ^&^& npm start
echo 3. In another terminal: cd frontend ^&^& npm start
echo.
echo Database migration will happen on first server start.
pause
