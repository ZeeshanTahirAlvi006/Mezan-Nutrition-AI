import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AchievementToast = ({ isVisible, message, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="bg-white px-8 py-4 rounded-full flex items-center space-x-3 shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-[var(--kcal-green-light)]">
            <div className="bg-[var(--kcal-green-light)] p-2 rounded-full">
               <span className="text-lg">✨</span>
            </div>
            <span className="font-bold text-[var(--kcal-text-main)] text-sm">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementToast;
