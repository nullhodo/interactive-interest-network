import type { InterestNode } from "../types";

export const baseCategories: InterestNode[] = [
  // --- ルートノード (isRoot: true) ---
  { name: "コンテンツ", isRoot: true },
  { name: "音楽", parents: ["コンテンツ"] },
  { name: "プログラミング", isRoot: true },
  { name: "読書", isRoot: true },
  { name: "ゲーム", parents: ["コンテンツ"] },
  { name: "SNS", isRoot: true },
  { name: "ことば", isRoot: true },
  { name: "インターネット", isRoot: true },
  { name: "学問", isRoot: true },
  { name: "生物", isRoot: true },
  { name: "アニメ・漫画", parents: ["コンテンツ"] },
  // { name: "ソフトウェア探索 (?)", isRoot: true },
  { name: "アート", isRoot: true },

  // --- 音楽の配下 ---
  { name: "音声合成", parents: ["音楽"] },
  { name: "サイハテ", url: "https://www.nicovideo.jp/watch/sm2053548", parents: ["音声合成"] },
  { name: "淡々、回想", parents: ["音声合成"] },
  { name: "潮汐", url: "https://www.youtube.com/watch?v=A_AcFKluuAk", parents: ["音声合成"] },
  { name: "平沢進", parents: ["音楽"] },
  { name: "ライブにも行く", parents: ["平沢進", "青葉市子"] },
  { name: "青葉市子", parents: ["音楽"] },
  { name: "AURORA", parents: ["音楽"] },
  { name: "シューゲイザー", parents: ["音楽"] },
  { name: "Lo-fi", parents: ["音楽"] },
  { name: "Nujabes", parents: ["Lo-fi"] },
  { name: "8bit", parents: ["音楽"] },
  { name: "City Pop", parents: ["音楽"] },
  { name: "東方Project", parents: ["音楽"] },
  { name: "Hip-Hop", parents: ["音楽", "韻"] },
  { name: "鎮座\nDOPENESS", parents: ["Hip-Hop"] },

  // --- プログラミングの配下 ---
  { name: "クリエイティブ\nコーディング", parents: ["プログラミング", "アート", "Rules-based"] },
  { name: "Processing\np5.js", parents: ["クリエイティブ\nコーディング"] },
  { name: "GLSL", parents: ["クリエイティブ\nコーディング"] },
  { name: "フラクタル", parents: ["クリエイティブ\nコーディング", "数学", "貝"] },
  { name: "Web", parents: ["プログラミング"] },
  { name: "JavaScript", parents: ["Web"] },
  { name: "TypeScript", parents: ["Web"] },
  { name: "Python", parents: ["プログラミング"] },
  { name: "Astro", parents: ["Web"] },
  { name: "Webデザイン", parents: ["Web", "アート"] },
  { name: "UX", parents: ["認知心理学", "Webデザイン"] },
  { name: "SNS bot", parents: ["プログラミング", "SNS"] },

  // --- 読書の配下 ---
  { name: "SF", parents: ["読書"] },
  { name: "ファンタジー", parents: ["読書"] },
  { name: "ミステリー", parents: ["読書"] },
  { name: "青柳碧人", parents: ["ミステリー"] },
  { name: "浜村渚の\n計算ノート", parents: ["青柳碧人", "数学"] },
  { name: "芦沢央", parents: ["ミステリー"] },

  // --- ゲームの配下 ---
  { name: "将棋", parents: ["ゲーム"] },
  { name: "ADV", parents: ["ゲーム"] },
  { name: "ファミレスを\n享受せよ", url: "https://store.steampowered.com/app/2336980/_/", parents: ["ADV"] },

  // --- SNSの配下 ---
  { name: "X", url: "https://x.com/nullhodo", parents: ["SNS", "インターネット"] },
  { name: "Bluesky", url: "https://bsky.app/profile/nullhodo.bsky.social", parents: ["SNS"] },
  { name: "fedibird", parents: ["SNS"] },
  { name: "GitHub", url: "https://github.com/nullhodo", parents: ["SNS"] },

  // --- ことばの配下 ---
  {name: "言語", parents: ["ことば"] },
  { name: "日本語", parents: ["言語"] },
  { name: "文字", parents: ["ことば"] },
  { name: "漢字", parents: ["文字"] },
  { name: "部首", parents: ["漢字"] },
  { name: "旧字体", parents: ["漢字"] },
  { name: "西夏文字", parents: ["文字"] },
  { name: "Unicode", parents: ["文字"] },
  { name: "アンビグラム", parents: ["文字"] },
  { name: "フォント", parents: ["文字"] },
  { name: "カリグラフィー", parents: ["文字", "アート"] },
  { name: "英語", parents: ["言語"] },
  { name: "韓国語", parents: ["言語"] },
  { name: "韻", parents: ["ことば"] },

  // --- インターネットの配下 ---
  { name: "ニコニコ動画", parents: ["インターネット"] },
  { name: "オモコロ", parents: ["インターネット"] },

  // --- 学問の配下 ---
  { name: "心理学", parents: ["学問"] },
  { name: "教育心理学", parents: ["心理学"] },
  { name: "発達心理学", parents: ["心理学"] },
  { name: "認知心理学", parents: ["心理学"] },
  { name: "統計学\nデータサイエンス", parents: ["学問"] },
  { name: "言語学", parents: ["学問", "ことば"] },
  { name: "数学", parents: ["学問"] },
  { name: "法学", parents: ["学問", "ことば"] },
  { name: "Rules-based", parents: ["法学", "プログラミング"] },

  // --- 生物の配下 ---
  { name: "魚", parents: ["生物"] },
  { name: "貝", parents: ["生物"] },
  { name: "両生類", parents: ["生物"] },
  { name: "爬虫類", parents: ["生物"] },

  // --- アニメ・漫画の配下 ---
  { name: "蟲師", parents: ["アニメ・漫画"] },
  { name: "灰羽連盟", parents: ["アニメ・漫画"] },
  { name: "宇宙よりも遠い場所", parents: ["アニメ・漫画"] },

  // --- ソフトウェア探索の配下 ---
  // { name: "Web Browser", parents: ["ソフトウェア探索 (?)"] },
  // { name: "Vivaldi", parents: ["Web Browser"] },

  // --- アートの配下 ---
  { name: "折り紙", parents: ["アート", "数学"] },
  { name: "映像", parents: ["アート"] },
  { name: "モーション\nグラフィックス", parents: ["映像"] },
];
