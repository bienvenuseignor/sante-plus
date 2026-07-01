#!/bin/bash

# Santé+ - Lancer l'application complète (Frontend + Backend Express intégré)
# Usage: bash LANCER_APP.sh

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

WORKSPACE="/home/ahilihan/Téléchargements/santeplus1"
cd "$WORKSPACE"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        🏥  SANTÉ+  — Démarrage         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# ─── Résolution de node ───────────────────────────────────────────────────────
NODE_BIN=$(which node 2>/dev/null || echo "")

if [ -z "$NODE_BIN" ]; then
  # Chercher dans les emplacements courants
  for candidate in \
      "/home/ahilihan/snap/antigravity/5/.cache/ms-playwright-go/1.57.0/node" \
      "/usr/bin/node" \
      "/usr/local/bin/node"; do
    if [ -x "$candidate" ]; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo -e "${RED}❌ node introuvable. Installez Node.js et relancez.${NC}"
  exit 1
fi

export PATH="$(dirname "$NODE_BIN"):$PATH"
echo -e "${BLUE}✅ Node.js trouvé : $NODE_BIN${NC}"
echo -e "${BLUE}   Version : $($NODE_BIN --version)${NC}"
echo ""

# ─── Nettoyage des anciens processus ─────────────────────────────────────────
echo -e "${YELLOW}🧹 Nettoyage des anciens processus sur le port 3000...${NC}"
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# ─── Vérifier node_modules ───────────────────────────────────────────────────
if [ ! -d "$WORKSPACE/node_modules" ]; then
  echo -e "${YELLOW}📦 Installation des dépendances (npm install)...${NC}"
  "$NODE_BIN" "$(dirname "$NODE_BIN")/npm" install
fi

# ─── Lancement ───────────────────────────────────────────────────────────────
echo -e "${BLUE}🚀 Démarrage du serveur Express + Vite (port 3000)...${NC}"
echo ""

# Utiliser tsx via node_modules
TSX="$WORKSPACE/node_modules/.bin/tsx"

if [ ! -f "$TSX" ]; then
  echo -e "${RED}❌ tsx introuvable dans node_modules. Vérifiez npm install.${NC}"
  exit 1
fi

"$NODE_BIN" "$TSX" "$WORKSPACE/server.ts" &
SERVER_PID=$!

echo -e "${GREEN}✅ Serveur lancé (PID: $SERVER_PID)${NC}"
echo ""

# Attendre que le serveur soit prêt
echo -e "${YELLOW}⏳ Attente du démarrage...${NC}"
MAX_WAIT=30
WAITED=0
while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
  sleep 1
  WAITED=$((WAITED+1))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}❌ Le serveur n'a pas démarré en ${MAX_WAIT}s. Vérifiez les logs.${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         🎉 APP LANCÉE AVEC SUCCÈS!     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📍 Application :   ${BLUE}http://localhost:3000${NC}"
echo -e "  🔌 API REST    :   ${BLUE}http://localhost:3000/api/medical-records/{npi}${NC}"
echo ""
echo -e "  👤 ${YELLOW}Identifiants de démonstration :${NC}"
echo "     Patient  : bienvenuesegnon@gmail.com  /  123456"
echo "     Hôpital  : hopital_cotonou@hopital.bj /  pass123"
echo ""
echo -e "  🔍 NPI de test pour scanner QR : ${YELLOW}1097885544901${NC}"
echo ""
echo -e "  🛑 Pour arrêter : ${RED}Ctrl+C${NC}"
echo ""

# Garder le script actif, tuer le serveur à la sortie
trap "echo ''; echo -e '${YELLOW}🛑 Arrêt du serveur...${NC}'; kill $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $SERVER_PID
