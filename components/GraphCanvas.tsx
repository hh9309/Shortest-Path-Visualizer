
import React, { useRef, useState } from 'react';
import { Node, Edge, EditorMode, AlgorithmNodeState } from '../types';
import { COLORS } from '../constants';

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  mode: EditorMode;
  startNodeId: string | null;
  endNodeId: string | null;
  setStartNodeId: (id: string) => void;
  setEndNodeId: (id: string) => void;
  currentStepState: {
    activeNodeId: string | null;
    checkingEdgeId: string | null;
    nodeStates: Record<string, AlgorithmNodeState>;
  } | null;
  showLabels: boolean;
  resetAlgorithm: () => void;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  mode,
  startNodeId,
  endNodeId,
  setStartNodeId,
  setEndNodeId,
  currentStepState,
  showLabels,
  resetAlgorithm
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{ nodeId: string, startX: number, startY: number } | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

  // Helper to get node coordinates
  const getNodePos = (id: string) => nodes.find(n => n.id === id) || { x: 0, y: 0 };

  const handleMouseDown = (e: React.MouseEvent, nodeId?: string) => {
    // If clicking a node
    if (nodeId) {
        if (mode === EditorMode.SELECT) {
            setDragState({ nodeId, startX: e.clientX, startY: e.clientY });
        } else if (mode === EditorMode.ADD_EDGE) {
            e.stopPropagation(); // Stop propagation to prevent immediate cancel
            setEdgeStart(nodeId);
            const pos = getNodePos(nodeId);
            setMousePos({ x: pos.x, y: pos.y });
        } else if (mode === EditorMode.SET_START) {
            setStartNodeId(nodeId);
        } else if (mode === EditorMode.SET_END) {
            setEndNodeId(nodeId);
        }
        e.stopPropagation();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
    setMousePos({ x: svgPoint.x, y: svgPoint.y });

    if (dragState) {
      const updatedNodes = nodes.map(n => 
        n.id === dragState.nodeId 
          ? { ...n, x: svgPoint.x, y: svgPoint.y }
          : n
      );
      onNodesChange(updatedNodes);
    }
  };

  const handleMouseUp = (e: React.MouseEvent, targetNodeId?: string) => {
    // 1. Handle Node Dragging End
    if (dragState) {
      setDragState(null);
    }
    
    // 2. Handle Add Edge End
    if (mode === EditorMode.ADD_EDGE && edgeStart) {
        e.stopPropagation(); // Ensure we handle the drop here
        
        // If we released over a valid target node different from start
        if (targetNodeId && targetNodeId !== edgeStart) {
            const start = edgeStart;
            const target = targetNodeId;

            const exists = edges.some(edge => 
                (edge.source === start && edge.target === target) ||
                (edge.source === target && edge.target === start)
            );
            
            if (!exists) {
                // 随机生成 2-10 的整数权重
                const weight = Math.floor(Math.random() * 9) + 2;

                const newEdge: Edge = {
                    id: `e-${Date.now()}`,
                    source: start,
                    target: target,
                    weight: weight
                };
                onEdgesChange([...edges, newEdge]);
            }
        }
        setEdgeStart(null);
    }
  };

  const handleBgClick = (e: React.MouseEvent) => {
     if (mode === EditorMode.ADD_NODE) {
        const svg = svgRef.current;
        if (!svg) return;
        const point = svg.createSVGPoint();
        point.x = e.clientX;
        point.y = e.clientY;
        const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
        
        // Find next available ID
        const maxId = nodes.reduce((max, n) => Math.max(max, parseInt(n.id) || 0), 0);
        const nextId = (maxId + 1).toString();
        
        const newNode: Node = {
            id: nextId,
            x: svgPoint.x,
            y: svgPoint.y,
            label: `v${nextId}`
        };
        onNodesChange([...nodes, newNode]);
     } else {
         // Clear edge start if clicking background
         setEdgeStart(null);
     }
  };

  // Node Colors
  const getNodeColor = (nodeId: string) => {
    if (currentStepState) {
      const state = currentStepState.nodeStates[nodeId];
      if (currentStepState.activeNodeId === nodeId) return COLORS.warning;
      if (state?.status === 'permanent') return COLORS.permanent;
      if (state?.status === 'temporary' && state.distance !== Infinity) return COLORS.temporary;
      return COLORS.unvisited;
    }
    if (nodeId === startNodeId) return COLORS.start;
    if (nodeId === endNodeId) return COLORS.end;
    return COLORS.primary;
  };

  const getNodeStroke = (nodeId: string) => {
      if (nodeId === startNodeId) return COLORS.success;
      if (nodeId === endNodeId) return COLORS.danger;
      return '#fff';
  }

  const getNodeLabelText = (node: Node) => {
    if (currentStepState) {
      const state = currentStepState.nodeStates[node.id];
      const d = state?.distance === Infinity ? '∞' : state?.distance;
      const pId = state?.parent;
      const pLabel = pId ? nodes.find(n => n.id === pId)?.label : '-';
      return `[${d}, ${pLabel}]`;
    }
    return node.label;
  };

  const getEdgeStyle = (edge: Edge) => {
    const isChecking = currentStepState?.checkingEdgeId === edge.id;
    let isPath = false;
    if (currentStepState) {
        const sState = currentStepState.nodeStates[edge.source];
        const tState = currentStepState.nodeStates[edge.target];
        if (tState?.parent === edge.source && tState.status === 'permanent') isPath = true;
        if (sState?.parent === edge.target && sState.status === 'permanent') isPath = true;
    }
    return {
      stroke: isChecking ? COLORS.warning : (isPath ? COLORS.primary : '#94a3b8'),
      strokeWidth: isPath ? 4 : (isChecking ? 3 : 2),
      opacity: (currentStepState && !isPath && !isChecking) ? 0.3 : 1
    };
  };

  return (
    <div className={`w-full h-full bg-slate-50 relative overflow-hidden select-none ${mode === EditorMode.ADD_EDGE ? 'cursor-crosshair' : ''}`}>
        {/* Instruction overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow text-sm text-slate-600 pointer-events-none z-10 border border-slate-200">
            {mode === EditorMode.SELECT && "拖动节点移动，右键删除。"}
            {mode === EditorMode.ADD_NODE && "点击空白处添加节点。"}
            {mode === EditorMode.ADD_EDGE && "按住鼠标左键，从一个节点拖到另一个节点添加边。"}
            {mode === EditorMode.SET_START && "点击节点设为起点 (绿色)。"}
            {mode === EditorMode.SET_END && "点击节点设为终点 (红色)。"}
        </div>

      <svg 
        ref={svgRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={(e) => handleMouseUp(e)} // Global mouse up to catch drops outside
        onClick={handleBgClick}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>

        {/* 1. Edges (Lines) - Rendered First */}
        {edges.map(edge => {
          const s = getNodePos(edge.source);
          const t = getNodePos(edge.target);
          const style = getEdgeStyle(edge);
          
          return (
            <g key={edge.id}>
                {/* Transparent wider stroke for easier clicking (deletion only) */}
                <line 
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y} 
                    stroke="transparent" 
                    strokeWidth="20"
                    className="cursor-pointer"
                    onContextMenu={(e) => {
                        e.preventDefault(); 
                        if(confirm("确定删除此边吗?")) {
                            onEdgesChange(edges.filter(ed => ed.id !== edge.id));
                            resetAlgorithm();
                        }
                    }}
                >
                    <title>右键删除</title>
                </line>
                
                {/* Visible line */}
                <line 
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y} 
                    stroke={style.stroke} 
                    strokeWidth={style.strokeWidth}
                    opacity={style.opacity}
                    className="pointer-events-none transition-all duration-300"
                />
            </g>
          );
        })}

        {/* 2. Drag Line (Temporary) - Visible during Add Edge action */}
        {edgeStart && mousePos && (
          <line 
            x1={getNodePos(edgeStart).x} 
            y1={getNodePos(edgeStart).y} 
            x2={mousePos.x} 
            y2={mousePos.y} 
            stroke={COLORS.primary} 
            strokeWidth="2" 
            strokeDasharray="5,5" 
            className="pointer-events-none" 
            style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' }}
          />
        )}

        {/* 3. Nodes - Rendered Middle Layer */}
        {nodes.map(node => {
            const isPermanent = currentStepState?.nodeStates[node.id]?.status === 'permanent';
            const isActive = currentStepState?.activeNodeId === node.id;
            
            return (
                <g 
                    key={node.id} 
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    onMouseUp={(e) => handleMouseUp(e, node.id)}
                    onMouseEnter={() => setHoverNode(node.id)}
                    onMouseLeave={() => setHoverNode(null)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`确定删除节点 ${node.label} 吗?`)) {
                            onNodesChange(nodes.filter(n => n.id !== node.id));
                            onEdgesChange(edges.filter(ed => ed.source !== node.id && ed.target !== node.id));
                            resetAlgorithm();
                        }
                    }}
                    className="cursor-pointer transition-all duration-300"
                    style={{ opacity: (currentStepState && !currentStepState.nodeStates[node.id]) ? 0.5 : 1}}
                >
                    {/* Invisible larger hit area for easier connections - fill must be white with 0 opacity to catch events */}
                    <circle r="35" fill="white" opacity="0" />

                    <circle 
                        r={isActive ? 24 : 20} 
                        fill={getNodeColor(node.id)}
                        stroke={getNodeStroke(node.id)}
                        strokeWidth={isActive ? 4 : 3}
                        className="shadow-md pointer-events-none" // Events handled by group
                    />
                    <text 
                        textAnchor="middle" 
                        dy="5" 
                        fill="white" 
                        className="font-bold text-sm pointer-events-none select-none"
                    >
                        {node.label}
                    </text>
                    
                    {/* Double Label Display */}
                    {showLabels && (
                        <foreignObject x="25" y="-15" width="100" height="40" className="overflow-visible pointer-events-none">
                             <div className={`text-xs px-2 py-1 rounded shadow-sm border border-slate-100 whitespace-nowrap 
                                ${isPermanent ? 'bg-blue-100 text-blue-800' : 'bg-white text-slate-700'}`}>
                                {getNodeLabelText(node)}
                             </div>
                        </foreignObject>
                    )}
                </g>
            );
        })}

        {/* 4. Edge Weights (Labels) - Rendered Last (Top Layer) - No interaction now */}
        {edges.map(edge => {
          const s = getNodePos(edge.source);
          const t = getNodePos(edge.target);
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;

          return (
              <g 
                key={`label-${edge.id}`}
                transform={`translate(${midX}, ${midY})`}
                className="pointer-events-none"
              >
                {/* Background */}
                <rect x="-15" y="-12" width="30" height="24" fill="white" rx="4" stroke="#e2e8f0" strokeWidth="1" className="shadow-sm" />
                <text 
                    textAnchor="middle" 
                    dy="4" 
                    className="text-sm font-bold fill-slate-700 select-none"
                >
                    {edge.weight}
                </text>
              </g>
          );
        })}

      </svg>
    </div>
  );
};

export default GraphCanvas;
