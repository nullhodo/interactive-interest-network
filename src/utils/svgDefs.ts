import * as d3 from "d3";
import type { InterestNode } from "../types";

/**
 * CSS変数（カスタムプロパティ）を安全に読み込むヘルパー関数
 */
const getCssVariable = (name: string, defaultValue: string): string => {
  if (typeof window !== "undefined") {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || defaultValue;
  }
  return defaultValue;
};

export const defineSvgGradients = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: InterestNode[],
) => {
  // グラデーションの定義
  let defs = svg.select<SVGDefsElement>("defs");
  if (defs.empty()) {
    defs = svg.append("defs");
  }

  // 各テーマカラーに対応するグラデーションを生成
  const uniqueThemeColors = Array.from(
    new Set(data.map((d) => d.themeColor).filter(Boolean)),
  ) as string[];

  uniqueThemeColors.forEach((color) => {
    const gradientId = `themeGradient-${color.replace(/[^\w]/g, "")}`;
    defs.select(`#${gradientId}`).remove();

    const linearGradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");

    const hsl = d3.hsl(color);
    linearGradient
      .append("stop")
      .attr("offset", "0%")
      .attr(
        "stop-color",
        d3.hsl(hsl.h, hsl.s, Math.min(1, hsl.l + 0.08)).toString(),
      );

    linearGradient
      .append("stop")
      .attr("offset", "50%")
      .attr("stop-color", color);

    linearGradient
      .append("stop")
      .attr("offset", "100%")
      .attr(
        "stop-color",
        d3.hsl(hsl.h, hsl.s, Math.max(0, hsl.l - 0.08)).toString(),
      );
  });

  // デフォルトの石のようなグラデーション
  const defaultGradientId = "stoneGradient";
  defs.select(`#${defaultGradientId}`).remove();
  const defaultLinearGradient = defs
    .append("linearGradient")
    .attr("id", defaultGradientId)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");

  defaultLinearGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#ffffff");

  defaultLinearGradient
    .append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "#f8f8f8");

  defaultLinearGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#eeeeee");

  // 反射光用のグラデーションを定義
  const shineGradientId = "shineGradient";
  defs.select(`#${shineGradientId}`).remove(); // 再描画時に古い定義を削除

  // CSS変数から輝き設定を動的に取得
  const x1 = getCssVariable("--shine-angle-x1", "0%");
  const y1 = getCssVariable("--shine-angle-y1", "0%");
  const x2 = getCssVariable("--shine-angle-x2", "100%");
  const y2 = getCssVariable("--shine-angle-y2", "100%");
  const shineColor = getCssVariable("--shine-color", "#ffffff");
  const maxOpacity = Number.parseFloat(
    getCssVariable("--shine-max-opacity", "0.8"),
  );

  const shineGradient = defs
    .append("linearGradient")
    .attr("id", shineGradientId)
    .attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", x2)
    .attr("y2", y2);

  /*
  位置 (%)         0% ------- 25% ------ 50% ------ 75% ------ 100%
  不透明度          0 (透明)    0 (透明)   maxOpacity  0 (透明)    0 (透明)
  */

  shineGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", shineColor)
    .attr("stop-opacity", 0);

  shineGradient
    .append("stop")
    .attr("offset", "25%")
    .attr("stop-color", shineColor)
    .attr("stop-opacity", 0);

  shineGradient
    .append("stop")
    .attr("offset", "50%")
    .attr("stop-color", shineColor)
    .attr("stop-opacity", maxOpacity);

  shineGradient
    .append("stop")
    .attr("offset", "75%")
    .attr("stop-color", shineColor)
    .attr("stop-opacity", 0);

  shineGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", shineColor)
    .attr("stop-opacity", 0);
};
