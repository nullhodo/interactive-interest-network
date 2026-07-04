import { InterestNode } from "../types";
import { baseCategories } from "./interestData";

const calculateDynamicSaturation = (numElements: number): number => {
  const baseSaturation = 35; // 要素が少ない場合の最大彩度
  const saturationReductionPerElement = 2; // 要素1つあたりの彩度減少量
  const minCalculatedSaturation = 15; // 彩度の最小値

  // 要素数が増えるほど彩度が減少するが、最小値以下にはならない
  return Math.max(
    minCalculatedSaturation,
    baseSaturation - numElements * saturationReductionPerElement,
  );
};

// 1. ルート要素を抽出
const roots = baseCategories.filter((c) => c.isRoot);
const numTopLevelElements = roots.length;
const dynamicSaturation = calculateDynamicSaturation(numTopLevelElements);

// 2. ルート要素ごとのカラーマップを作成
const rootColorMap = new Map<string, string>();
roots.forEach((root, index) => {
  rootColorMap.set(
    root.name,
    `hsl(${(360 / numTopLevelElements) * index}, ${dynamicSaturation}%, 95%)`,
  );
});

// 3. 親→子の隣接リストを作成
const childrenMap = new Map<string, string[]>();
baseCategories.forEach((node) => {
  if (node.parents) {
    node.parents.forEach((parent) => {
      if (!childrenMap.has(parent)) {
        childrenMap.set(parent, []);
      }
      childrenMap.get(parent)!.push(node.name);
    });
  }
});

// 4. 各ノードがどのルートに所属するかをBFS（幅優先探索）で判定
const nodeToRootMap = new Map<string, string>();
const queue: { name: string; rootName: string }[] = [];

roots.forEach((root) => {
  nodeToRootMap.set(root.name, root.name);
  queue.push({ name: root.name, rootName: root.name });
});

while (queue.length > 0) {
  const { name, rootName } = queue.shift()!;
  const children = childrenMap.get(name) || [];
  children.forEach((childName) => {
    if (!nodeToRootMap.has(childName)) {
      nodeToRootMap.set(childName, rootName);
      queue.push({ name: childName, rootName });
    }
  });
}

// 5. 最終的なテーマカラーを適用してデータをエクスポート
export const initialData: InterestNode[] = baseCategories.map((node) => {
  const associatedRoot = nodeToRootMap.get(node.name) || "";
  const themeColor = rootColorMap.get(associatedRoot) || null;
  return {
    ...node,
    themeColor: themeColor || undefined,
  };
});
