import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import admin from '../../api/adminClient';
import { Search, Trash2, Eye } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 15;

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await admin.listUsers({ page, limit, search: search || undefined });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setUsers([]);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const toggleDisabled = async (user) => {
    try {
      await admin.updateUser(user._id, { isDisabled: !user.isDisabled });
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.message || 'Update failed');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Permanently delete this user and all their data?')) return;
    try {
      await admin.deleteUser(id);
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const pages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Users</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm w-64 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Goal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-white">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">{u.healthGoals || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.isDisabled ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {u.isDisabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link to={`/admin/users/${u._id}`} className="inline-flex p-2 text-slate-400 hover:text-emerald-400" title="View">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button type="button" onClick={() => toggleDisabled(u)} className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">
                      {u.isDisabled ? 'Enable' : 'Disable'}
                    </button>
                    <button type="button" onClick={() => deleteUser(u._id)} className="inline-flex p-2 text-slate-400 hover:text-red-400" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50">Prev</button>
          <span className="text-slate-400 text-sm py-1">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
