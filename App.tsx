
import React, { useState, useEffect, useCallback } from 'react';
import GraphCanvas from './components/GraphCanvas';
import DataTable from './components/DataTable';
import AIInsightsPanel from './components/AIInsightsPanel';
import { runDoubleLabeling } from './services/dijkstra';
import { INITIAL_NODES, INITIAL_EDGES, COLORS } from './constants';
import { Node, Edge, EditorMode, AlgorithmStep } from './types';
import { 
    MousePointer2, PlusCircle, Link, Play, RotateCcw, 
    StepForward, StepBack, MapPin, Info,
    Trash2, TableProperties, Brain
} from 'lucide-react';

export default function App() {
  // Graph State
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [startNodeId, setStartNodeId] = useState<string>('1');
  const [endNodeId, setEndNodeId] = useState<string>('6');

  // UI State
  const [mode, setMode] = useState<EditorMode>(EditorMode.SELECT);
  const [leftPanelWidth, setLeftPanelWidth] = useState(360); // Slightly wider for AI content
  const [activeTab, setActiveTab] = useState<'algorithm' | 'ai'>('algorithm');

  // Algorithm State
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Generate Steps
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

  // Playback Control
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

  const clearGraph = () => {
      resetAlgorithm();
      setNodes([]);
      setEdges([]);
      setStartNodeId('');
      setEndNodeId('');
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

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden">
      
      {/* Sidebar (Left) */}
      <div 
        className="h-full bg-white border-r border-slate-200 shadow-xl flex flex-col transition-all duration-300 z-20 flex-shrink-0"
        style={{ width: `${leftPanelWidth}px` }}
      >
        <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                最短路双标号法
            </h1>
            <p className="text-xs text-slate-500 mt-1">Shortest Path Visualizer</p>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('algorithm')}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'algorithm' 
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                    : 'bg-slate-50 text-slate-500 hover:text-slate-700'
                }`}
            >
                <TableProperties size={14} /> 算法演示
            </button>
            <button 
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'ai' 
                    ? 'bg-white text-purple-600 border-b-2 border-purple-600' 
                    : 'bg-slate-50 text-slate-500 hover:text-slate-700'
                }`}
            >
                <Brain size={14} /> AI 洞察
            </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'algorithm' ? (
                <div className="h-full flex flex-col animate-in slide-in-from-left-2 duration-300">
                    {/* Algorithm Controls */}
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">算法控制</h2>
                        
                        <div className="flex items-center gap-2 mb-3">
                            <button 
                                onClick={steps.length === 0 ? generateSteps : () => setIsPlaying(!isPlaying)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isPlaying 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                                }`}
                            >
                                {isPlaying ? <span className="flex items-center gap-1">暂停</span> : (steps.length === 0 ? <span className="flex items-center gap-1"><Play size={16}/> 开始计算</span> : <span className="flex items-center gap-1"><Play size={16}/> 继续演示</span>)}
                            </button>
                            <button 
                                onClick={resetAlgorithm}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                title="重置算法"
                            >
                                <RotateCcw size={18} />
                            </button>
                        </div>

                        {steps.length > 0 && (
                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <button onClick={() => handleStep('backward')} disabled={currentStepIndex <= 0} className="p-1 hover:text-blue-600 disabled:opacity-30"><StepBack size={18}/></button>
                                <span className="text-xs font-mono font-medium text-slate-600">
                                    Step {currentStepIndex + 1} / {steps.length}
                                </span>
                                <button onClick={() => handleStep('forward')} disabled={currentStepIndex >= steps.length - 1} className="p-1 hover:text-blue-600 disabled:opacity-30"><StepForward size={18}/></button>
                            </div>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <h2 className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">
                            标号表 (Label Table)
                        </h2>
                        <div className="flex-1 overflow-auto bg-slate-50">
                            <DataTable currentStep={currentStepData} nodes={nodes} />
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="p-4 border-t border-slate-200 bg-white text-xs text-slate-500 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div> <span>P: 永久标号</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div> <span>T: 临时标号</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div> <span>起点</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div> <span>终点</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full animate-in slide-in-from-right-2 duration-300">
                    <AIInsightsPanel 
                        nodes={nodes} 
                        edges={edges} 
                        startNodeId={startNodeId}
                        endNodeId={endNodeId}
                    />
                </div>
            )}
        </div>
      </div>

      {/* Main Content (Canvas) */}
      <div className="flex-1 flex flex-col relative h-full">
        
        {/* Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border border-slate-200 p-1.5 flex items-center gap-1 z-10">
            {[
                { m: EditorMode.SELECT, icon: MousePointer2, label: "选择/移动" },
                { m: EditorMode.ADD_NODE, icon: PlusCircle, label: "添加节点" },
                { m: EditorMode.ADD_EDGE, icon: Link, label: "添加连线" },
                { m: EditorMode.SET_START, icon: MapPin, label: "设起点", color: "text-green-600" },
                { m: EditorMode.SET_END, icon: MapPin, label: "设终点", color: "text-red-600" },
            ].map(item => (
                <button
                    key={item.m}
                    onClick={() => setMode(item.m)}
                    className={`p-2 rounded-full transition-all ${mode === item.m ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-1' : 'hover:bg-slate-100 text-slate-500'} ${item.color || ''}`}
                    title={item.label}
                >
                    <item.icon size={20} />
                </button>
            ))}
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={clearGraph} className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="清空画布">
                <Trash2 size={18} />
            </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
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
            />
        </div>

        {/* Step Description Log (Only visible in Algorithm Mode) */}
        {activeTab === 'algorithm' && (
            <div className="h-32 bg-white border-t border-slate-200 p-4 shadow-inner overflow-auto z-10">
                <div className="max-w-3xl mx-auto w-full">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Info size={14} /> 算法日志
                    </h3>
                    {currentStepData ? (
                        <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-2xl font-black text-slate-200">
                                {String(currentStepIndex + 1).padStart(2, '0')}
                            </div>
                            <div>
                                <p className="text-slate-800 font-medium leading-relaxed">
                                    {currentStepData.description}
                                </p>
                                {currentStepData.checkingEdgeId && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        正在检查边: {(() => {
                                            const e = edges.find(ed => ed.id === currentStepData.checkingEdgeId);
                                            if(!e) return '';
                                            const s = nodes.find(n => n.id === e.source)?.label;
                                            const t = nodes.find(n => n.id === e.target)?.label;
                                            return `${s} -> ${t} (权重: ${e.weight})`;
                                        })()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm flex items-center gap-2 h-full">
                            <Info size={16} /> 准备就绪。请点击“开始计算”运行算法。
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
