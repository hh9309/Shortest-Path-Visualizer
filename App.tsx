
import React, { useState, useEffect, useCallback } from 'react';
import GraphCanvas from './components/GraphCanvas';
import DataTable from './components/DataTable';
import AIInsightsPanel from './components/AIInsightsPanel';
import StepList from './components/StepList';
import { runDoubleLabeling } from './services/dijkstra';
import { INITIAL_NODES, INITIAL_EDGES } from './constants';
import { Node, Edge, EditorMode, AlgorithmStep } from './types';
import { 
    MousePointer2, PlusCircle, Link, Play, RotateCcw, 
    StepForward, StepBack, MapPin, 
    Trash2, TableProperties
} from 'lucide-react';

// --- Sub-components for better modularity ---

const SidebarHeader = () => (
    <div className="p-4 border-b border-slate-100 bg-white flex-shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            最短路双标号法
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Shortest Path Visualizer</p>
    </div>
);

const Toolbar = ({ mode, setMode, handleDelete, selection }: { 
    mode: EditorMode, 
    setMode: (m: EditorMode) => void, 
    handleDelete: () => void, 
    selection: any 
}) => {
    const tools = [
        { m: EditorMode.SELECT, icon: MousePointer2, label: "选择" },
        { m: EditorMode.ADD_NODE, icon: PlusCircle, label: "加节点" },
        { m: EditorMode.ADD_EDGE, icon: Link, label: "加连线" },
        { m: EditorMode.SET_START, icon: MapPin, label: "设起点", color: "text-green-600" },
        { m: EditorMode.SET_END, icon: MapPin, label: "设终点", color: "text-red-600" },
    ];

    return (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-1 flex flex-col gap-1 z-10">
            {tools.map(item => (
                <button
                    key={item.m}
                    onClick={() => setMode(item.m)}
                    className={`p-2.5 rounded-lg transition-all ${
                        mode === item.m 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'hover:bg-slate-100 text-slate-500'
                    } ${item.color && mode !== item.m ? item.color : ''}`}
                    title={item.label}
                >
                    <item.icon size={20} />
                </button>
            ))}
            <div className="h-px w-full bg-slate-100 my-1"></div>
            <button 
                onClick={handleDelete} 
                className={`p-2.5 rounded-lg transition-colors ${
                    selection 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'hover:bg-slate-100 text-slate-400'
                }`} 
                title={selection ? "删除选中" : "清空"}
            >
                <Trash2 size={20} />
            </button>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
  // Graph State
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [startNodeId, setStartNodeId] = useState<string>('1');
  const [endNodeId, setEndNodeId] = useState<string>('6');
  
  // Selection & UI State
  const [selection, setSelection] = useState<{ type: 'node' | 'edge', id: string } | null>(null);
  const [mode, setMode] = useState<EditorMode>(EditorMode.SELECT);

  // Algorithm State
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState(1000);

  // --- Logic Helpers ---

  const generateSteps = useCallback(() => {
    if (!startNodeId || !endNodeId) {
        alert("请先设置起点和终点");
        return;
    }
    const result = runDoubleLabeling(nodes, edges, startNodeId, endNodeId);
    setSteps(result);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [nodes, edges, startNodeId, endNodeId]);

  useEffect(() => {
    let interval: number;
    if (isPlaying && steps.length > 0 && currentStepIndex < steps.length - 1) {
      interval = window.setInterval(() => {
        setCurrentStepIndex(prev => {
            if (prev >= steps.length - 1) {
                setIsPlaying(false);
                return prev;
            }
            return prev + 1;
        });
      }, playbackSpeed);
    } else if (currentStepIndex >= steps.length - 1) {
        setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, steps.length, currentStepIndex, playbackSpeed]);

  const resetAlgorithm = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setSteps([]);
  };

  const handleModeChange = (newMode: EditorMode) => {
      setMode(newMode);
      setSelection(null);
  };

  const handleDelete = () => {
      if (selection) {
          if (selection.type === 'node') {
              const nodeId = selection.id;
              setNodes(prev => prev.filter(n => n.id !== nodeId));
              setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
              if (startNodeId === nodeId) setStartNodeId('');
              if (endNodeId === nodeId) setEndNodeId('');
              setSelection(null);
              resetAlgorithm();
          } else if (selection.type === 'edge') {
              setEdges(prev => prev.filter(e => e.id !== selection.id));
              setSelection(null);
              resetAlgorithm();
          }
      } else {
          if (confirm("确定清空整个画布吗？这将删除所有节点和边。")) {
              resetAlgorithm();
              setNodes([]);
              setEdges([]);
              setStartNodeId('');
              setEndNodeId('');
              setSelection(null);
          }
      }
  };

  const handleStep = (direction: 'forward' | 'backward') => {
      setIsPlaying(false);
      if (direction === 'forward' && currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
      } else if (direction === 'backward' && currentStepIndex > 0) {
          setCurrentStepIndex(prev => prev - 1);
      }
  };

  const currentStepData = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  // --- Render ---

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden text-slate-900">
      
      {/* 1. LEFT SIDEBAR (Algorithm Steps and Data) */}
      <aside className="w-full md:w-[320px] lg:w-[380px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20 flex-shrink-0 h-[40dvh] md:h-full">
        <SidebarHeader />
        
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Step List Component */}
            <StepList 
                steps={steps} 
                currentIndex={currentStepIndex} 
                onStepSelect={(idx) => {
                    setIsPlaying(false);
                    setCurrentStepIndex(idx);
                }}
            />

            {/* Controls */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                    <button 
                        onClick={steps.length === 0 ? generateSteps : () => setIsPlaying(!isPlaying)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md ${
                            isPlaying 
                            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' 
                            : 'bg-blue-600 text-white shadow-blue-200'
                        }`}
                    >
                        {isPlaying ? <span>暂停演示</span> : (steps.length === 0 ? <><Play size={16}/> 开始计算</> : <><Play size={16}/> 继续演示</>)}
                    </button>
                    <button 
                        onClick={resetAlgorithm}
                        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200"
                        title="重置"
                    >
                        <RotateCcw size={18} />
                    </button>
                </div>

                {steps.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => handleStep('backward')} disabled={currentStepIndex <= 0} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-20"><StepBack size={18}/></button>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Step {currentStepIndex + 1} / {steps.length}</span>
                            <button onClick={() => handleStep('forward')} disabled={currentStepIndex >= steps.length - 1} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-20"><StepForward size={18}/></button>
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed max-h-20 overflow-y-auto">
                            {currentStepData?.description}
                        </div>
                    </div>
                )}
            </div>

            {/* Data Table */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 flex items-center gap-2">
                    <TableProperties size={12}/> 标号状态表
                </div>
                <div className="flex-1 overflow-auto">
                    <DataTable currentStep={currentStepData} nodes={nodes} />
                </div>
            </div>

            {/* Legend */}
            <div className="p-3 bg-white border-t border-slate-100 grid grid-cols-4 gap-2 text-[10px] font-medium text-slate-500">
                <div className="flex flex-col items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></div>P永久</div>
                <div className="flex flex-col items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></div>T临时</div>
                <div className="flex flex-col items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-200"></div>起点</div>
                <div className="flex flex-col items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-200"></div>终点</div>
            </div>
        </div>
      </aside>

      {/* 2. MAIN AREA (Canvas Top, AI Bottom) */}
      <main className="flex-1 flex flex-col relative h-[60dvh] md:h-full">
        {/* Graph Canvas */}
        <div className="flex-[3] relative bg-slate-100 overflow-hidden shadow-inner border-b border-slate-200">
            <GraphCanvas 
                nodes={nodes}
                edges={edges}
                onNodesChange={(n) => { setNodes(n); resetAlgorithm(); }}
                onEdgesChange={(e) => { setEdges(e); resetAlgorithm(); }}
                mode={mode}
                startNodeId={startNodeId}
                endNodeId={endNodeId}
                setStartNodeId={(id) => { setStartNodeId(id); resetAlgorithm(); }}
                setEndNodeId={(id) => { setEndNodeId(id); resetAlgorithm(); }}
                currentStepState={currentStepData}
                showLabels={true}
                resetAlgorithm={resetAlgorithm}
                selection={selection}
                onSelect={setSelection}
            />
            <Toolbar 
                mode={mode} 
                setMode={handleModeChange} 
                handleDelete={handleDelete} 
                selection={selection} 
            />
        </div>

        {/* AI Insights Panel - Positioned below canvas */}
        <div className="flex-[2] bg-white flex flex-col shadow-2xl z-10 overflow-hidden">
             <AIInsightsPanel 
                nodes={nodes} 
                edges={edges} 
                startNodeId={startNodeId}
                endNodeId={endNodeId}
            />
        </div>
      </main>
    </div>
  );
}
