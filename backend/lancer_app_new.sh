#!/bin/bash
set -e

ROOT="/home/ahilihan/Téléchargements/santeplus1/backend"
APP="$ROOT/app_new/main.py"

echo ""
echo "🚀 Lancement du backend sécurisé Santé+ (app_new)"
echo "📂 Module: $APP"
echo "🔗 Swagger: http://localhost:8010/docs"
echo ""

if [ ! -f "$APP" ]; then
  echo "❌ Fichier introuvable: $APP"
  exit 1
fi

python3 -m uvicorn "app_new.main:app" --host 0.0.0.0 --port 8010 --reload
