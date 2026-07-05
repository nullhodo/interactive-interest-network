import { InterestNode, SimulationNode, SimulationLink } from "../types";

/**
 * データを元に、現在表示すべきノードとリンクを計算する関数
 */
export const generateNodesAndLinks = (
  data: InterestNode[],
  expandedNodeIds: Set<string>,
  currentSimulationNodesMap: Map<string, SimulationNode>,
  currentWidth: number,
  currentHeight: number,
): { newNodes: SimulationNode[]; newLinks: SimulationLink[] } => {
  const newNodes: SimulationNode[] = [];
  const newLinks: SimulationLink[] = [];

  // 1. ノードマップと親 → 子の隣接リストを作成
  const nodeMap = new Map<string, InterestNode>(data.map((d) => [d.name, d]));
  const childrenMap = new Map<string, string[]>();
  data.forEach((node) => {
    if (node.parents) {
      node.parents.forEach((parent) => {
        if (!childrenMap.has(parent)) {
          childrenMap.set(parent, []);
        }
        childrenMap.get(parent)!.push(node.name);
      });
    }
  });

  // 2. BFSで表示するノード、深さ、主要な親を決定
  const visibleNodeNames = new Set<string>();
  const nodeDepths = new Map<string, number>();
  const nodeParent = new Map<string, string | null>();

  const queue: { name: string; parent: string | null; depth: number }[] = [];

  // ルートノードをすべて初期キューに登録
  data.filter((d) => d.isRoot).forEach((root) => {
    queue.push({ name: root.name, parent: null, depth: 0 });
  });

  while (queue.length > 0) {
    const { name, parent, depth } = queue.shift()!;
    if (visibleNodeNames.has(name)) continue;

    visibleNodeNames.add(name);
    nodeDepths.set(name, depth);
    nodeParent.set(name, parent);

    // 親が展開されている場合のみ、その子供たちを表示候補に追加
    if (expandedNodeIds.has(name)) {
      const children = childrenMap.get(name) || [];
      children.forEach((childName) => {
        if (!visibleNodeNames.has(childName)) {
          queue.push({ name: childName, parent: name, depth: depth + 1 });
        }
      });
    }
  }

  // 3. 表示対象ノードから SimulationNode を作成
  visibleNodeNames.forEach((name) => {
    const nodeData = nodeMap.get(name);
    if (!nodeData) return;

    const id = name;
    const depth = nodeDepths.get(name) ?? 0;
    const parentId = nodeParent.get(name) ?? null;

    const newNode: SimulationNode = {
      id,
      name,
      depth,
      parentId,
      data: nodeData,
      themeColor: nodeData.themeColor ?? null,
    };

    const oldSimulationNode = currentSimulationNodesMap.get(id);
    if (oldSimulationNode) {
      newNode.x = oldSimulationNode.x;
      newNode.y = oldSimulationNode.y;
      newNode.vx = oldSimulationNode.vx;
      newNode.vy = oldSimulationNode.vy;
      newNode.fx = oldSimulationNode.fx;
      newNode.fy = oldSimulationNode.fy;
    } else {
      // 親ノードがすでにシミュレーション上に存在する場合は、親ノードの位置を初期位置とする
      const parentSimNode = parentId ? currentSimulationNodesMap.get(parentId) : null;
      if (parentSimNode && parentSimNode.x !== undefined && parentSimNode.y !== undefined) {
        // 子ノードが重なって巨大な斥力が発生するのを防ぐため、親の周囲に少し散らして配置する
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 20; // 20px ~ 40px の範囲
        newNode.x = parentSimNode.x + Math.cos(angle) * radius;
        newNode.y = parentSimNode.y + Math.sin(angle) * radius;
      } else {
        newNode.x =
          currentWidth / 2 + (Math.random() - 0.5) * currentWidth * 1.0;
        newNode.y =
          currentHeight / 2 + (Math.random() - 0.5) * currentHeight * 1.0;
      }
    }
    newNodes.push(newNode);
  });

  // 4. 表示対象ノード間を結ぶリンクを生成
  data.forEach((node) => {
    if (visibleNodeNames.has(node.name) && node.parents) {
      node.parents.forEach((parentName) => {
        if (visibleNodeNames.has(parentName)) {
          newLinks.push({ source: parentName, target: node.name });
        }
      });
    }
  });

  return { newNodes, newLinks };
};

/**
 * 子ノードを持っているノードのセットを作成する
 */
export const getHasChildrenSet = (data: InterestNode[]): Set<string> => {
  const hasChildrenSet = new Set<string>();
  data.forEach((node) => {
    if (node.parents) {
      node.parents.forEach((p) => hasChildrenSet.add(p));
    }
  });
  return hasChildrenSet;
};
