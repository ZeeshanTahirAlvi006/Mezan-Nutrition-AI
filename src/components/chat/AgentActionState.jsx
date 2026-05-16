import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Search, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

const AgentActionState = ({ toolName, toolArgs, result, isExecuting }) => {
  const [expanded, setExpanded] = useState(false);

  // Map tool names to user-friendly messages and icons
  const getToolInfo = () => {
    switch(toolName) {
      case 'search_food_database':
        return {
          icon: <Database className="w-4 h-4" />,
          message: isExecuting 
            ? `Analyzing nutrition data for "${toolArgs?.query}"...` 
            : `Analysis complete for "${toolArgs?.query}"`
        };
      case 'get_user_food_logs':
        return {
          icon: <Database className="w-4 h-4" />,
          message: isExecuting 
            ? `Retrieving your nutritional history...` 
            : `Personal log retrieved successfully`
        };
      default:
        return {
          icon: <Search className="w-4 h-4" />,
          message: isExecuting ? 'Consulting intelligence engine...' : 'Intelligence retrieval complete'
        };
    }
  };

  const info = getToolInfo();

  return (
    <div className="my-2 ml-14 max-w-[85%] md:max-w-[70%]">
      <div 
        className={`flex items-center justify-between p-3 rounded-xl border ${isExecuting ? 'border-(--kcal-green) bg-(--kcal-green-light)' : 'border-(--kcal-green-light) bg-white'} transition-colors cursor-pointer shadow-sm`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3 text-sm text-(--kcal-text-main)">
          <div className={isExecuting ? 'animate-pulse text-(--kcal-green)' : 'text-(--kcal-green)'}>
            {isExecuting ? info.icon : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <span className="font-semibold">{info.message}</span>
        </div>
        
        {!isExecuting && result && (
          <button className="text-(--kcal-text-muted) hover:text-(--kcal-green) transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && result && !isExecuting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-(--kcal-cream) rounded-xl border border-(--kcal-green-light) text-[10px] text-(--kcal-text-muted) overflow-x-auto font-mono whitespace-pre-wrap shadow-inner leading-relaxed">
              {result}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentActionState;
