# ✅ CHECKLIST FINALE - PRÉSENTATION SANTÉ+ (90 MIN)

## 📋 PRÉ-PRÉSENTATION (5 MIN AVANT)

- [ ] Fermer tous les onglets/applications inutiles
- [ ] Vérifier la connexion Internet (stable)
- [ ] Vérifier le son du micro/système
- [ ] Ouvrir le terminal et lancer: `cd /home/ahilihan/Téléchargements/santeplus1 && bash LANCER_APP.sh`
- [ ] Attendre que les deux serveurs démarrent (environ 10 secondes)
- [ ] Vérifier: http://localhost:3000 accessible
- [ ] Vérifier: http://localhost:8000/docs accessible
- [ ] Préparer les credentials à côté (copier-coller)
- [ ] Avoir le PRESENTATION_GUIDE.md ouvert en référence

---

## 🎬 DÉROULEMENT PRÉSENTATION (90 MIN TOTAL)

### ⏱️ **INTRO (1-2 MIN)**
- [ ] Accueil / Présentation personnelle
- [ ] "Imaginez un patient au Bénin..." (contexte)
- [ ] Les 3 problèmes clés:
  1. Pas d'accès à ses données médicales
  2. Frais élevés de santé
  3. Frais de transaction bancaires

---

### 🗺️ **MODULE 1: LOCALISATION (2-3 MIN)**
- [ ] **Landing Page**: Click "Entrer dans l'app"
- [ ] **Authentification**: 
  - [ ] Montrer les deux tabs (Patient & Hôpital)
  - [ ] Login Patient: `bienvenuesegnon@gmail.com` / `123456`
- [ ] **Carte Interactive**:
  - [ ] "Vous voyez ici les hôpitaux du Bénin en temps réel"
  - [ ] Click sur un hôpital → voir détails
  - [ ] Montrer le filtre par région/services
  - [ ] Cliquer sur "Prendre rendez-vous"

---

### 🔐 **MODULE 2: DOSSIER MÉDICAL SÉCURISÉ (6-7 MIN)**
**⚠️ NOUVEAU COMPOSANT - MONTRER AVEC FIERTÉ!**

- [ ] **Click "Dossier Médical"** dans la navbar (bouton rouge avec lock)
- [ ] **Expliquer la sécurité**:
  - [ ] "Votre dossier est chiffré en AES-256"
  - [ ] "Chaque consultation est immuable (append-only)"
  - [ ] "Stocké localement, pas sur un serveur"
  - [ ] Montrer le hash SHA-256
  - [ ] "Ce hash est enregistré sur Bitcoin"

- [ ] **Montrer l'historique des consultations**:
  - [ ] 3 consultations existantes (pré-chargées)
  - [ ] Cliquer sur une pour voir les détails
  - [ ] Montrer: Diagnostic, Prescription, Notes du médecin

