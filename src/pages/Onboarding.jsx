import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, User, Target, ShieldCheck } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    location: '',
    age: '',
    weight: '',
    height: '',
    healthGoals: 'Maintenance',
    restrictions: []
  });

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    try {
      await client.put('/api/users/profile', formData);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRestriction = (res) => {
    setFormData(prev => {
      const exists = prev.restrictions.includes(res);
      if (exists) {
        return { ...prev, restrictions: prev.restrictions.filter(r => r !== res) };
      } else {
        return { ...prev, restrictions: [...prev.restrictions, res] };
      }
    });
  };

  return (
    <div className="min-h-screen bg-(--kcal-cream) flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mb-10">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-(--kcal-green) font-bold text-xs uppercase tracking-widest">Step {step} of 3</span>
          <h1 className="text-2xl font-extrabold text-(--kcal-green) tracking-tighter">kcal</h1>
        </div>
        <div className="flex justify-between">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 rounded-full w-[31%] transition-all duration-700 ${step >= i ? 'bg-(--kcal-green) shadow-sm' : 'bg-(--kcal-green-light)'}`} />
          ))}
        </div>
      </div>

      <motion.div 
        layout
        className="kcal-card w-full max-w-lg p-10 relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-(--kcal-green-light) p-3 rounded-2xl">
                  <User className="text-(--kcal-green) w-6 h-6"/>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-(--kcal-text-main)">About You</h2>
                  <p className="text-sm text-(--kcal-text-muted)">Let's start with the basics.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">Location</label>
                  <input type="text" className="kcal-input"
                    value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="City, Country" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">Age</label>
                  <input type="number" className="kcal-input"
                    value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} placeholder="Years" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">Weight (kg)</label>
                  <input type="number" className="kcal-input"
                    value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="kg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-(--kcal-text-muted) uppercase tracking-widest mb-2 ml-1">Height (cm)</label>
                  <input type="number" className="kcal-input"
                    value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} placeholder="cm" />
                </div>
              </div>
              <button onClick={handleNext} className="kcal-btn-primary w-full mt-6 group">
                Continue <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-(--kcal-coral-light) p-3 rounded-2xl">
                  <Target className="text-(--kcal-coral) w-6 h-6"/>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-(--kcal-text-main)">Your Goal</h2>
                  <p className="text-sm text-(--kcal-text-muted)">What do you want to achieve?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {['Weight Loss', 'Maintenance', 'Muscle Gain'].map(goal => (
                  <button
                    key={goal}
                    onClick={() => setFormData({...formData, healthGoals: goal})}
                    className={`p-6 rounded-[var(--radius-xl)] border-2 text-left transition-all flex justify-between items-center ${formData.healthGoals === goal ? 'border-(--kcal-green) bg-(--kcal-green-light)' : 'border-transparent bg-(--kcal-white) hover:bg-[#F9F9F9]'}`}
                  >
                    <span className="font-bold text-(--kcal-text-main)">{goal}</span>
                    {formData.healthGoals === goal && <div className="w-5 h-5 bg-(--kcal-green) rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                  </button>
                ))}
              </div>
              <div className="flex space-x-4 mt-8">
                <button onClick={handlePrev} className="flex-1 border-2 border-(--kcal-green-light) text-(--kcal-green) font-bold py-4 rounded-[var(--radius-xl)] flex items-center justify-center text-sm transition-all hover:bg-(--kcal-green-light)">
                  <ChevronLeft className="mr-2 w-5 h-5" /> Back
                </button>
                <button onClick={handleNext} className="flex-[2] kcal-btn-primary group">
                  Next <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-(--kcal-green-light) p-3 rounded-2xl">
                  <ShieldCheck className="text-(--kcal-green) w-6 h-6"/>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-(--kcal-text-main)">Preferences</h2>
                  <p className="text-sm text-(--kcal-text-muted)">Any dietary restrictions?</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut Allergy', 'Halal'].map(res => (
                  <button
                    key={res}
                    onClick={() => toggleRestriction(res)}
                    className={`px-5 py-3 rounded-full border-2 transition-all text-xs font-bold ${formData.restrictions.includes(res) ? 'border-(--kcal-green) bg-(--kcal-green) text-white' : 'border-(--kcal-green-light) text-(--kcal-text-muted) hover:border-(--kcal-green)'}`}
                  >
                    {res}
                  </button>
                ))}
              </div>
              <div className="flex space-x-4 mt-10">
                <button onClick={handlePrev} className="flex-1 border-2 border-(--kcal-green-light) text-(--kcal-green) font-bold py-4 rounded-[var(--radius-xl)] flex items-center justify-center text-sm transition-all hover:bg-(--kcal-green-light)">
                  <ChevronLeft className="mr-2 w-5 h-5" /> Back
                </button>
                <button onClick={handleSubmit} className="flex-[2] kcal-btn-primary">
                  Finalize Profile
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
