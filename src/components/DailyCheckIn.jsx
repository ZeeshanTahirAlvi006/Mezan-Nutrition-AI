import React, { useState } from 'react';
import client from '../api/client';
import { motion } from 'framer-motion';

const DailyCheckIn = () => {
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
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="kcal-card">
      <h3 className="text-lg font-bold text-(--kcal-text-main) mb-6">How are you today?</h3>
      
      <div className="mb-6">
        <label className="block text-xs font-black text-(--kcal-text-muted) uppercase tracking-widest mb-4">Daily Mood</label>
        <div className="grid grid-cols-5 gap-2 bg-(--kcal-cream) p-2 rounded-(--radius-xl) border border-(--kcal-green-light)">
          {moods.map(m => (
            <button
              key={m.val}
              onClick={() => setMood(m.val)}
              className={`text-2xl py-3 rounded-xl transition-all flex items-center justify-center ${mood === m.val ? 'bg-white shadow-md scale-110' : 'opacity-40 hover:opacity-100'}`}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="flex justify-between text-sm font-bold text-(--kcal-text-muted) mb-2">
          <span>Energy Level</span>
          <span className="text-(--kcal-green)">{energy}/10</span>
        </label>
        <input 
          type="range" min="1" max="10" 
          value={energy} onChange={(e) => setEnergy(parseInt(e.target.value))}
          className="kcal-slider"
        />
      </div>

      <div className="mb-8">
        <label className="flex justify-between text-sm font-bold text-(--kcal-text-muted) mb-2">
          <span>Fullness</span>
          <span className="text-(--kcal-coral)">{satiety}/10</span>
        </label>
        <input 
          type="range" min="1" max="10" 
          value={satiety} onChange={(e) => setSatiety(parseInt(e.target.value))}
          className="kcal-slider kcal-slider-coral"
        />
      </div>

      <button 
        onClick={handleSubmit}
        className={`w-full py-4 rounded-(--radius-xl) font-bold transition-all ${saved ? 'bg-[#91C78820] text-(--kcal-green)' : 'kcal-btn-primary'}`}
      >
        {saved ? 'Checked In! ✅' : 'Save Status'}
      </button>
    </div>
  );
};

export default DailyCheckIn;
