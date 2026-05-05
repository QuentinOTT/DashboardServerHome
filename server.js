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
import { execSync, exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuration Proxmox API
const proxmoxApi = axios.create({
  baseURL: process.env.PROXMOX_HOST,
  headers: {
    'Authorization': `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}`
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
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
      timeout: 2000
    });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur Home Assistant:", err.message);
    return null;
  }
}

// --- TAPO CLOUD INTEGRATION ---
async function getTapoDevices(email, password) {
  try {
    const baseUrl = "https://eu-wap.tplinkcloud.com";
    
    const loginRes = await axios.post(baseUrl, {
      method: "login",
      params: { appType: "Tapo_Android", cloudUserName: email, cloudPassword: password, terminalUUID: "52386121-7566-47b2-a447-798138722026" }
    });

    const token = loginRes.data.result?.token;
    if (!token) return null;

    const devicesRes = await axios.post(`${baseUrl}?token=${token}`, { 
      method: "getDeviceList",
      params: { index: 0, count: 20 }
    });
    
    const list = devicesRes.data.result?.deviceList || [];
    
    // Enrichir chaque appareil
    const enrichedList = await Promise.all(list.map(async (d) => {
      try {
        if (d.alias && /^[A-Za-z0-9+/=]+$/.test(d.alias) && d.alias.length > 8) {
          d.alias = Buffer.from(d.alias, 'base64').toString('utf8');
        }

        const res = await axios.post(`${baseUrl}?token=${token}`, {
          method: "passthrough",
          params: { deviceId: d.deviceId, requestData: JSON.stringify({ method: "get_device_info", params: {} }) }
        }, { timeout: 2000 });

        const state = JSON.parse(res.data.result?.responseData || "{}");
        return { ...d, params: { ...d.params, ...state.result, ...state.params } };
      } catch (e) { return d; }
    }));

    return enrichedList;
  } catch (err) {
    console.error("❌ Erreur Tapo Cloud:", err.message);
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
  const path = join(__dirname, 'service-registry.json');
  res.json(JSON.parse(readFileSync(path, 'utf8')));
});

app.post('/api/registry', (req, res) => {
  const path = join(__dirname, 'service-registry.json');
  writeFile(path, JSON.stringify(req.body, null, 2), (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/health/:vmid', async (req, res) => {
  try {
    const { vmid } = req.params;
    let type = 'qemu';
    if (parseInt(vmid) >= 1000) type = 'lxc'; 
    
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

// --- DOMOTIQUE STATUS (REAL & PING) ---
app.get('/api/domotique/status', async (req, res) => {
  try {
    const registryPath = join(__dirname, 'service-registry.json');
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    const devices = registry.domotique || [];
    const tapoEmail = process.env.TAPO_EMAIL || registry.settings?.tapo?.email;
    const tapoPassword = process.env.TAPO_PASSWORD || registry.settings?.tapo?.password;
    
    // 1. Récupérer les données Home Assistant (Priorité)
    const haStates = await getHADevices() || [];
    
    // 2. Récupérer les données Tapo Cloud (Fallback)
    let realTapoDevices = [];
    if (tapoEmail && tapoPassword) {
      realTapoDevices = await getTapoDevices(tapoEmail, tapoPassword) || [];
    }

    const updatedDevices = await Promise.all(devices.map(async (device) => {
      // 1. Priorité Home Assistant
      const haEntity = haStates.find(e => 
        e.entity_id === device.ha_id || 
        (e.attributes?.friendly_name && e.attributes.friendly_name.toLowerCase() === device.name.toLowerCase())
      );

      if (haEntity) {
        return {
          ...device,
          status: haEntity.state === 'unavailable' || haEntity.state === 'off' ? 'offline' : 'online',
          battery: haEntity.attributes?.battery_level || haEntity.attributes?.battery || device.battery,
          rssi: haEntity.attributes?.rssi || device.rssi,
          lastEvent: `HA: ${haEntity.state}`
        };
      }

      // 2. Fallback Tapo Cloud
      const realData = realTapoDevices.find(d => {
        const aliasMatch = d.alias && d.alias.toLowerCase().trim() === device.name.toLowerCase().trim();
        const nameMatch = d.deviceName && d.deviceName.toLowerCase().trim() === device.name.toLowerCase().trim();
        return aliasMatch || nameMatch;
      });

      // 3. Fallback Scan Local
      const isLocalOnline = await new Promise((resolve) => {
        if (!device.ip) return resolve(false);
        const socket = net.connect(80, device.ip, () => { socket.destroy(); resolve(true); });
        socket.setTimeout(800);
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { resolve(false); });
      });
      
      if (realData || isLocalOnline) {
        return {
          ...device,
          status: 'online',
          battery: device.name.includes("D210") ? "100%" : (realData?.params?.battery_level || device.battery),
          rssi: realData?.params?.rssi || device.rssi,
          lastEvent: isLocalOnline ? "Connecté (Local)" : "En ligne"
        };
      }
      
      return { ...device, status: 'offline', lastEvent: "Hors ligne" };
    }));

    res.json({ success: true, devices: updatedDevices });
  } catch (err) {
    console.error("🔥 Erreur Domotique:", err.message);
    res.status(500).json({ success: false, error: "Erreur de scan" });
  }
});

app.get('/api/vms/:vmid', async (req, res) => {
  try {
    const { vmid } = req.params;
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
