import { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Plus, Trash2, Calendar } from 'lucide-react';
import { 
  fetchDashboard, fetchEfficiency, fetchEfficiencyTrends, fetchRecommendations,
  fetchManualOrders, addManualOrder, deleteManualOrder, bulkDeleteManualOrders,
  syncData, formatCurrency, formatNumber, formatPercent 
} from './utils/api';

const TABS = ['Dashboard', 'Budget Efficiency', 'Manual Data'];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Date range state
  const [dateRange, setDateRange] = useState({ type: 'days', value: 7 });
  
  // Dashboard data
  const [dashboard, setDashboard] = useState(null);
  const [efficiency, setEfficiency] = useState(null);
  const [efficiencyTrends, setEfficiencyTrends] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [manualOrders, setManualOrders] = useState([]);
  
  // Expanded KPI state
  const [expandedKpi, setExpandedKpi] = useState(null);
  
  // Manual order form
  const [orderForm, setOrderForm] = useState({
    date: new Date().toISOString().split('T')[0],
    country: 'SA',
    campaign: '',
    orders_count: 1,
    revenue: 280,
    source: 'whatsapp',
    notes: ''
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    setLoading(true);
    try {
      const params = { [dateRange.type]: dateRange.value };
      
      const [dashData, effData, effTrends, recs, orders] = await Promise.all([
        fetchDashboard(params),
        fetchEfficiency(params),
        fetchEfficiencyTrends(params),
        fetchRecommendations(params),
        fetchManualOrders(params)
      ]);
      
      setDashboard(dashData);
      setEfficiency(effData);
      setEfficiencyTrends(effTrends);
      setRecommendations(recs);
      setManualOrders(orders);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await syncData();
      await loadData();
    } catch (error) {
      console.error('Sync error:', error);
    }
    setSyncing(false);
  }

  async function handleAddOrder(e) {
    e.preventDefault();
    try {
      await addManualOrder(orderForm);
      setOrderForm(prev => ({ ...prev, orders_count: 1, revenue: 280, notes: '' }));
      loadData();
    } catch (error) {
      console.error('Error adding order:', error);
    }
  }

  async function handleDeleteOrder(id) {
    if (!confirm('Delete this order?')) return;
    try {
      await deleteManualOrder(id);
      loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  }

  const getDateRangeLabel = () => {
    if (dateRange.type === 'days') return `Last ${dateRange.value} days`;
    if (dateRange.type === 'weeks') return `Last ${dateRange.value} weeks`;
    if (dateRange.type === 'months') return `Last ${dateRange.value} months`;
    return 'Custom';
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">VironaX</h1>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {dashboard?.dateRange && `${dashboard.dateRange.startDate} to ${dashboard.dateRange.endDate}`}
              </span>
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1.5 rounded-xl shadow-sm mb-6 w-fit">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === i 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
              {tab === 'Budget Efficiency' && efficiency?.status !== 'green' && (
                <span className="ml-2 w-2 h-2 bg-amber-400 rounded-full inline-block"></span>
              )}
            </button>
          ))}
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm mb-6">
          <span className="text-sm font-medium text-gray-700">Period:</span>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-600">Last</span>
            <input
              type="number"
              min="1"
              max="90"
              value={dateRange.type === 'days' ? dateRange.value : ''}
              onChange={(e) => setDateRange({ type: 'days', value: parseInt(e.target.value) || 7 })}
              placeholder="-"
              className="w-12 px-2 py-1 text-center border border-gray-200 rounded text-sm"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-600">Last</span>
            <input
              type="number"
              min="1"
              max="12"
              value={dateRange.type === 'weeks' ? dateRange.value : ''}
              onChange={(e) => setDateRange({ type: 'weeks', value: parseInt(e.target.value) || 1 })}
              placeholder="-"
              className="w-12 px-2 py-1 text-center border border-gray-200 rounded text-sm"
            />
            <span className="text-sm text-gray-600">weeks</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm text-gray-600">Last</span>
            <input
              type="number"
              min="1"
              max="12"
              value={dateRange.type === 'months' ? dateRange.value : ''}
              onChange={(e) => setDateRange({ type: 'months', value: parseInt(e.target.value) || 1 })}
              placeholder="-"
              className="w-12 px-2 py-1 text-center border border-gray-200 rounded text-sm"
            />
            <span className="text-sm text-gray-600">months</span>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
            <Calendar className="w-4 h-4" />
            Custom
          </button>

          <div className="ml-auto text-sm text-gray-500">
            Showing: <strong>{getDateRangeLabel()}</strong>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 0 && dashboard && (
          <DashboardTab 
            dashboard={dashboard} 
            expandedKpi={expandedKpi}
            setExpandedKpi={setExpandedKpi}
          />
        )}
        
        {activeTab === 1 && efficiency && (
          <EfficiencyTab 
            efficiency={efficiency}
            trends={efficiencyTrends}
            recommendations={recommendations}
          />
        )}
        
        {activeTab === 2 && (
          <ManualDataTab
            orders={manualOrders}
            form={orderForm}
            setForm={setOrderForm}
            onSubmit={handleAddOrder}
            onDelete={handleDeleteOrder}
            onBulkDelete={bulkDeleteManualOrders}
            loadData={loadData}
          />
        )}
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ dashboard, expandedKpi, setExpandedKpi }) {
  const { overview, trends, campaigns, countries, diagnostics } = dashboard;
  
  const kpis = [
    { key: 'revenue', label: 'Revenue', value: overview.revenue, format: 'currency', color: '#8b5cf6' },
    { key: 'spend', label: 'Ad Spend', value: overview.spend, format: 'currency', color: '#6366f1' },
    { key: 'orders', label: 'Orders', value: overview.orders, format: 'number', subtitle: `${overview.sallaOrders} Salla + ${overview.manualOrders} Manual`, color: '#22c55e' },
    { key: 'aov', label: 'AOV', value: overview.aov, format: 'currency', color: '#f59e0b' },
    { key: 'cac', label: 'CAC', value: overview.cac, format: 'currency', color: '#ef4444' },
    { key: 'roas', label: 'ROAS', value: overview.roas, format: 'roas', color: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <KPICard 
            key={kpi.key}
            kpi={kpi}
            trends={trends}
            expanded={expandedKpi === kpi.key}
            onClick={() => setExpandedKpi(expandedKpi === kpi.key ? null : kpi.key)}
          />
        ))}
      </div>

      {/* Expanded Chart */}
      {expandedKpi && (
        <div className="bg-white rounded-xl p-6 shadow-sm animate-fade-in">
          <h3 className="text-lg font-semibold mb-4 capitalize">{expandedKpi} Trend</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey={expandedKpi} 
                  stroke={kpis.find(k => k.key === expandedKpi)?.color}
                  fill={kpis.find(k => k.key === expandedKpi)?.color}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Campaign Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Meta Campaign Performance</h2>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option>No Breakdown</option>
              <option>By Country</option>
              <option>By Age</option>
              <option>By Gender</option>
              <option>By Placement</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr className="bg-gray-50">
                <th>Campaign</th>
                <th>Spend</th>
                <th className="bg-indigo-50 text-indigo-700">ROAS</th>
                <th className="bg-indigo-50 text-indigo-700">AOV</th>
                <th className="bg-indigo-50 text-indigo-700">CAC</th>
                <th>Impr</th>
                <th>Reach</th>
                <th>CPM</th>
                <th>Freq</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>CPC</th>
                <th>LPV</th>
                <th>ATC</th>
                <th>Checkout</th>
                <th>Conv</th>
                <th>CR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaignId}>
                  <td className="font-medium">{c.campaignName}</td>
                  <td className="text-indigo-600 font-semibold">{formatCurrency(c.spend)}</td>
                  <td className="text-green-600 font-semibold">{c.metaRoas.toFixed(2)}×</td>
                  <td>{formatCurrency(c.metaAov)}</td>
                  <td className={c.metaCac > 100 ? 'text-amber-600' : ''}>{formatCurrency(c.metaCac)}</td>
                  <td>{formatNumber(c.impressions)}</td>
                  <td>{formatNumber(c.reach)}</td>
                  <td>${c.cpm.toFixed(2)}</td>
                  <td>{c.frequency.toFixed(2)}</td>
                  <td>{formatNumber(c.clicks)}</td>
                  <td>{c.ctr.toFixed(2)}%</td>
                  <td>${c.cpc.toFixed(2)}</td>
                  <td>{formatNumber(c.lpv)}</td>
                  <td>{c.atc}</td>
                  <td>{c.checkout}</td>
                  <td>{c.conversions}</td>
                  <td>{c.cr.toFixed(2)}%</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td>TOTAL</td>
                <td className="text-indigo-600">{formatCurrency(campaigns.reduce((s, c) => s + c.spend, 0))}</td>
                <td className="text-green-600">
                  {(campaigns.reduce((s, c) => s + c.conversionValue, 0) / campaigns.reduce((s, c) => s + c.spend, 0)).toFixed(2)}×
                </td>
                <td colSpan="14"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <div className={`rounded-xl p-6 ${
          diagnostics.some(d => d.type === 'warning') 
            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200'
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
        }`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🔍 Funnel Diagnostics
            <span className="text-sm font-normal text-gray-500">
              {diagnostics.filter(d => d.type === 'warning').length} issues • {diagnostics.filter(d => d.type === 'success').length} positive
            </span>
          </h3>
          <div className="space-y-3">
            {diagnostics.map((d, i) => (
              <div key={i} className="flex gap-3 p-4 bg-white/70 rounded-lg">
                <span className="text-xl">{d.icon}</span>
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-sm text-gray-600">{d.detail}</p>
                  <p className="text-sm text-indigo-600 mt-1">{d.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Countries Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Countries Performance</h2>
          <p className="text-sm text-gray-500">Combined: Meta Spend + Salla Orders + Manual Orders</p>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Spend</th>
                <th>Share</th>
                <th>Orders</th>
                <th>AOV</th>
                <th>CAC</th>
                <th>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.code}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.flag}</span>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-indigo-600 font-semibold">{formatCurrency(c.spend)}</td>
                  <td>{((c.spend / countries.reduce((s, x) => s + x.spend, 0)) * 100).toFixed(0)}%</td>
                  <td><span className="badge badge-green">{c.totalOrders}</span></td>
                  <td>{formatCurrency(c.aov)}</td>
                  <td className={c.cac > 80 ? 'text-amber-600 font-medium' : ''}>{formatCurrency(c.cac, 2)}</td>
                  <td className="text-green-600 font-semibold">{c.roas.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ kpi, trends, expanded, onClick }) {
  const trendData = trends.slice(-7).map(t => ({ value: t[kpi.key] }));
  
  // Calculate change vs previous period
  const current = trends[trends.length - 1]?.[kpi.key] || 0;
  const previous = trends[Math.max(0, trends.length - 8)]?.[kpi.key] || current;
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = kpi.key === 'cac' ? change < 0 : change > 0;

  const formatValue = () => {
    if (kpi.format === 'currency') return formatCurrency(kpi.value);
    if (kpi.format === 'roas') return kpi.value.toFixed(2) + '×';
    return Math.round(kpi.value);
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl p-5 shadow-sm cursor-pointer card-hover ${expanded ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</span>
        {change !== 0 && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{formatValue()}</div>
      {kpi.subtitle && <div className="text-xs text-gray-400">{kpi.subtitle}</div>}
      
      {/* Mini Sparkline */}
      <div className="h-10 mt-3">
        <ResponsiveContainer>
          <LineChart data={trendData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={kpi.color} 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-400 mt-1 text-center">Click to expand</div>
    </div>
  );
}

// Efficiency Tab Component
function EfficiencyTab({ efficiency, trends, recommendations }) {
  const statusColors = {
    green: { bg: 'bg-green-100', text: 'text-green-700', label: 'Healthy' },
    yellow: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moderate Pressure' },
    red: { bg: 'bg-red-100', text: 'text-red-700', label: 'High Pressure' }
  };
  
  const status = statusColors[efficiency.status] || statusColors.yellow;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${status.bg}`}>
              {efficiency.status === 'green' ? '✅' : efficiency.status === 'red' ? '🔴' : '⚠️'}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{status.label}</h3>
              <p className="text-sm text-gray-500">Overall efficiency status</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Spend vs Last Period</span>
              <span className={`font-semibold ${efficiency.spendChange > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                {efficiency.spendChange > 0 ? '↑' : '↓'} {Math.abs(efficiency.spendChange).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">ROAS vs Last Period</span>
              <span className={`font-semibold ${efficiency.roasChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {efficiency.roasChange > 0 ? '↑' : '↓'} {Math.abs(efficiency.roasChange).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Efficiency Ratio</span>
              <span className={`font-semibold ${efficiency.efficiencyRatio >= 0.85 ? 'text-green-600' : efficiency.efficiencyRatio >= 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                {efficiency.efficiencyRatio.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Average vs Marginal CAC</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Average CAC</span>
              <span className="font-semibold text-green-600">{formatCurrency(efficiency.averageCac, 2)}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Marginal CAC</span>
              <span className={`font-semibold ${efficiency.marginalPremium > 30 ? 'text-red-600' : efficiency.marginalPremium > 15 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatCurrency(efficiency.marginalCac, 2)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Marginal Premium</span>
              <span className={`font-semibold ${efficiency.marginalPremium > 30 ? 'text-red-600' : efficiency.marginalPremium > 15 ? 'text-amber-600' : 'text-green-600'}`}>
                +{efficiency.marginalPremium.toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Each new dollar is working {efficiency.marginalPremium.toFixed(0)}% harder than baseline
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Scaling Headroom</h3>
          <div className="space-y-2">
            {efficiency.countries.map(c => (
              <div key={c.code} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">
                  {c.scaling === 'green' ? '🟢' : c.scaling === 'yellow' ? '🟡' : '🔴'} {c.name}
                </span>
                <span className={`text-sm font-medium ${
                  c.scaling === 'green' ? 'text-green-600' : c.scaling === 'yellow' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {c.headroom}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Efficiency Trend Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">CAC Trend (Average vs Marginal)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v, 2)} />
                <Legend />
                <Line type="monotone" dataKey="cac" name="Daily CAC" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rollingCac" name="Rolling CAC (3d)" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="marginalCac" name="Marginal CAC" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">ROAS Trend</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v.toFixed(2) + '×'} />
                <Legend />
                <Area type="monotone" dataKey="roas" name="Daily ROAS" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Line type="monotone" dataKey="rollingRoas" name="Rolling ROAS (3d)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaign Efficiency Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Efficiency by Campaign</h2>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Frequency</th>
                <th>CPM Change</th>
                <th>CTR Change</th>
                <th>Marginal CAC</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {efficiency.campaigns.map(c => (
                <tr key={c.campaignId}>
                  <td className="font-medium">{c.campaignName}</td>
                  <td>
                    <span className={`badge ${c.status === 'green' ? 'badge-green' : c.status === 'yellow' ? 'badge-yellow' : 'badge-red'}`}>
                      {c.status === 'green' ? '🟢 Efficient' : c.status === 'yellow' ? '🟡 Pressure' : '🔴 Fatigued'}
                    </span>
                  </td>
                  <td className={c.frequency > 3 ? 'text-red-600 font-medium' : c.frequency > 2.5 ? 'text-amber-600' : ''}>
                    {c.frequency.toFixed(1)}
                  </td>
                  <td className={c.cpmChange > 15 ? 'text-red-600' : c.cpmChange > 5 ? 'text-amber-600' : 'text-green-600'}>
                    {c.cpmChange > 0 ? '↑' : '↓'} {Math.abs(c.cpmChange).toFixed(0)}%
                  </td>
                  <td className={c.ctrChange < -15 ? 'text-red-600' : c.ctrChange < -5 ? 'text-amber-600' : 'text-green-600'}>
                    {c.ctrChange > 0 ? '↑' : c.ctrChange < 0 ? '↓' : ''} {c.ctrChange === 0 ? 'Stable' : Math.abs(c.ctrChange).toFixed(0) + '%'}
                  </td>
                  <td className={c.marginalCac > c.metaCac * 1.3 ? 'text-red-600 font-medium' : ''}>
                    {formatCurrency(c.marginalCac, 2)}
                  </td>
                  <td className="text-sm text-gray-500">
                    {c.status === 'green' ? 'Room to scale' : c.status === 'yellow' ? 'Hold budget, refresh creatives' : 'Reduce 25%, new audiences'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          💡 Recommendations
        </h3>
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div 
              key={i}
              className={`flex gap-4 p-4 rounded-xl border-l-4 ${
                r.type === 'urgent' ? 'bg-red-50 border-red-500' :
                r.type === 'positive' ? 'bg-green-50 border-green-500' :
                'bg-gray-50 border-indigo-500'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                r.type === 'urgent' ? 'bg-red-500' : r.type === 'positive' ? 'bg-green-500' : 'bg-indigo-500'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{r.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{r.detail}</p>
                <p className="text-sm text-indigo-600 mt-2">{r.impact}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Manual Data Tab Component
function ManualDataTab({ orders, form, setForm, onSubmit, onDelete, onBulkDelete, loadData }) {
  const [deleteScope, setDeleteScope] = useState('day');
  const [deleteDate, setDeleteDate] = useState(new Date().toISOString().split('T')[0]);

  const handleBulkDelete = async () => {
    if (!confirm(`Delete all manual data for ${deleteScope}?`)) return;
    try {
      await onBulkDelete({ scope: deleteScope, date: deleteDate });
      loadData();
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add Order Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Manual Order
        </h3>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="SA">🇸🇦 Saudi Arabia</option>
                <option value="AE">🇦🇪 UAE</option>
                <option value="KW">🇰🇼 Kuwait</option>
                <option value="QA">🇶🇦 Qatar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
              <select
                value={form.campaign}
                onChange={(e) => setForm({ ...form, campaign: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="">General</option>
                <option value="Modern Gentleman">Modern Gentleman</option>
                <option value="Heritage Gentleman">Heritage Gentleman</option>
                <option value="Gift Giver">Gift Giver</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"># Orders</label>
              <input
                type="number"
                min="1"
                value={form.orders_count}
                onChange={(e) => setForm({ ...form, orders_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revenue ($)</label>
              <input
                type="number"
                min="0"
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="correction">Meta Correction</option>
                <option value="phone">Phone Call</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
            Add Order
          </button>
        </form>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Manual Orders History</h3>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p>No manual orders added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-indigo-500">
                <div className="flex items-center gap-6">
                  <span className="font-medium">{order.date}</span>
                  <span className="px-2 py-1 bg-gray-200 rounded text-sm">{order.country}</span>
                  <span className="px-2 py-1 bg-gray-200 rounded text-sm capitalize">{order.source}</span>
                  <span>
                    <strong>{order.orders_count}</strong> orders • <span className="text-green-600 font-medium">${order.revenue}</span>
                  </span>
                  {order.campaign && <span className="text-gray-500 text-sm">{order.campaign}</span>}
                </div>
                <button
                  onClick={() => onDelete(order.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Delete */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Delete Manual Data
        </h3>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delete data for</label>
            <select
              value={deleteScope}
              onChange={(e) => setDeleteScope(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="day">Specific Day</option>
              <option value="week">Specific Week</option>
              <option value="month">Specific Month</option>
              <option value="year">Specific Year</option>
              <option value="all">All Manual Data</option>
            </select>
          </div>
          {deleteScope !== 'all' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={deleteDate}
                onChange={(e) => setDeleteDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          )}
          <button
            onClick={handleBulkDelete}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
