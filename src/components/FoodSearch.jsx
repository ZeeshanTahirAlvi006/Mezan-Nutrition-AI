import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Search, Plus, PlusCircle, X } from 'lucide-react';

const FoodSearch = ({ onAddFood }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Custom Food Form State
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: '', calories: '', protein: '', carbs: '', fats: ''
  });

  // Dynamic Search Effect (Debounced)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/api/food/search?q=${query}`);
      setResults(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await client.post('/api/food', customFood);
      onAddFood(data); 
      setShowCustomForm(false);
      setCustomFood({ name: '', calories: '', protein: '', carbs: '', fats: '' });
      setQuery('');
      setResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col h-full bg-white relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base md:text-lg font-black text-text-rich-black uppercase tracking-wider">Log Food</h3>
        <button 
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="text-xs flex items-center gap-1.5 text-primary hover:underline font-bold cursor-pointer"
        >
          {showCustomForm ? (
            <>
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Custom Entry</span>
            </>
          )}
        </button>
      </div>

      {showCustomForm ? (
        <form onSubmit={handleCustomSubmit} className="space-y-4 mb-4">
          <input 
            type="text" placeholder="Food Name (e.g. Pasta)" required
            className="kcal-input bg-surface-off-white/50"
            value={customFood.name} onChange={e => setCustomFood({...customFood, name: e.target.value})} 
          />
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="number" placeholder="Calories" required
              className="kcal-input bg-surface-off-white/50"
              value={customFood.calories} onChange={e => setCustomFood({...customFood, calories: e.target.value})} 
            />
            <input 
              type="number" placeholder="Protein (g)" 
              className="kcal-input bg-surface-off-white/50"
              value={customFood.protein} onChange={e => setCustomFood({...customFood, protein: e.target.value})} 
            />
            <input 
              type="number" placeholder="Carbs (g)" 
              className="kcal-input bg-surface-off-white/50"
              value={customFood.carbs} onChange={e => setCustomFood({...customFood, carbs: e.target.value})} 
            />
            <input 
              type="number" placeholder="Fats (g)" 
              className="kcal-input bg-surface-off-white/50"
              value={customFood.fats} onChange={e => setCustomFood({...customFood, fats: e.target.value})} 
            />
          </div>
          <button type="submit" className="kcal-btn-primary w-full cursor-pointer shadow-sm">
            Log Custom Food
          </button>
        </form>
      ) : (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Search food database..." 
              className="kcal-input !pl-12 bg-surface-off-white/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && (
            <div className="flex items-center gap-2.5 text-primary text-sm mb-6 font-bold">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Searching...</span>
            </div>
          )}
          
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {results.length > 0 ? (
              results.map(food => (
                <div key={food._id} className="flex justify-between items-center bg-surface-off-white/40 hover:bg-primary-container/10 p-4 rounded-xl border border-transparent hover:border-outline-variant/30 transition-all group">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-text-rich-black truncate text-sm md:text-base">{food.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-[10px] font-black text-primary uppercase">{food.calories} kcal</span>
                      <div className="flex items-center gap-2 text-[8px] text-on-surface-variant font-black uppercase tracking-tighter">
                        <span>P: {food.protein}g</span>
                        <span>•</span>
                        <span>C: {food.carbs}g</span>
                        <span>•</span>
                        <span>F: {food.fats}g</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onAddFood(food)}
                    className="p-3 bg-white text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm border border-outline-variant/30 active:scale-95 cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))
            ) : query.length >= 2 && !loading ? (
              <p className="text-center text-on-surface-variant py-6 text-sm italic">No results found. Try manual entry.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default FoodSearch;
