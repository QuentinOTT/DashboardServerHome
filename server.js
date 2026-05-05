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

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Protection contre les crashs
process.on('uncaughtException', (err) => {
  console.error('🔥 CRASH ÉVITÉ (Uncaught Exception):', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 CRASH ÉVITÉ (Unhandled Rejection):', reason);
});

// Configuration Proxmox API
const proxmoxApi = axios.create({
  baseURL: process.env.PROXMOX_HOST,
  headers: {
    'Authorization': `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}`
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 5000
});

const PROXMOX_NODE = process.env.PROXMOX_NODE || 'vps';

// --- HOME ASSISTANT INTEGRATION ---
async function getHADevices() {
  const url = process.env.HA_URL;
  const token = process.env.HA_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await axios.get(`${url}/api/states`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 3000
    });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur Home Assistant:", err.message);
    return null;
  }
}

// Routes API
app.get('/api/node/status', async (req, res) => {
  try {
    const response = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/status`);
    res.json({ success: true, data: response.data.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/vms', async (req, res) => {
  try {
    const [qemu, lxc] = await Promise.all([
      proxmoxApi.get(`/nodes/${PROXMOX_NODE}/qemu`),
      proxmoxApi.get(`/nodes/${PROXMOX_NODE}/lxc`)
    ]);
    
    const vms = [...qemu.data.data, ...lxc.data.data].map(vm => ({
      vmid: vm.vmid,
      name: vm.name,
      status: vm.status,
      type: vm.type || (vm.vmid < 500 ? 'qemu' : 'lxc'),
      cpu: vm.cpus,
      memory: vm.maxmem,
      uptime: vm.uptime
    }));

    res.json({ success: true, data: vms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/registry', (req, res) => {
  try {
    const path = join(__dirname, 'service-registry.json');
    res.json(JSON.parse(readFileSync(path, 'utf8')));
  } catch (err) {
    res.status(500).json({ error: "Erreur lecture registre" });
  }
});

app.get('/api/health/:vmid', async (req, res) => {
  try {
    const { vmid } = req.params;
    let type = parseInt(vmid) >= 500 ? 'lxc' : 'qemu';
    
    try {
      const status = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/${type}/${vmid}/status/current`);
      res.json({ success: true, data: status.data.data });
    } catch (e) {
      const altType = type === 'qemu' ? 'lxc' : 'qemu';
      const status = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/${altType}/${vmid}/status/current`);
      res.json({ success: true, data: status.data.data });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- DOMOTIQUE STATUS (SPEED OPTIMIZED) ---
app.get('/api/domotique/status', async (req, res) => {
  try {
    const registryPath = join(__dirname, 'service-registry.json');
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    const devices = registry.domotique || [];
    
    const haStates = await getHADevices() || [];
    
    const updatedDevices = devices.map(device => {
      const haEntity = haStates.find(e => 
        e.entity_id === device.ha_id || 
        (e.attributes?.friendly_name && e.attributes.friendly_name.toLowerCase() === device.name.toLowerCase())
      );

      if (haEntity) {
        return {
          ...device,
          status: (haEntity.state === 'unavailable' || haEntity.state === 'off') ? 'offline' : 'online',
          battery: haEntity.attributes?.battery_level || haEntity.attributes?.battery || device.battery,
          lastEvent: `HA: ${haEntity.state}`
        };
      }
      return { ...device, status: 'offline', lastEvent: "Non lié" };
    });

    const autoDevices = haStates
      .filter(e => {
        const domain = e.entity_id.split('.')[0];
        return (domain === 'light' || domain === 'switch' || domain === 'binary_sensor') && 
               !devices.some(d => d.ha_id === e.entity_id || d.name === e.attributes?.friendly_name);
      })
      .slice(0, 10)
      .map(e => ({
        name: e.attributes?.friendly_name || e.entity_id,
        status: (e.state === 'unavailable' || e.state === 'off') ? 'offline' : 'online',
        type: e.entity_id.startsWith('light') ? 'light' : 'sensor',
        lastEvent: "Découvert"
      }));

    res.json({ success: true, devices: [...updatedDevices, ...autoDevices] });
  } catch (err) {
    console.error("🔥 Erreur Domotique:", err.message);
    res.status(500).json({ success: false, error: "Erreur scan" });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'QuentinOtt Dashboard Backend Active' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Backend actif sur le port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Le port ${PORT} est déjà utilisé.`);
  } else {
    console.error('❌ Erreur Serveur:', err.message);
  }
});
