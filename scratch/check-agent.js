import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const agent = new https.Agent({ rejectUnauthorized: false });
const proxmoxApi = axios.create({
  baseURL: `${process.env.PROXMOX_HOST}/api2/json`,
  headers: { 'Authorization': `PVEAPIToken=${process.env.PROXMOX_TOKEN_ID}=${process.env.PROXMOX_TOKEN_SECRET}` },
  httpsAgent: agent
});

async function checkAgent() {
  try {
    const res = await proxmoxApi.get(`/nodes/${process.env.PROXMOX_NODE}/qemu/100/agent/info`);
    console.log('✅ Agent Info:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Agent Error:', err.response?.data || err.message);
  }
}

checkAgent();
