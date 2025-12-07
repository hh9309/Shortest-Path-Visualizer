import React, { useState, useEffect, useRef } from 'react';
import { AlgorithmStep } from '../types';
import { ChevronDown, ChevronRight, List } from 'lucide-react';

interface StepListProps {
  steps: AlgorithmStep[];
  currentIndex: number;
  onStepSelect: (index: number) => void;
}

const StepList: React.FC<StepListProps> = ({ steps, currentIndex, onStepSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-expand if steps are generated for the first time
  useEffect(() => {
    if (steps.length > 0 && currentIndex === 0) {
        setIsExpanded(true);
    }
  }, [steps.length]);

  // Auto-scroll to active item when list is open
  useEffect(() => {
    if (isExpanded && activeRef.current) {
        activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex, isExpanded]);

  if (steps.length === 0) return null;

  return (
    <div className="border-b border-slate-200 bg-white flex-shrink-0 transition-all duration-300">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
            <List size={16} className="text-blue-600"/> 
            算法步骤列表 
            <span className="text-xs font-normal text-slate-400 ml-1">({steps.length} 步)</span>
        </span>
        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="max-h-48 overflow-y-auto bg-slate-50/50 border-t border-slate-100 shadow-inner custom-scrollbar">
            {steps.map((step, idx) => (
                <button
                    key={idx}
                    ref={idx === currentIndex ? activeRef : null}
                    onClick={() => onStepSelect(idx)}
                    className={`w-full text-left px-4 py-2.5 text-xs border-b border-slate-100 last:border-0 transition-colors flex gap-2 group ${
                        idx === currentIndex 
                        ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-l-blue-500' 
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 border-l-4 border-l-transparent'
                    }`}
                >
                    <span className={`font-mono shrink-0 w-5 text-right ${idx === currentIndex ? 'opacity-100' : 'opacity-40'}`}>
                        {idx + 1}.
                    </span>
                    <span className="truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:line-clamp-none line-clamp-1">
                        {step.description}
                    </span>
                </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default StepList;