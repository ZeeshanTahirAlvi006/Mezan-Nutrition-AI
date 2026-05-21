import React, { useState, useContext } from 'react';
import client from '../api/client';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

const DailyCheckIn = () => {
  const { refreshUser } = useContext(AuthContext);
  const [mood, setMood] = useState('neutral');
  const [energy, setEnergy] = useState(5);
  const [satiety, setSatiety] = useState(5);
  const [saved, setSaved] = useState(false);

  const moods = [
    { label: 'Terrible', emoji: '😫', val: 'terrible' },
    { label: 'Bad', emoji: '😕', val: 'bad' },
    { label: 'Neutral', emoji: '😐', val: 'neutral' },
    { label: 'Good', emoji: '🙂', val: 'good' },
    { label: 'Awesome', emoji: '🤩', val: 'awesome' }
  ];

  const handleSubmit = async () => {
    try {
      await client.post('/api/checkin', {
        date: new Date().toISOString(),
        mood,
        energyLevel: energy,
        satiety
      });
      setSaved(true);
      if (refreshUser) refreshUser();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-2xl shadow-sm border border-outline-variant/20">
      <h3 className="text-base md:text-lg font-black text-text-rich-black uppercase tracking-wider mb-6">How are you feeling today?</h3>
      
      <div className="mb-6">
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4 ml-1">Daily Mood</label>
        <div className="grid grid-cols-5 gap-2.5 bg-surface-off-white p-2 rounded-2xl border border-outline-variant/20">
          {moods.map(m => (
            <button
              key={m.val}
              onClick={() => setMood(m.val)}
              className={`text-2xl py-3 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                mood === m.val 
                  ? 'bg-white shadow-[0_4px_12px_rgba(58,105,55,0.08)] scale-105 border border-primary/20' 
                  : 'opacity-40 hover:opacity-100'
              }`}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="flex justify-between text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
          <span>Energy Level</span>
          <span className="text-primary font-bold">{energy}/10</span>
        </label>
        <input 
          type="range" min="1" max="10" 
          value={energy} onChange={(e) => setEnergy(parseInt(e.target.value))}
          className="kcal-slider cursor-pointer"
        />
      </div>

      <div className="mb-8">
        <label className="flex justify-between text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
          <span>Fullness</span>
          <span className="text-[#FB7185] font-bold">{satiety}/10</span>
        </label>
        <input 
          type="range" min="1" max="10" 
          value={satiety} onChange={(e) => setSatiety(parseInt(e.target.value))}
          className="kcal-slider kcal-slider-coral cursor-pointer"
        />
      </div>

      <button 
        onClick={handleSubmit}
        className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer ${
          saved 
            ? 'bg-primary/10 text-primary border border-primary/20' 
            : 'kcal-btn-primary shadow-sm hover:shadow-md'
        }`}
      >
        {saved ? 'Checked In! ✅' : 'Save Wellness Status'}
      </button>
    </div>
  );
};

export default DailyCheckIn;
