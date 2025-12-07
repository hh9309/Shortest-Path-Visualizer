import React from 'react';
import { AlgorithmStep, Node } from '../types';

interface DataTableProps {
  currentStep: AlgorithmStep | null;
  nodes: Node[];
}

const DataTable: React.FC<DataTableProps> = ({ currentStep, nodes }) => {
  if (!currentStep) return (
    <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
        点击“开始计算”查看数据
    </div>
  );

  const sortedNodes = [...nodes].sort((a, b) => parseInt(a.id) - parseInt(b.id));

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 border-b">节点</th>
            <th className="px-3 py-2 border-b">d (距离)</th>
            <th className="px-3 py-2 border-b">p (前驱)</th>
            <th className="px-3 py-2 border-b">状态</th>
          </tr>
        </thead>
        <tbody className="bg-white">
            {sortedNodes.map(node => {
                const state = currentStep.nodeStates[node.id];
                if (!state) return null;
                const isPermanent = state.status === 'permanent';
                const isStart = state.distance === 0 && state.parent === node.id;
                
                return (
                    <tr key={node.id} className={`border-b hover:bg-slate-50 transition-colors ${currentStep.activeNodeId === node.id ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                            {node.label}
                        </td>
                        <td className="px-3 py-2 font-mono">
                            {state.distance === Infinity ? '∞' : state.distance}
                        </td>
                        <td className="px-3 py-2">
                             {state.parent ? (
                                 state.parent === node.id ? '-' : `${nodes.find(n => n.id === state.parent)?.label}`
                             ) : '-'}
                        </td>
                        <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                isPermanent 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-amber-100 text-amber-700'
                            }`}>
                                {isPermanent ? 'P (永久)' : 'T (临时)'}
                            </span>
                        </td>
                    </tr>
                );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;