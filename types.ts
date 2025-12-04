
export interface Node {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export type NodeStatus = 'unvisited' | 'temporary' | 'permanent';

export interface AlgorithmNodeState {
  distance: number;
  parent: string | null;
  status: NodeStatus;
}

export interface AlgorithmStep {
  stepIndex: number;
  description: string;
  activeNodeId: string | null; // The node currently being processed (made permanent)
  checkingEdgeId: string | null; // The edge currently being relaxed
  nodeStates: Record<string, AlgorithmNodeState>;
  permanentNodes: string[];
}

export enum EditorMode {
  SELECT = 'SELECT',
  ADD_NODE = 'ADD_NODE',
  ADD_EDGE = 'ADD_EDGE',
  SET_START = 'SET_START',
  SET_END = 'SET_END',
}
