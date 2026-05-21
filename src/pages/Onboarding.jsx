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
    <div className="min-h-screen bg-surface-off-white flex flex-col items-center justify-center p-6 md:p-8">
      {/* Top Brand & Progress Indicator */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-primary font-bold text-xs uppercase tracking-widest">Step {step} of 3</span>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">spa</span>
            <span className="font-headline font-bold text-lg text-primary">Mezan</span>
          </div>
        </div>
        <div className="flex justify-between gap-2.5">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-2 rounded-full w-1/3 transition-all duration-500 ${
                step >= i ? 'bg-primary shadow-[0_2px_4px_rgba(58,105,55,0.2)]' : 'bg-outline-variant/30'
              }`} 
            />
          ))}
        </div>
      </div>

      {/* Main Form Card */}
      <motion.div 
        layout
        className="glass-panel w-full max-w-xl p-8 md:p-10 rounded-2xl shadow-lg border border-outline-variant/20 relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-primary-container/20 p-3.5 rounded-2xl text-primary flex items-center justify-center">
                  <User className="w-6 h-6"/>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-text-rich-black leading-tight">About You</h2>
                  <p className="text-xs md:text-sm text-on-surface-variant">Let's start with the basics to customize your profile.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">Location</label>
                  <input 
                    type="text" 
                    className="kcal-input bg-white"
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                    placeholder="City, Country" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">Age</label>
                  <input 
                    type="number" 
                    className="kcal-input bg-white"
                    value={formData.age} 
                    onChange={e => setFormData({...formData, age: e.target.value})} 
                    placeholder="Years" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">Weight (kg)</label>
                  <input 
                    type="number" 
                    className="kcal-input bg-white"
                    value={formData.weight} 
                    onChange={e => setFormData({...formData, weight: e.target.value})} 
                    placeholder="kg" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">Height (cm)</label>
                  <input 
                    type="number" 
                    className="kcal-input bg-white"
                    value={formData.height} 
                    onChange={e => setFormData({...formData, height: e.target.value})} 
                    placeholder="cm" 
                  />
                </div>
              </div>
              
              <button 
                onClick={handleNext} 
                disabled={!formData.location || !formData.age || !formData.weight || !formData.height}
                className="kcal-btn-primary w-full mt-6 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-[#FFF0F0] p-3.5 rounded-2xl text-[#FB7185] flex items-center justify-center">
                  <Target className="w-6 h-6"/>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-text-rich-black leading-tight">Your Goal</h2>
                  <p className="text-xs md:text-sm text-on-surface-variant">What is your primary weight or body goal?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {['Weight Loss', 'Maintenance', 'Muscle Gain'].map(goal => (
                  <button
                    key={goal}
                    onClick={() => setFormData({...formData, healthGoals: goal})}
                    className={`p-5 rounded-2xl border transition-all flex justify-between items-center text-left cursor-pointer ${
                      formData.healthGoals === goal 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-outline-variant/30 bg-white hover:bg-surface-off-white hover:border-outline-variant'
                    }`}
                  >
                    <span className="font-bold text-sm md:text-base text-on-surface">{goal}</span>
                    {formData.healthGoals === goal && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={handlePrev} 
                  className="flex-1 border border-primary/30 text-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:bg-primary/5 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button 
                  onClick={handleNext} 
                  className="flex-[2] kcal-btn-primary flex items-center justify-center gap-2 group cursor-pointer"
                >
                  Next <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-primary-container/20 p-3.5 rounded-2xl text-primary flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6"/>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-text-rich-black leading-tight">Dietary Preferences</h2>
                  <p className="text-xs md:text-sm text-on-surface-variant">Select any dietary restrictions or allergies.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 py-3">
                {['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut Allergy', 'Halal'].map(res => {
                  const isSelected = formData.restrictions.includes(res);
                  return (
                    <button
                      key={res}
                      onClick={() => toggleRestriction(res)}
                      className={`px-5 py-3 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-primary bg-primary text-white shadow-md shadow-primary/20' 
                          : 'border-outline-variant/40 bg-white text-on-surface-variant hover:border-primary hover:text-primary'
                      }`}
                    >
                      {res}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={handlePrev} 
                  className="flex-1 border border-primary/30 text-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:bg-primary/5 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="flex-[2] kcal-btn-primary flex items-center justify-center cursor-pointer shadow-lg"
                >
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

