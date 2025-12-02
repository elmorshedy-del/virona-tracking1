const API_BASE = '/api';

export async function fetchDashboard(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/analytics/dashboard?${query}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchEfficiency(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/analytics/efficiency?${query}`);
  if (!res.ok) throw new Error('Failed to fetch efficiency');
  return res.json();
}

export async function fetchEfficiencyTrends(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/analytics/efficiency/trends?${query}`);
  if (!res.ok) throw new Error('Failed to fetch efficiency trends');
  return res.json();
}

export async function fetchRecommendations(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/analytics/recommendations?${query}`);
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

export async function fetchManualOrders(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/manual?${query}`);
  if (!res.ok) throw new Error('Failed to fetch manual orders');
  return res.json();
}

export async function addManualOrder(data) {
  const res = await fetch(`${API_BASE}/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add order');
  return res.json();
}

export async function deleteManualOrder(id) {
  const res = await fetch(`${API_BASE}/manual/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete order');
  return res.json();
}

export async function bulkDeleteManualOrders(data) {
  const res = await fetch(`${API_BASE}/manual/delete-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to delete orders');
  return res.json();
}

export async function syncData() {
  const res = await fetch(`${API_BASE}/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync');
  return res.json();
}

export function formatCurrency(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatNumber(value, decimals = 0) {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(decimals);
}

export function formatPercent(value, decimals = 2) {
  return value.toFixed(decimals) + '%';
}
