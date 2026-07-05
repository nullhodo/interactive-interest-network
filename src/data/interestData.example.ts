import { InterestNode } from "../types";

// サンプルデータ: 趣味や興味のつながりを表す複雑なネットワーク構成例
// 実際の自分のデータを使用する場合は、このファイルをコピーして `interestData.ts` を作成してください。
// `interestData.ts` は .gitignore によって Git の管理対象から外れるようになっています。
export const baseCategories: InterestNode[] = [
  // --- ルートノード (isRoot: true) ---
  { name: "テクノロジー", isRoot: true, themeColor: "blue" },
  { name: "デザイン", isRoot: true, themeColor: "pink" },
  { name: "サイエンス", isRoot: true, themeColor: "green" },
  { name: "カルチャー", isRoot: true },

  // --- テクノロジーの配下 ---
  { name: "ソフトウェア", parents: ["テクノロジー"] },
  { name: "ハードウェア", parents: ["テクノロジー"] },
  { name: "Web開発", parents: ["ソフトウェア"] },
  { name: "AI・機械学習", parents: ["ソフトウェア", "サイエンス"] },
  { name: "フロントエンド", parents: ["Web開発"] },
  { name: "バックエンド", parents: ["Web開発"] },
  { name: "React", parents: ["フロントエンド"], url: "https://react.dev/" },
  { name: "IoT", parents: ["ハードウェア", "ソフトウェア"] },

  // --- デザインの配下 ---
  { name: "UI/UX", parents: ["デザイン", "テクノロジー"] },
  { name: "タイポグラフィ", parents: ["デザイン"] },
  { name: "色彩工学", parents: ["デザイン", "サイエンス"] },

  // --- サイエンスの配下 ---
  { name: "物理学", parents: ["サイエンス"] },
  { name: "数学", parents: ["サイエンス"] },
  { name: "量子コンピュータ", parents: ["物理学", "テクノロジー"] },

  // --- カルチャーの配下 ---
  { name: "映画", parents: ["カルチャー"] },
  { name: "音楽", parents: ["カルチャー"] },
  { name: "電子音楽", parents: ["音楽", "テクノロジー"] },
  { name: "シンセサイザー", parents: ["電子音楽", "ハードウェア"] },
  
  // --- さらに深い階層・改行・複数親のテスト ---
  { name: "モジュラー\nシンセ", parents: ["シンセサイザー"], themeColor: "orange" },
  { name: "生成AI", parents: ["AI・機械学習"] },
  { name: "LLM", parents: ["生成AI"] },
  { name: "プロンプト\nエンジニアリング", parents: ["LLM", "カルチャー"] }
];
