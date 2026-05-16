import React, { useEffect, useState } from 'react';
import admin from '../../api/adminClient';
import { Trash2, Eye } from 'lucide-react';

const AdminMealPlans = () => {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const fetchPlans = async () => {
    const { data } = await admin.listMealPlans({ page, limit });
    setPlans(data.plans);
    setTotal(data.total);
  };

  useEffect(() => {
    fetchPlans();
  }, [page]);

  const viewPlan = async (id) => {
    const { data } = await admin.getMealPlan(id);
    setSelected(data);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this meal plan?')) return;
    await admin.deleteMealPlan(id);
    setSelected(null);
    fetchPlans();
  };

  const pages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Meal plans</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {plans.map((p) => (
                <tr key={p._id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-white">{p.user?.email || '—'}</td>
                  <td className="px-4 py-3">{p.dayCount ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => viewPlan(p._id)} className="p-2 text-slate-400 hover:text-emerald-400">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => remove(p._id)} className="p-2 text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50">Prev</button>
              <span className="text-slate-400 text-sm">{page}/{pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50">Next</button>
            </div>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 overflow-y-auto max-h-[600px]">
          {!selected ? (
            <p className="text-slate-500">Select a plan to view details</p>
          ) : (
            <>
              <h3 className="text-lg font-bold text-white mb-4">{selected.user?.email}</h3>
              {selected.days?.map((day) => (
                <div key={day.date} className="mb-4 pb-4 border-b border-slate-700 last:border-0">
                  <p className="text-emerald-400 font-medium">{new Date(day.date).toLocaleDateString()} — {day.totalCalories} kcal</p>
                  {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((meal) =>
                    day.meals?.[meal]?.length > 0 ? (
                      <div key={meal} className="mt-2">
                        <p className="text-xs text-slate-500 uppercase">{meal}</p>
                        <ul className="text-sm text-slate-300">
                          {day.meals[meal].map((item, i) => (
                            <li key={i}>{item.foodName} ({item.calories} kcal)</li>
                          ))}
                        </ul>
                      </div>
                    ) : null
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMealPlans;
