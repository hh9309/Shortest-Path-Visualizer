
import React, { useState, useEffect, useRef } from 'react';
import { AlgorithmStep } from '../types';
import { ChevronDown, ChevronRight, List } from 'lucide-react';

interface StepListProps {
  steps: AlgorithmStep[];
  currentIndex: number;
  onStepSelect: (index: number) => void;
}

const StepList: React.FC<StepListProps> = ({ steps, currentIndex, onStepSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active item when list is open
  useEffect(() => {
    if (isExpanded && activeRef.current) {
        activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex, isExpanded]);

  if (steps.length === 0) return (
      <div className="px-4 py-8 text-center text-slate-300">
          <List size={24} className="mx-auto mb-2 opacity-20"/>
          <p className="text-xs italic">配置好图后点击“开始计算”</p>
      </div>
  );

  return (
    <div className="border-b border-slate-100 bg-white flex-shrink-0 transition-all duration-300">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
            <List size={14} className="text-blue-600"/> 
            算法执行序列 
            <span className="text-[10px] font-medium text-slate-300 ml-1">({steps.length} STEPS)</span>
        </span>
        {isExpanded ? <ChevronDown size={14} className="text-slate-300" /> : <ChevronRight size={14} className="text-slate-300" />}
      </button>

      {isExpanded && (
        <div className="max-h-[160px] overflow-y-auto bg-slate-50/30 border-t border-slate-50 custom-scrollbar">
            {steps.map((step, idx) => (
                <button
                    key={idx}
                    ref={idx === currentIndex ? activeRef : null}
                    onClick={() => onStepSelect(idx)}
                    className={`w-full text-left px-4 py-2.5 text-[11px] border-b border-slate-50 last:border-0 transition-all flex gap-3 group ${
                        idx === currentIndex 
                        ? 'bg-blue-600 text-white font-bold' 
                        : 'text-slate-500 hover:bg-white hover:text-slate-900'
                    }`}
                >
                    <span className={`font-mono shrink-0 w-4 text-right ${idx === currentIndex ? 'opacity-100' : 'opacity-30'}`}>
                        {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <span className={`${idx === currentIndex ? 'line-clamp-none' : 'truncate'} flex-1`}>
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
