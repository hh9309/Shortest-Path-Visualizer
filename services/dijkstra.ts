import { Node, Edge, AlgorithmStep, AlgorithmNodeState } from '../types';

export const runDoubleLabeling = (
  nodes: Node[],
  edges: Edge[],
  startNodeId: string,
  endNodeId: string
): AlgorithmStep[] => {
  const steps: AlgorithmStep[] = [];
  
  // Initialize states
  const nodeStates: Record<string, AlgorithmNodeState> = {};
  nodes.forEach(node => {
    nodeStates[node.id] = {
      distance: node.id === startNodeId ? 0 : Infinity,
      parent: node.id === startNodeId ? startNodeId : null,
      status: node.id === startNodeId ? 'temporary' : 'unvisited',
    };
  });

  // Helper to clone state for snapshots
  const snapshot = (
    desc: string, 
    active: string | null, 
    edge: string | null,
    perms: string[]
  ) => {
    steps.push({
      stepIndex: steps.length,
      description: desc,
      activeNodeId: active,
      checkingEdgeId: edge,
      nodeStates: JSON.parse(JSON.stringify(nodeStates)),
      permanentNodes: [...perms]
    });
  };

  const permanentNodes: string[] = [];
  let unvisitedCount = nodes.length;

  // Step 0: Initial State
  snapshot("初始化：设定起点标号 [0, 起点]，其他节点为 [∞, -]。", null, null, permanentNodes);

  while (unvisitedCount > 0) {
    // 1. Find the node with the smallest distance among non-permanent nodes (temporary nodes)
    
    let minDistance = Infinity;
    let u: string | null = null;

    for (const node of nodes) {
      if (nodeStates[node.id].status !== 'permanent') {
        if (nodeStates[node.id].distance < minDistance) {
          minDistance = nodeStates[node.id].distance;
          u = node.id;
        }
      }
    }

    // If no reachable node is left (all remaining are infinity), break
    if (u === null || minDistance === Infinity) {
        snapshot("没有更多可达的临时节点。算法结束。", null, null, permanentNodes);
        break;
    }

    // 2. Mark u as Permanent (P-label)
    nodeStates[u].status = 'permanent';
    permanentNodes.push(u);
    unvisitedCount--;
    
    snapshot(
      `选定临时标号最小的节点 ${nodes.find(n => n.id === u)?.label} (d=${nodeStates[u].distance})，将其标记为 P (永久标号)。`, 
      u, 
      null, 
      permanentNodes
    );

    if (u === endNodeId) {
      snapshot(`已到达终点 ${nodes.find(n => n.id === u)?.label}。最短路径找到。`, u, null, permanentNodes);
      break;
    }

    // 3. Update neighbors
    // Find all outgoing edges from u
    const neighbors = edges.filter(e => e.source === u || e.target === u);
    
    for (const edge of neighbors) {
      const targetId = edge.source === u ? edge.target : edge.source;
      
      if (nodeStates[targetId].status !== 'permanent') {
        const newDist = nodeStates[u].distance + edge.weight;
        const currentDist = nodeStates[targetId].distance;

        if (newDist < currentDist) {
          nodeStates[targetId].distance = newDist;
          nodeStates[targetId].parent = u;
          nodeStates[targetId].status = 'temporary'; // It is now a T-label with finite value
          
          snapshot(
            `更新节点 ${nodes.find(n => n.id === targetId)?.label} 的标号：由 ${currentDist === Infinity ? '∞' : currentDist} 更新为 ${newDist} (来自 ${nodes.find(n => n.id === u)?.label})。`,
            u,
            edge.id,
            permanentNodes
          );
        } else {
             snapshot(
            `检查节点 ${nodes.find(n => n.id === targetId)?.label}：现有距离 ${currentDist} <= 新路径 ${newDist}，不更新。`,
            u,
            edge.id,
            permanentNodes
          );
        }
      }
    }
  }

  return steps;
};