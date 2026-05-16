import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import admin from '../../api/adminClient';
import { ArrowLeft } from 'lucide-react';

const AdminUserDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    admin.getUser(id).then(({ data: d }) => setData(d));
  }, [id]);

  useEffect(() => {
    if (tab === 'logs') {
      admin.getUserLogs(id, { limit: 20 }).then(({ data }) => setLogs(data.logs));
    } else {
      admin.getUserCheckins(id, { limit: 20 }).then(({ data }) => setCheckins(data.checkins));
    }
  }, [id, tab]);

  if (!data) {
    return <div className="text-slate-500 py-12 text-center">Loading...</div>;
  }

  const { user, summary } = data;

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white">{user.email}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div><span className="text-slate-500">Goal</span><p className="text-white">{user.healthGoals || '—'}</p></div>
          <div><span className="text-slate-500">Location</span><p className="text-white">{user.location || '—'}</p></div>
          <div><span className="text-slate-500">Logs</span><p className="text-white">{summary.logCount}</p></div>
          <div><span className="text-slate-500">Chat sessions</span><p className="text-white">{summary.sessionCount}</p></div>
        </div>
        {summary.hasMealPlan && (
          <p className="text-emerald-400 text-sm mt-2">Has saved meal plan</p>
        )}
        <Link to={`/admin/chat?userId=${user._id}`} className="text-emerald-400 text-sm mt-2 inline-block hover:underline">
          View chat sessions →
        </Link>
      </div>

      <div className="flex gap-2 border-b border-slate-700">
        {['logs', 'checkins'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'logs' && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-slate-500">No logs</p>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-white font-medium">{new Date(log.date).toLocaleDateString()}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {log.totals?.calories || 0} kcal · P {log.totals?.protein || 0}g
                </p>
                <ul className="mt-2 text-xs text-slate-500">
                  {log.foodItems?.map((fi, i) => (
                    <li key={i}>{fi.foodId?.name || 'Unknown'} × {fi.servings}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'checkins' && (
        <div className="space-y-3">
          {checkins.length === 0 ? (
            <p className="text-slate-500">No check-ins</p>
          ) : (
            checkins.map((c) => (
              <div key={c._id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex justify-between">
                <span className="text-white">{new Date(c.date).toLocaleDateString()}</span>
                <span className="text-slate-400 text-sm">Mood: {c.mood || '—'} · Energy: {c.energyLevel ?? '—'}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUserDetail;
