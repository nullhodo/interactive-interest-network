import type * as d3 from "d3";

export interface InterestNode {
  name: string;
  url?: string;
  theme?: string;
  themeColor?: string;
  isRoot?: boolean;
  parents?: string[];
}

export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  depth: number;
  parentId: string | null;
  data: InterestNode;
  themeColor: string | null;
}

export interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
}
