import React, { useState, useEffect, useCallback } from 'react';
import GraphCanvas from './components/GraphCanvas';
import DataTable from './components/DataTable';
import AIInsightsPanel from './components/AIInsightsPanel';
import { runDoubleLabeling } from './services/dijkstra';
import { INITIAL_NODES, INITIAL_EDGES } from './constants';
import { Node, Edge, EditorMode, AlgorithmStep } from './types';
import { 
    MousePointer2, PlusCircle, Link, Play, RotateCcw, 
    StepForward, StepBack, MapPin, Info,
    Trash2, TableProperties, Brain
} from 'lucide-react';

// --- Sub-components for better modularity ---

const SidebarHeader = () => (
    <div className="p-3 md:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <div>
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                最短路双标号法
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1 hidden md:block">Shortest Path Visualizer</p>
        </div>
    </div>
);

const TabNavigation = ({ activeTab, setActiveTab }: { activeTab: 'algorithm' | 'ai', setActiveTab: (t: 'algorithm' | 'ai') => void }) => (
    <div className="flex border-b border-slate-200 flex-shrink-0">
        <button 
            onClick={() => setActiveTab('algorithm')}
            className={`flex-1 py-3 md:py-4 text-sm md:text-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'algorithm' 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
        >
            <TableProperties size={18} />
            <span>算法演示</span>
        </button>
        <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 md:py-4 text-sm md:text-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'ai' 
                ? 'bg-white text-purple-600 border-b-2 border-purple-600' 
                : 'bg-slate-50 text-slate-500 hover:text-slate-700'
            }`}
        >
            <Brain size={18} />
            <span>AI 洞察</span>
        </button>
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-full shadow-lg border border-slate-200 p-1.5 flex items-center gap-1 z-10 max-w-[95%] overflow-x-auto no-scrollbar">
            {tools.map(item => (
                <button
                    key={item.m}
                    onClick={() => setMode(item.m)}
                    className={`p-2.5 rounded-full flex-shrink-0 transition-all ${
                        mode === item.m 
                        ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-1' 
                        : 'hover:bg-slate-100 text-slate-500'
                    } ${item.color || ''}`}
                    title={item.label}
                >
                    <item.icon size={20} />
                </button>
            ))}
            <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0"></div>
            <button 
                onClick={handleDelete} 
                className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${
                    selection 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'hover:bg-slate-100 text-slate-500'
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
  const [activeTab, setActiveTab] = useState<'algorithm' | 'ai'>('algorithm');

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
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-100 overflow-hidden">
      
      {/* 1. GRAPH CANVAS AREA (Top on mobile, Right on Desktop) */}
      <div className="order-1 md:order-2 flex-col relative h-[45dvh] md:h-full flex-1 flex transition-all duration-300">
        <div className="flex-1 relative overflow-hidden bg-slate-100 shadow-inner">
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
      </div>

      {/* 2. SIDEBAR PANEL (Bottom on mobile, Left on Desktop) */}
      <div className="order-2 md:order-1 w-full md:w-[400px] h-[55dvh] md:h-full bg-white border-t md:border-t-0 md:border-r border-slate-200 shadow-2xl flex flex-col z-20 flex-shrink-0">
        <SidebarHeader />
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content Container */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* --- ALGORITHM TAB --- */}
            <div className={`h-full flex flex-col transition-opacity duration-300 ${activeTab === 'algorithm' ? 'opacity-100' : 'hidden opacity-0 absolute inset-0 pointer-events-none'}`}>
                
                {/* Controls Area */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 space-y-2">
                    {/* Playback Buttons */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={steps.length === 0 ? generateSteps : () => setIsPlaying(!isPlaying)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                                isPlaying 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            }`}
                        >
                            {isPlaying ? <span className="flex items-center gap-1">暂停</span> : (steps.length === 0 ? <span className="flex items-center gap-1"><Play size={16}/> 开始计算</span> : <span className="flex items-center gap-1"><Play size={16}/> 继续演示</span>)}
                        </button>
                        <button 
                            onClick={resetAlgorithm}
                            className="p-2.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                            title="重置"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    {/* Step Navigation & Simple Log (Mobile optimized) */}
                    {steps.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200 p-2 text-sm flex flex-col gap-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <button onClick={() => handleStep('backward')} disabled={currentStepIndex <= 0} className="p-1 hover:text-blue-600 disabled:opacity-30"><StepBack size={18}/></button>
                                <span className="text-xs font-mono font-bold text-slate-500">Step {currentStepIndex + 1}/{steps.length}</span>
                                <button onClick={() => handleStep('forward')} disabled={currentStepIndex >= steps.length - 1} className="p-1 hover:text-blue-600 disabled:opacity-30"><StepForward size={18}/></button>
                            </div>
                            {/* Compact Log Message */}
                            <div className="text-xs text-slate-700 leading-relaxed max-h-[4.5em] overflow-y-auto">
                                {currentStepData?.description}
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Table Area */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400 uppercase border-b border-slate-200 flex items-center gap-2">
                        <TableProperties size={14}/> 标号数据表
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-50/30">
                        <DataTable currentStep={currentStepData} nodes={nodes} />
                    </div>
                </div>

                {/* Legend Footer */}
                <div className="p-2 border-t border-slate-200 bg-white text-[10px] md:text-xs text-slate-500 grid grid-cols-4 gap-1 text-center flex-shrink-0">
                     <span className="flex flex-col md:flex-row items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>永久</span>
                     <span className="flex flex-col md:flex-row items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>临时</span>
                     <span className="flex flex-col md:flex-row items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>起点</span>
                     <span className="flex flex-col md:flex-row items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>终点</span>
                </div>
            </div>
            
            {/* --- AI TAB --- */}
            <div className={`h-full flex flex-col transition-opacity duration-300 ${activeTab === 'ai' ? 'opacity-100' : 'hidden opacity-0 absolute inset-0 pointer-events-none'}`}>
                 <AIInsightsPanel 
                    nodes={nodes} 
                    edges={edges} 
                    startNodeId={startNodeId}
                    endNodeId={endNodeId}
                />
            </div>
        </div>
      </div>
    </div>
  );
}