#!/bin/bash

echo "🚀 Kotak Neo Trading Algorithm - Setup Script"
echo "=============================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v14+"
    exit 1
fi

echo "✓ Node.js $(node -v)"

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL not found. Please install MySQL 5.7+"
    exit 1
fi

echo "✓ MySQL installed"

# Backend setup
echo ""
echo "📦 Setting up Backend..."
cd backend
npm install

# Create .env if doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your Kotak Neo credentials"
fi

# Frontend setup
echo ""
echo "📦 Setting up Frontend..."
cd ../frontend
npm install

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your Kotak Neo API credentials"
echo "2. Run: cd backend && npm start"
echo "3. In another terminal: cd frontend && npm start"
echo ""
echo "Database migration will happen on first server start."
