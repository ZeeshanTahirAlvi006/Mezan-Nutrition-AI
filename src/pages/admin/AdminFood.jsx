import React, { useEffect, useState } from 'react';
import admin from '../../api/adminClient';
import { Plus, Upload, Pencil, Trash2, Search } from 'lucide-react';

const emptyForm = { name: '', country: 'Global', calories: '', protein: '', carbs: '', fats: '' };

const AdminFood = () => {
  const [foods, setFoods] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [importResult, setImportResult] = useState(null);
  const limit = 15;

  const fetchFood = async () => {
    const { data } = await admin.listFood({ page, limit, q: q || undefined });
    setFoods(data.foods);
    setTotal(data.total);
  };

  useEffect(() => {
    fetchFood();
  }, [page, q]);

  const openCreate = () => {
    setForm(emptyForm);
    setModal('create');
  };

  const openEdit = (food) => {
    setForm({
      name: food.name,
      country: food.country || 'Global',
      calories: food.calories,
      protein: food.protein ?? '',
      carbs: food.carbs ?? '',
      fats: food.fats ?? '',
    });
    setModal(food._id);
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        calories: Number(form.calories),
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fats: Number(form.fats) || 0,
      };
      if (modal === 'create') {
        await admin.createFood(payload);
      } else {
        await admin.updateFood(modal, payload);
      }
      setModal(null);
      fetchFood();
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this food item?')) return;
    await admin.deleteFood(id);
    fetchFood();
  };

  const onCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await admin.importFoodCsv(file);
      setImportResult(data);
      fetchFood();
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed');
    }
    e.target.value = '';
  };

  const pages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Food catalog</h2>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-sm cursor-pointer hover:bg-slate-600">
            <Upload className="w-4 h-4" />
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={onCsv} />
          </label>
          <button type="button" onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add food
          </button>
        </div>
      </div>

      {importResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-300">
          Imported {importResult.imported}, skipped {importResult.skipped}
          <button type="button" className="ml-4 text-slate-400 underline" onClick={() => setImportResult(null)}>Dismiss</button>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search foods..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
        />
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-left bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Cal</th>
              <th className="px-4 py-3">P/C/F</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {foods.map((f) => (
              <tr key={f._id} className="hover:bg-slate-700/30">
                <td className="px-4 py-3 text-white">{f.name}</td>
                <td className="px-4 py-3 text-slate-400">{f.country}</td>
                <td className="px-4 py-3">{f.calories}</td>
                <td className="px-4 py-3 text-slate-400">{f.protein}/{f.carbs}/{f.fats}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => openEdit(f)} className="p-2 text-slate-400 hover:text-emerald-400"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => remove(f._id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50">Prev</button>
          <span className="text-slate-400 text-sm py-1">{page}/{pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-slate-700 disabled:opacity-50">Next</button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">{modal === 'create' ? 'Add food' : 'Edit food'}</h3>
            {['name', 'country', 'calories', 'protein', 'carbs', 'fats'].map((field) => (
              <input
                key={field}
                placeholder={field}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm capitalize"
              />
            ))}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-slate-400">Cancel</button>
              <button type="button" onClick={save} className="px-4 py-2 bg-emerald-500 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFood;
