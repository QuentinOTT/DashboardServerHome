#!/bin/bash

# ==============================================================================
# Annexe 17 — Script de Configuration Automatique pour VM de Supervision
# Auteur : QuentinOtt
# Description : Automatisation de la configuration système, installation des
#               dépendances (Docker, Node.js, PM2) et démarrage du serveur Dashboard.
# OS Cible : Debian / Ubuntu
# ==============================================================================

# Arrêter immédiatement le script en cas d'erreur
set -e

# Couleurs pour le formatage des messages de logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO] \$(date '+%Y-%m-%d %H:%M:%S') - \$1${NC}"
}

log_success() {
    echo -e "${GREEN}[OK] \$1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[ATTENTION] \$1${NC}"
}

log_error() {
    echo -e "${RED}[ERREUR] \$1${NC}"
}

# --- 1. VERIFICATION DES PRIVILEGES ---
if [ "\$EUID" -ne 0 ]; then
    log_error "Ce script doit être exécuté en tant que superutilisateur (root) ou via sudo."
    exit 1
fi

log_info "Début de la configuration automatique du serveur..."

# --- 2. MISE A JOUR DU SYSTEME ---
log_info "Mise à jour des dépôts de paquets et du système..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential software-properties-common ca-certificates gnupg ufw
log_success "Système à jour et paquets de base installés."

# --- 3. CONFIGURATION DU PARE-FEU (UFW) ---
log_info "Configuration des règles de pare-feu de base..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 3001/tcp comment 'Dashboard Express Backend'
ufw --force enable
log_success "Pare-feu configuré et activé."

# --- 4. INSTALLATION DE NODE.JS ET PM2 ---
log_info "Installation de Node.js (LTS)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
log_success "Node.js \$(node -v) et NPM \$(npm -v) installés."

log_info "Installation globale du gestionnaire de processus PM2..."
npm install -g pm2
log_success "PM2 installé avec succès."

# --- 5. INSTALLATION DE DOCKER ---
log_info "Installation de Docker et Docker Compose..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
chmod a+r /etc/apt/keyrings/docker.gpg

# Ajout du dépôt Docker officiel
echo \
  "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
log_success "Docker Engine et Docker Compose installés et démarrés."

# --- 6. DEPLOIEMENT DU DASHBOARD SERVER ---
DEPLOY_DIR="/opt/dashboard-server"
log_info "Déploiement de l'application dans \$DEPLOY_DIR..."

if [ -d "\$DEPLOY_DIR" ]; then
    log_warn "Le répertoire de destination existe déjà. Mise à jour via git pull..."
    cd "\$DEPLOY_DIR"
    git pull || log_warn "Échec du git pull, le répertoire contient peut-être des modifications locales."
else
    # Remplacez l'URL ci-dessous par celle de votre dépôt Git
    git clone https://github.com/votre-compte/dashboard-server.git "\$DEPLOY_DIR"
    cd "\$DEPLOY_DIR"
fi

# Installation des dépendances NPM du projet
log_info "Installation des dépendances du projet..."
npm install --omit=dev

# Création du fichier .env si inexistant
if [ ! -f ".env" ]; then
    log_warn "Fichier .env manquant. Création d'un fichier de configuration exemple..."
    cat <<EOT > .env
PORT=3001
PROXMOX_HOST=https://IP_PROXMOX:8006
PROXMOX_TOKEN_ID=votre_token_id
PROXMOX_TOKEN_SECRET=votre_secret_token
PROXMOX_NODE=vps
EOT
    log_warn "Configurez vos variables d'environnement dans \$DEPLOY_DIR/.env"
fi

# --- 7. CONFIGURATION DU SERVICE SYSTEMD VIA PM2 ---
log_info "Démarrage du serveur backend sous PM2..."
pm2 start server.js --name "dashboard-backend" --watch || pm2 restart "dashboard-backend"

log_info "Configuration de la persistance PM2..."
pm2 save
pm2 startup systemd -u root --hp /root

log_success "Configuration du serveur terminée avec succès !"
log_info "Le serveur tourne actuellement sur le port 3001."
log_info "Vérifiez les logs avec la commande : pm2 logs"
