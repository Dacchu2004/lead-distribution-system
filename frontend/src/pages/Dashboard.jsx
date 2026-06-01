import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Upload, UserPlus, Loader2 } from 'lucide-react';
import axiosInstance from '../api/axios';

/**
 * Dashboard
 *
 * Displays live stats pulled from the database on mount.
 * Full implementation is in Part 4 — this version already works
 * and will update automatically once agents and lists are added.
 *
 * Design decision — Promise.all for parallel fetches:
 * /agents and /lists are independent — running them in parallel
 * halves total load time vs awaiting them sequentially.
 */
export default function Dashboard() {
  const [stats, setStats] = useState({ agents: 0, items: 0, batches: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [agentsRes, listsRes] = await Promise.all([
          axiosInstance.get('/agents'),
          axiosInstance.get('/lists'),
        ]);

        const agents = agentsRes.data.agents || [];
        const agentGroups = listsRes.data.agents || [];

        // Count total items across all agents
        const totalItems = agentGroups.reduce(
          (sum, ag) => sum + (ag.items?.length || 0),
          0
        );

        // Count unique upload batches
        const batchIds = new Set();
        agentGroups.forEach((ag) =>
          ag.items?.forEach((item) => batchIds.add(item.batchId))
        );

        // Collect last 5 items (flatten all agents, sort newest first)
        const allItems = agentGroups
          .flatMap((ag) =>
            (ag.items || []).map((item) => ({ ...item, agentName: ag.agentName }))
          )
          .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
          .slice(0, 5);

        setStats({
          agents: agents.length,
          items: totalItems,
          batches: batchIds.size,
        });
        setRecentItems(allItems);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ─── Stat card component (inline) ─────────────────────────────────────
  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-dark-700 border border-dark-500 rounded-xl p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-sans uppercase tracking-wider mb-2">
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-16 bg-dark-500 rounded animate-pulse" />
          ) : (
            <p className="text-white font-bold text-3xl font-mono">{value}</p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* ─── Page header ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl font-sans">Dashboard</h2>
        <p className="text-slate-500 text-sm font-sans mt-0.5">
          Live overview of your CSTech admin panel
        </p>
      </div>

      {/* ─── Error state ────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
          <p className="text-red-400 text-sm font-sans">{error}</p>
        </div>
      )}

      {/* ─── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Agents"
          value={stats.agents}
          color="bg-indigo-500/20 border border-indigo-500/30"
        />
        <StatCard
          icon={FileText}
          label="Total List Items"
          value={stats.items}
          color="bg-emerald-500/20 border border-emerald-500/30"
        />
        <StatCard
          icon={Upload}
          label="Upload Batches"
          value={stats.batches}
          color="bg-amber-500/20 border border-amber-500/30"
        />
      </div>

      {/* ─── Quick actions ───────────────────────────────────────────────── */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl p-5 shadow-card mb-6">
        <h3 className="text-white font-semibold text-sm font-sans mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/agents')}
            className="flex items-center gap-2 bg-dark-600 hover:bg-dark-500 text-slate-300
                       hover:text-white text-sm font-sans font-medium px-4 py-2 rounded-lg
                       border border-dark-400 transition-colors"
          >
            <UserPlus size={15} />
            Add Agent
          </button>
          <button
            onClick={() => navigate('/lists')}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white
                       text-sm font-sans font-medium px-4 py-2 rounded-lg
                       shadow-glow transition-colors"
          >
            <Upload size={15} />
            Upload List
          </button>
        </div>
      </div>

      {/* ─── Recent items ────────────────────────────────────────────────── */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-500">
          <h3 className="text-white font-semibold text-sm font-sans">Recent List Items</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-dark-500 rounded animate-pulse" style={{ width: `${50 + i * 15}%` }} />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-slate-600 text-sm font-sans">
              No items yet — upload a CSV on the Lists page
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-dark-500/50 bg-dark-600/30">
                  <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-2.5 font-medium">Name</th>
                  <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-2.5 font-medium">Phone</th>
                  <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-2.5 font-medium">Agent</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item, i) => (
                  <tr key={i} className="border-b border-dark-500/30 hover:bg-dark-600/20 transition-colors">
                    <td className="px-5 py-3 text-white">{item.firstName}</td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{item.phone}</td>
                    <td className="px-5 py-3">
                      <span className="bg-accent/15 text-accent-light text-xs font-sans px-2 py-0.5 rounded-full">
                        {item.agentName}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
