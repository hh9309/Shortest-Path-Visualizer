
import { Node, Edge } from './types';

export const COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#64748b', // slate-500
  success: '#22c55e', // green-500
  danger: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  background: '#f8fafc', // slate-50
  permanent: '#3b82f6',
  temporary: '#f59e0b',
  unvisited: '#cbd5e1',
  start: '#22c55e',
  end: '#ef4444',
};

// 坐标优化：再次上移并微调 X 轴分布，使图在视野中更加紧凑且居中
export const INITIAL_NODES: Node[] = [
  { id: '1', x: 220, y: 150, label: 'v1' },
  { id: '2', x: 420, y: 50, label: 'v2' },
  { id: '3', x: 420, y: 250, label: 'v3' },
  { id: '4', x: 620, y: 50, label: 'v4' },
  { id: '5', x: 620, y: 250, label: 'v5' },
  { id: '6', x: 820, y: 150, label: 'v6' },
];

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: '1', target: '2', weight: 4 },
  { id: 'e2', source: '1', target: '3', weight: 2 },
  { id: 'e3', source: '2', target: '3', weight: 1 },
  { id: 'e4', source: '2', target: '4', weight: 5 },
  { id: 'e5', source: '3', target: '4', weight: 8 },
  { id: 'e6', source: '3', target: '5', weight: 10 },
  { id: 'e7', source: '4', target: '5', weight: 2 },
  { id: 'e8', source: '4', target: '6', weight: 6 },
  { id: 'e9', source: '5', target: '6', weight: 3 },
];
