/**
 * Proxmox Dashboard - Express Backend Server
 * Centralized Home Assistant + Tapo Cloud + Proxmox API
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import net from 'net';
import { readFileSync, writeFile } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Protection globale
process.on('uncaughtException', (err) => console.error('🔥 Erreur:', err.message));

const proxmoxApi = axios.create({
  baseURL: `${process.env.PROXMOX_HOST}/api2/json`,
  headers: { 'Authorization': `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}` },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 5000
});

const PROXMOX_NODE = process.env.PROXMOX_NODE || 'vps';

// --- HOME ASSISTANT ---
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
  } catch (err) { return null; }
}

// --- ROUTES ---
app.get('/api/node/status', async (req, res) => {
  try {
    const response = await proxmoxApi.get(`/nodes/${PROXMOX_NODE}/status`);
    res.json({ success: true, data: response.data.data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
      type: vm.type || (vm.vmid < 500 ? 'qemu' : 'lxc')
    }));
    res.json({ success: true, data: vms });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/domotique/status', async (req, res) => {
  try {
    const registry = JSON.parse(readFileSync(join(__dirname, 'service-registry.json'), 'utf8'));
    const devices = registry.domotique || [];
    const haStates = await getHADevices() || [];
    
    const updatedDevices = devices.map(device => {
      const ha = haStates.find(e => e.entity_id === device.ha_id || (e.attributes?.friendly_name && e.attributes.friendly_name.toLowerCase() === device.name.toLowerCase()));
      if (ha) {
        return { ...device, status: ha.state === 'off' ? 'offline' : 'online', battery: ha.attributes?.battery_level || device.battery, lastEvent: `HA: ${ha.state}` };
      }
      return { ...device, status: 'offline', lastEvent: "Non lié" };
    });

    const auto = haStates
      .filter(e => ['light', 'switch'].includes(e.entity_id.split('.')[0]) && !devices.some(d => d.ha_id === e.entity_id))
      .slice(0, 8)
      .map(e => ({ name: e.attributes?.friendly_name || e.entity_id, status: e.state === 'off' ? 'offline' : 'online', type: 'light', lastEvent: "Découvert" }));

    res.json({ success: true, devices: [...updatedDevices, ...auto] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/registry', (req, res) => res.json(JSON.parse(readFileSync(join(__dirname, 'service-registry.json'), 'utf8'))));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 QuentinOtt Backend OK sur port ${PORT}`));
