#!/bin/bash

# 🚀 SANTÉ+ - SCRIPT COMPLET DE LANCEMENT EN UNE SEULE COMMANDE

clear

echo "================================================"
echo "   🏥 SANTÉ+ BÉNIN - STARTUP DÉMO PRÊTE"
echo "================================================"
echo ""
echo "📍 Workspace: /home/ahilihan/Téléchargements/santeplus1"
echo ""

# Fonction pour démarrer les services
start_services() {
  cd /home/ahilihan/Téléchargements/santeplus1
  
  # Tuer les anciens processus
  pkill -f "npm run dev" 2>/dev/null || true
  pkill -f "python3.*main.py" 2>/dev/null || true
  sleep 2
  
  echo "🧹 Services précédents nettoyés"
  echo ""
  echo "🚀 Démarrage des services..."
  echo ""
  
  # Terminal 1: Backend
  (cd /home/ahilihan/Téléchargements/santeplus1/backend && python3 main.py) &
  BACKEND_PID=$!
  
  sleep 2
  
  # Terminal 2: Frontend
  (cd /home/ahilihan/Téléchargements/santeplus1 && npm run dev) &
  FRONTEND_PID=$!
  
  sleep 5
  
  # Vérifier les services
  echo ""
  echo "🔍 Vérification des services..."
  
  if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "✅ Backend FastAPI: http://localhost:8000/docs"
  else
    echo "❌ Backend non accessible"
    exit 1
  fi
  
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend React+Vite: http://localhost:3000"
  else
    echo "❌ Frontend non accessible"
    exit 1
  fi
  
  echo ""
}

# Menu principal
show_menu() {
  echo "================================================"
  echo "   🎯 MENU DÉMO SANTÉ+"
  echo "================================================"
  echo ""
  echo "1️⃣  Démarrer l'APP (Front + Back)"
  echo "2️⃣  Voir les credentials démo"
  echo "3️⃣  Voir le script de présentation"
  echo "4️⃣  Accéder au code"
  echo "5️⃣  Voir les améliorations"
  echo "0️⃣  Quitter"
  echo ""
}

# Afficher les credentials
show_credentials() {
  echo ""
  echo "================================================"
  echo "   👤 CREDENTIALS DÉMO"
  echo "================================================"
  echo ""
  echo "🏥 PATIENT:"
  echo "   Email: bienvenuesegnon@gmail.com"
  echo "   Password: 123456"
  echo ""
  echo "🏗️  HÔPITAL:"
  echo "   Email: hopital_cotonou@hopital.bj"
  echo "   Password: pass123"
  echo ""
}

# Afficher les améliorations
show_improvements() {
  echo ""
  echo "================================================"
  echo "   ✨ AMÉLIORATIONS APPORTÉES"
  echo "================================================"
  echo ""
  echo "🔐 DOSSIER MÉDICAL SÉCURISÉ (Module 2):"
  echo "   ✅ Chiffrement AES-256"
  echo "   ✅ Immuable (Append-Only)"
  echo "   ✅ Persistant (localStorage)"
  echo "   ✅ Hash SHA-256 + Bitcoin OP_RETURN"
  echo "   ✅ Possible d'ajouter de nouvelles consultations"
  echo ""
  echo "💳 PAIEMENT BITCOIN/LIGHTNING (Module 3):"
  echo "   ✅ Explication importance Bitcoin + Breez"
  echo "   ✅ Comparaison: Pas d'intermédiaire vs cartes classiques"
  echo "   ✅ Avantages: Frais réduits, instantané, accès global"
  echo "   ✅ 3 options: Wallet, Lightning QR, Partage familial"
  echo ""
  echo "📱 INFRASTRUCTURE:"
  echo "   ✅ Backend: FastAPI (Python)"
  echo "   ✅ Frontend: React 19 + Vite + TypeScript"
  echo "   ✅ Data: Persistance localStorage"
  echo ""
}

# Script principal
while true; do
  show_menu
  read -p "Choisissez une option (0-5): " choice
  
  case $choice in
    1)
      start_services
      echo ""
      echo "================================================"
      echo "   ✅ APP LANCÉE AVEC SUCCÈS"
      echo "================================================"
      echo ""
      echo "🌐 Accédez à: http://localhost:3000"
      echo ""
      echo "📋 API Docs: http://localhost:8000/docs"
      echo ""
      show_credentials
      echo ""
      echo "🎯 FLUX DÉMO (90 min):"
      echo "   1. Landing page → Click 'Entrer'"
      echo "   2. Auth: Patient login avec credentials"
      echo "   3. Carte interactive: Voir hôpitaux + filtrer"
      echo "   4. Portefeuille: Montrer balance + access requests"
      echo "   5. 🆕 DOSSIER MÉDICAL: Click 'Dossier Médical' dans navbar"
      echo "      - Voir consultations persistantes"
      echo "      - Montrer chiffrement AES-256"
      echo "      - Montrer hash SHA-256 Bitcoin"
      echo "      - Ajouter une nouvelle consultation"
      echo "   6. Rendez-vous: Voir appointments"
      echo "   7. Hospital Dashboard: Login hôpital"
      echo "      - Créer facture"
      echo "      - 🆕 Voir explication Bitcoin/Lightning/Breez"
      echo "      - Choisir méthode paiement"
      echo "      - Montrer QR Code Lightning"
      echo "      - Simuler paiement"
      echo "      - Générer PDF facture"
      echo ""
      echo "Press CTRL+C pour arrêter"
      wait
      ;;
    2)
      show_credentials
      ;;
    3)
      echo ""
      echo "📖 Script de présentation disponible:"
      echo "   /home/ahilihan/Téléchargements/santeplus1/PRESENTATION_GUIDE.md"
      echo ""
      ;;
    4)
      echo ""
      echo "📂 Accédez au code:"
      echo "   code /home/ahilihan/Téléchargements/santeplus1"
      echo ""
      code /home/ahilihan/Téléchargements/santeplus1
      ;;
    5)
      show_improvements
      ;;
    0)
      echo ""
      echo "Au revoir! 👋"
      exit 0
      ;;
    *)
      echo "❌ Option invalide"
      sleep 1
      clear
      ;;
  esac
done
