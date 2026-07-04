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

const numTopLevelElements = baseCategories.length;
const dynamicSaturation = calculateDynamicSaturation(numTopLevelElements);

export const initialData: InterestNode[] = baseCategories.map(
  (category, index) => ({
    ...category,
    themeColor: `hsl(${(360 / numTopLevelElements) * index}, ${dynamicSaturation}%, 95%)`,
  }),
);