- [ ] **AJOUTER UNE NOUVELLE CONSULTATION** (TEST DE PERSISTANCE):
  - [ ] Click "Ajouter une Consultation"
  - [ ] Remplir le formulaire:
    - [ ] Médecin: "Dr Pierre Diallo"
    - [ ] Hôpital: "Hôpital Général"
    - [ ] Diagnostic: "Hypertension"
    - [ ] Prescription: "Losartan 50mg"
  - [ ] Click "Enregistrer"
  - [ ] **Montrer que le hash du dossier change** (proof d'immuabilité)

- [ ] **PERSISTANCE TEST**:
  - [ ] Click "Retour"
  - [ ] Click "Dossier Médical" à nouveau
  - [ ] **"Remarquez: votre nouvelle consultation est TOUJOURS LÀ"**
  - [ ] "Elle est persistante localement, même si vous fermez l'app"
  - [ ] "Et elle est IMMUABLE - impossible à modifier"

---

### 💳 **MODULE 3: PAIEMENT BITCOIN/LIGHTNING (5-6 MIN)**

- [ ] **Aller sur Portefeuille**:
  - [ ] Montrer le solde: "15000 XOF"
  - [ ] Cliquer sur un hôpital depuis Carte → "Consulter" ou "Prendre RDV"

- [ ] **Hôpital Dashboard** (Login hôpital):
  - [ ] Email: `hopital_cotonou@hopital.bj` / `pass123`
  - [ ] Montrer l'interface hôpital
  - [ ] "Créer une facture"
  - [ ] Créer un document médical à facturer

- [ ] **FLOW DE PAIEMENT - MONTRER L'IMPORTANCE BITCOIN**:
  - [ ] **Orange Box qui dit "Pourquoi Bitcoin?"**:
    - [ ] "Pas d'intermédiaire"
    - [ ] "Frais réduits: 0.5% vs 3-5%"
    - [ ] "Instantané via Lightning Network"
    - [ ] "Accès global sans compte bancaire"
    - [ ] "Sécurité maximale"
  - [ ] **Montrer les 3 options de paiement**:
    1. [ ] Wallet Santé+ (balance locale)
    2. [ ] Lightning Network (QR Code) ← **Montrer avec fierté**
    3. [ ] Partage WhatsApp (famille)

- [ ] **SÉLECTIONNER "Payer en Lightning"**:
  - [ ] Expliquer: "Je scanne ce QR Code avec Breez ou mon wallet Bitcoin"
  - [ ] Montrer le QR Code généré
  - [ ] "Transaction en < 1 seconde, frais minimaux"
  - [ ] Click pour simuler le paiement

- [ ] **Succès**:
  - [ ] Montrer le hash de transaction Bitcoin
  - [ ] "Votre paiement est MAINTENANT enregistré sur la blockchain"
  - [ ] Générer le PDF facture (click "Télécharger PDF")

---

### 🎯 **Q&A (10-15 MIN)**

**Préparer des réponses pour:**

1. **"Mais pourquoi Bitcoin et pas juste une app classique?"**
   - Réponse: Décentralisé, pas de censure, frais réduits, accessible sans compte bancaire

2. **"Comment Breez Lightning se connecte?"**
   - Réponse: API Breez SDK (mentionner qu'on a la clé API disponible)

3. **"Et si Internet coupe?"**
   - Réponse: Les données patient restent chiffrées localement. Les paiements se synchro quand Internet revient

4. **"Comment vous monétisez?"**
   - Réponse: Commission faible sur les paiements Lightning (0.1-0.25%)

5. **"C'est produit, c'est prêt pour le marché?"**
   - Réponse: MVP en démo. Besoin d'intégration réelle Breez SDK + tests bancaires + régulation

---

## ⚙️ **DÉMONSTRATION TECHNIQUE (5 MIN)**

- [ ] Montrer l'architecture:
  - [ ] Frontend: React 19 + Vite + TypeScript
  - [ ] Backend: FastAPI (Python)
  - [ ] Data: localStorage (persistant)
  - [ ] URL API: http://localhost:8000/docs

- [ ] Montrer rapidement le GitHub:
  - [ ] https://github.com/diogo242/sant-plus

---

## 🚨 **PROBLÈMES POSSIBLES & SOLUTIONS**

| Problème | Solution |
|----------|----------|
| Frontend ne démarre | `npm install` + `npm run dev` |
| Backend ne démarre | `pip install -r requirements.txt` puis `python3 backend/main.py` |
| Port 3000 déjà utilisé | `lsof -i :3000` + `kill -9 PID` |
| Port 8000 déjà utilisé | `lsof -i :8000` + `kill -9 PID` |
| localStorage vide | Rafraîchir la page (F5) |
| "Impossible de créer la facture" | Vérifier que l'hôpital est sélectionné |

---

## 📝 **NOTES D'AMÉLIORATION POST-PRÉSENTATION**

Pour la version produit:
- [ ] Intégrer réellement Breez SDK (API key)
- [ ] Intégrer avec une blockchain réelle (Bitcoin testnet)
- [ ] Chiffrement réel (libsodium ou crypto-js)
- [ ] Base de données (PostgreSQL instead of localStorage)
- [ ] Authentification 2FA
- [ ] Tests automatisés
- [ ] Déploiement cloud (AWS/GCP)

---

## ✨ **POINTS FORTS À SOULIGNER**

✅ **Dossier médical immuable** - Première fois qu'une app médicale Bénin le fait
✅ **Bitcoin + Lightning** - Paiements instantanés sans intermédiaire
✅ **Données persistantes** - Offline-first, works sans serveur constant
✅ **Accessibilité** - Pas besoin de compte bancaire, juste Internet
✅ **Design moderne** - Interface intuitive pour patients Bénin

---

**BONNE CHANCE! 🚀 Vous avez ceci! 💪**
