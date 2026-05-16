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
    <div className="kcal-card flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-(--kcal-text-main) uppercase tracking-tight">Log Food</h3>
        <button 
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="text-xs flex items-center space-x-2 text-(--kcal-green) hover:underline font-bold"
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
          <input type="text" placeholder="Food Name (e.g. Pasta)" required
            className="kcal-input"
            value={customFood.name} onChange={e => setCustomFood({...customFood, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Calories" required
              className="kcal-input"
              value={customFood.calories} onChange={e => setCustomFood({...customFood, calories: e.target.value})} />
            <input type="number" placeholder="Protein (g)" 
              className="kcal-input"
              value={customFood.protein} onChange={e => setCustomFood({...customFood, protein: e.target.value})} />
            <input type="number" placeholder="Carbs (g)" 
              className="kcal-input"
              value={customFood.carbs} onChange={e => setCustomFood({...customFood, carbs: e.target.value})} />
            <input type="number" placeholder="Fats (g)" 
              className="kcal-input"
              value={customFood.fats} onChange={e => setCustomFood({...customFood, fats: e.target.value})} />
          </div>
          <button type="submit" className="kcal-btn-primary w-full">
            Log Custom Food
          </button>
        </form>
      ) : (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-(--kcal-text-muted)" />
            <input 
              type="text" 
              placeholder="Search food database..." 
              className="kcal-input !pl-12"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && (
            <div className="flex items-center space-x-3 text-(--kcal-green) text-sm mb-6 font-bold">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-(--kcal-green)"></div>
              <span>Searching...</span>
            </div>
          )}
          
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {results.length > 0 ? (
              results.map(food => (
                <div key={food._id} className="flex justify-between items-center bg-(--kcal-cream) hover:bg-(--kcal-green-light) p-4 rounded-(--radius-lg) border border-transparent hover:border-(--kcal-green-light) transition-all group">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-(--kcal-text-main) truncate text-sm md:text-base">{food.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-[10px] font-black text-(--kcal-green) uppercase">{food.calories} kcal</span>
                      <div className="flex items-center space-x-2 text-[8px] text-(--kcal-text-muted) font-black uppercase tracking-tighter">
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
                    className="p-3 bg-(--kcal-white) text-(--kcal-green) rounded-xl hover:bg-(--kcal-green) hover:text-white transition-all shadow-sm border border-(--kcal-green-light) active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))
            ) : query.length >= 2 && !loading ? (
              <p className="text-center text-(--kcal-text-muted) py-6 text-sm italic">No results found. Try manual entry.</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default FoodSearch;
