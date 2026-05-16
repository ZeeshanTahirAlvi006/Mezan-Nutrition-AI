import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import admin from '../../api/adminClient';
import {
  Users,
  UtensilsCrossed,
  MessageSquare,
  ClipboardList,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
    <div className="flex items-center justify-between mb-3">
      <span className="text-slate-400 text-sm">{label}</span>
      <Icon className="w-5 h-5 text-emerald-400" />
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    admin
      .getStats()
      .then(({ data }) => setStats(data))
      .catch(() => setError('Failed to load stats'));
  }, []);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Overview</h2>
        <p className="text-slate-400 text-sm mt-1">Platform health at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total users" value={stats.totalUsers} sub={`+${stats.newUsers7d} this week`} />
        <StatCard icon={Activity} label="Active (7d)" value={stats.activeUsers7d} sub="Users who logged food" />
        <StatCard icon={UtensilsCrossed} label="Food items" value={stats.foodItems} />
        <StatCard icon={ClipboardList} label="Logs today" value={stats.dailyLogsToday} sub={`${stats.checkInsToday} check-ins`} />
        <StatCard icon={MessageSquare} label="Chat sessions" value={stats.chatSessions} sub={`${stats.messages} messages`} />
        <StatCard icon={UtensilsCrossed} label="Meal plans" value={stats.mealPlans} />
      </div>

      {stats.registrationsByDay?.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">New registrations (30 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.registrationsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/users" className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30">
          Manage users
        </Link>
        <Link to="/admin/food" className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-600">
          Food catalog
        </Link>
        <Link to="/admin/chat" className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-600">
          Moderate chat
        </Link>
      </div>
    </div>
  );
};

export default AdminOverview;
