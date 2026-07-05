// ノードの初期半径を計算する関数 (深さに応じてサイズを調整)
export const getNodeRadius = (name: string, depth: number): number => {
  const lines = name.split("\n");
  const maxLineLength = Math.max(...lines.map((l) => l.length));
  const baseRadius = 75;
  const textLengthFactor = maxLineLength * 3.5;
  // 深くなるほどサイズを大幅に小さくする
  let depthReductionFactor: number;
  if (depth === 0) {
    depthReductionFactor = 0;
  } else if (depth === 1) {
    depthReductionFactor = 40; // 親子間のサイズ差を緩やかに
  } else if (depth === 2) {
    depthReductionFactor = 65; // 孫要素のサイズを緩やかに
  } else {
    depthReductionFactor = 75; // ひ孫要素以降を緩やかに
  }

  return Math.max(8, baseRadius + textLengthFactor - depthReductionFactor);
};

// ノードの初期y半径を計算する関数 (楕円の縦幅、深さと行数に応じて調整)
export const getNodeRy = (name: string, depth: number): number => {
  const lines = name.split("\n");
  const lineCount = lines.length;
  
  const baseRy = 60;
  const extraHeightFactor = (lineCount - 1) * 15; // 複数行なら高さを増やす
  // 深くなるほどサイズを大幅に小さくする
  let depthReductionFactor: number;
  if (depth === 0) {
    depthReductionFactor = 0;
  } else if (depth === 1) {
    depthReductionFactor = 30; // 親子間のサイズ差を緩やかに
  } else if (depth === 2) {
    depthReductionFactor = 40; // 孫要素のサイズを緩やかに
  } else {
    depthReductionFactor = 45; // ひ孫要素以降を緩やかに
  }

  return Math.max(5, baseRy + extraHeightFactor - depthReductionFactor);
};

/**
 * superellipseのパスデータを生成する。
 * 式: |x/rx|^n + |y/ry|^n = 1
 *
 * @param rx 横方向の半径 (半長軸)
 * @param ry 縦方向の半径 (半短軸)
 * @param n 形状を制御する指数。2で通常の楕円になり、大きくなるほど角の立った四角形に近づく（2.5〜4.0付近がスクワークルとして美しい）
 * @returns SVGのd属性に使用可能なパス文字列
 */
export const getSuperellipsePath = (rx: number, ry: number, n = 3): string => {
  const steps = 64;
  let pathData = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i * 2 * Math.PI) / steps;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const x = rx * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / n);
    const y = ry * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / n);
    if (i === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  }
  pathData += " Z";
  return pathData;
};

// SVGのID属性などで使用できる安全な文字列を生成する関数（日本語・特殊文字対応）
// 日本語名のノードでも光の反射のクリッピングが正しく動くようにするため
export const getSafeSvgId = (str: string): string => {
  return encodeURIComponent(str)
    .replace(/%/g, "_")
    .replace(/[^\w]/g, "_");
};
