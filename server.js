/**
 * Proxmox Dashboard - Express Backend Server
 * Centralized Home Assistant + Tapo Cloud + Proxmox API
 */

import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import net from 'net';
import { readFileSync, writeFile } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Protection globale
process.on('uncaughtException', (err) => console.error('🔥 Erreur:', err.message));

// ==========================================
// 1. CONFIGURATION DU CLIENT API PROXMOX
// ==========================================
// Initialisation du client Axios configuré pour communiquer avec l'API Proxmox VE.
// On récupère les identifiants sécurisés depuis les variables d'environnement (.env).
const proxmoxApi = axios.create({
  // URL de base vers l'API2 de Proxmox au format JSON (ex: https://pve.example.com:8006/api2/json)
  baseURL: `${process.env.PROXMOX_HOST ? process.env.PROXMOX_HOST.replace(/\/$/, '') : ''}/api2/json`,
  
  // Utilisation d'un Token d'API Proxmox PVE (PVEAPIToken=USER@REALM!TOKENID=SECRET)
  // Cela évite de stocker ou d'envoyer le mot de passe utilisateur principal.
  headers: { 'Authorization': `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}` },
  
  // Désactivation de la validation stricte SSL si le certificat de Proxmox est auto-signé
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  
  // Timeout de sécurité pour éviter de bloquer l'application si l'API est injoignable
  timeout: 5000
});

// Nom du nœud Proxmox cible à superviser (défini par défaut à 'vps')
const PROXMOX_NODE = process.env.PROXMOX_NODE || 'vps';

// --- HOME ASSISTANT ---
async function getHADevices() {
  /*
  const url = process.env.HA_URL;
  const token = process.env.HA_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await axios.get(`${url}/api/states`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 3000
    });
    return res.data;
  } catch (err) { return null; }
  */
  return null;
}

// ==========================================
// 2. POINTS D'ENTRÉE (ROUTES) DE L'API
// ==========================================

// Route : Récupérer le statut global du nœud (CPU, RAM, Uptime, Disque)
app.get('/api/node/status', async (req, res) => {
  try {
    // Requête HTTP GET vers le endpoint de statut Proxmox
    const response = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/status`);
    // Renvoi des données brutes de santé du serveur Proxmox
    res.json({ success: true, data: response.data.data });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message }); 
  }
});

// Route : Récupérer la liste des VM (Qemu) et Conteneurs (LXC)
app.get('/api/vms', async (req, res) => {
  try {
    // Exécution de requêtes parallèles pour optimiser le temps de réponse
    const [qemu, lxc] = await Promise.all([
      proxmoxApi.get(`/nodes/${PROXMOX_NODE}/qemu`), // Liste des machines virtuelles
      proxmoxApi.get(`/nodes/${PROXMOX_NODE}/lxc`)   // Liste des conteneurs LXC
    ]);
    
    // Fusion et normalisation des VM et LXC pour le Dashboard React
    const vms = [...qemu.data.data, ...lxc.data.data].map(vm => ({
      vmid: vm.vmid,
      name: vm.name,
      status: vm.status, // running, stopped, etc.
      type: vm.type || (vm.vmid < 500 ? 'qemu' : 'lxc') // Déduction du type si absent
    }));
    
    res.json({ success: true, data: vms });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message }); 
  }
});

app.get('/api/domotique/status', async (req, res) => {
  try {
    /*
    const registry = JSON.parse(readFileSync(join(__dirname, 'service-registry.json'), 'utf8'));
    const devices = registry.domotique || [];
    const haStates = await getHADevices() || [];
    
    const updatedDevices = devices.map(device => {
      const ha = haStates.find(e => e.entity_id === device.ha_id || (e.attributes?.friendly_name && e.attributes.friendly_name.toLowerCase() === device.name.toLowerCase()));
      if (ha) {
        return { ...device, status: ha.state === 'off' || ha.state === 'unavailable' ? 'offline' : 'online', battery: ha.attributes?.battery_level || device.battery, lastEvent: `HA: ${ha.state}` };
      }
      return { ...device, status: 'offline', lastEvent: "Non lié" };
    });

    const allowedDomains = ['light', 'switch', 'sensor', 'binary_sensor', 'media_player', 'climate'];
    const auto = haStates
      .filter(e => {
        const domain = e.entity_id.split('.')[0];
        return allowedDomains.includes(domain) && !devices.some(d => d.ha_id === e.entity_id);
      })
      .slice(0, 15)
      .map(e => ({ 
        name: e.attributes?.friendly_name || e.entity_id, 
        status: e.state === 'off' || e.state === 'unavailable' ? 'offline' : 'online', 
        type: e.entity_id.split('.')[0] === 'light' ? 'light' : 'sensor', 
        battery: e.attributes?.battery_level || null,
        lastEvent: "Découvert (HA)" 
      }));

    res.json({ success: true, devices: [...updatedDevices, ...auto] });
    */
    res.json({ success: true, devices: [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/registry', (req, res) => res.json(JSON.parse(readFileSync(join(__dirname, 'service-registry.json'), 'utf8'))));

// Route pour exécuter le script de configuration système (Annexe 17)
app.post('/api/run-setup', (req, res) => {
  const scriptPath = join(__dirname, 'setup-server.sh');
  
  console.log(`[SETUP] Lancement du script de configuration : ${scriptPath}`);
  
  // Exécution du script shell
  exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[SETUP ERROR] ${error.message}`);
      return res.status(500).json({ 
        success: false, 
        error: error.message, 
        details: stderr 
      });
    }
    console.log(`[SETUP SUCCESS] Script exécuté avec succès.`);
    res.json({ success: true, output: stdout });
  });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 QuentinOtt Backend OK sur port ${PORT}`));
