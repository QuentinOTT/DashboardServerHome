/**
 * Proxmox Dashboard - Express Backend Server
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import net from 'net';
import { readFileSync, writeFile, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Logger de debug
// Logger de debug avec statut
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const PROXMOX_HOST = process.env.PROXMOX_HOST?.replace(/\/$/, '');
const PROXMOX_TOKEN_ID = process.env.PROXMOX_TOKEN_ID;
const PROXMOX_TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET;
const PROXMOX_NODE = process.env.PROXMOX_NODE || 'pve';
const PORT = 3001;

const proxmoxApi = axios.create({
  baseURL: `${PROXMOX_HOST}/api2/json`,
  headers: { Authorization: `PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}` },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 15000,
});

function loadServiceRegistry() {
  try {
    return JSON.parse(readFileSync(join(__dirname, 'service-registry.json'), 'utf-8'));
  } catch (err) {
    return { vms: {} };
  }
}

async function checkService(service, defaultIp) {
  let host = defaultIp;
  if (service.url) {
    try { host = new URL(service.url).hostname; } catch (e) {}
  }
  if (service.protocol === 'http' || service.protocol === 'https') {
    try {
      const res = await axios.get(service.url || `${service.protocol}://${host}:${service.port}`, {
        timeout: 3000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        validateStatus: () => true
      });
      return res.status < 500;
    } catch (err) {}
  }
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(service.port, host);
  });
}

// ============================================================
// ROUTES API (Ordre important : Spécifiques avant Génériques)
// ============================================================

app.get('/api/ping', (req, res) => res.json({ success: true, message: 'pong' }));

// --- REGISTRY ---
app.get('/api/registry', (req, res) => res.json({ success: true, data: loadServiceRegistry() }));

app.post('/api/registry', (req, res) => {
  try {
    const registry = req.body;
    writeFile(join(__dirname, 'service-registry.json'), JSON.stringify(registry, null, 2), (err) => {
      if (err) throw err;
      res.json({ success: true });
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- NODE STATUS ---
app.get('/api/node/status', async (req, res) => {
  try {
    const { data } = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/status`);
    
    // Tentative de récupération des températures via sensors
    let temps = null;
    try {
      let sensorsPath = 'sensors';
      if (existsSync('/usr/bin/sensors')) sensorsPath = '/usr/bin/sensors';
      else if (existsSync('/bin/sensors')) sensorsPath = '/bin/sensors';

      const sensorsOutput = execSync(`${sensorsPath} -j`, { encoding: 'utf8', timeout: 2000 });
      const sensorsData = JSON.parse(sensorsOutput);
      
      // Fonction récursive pour trouver n'importe quelle valeur "tempX_input"
      const findTemp = (obj) => {
        for (const key in obj) {
          if (key.endsWith('_input') && typeof obj[key] === 'number') return obj[key];
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const found = findTemp(obj[key]);
            if (found) return found;
          }
        }
        return null;
      };

      temps = findTemp(sensorsData);
      
      if (temps) {
        console.log(`✅ [OK] Température CPU trouvée : ${temps}°C`);
      } else {
        console.log(`⚠️ [WARN] Sensors a répondu mais aucune température n'a été trouvée dans le JSON.`);
      }
    } catch (e) {
      console.log(`❌ [ERROR] Échec de l'exécution de sensors : ${e.message}`);
    }

    res.json({ success: true, data: { ...data.data, cpuTemp: temps } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- VM DOCKER ---
app.get('/api/vms/:vmid/docker', async (req, res) => {
  try {
    const { vmid } = req.params;
    const dockerCmd = "docker ps --format '{{json .}}'";
    const execRes = await proxmoxApi.post(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/agent/exec`, { command: ['sh', '-c', dockerCmd] });
    const pid = execRes.data.data.pid;
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/agent/exec-status`, { params: { pid } });
    const output = statusRes.data.data['out-data'] || '';
    const containers = output.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    res.json({ success: true, data: containers });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- VM LOGS ---
app.get('/api/vms/:vmid/logs', async (req, res) => {
  try {
    const { vmid } = req.params;
    const logCmd = "journalctl -n 100 --no-hostname --no-pager";
    const execRes = await proxmoxApi.post(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/agent/exec`, { command: ['sh', '-c', logCmd] });
    const pid = execRes.data.data.pid;
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/agent/exec-status`, { params: { pid } });
    const output = statusRes.data.data['out-data'] || 'Aucun log trouvé.';
    res.json({ success: true, data: output });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- VM FILES ---
app.get('/api/vms/:vmid/files', async (req, res) => {
  try {
    const { vmid } = req.params;
    const path = req.query.path || '/';
    const lsCmd = `ls -F --group-directories-first "${path}"`;
    const execRes = await proxmoxApi.post(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/agent/exec`, { command: ['sh', '-c', lsCmd] });
    const pid = execRes.data.data.pid;
    await new Promise(r => setTimeout(r, 1500));
    const statusRes = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/agent/exec-status`, { params: { pid } });
    const output = statusRes.data.data['out-data'] || '';
    const files = output.split('\n').filter(l => l.trim()).map(l => ({
      name: l.replace(/[*|=>@/]$/, ''),
      isDir: l.endsWith('/'),
      path: `${path === '/' ? '' : path}/${l.replace(/[*|=>@/]$/, '')}`
    }));
    res.json({ success: true, data: files });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- VM POWER ---
app.post('/api/vms/:vmid/power', async (req, res) => {
  try {
    const { vmid } = req.params;
    const { command } = req.body;
    await proxmoxApi.post(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/status/${command}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- VM HEALTH ---
app.get('/api/health/:vmid', async (req, res) => {
  try {
    const { vmid } = req.params;
    const registry = loadServiceRegistry();
    const entry = registry.vms[String(vmid)];
    if (!entry) return res.json({ success: true, data: [] });
    const healthChecks = await Promise.all(entry.services.map(async (s) => ({
      ...s,
      status: (await checkService(s, entry.ip)) ? 'up' : 'down',
      url: s.url || (s.protocol !== 'tcp' ? `${s.protocol}://${entry.ip}:${s.port}` : null)
    })));
    res.json({ success: true, data: healthChecks });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- LIST ALL VMS & LXC ---
app.get('/api/vms', async (req, res) => {
  try {
    // Récupérer VMs et LXC en parallèle
    const [qemuRes, lxcRes] = await Promise.all([
      proxmoxApi.get(`/nodes/${PROXMOX_NODE}/qemu`),
      proxmoxApi.get(`/nodes/${PROXMOX_NODE}/lxc`).catch(() => ({ data: { data: [] } }))
    ]);

    const vms = qemuRes.data.data || [];
    const lxcs = lxcRes.data.data || [];

    console.log(`📊 Proxmox Data: ${vms.length} VMs trouvées, ${lxcs.length} LXCs trouvés sur le node ${PROXMOX_NODE}`);
    const allInstances = [
      ...vms.map(v => ({ ...v, type: 'qemu' })),
      ...lxcs.map(l => ({ ...l, type: 'lxc' }))
    ];

    const registry = loadServiceRegistry();
    const enriched = allInstances.map(instance => {
      const reg = registry.vms[String(instance.vmid)] || {};
      return { 
        ...instance, 
        name: instance.name || instance.vmid,
        label: reg.label || null, 
        ip: reg.ip || null, 
        services: reg.services || [] 
      };
    }).sort((a, b) => (a.status === 'running' ? -1 : 1));

    res.json({ success: true, data: enriched });
  } catch (err) { 
    console.error('❌ Erreur Fetch All:', err.message);
    res.status(500).json({ success: false, error: err.message }); 
  }
});

// --- GENERIC STATUS (Supports both QEMU & LXC) ---
// --- POWER PROFILE MANAGEMENT ---
app.get('/api/node/power-profile', (req, res) => {
  try {
    const governor = execSync('cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', { encoding: 'utf8' }).trim();
    const available = execSync('cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors', { encoding: 'utf8' }).trim().split(' ');
    res.json({ success: true, data: { current: governor, available } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Impossible de lire le profil d'énergie. Votre conteneur n'a peut-être pas les droits." });
  }
});

app.post('/api/node/power-profile', (req, res) => {
  try {
    const { profile } = req.body;
    // Commande pour appliquer le profil à TOUS les coeurs
    execSync(`echo "${profile}" | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor`);
    console.log(`⚡ Profil d'énergie mis à jour : ${profile}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Échec de la modification du profil. Droits insuffisants." });
  }
});

app.get('/api/vms/:vmid', async (req, res) => {
  try {
    const { vmid } = req.params;
    // On tente d'abord en QEMU, puis en LXC si échec
    let data;
    try {
      const res = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/qemu/${vmid}/status/current`);
      data = res.data.data;
    } catch (e) {
      const res = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/lxc/${vmid}/status/current`);
      data = res.data.data;
    }
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Backend QuentinOtt actif sur le port ${PORT}`);
});
