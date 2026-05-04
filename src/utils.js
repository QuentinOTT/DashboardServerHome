/**
 * Utility helpers for formatting bytes, uptime, percentages.
 */

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatUptime(seconds) {
  if (!seconds || seconds === 0) return 'Arrêtée';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatPercent(fraction) {
  return (fraction * 100).toFixed(1) + '%';
}

export function cpuColor(fraction) {
  const pct = fraction * 100;
  if (pct < 40) return '#10b981';
  if (pct < 75) return '#f59e0b';
  return '#ef4444';
}

export function ramColor(used, max) {
  if (!max) return '#10b981';
  const pct = (used / max) * 100;
  if (pct < 60) return '#06b6d4';
  if (pct < 85) return '#f59e0b';
  return '#ef4444';
}
