import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { InterestNode, SimulationNode, SimulationLink } from "../types";

// ノードの初期半径を計算する関数 (深さに応じてサイズを調整)
const getNodeRadius = (name: string, depth: number): number => {
  const baseRadius = 75; // 基本半径をさらに大きく
  // アイコンの場合はテキスト長の影響を減らす
  const textLengthFactor =
    name.length * 3.5 * (name === "X" || name === "Bluesky" ? 0.5 : 1);
  // 深くなるほどサイズを大幅に小さくする
  let depthReductionFactor: number;
  if (depth === 0) depthReductionFactor = 0;
  else if (depth === 1)
    depthReductionFactor = 40; // 親子間のサイズ差を緩やかに
  else if (depth === 2)
    depthReductionFactor = 65; // 孫要素のサイズを緩やかに
  else depthReductionFactor = 75; // ひ孫要素以降を緩やかに

  return Math.max(8, baseRadius + textLengthFactor - depthReductionFactor); // 最小サイズをさらに小さく
};

// ノードの初期y半径を計算する関数 (楕円の縦幅、深さに応じて調整)
const getNodeRy = (depth: number): number => {
  const baseRy = 60; // 基本縦幅をさらに大きく
  // 深くなるほどサイズを大幅に小さくする
  let depthReductionFactor: number;
  if (depth === 0) depthReductionFactor = 0;
  else if (depth === 1)
    depthReductionFactor = 30; // 親子間のサイズ差を緩やかに
  else if (depth === 2)
    depthReductionFactor = 40; // 孫要素のサイズを緩やかに
  else depthReductionFactor = 45; // ひ孫要素以降を緩やかに

  return Math.max(5, baseRy - depthReductionFactor); // 最小サイズをさらに小さく
};

interface WordCloudProps {
  data: InterestNode[];
}

type HintKey = "clicked" | "move_field" | "scrolled";

interface UserActions {
  clicked: boolean;
  dragged: boolean;
  keyed: boolean;
  scrolled: boolean;
  move_field: boolean;
}

export const WordCloud = ({ data }: WordCloudProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [links, setLinks] = useState<SimulationLink[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(),
  );

  // 操作教示のためのステート
  const HINT_INITIAL_DELAY = 5000; // 最初のヒントが表示されるまでの時間
  const HINT_DISPLAY_DURATION = 7000; // 各ヒントが表示される時間

  const hintMessagesMap: Record<HintKey, string> = {
    clicked: "楕円をクリックして展開",
    move_field: "空白をドラッグ、またはWASDキーや矢印キーでフィールドを移動",
    scrolled: "ホイールスクロールでズーム",
  };
  const hintOrder: HintKey[] = ["clicked", "move_field", "scrolled"];

  const [userActions, setUserActions] = useState<UserActions>({
    clicked: false,
    dragged: false,
    keyed: false,
    scrolled: false,
    move_field: false,
  });
  const [currentHintMessage, setCurrentHintMessage] = useState<string | null>(
    null,
  );
  const [isFadingOut, setIsFadingOut] = useState(false); // フェードアウト中かどうかのフラグ
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintSequenceIndexRef = useRef(0);

  // D3シミュレーションの参照を保持
  const simulationRef = useRef<d3.Simulation<
    SimulationNode,
    SimulationLink
  > | null>(null);
  // D3ズームの参照を保持
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // 現在のズームトランスフォームを保持 (キーボード操作用)
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // 1. D3 Simulation & Zoom Initialization (runs once on mount)
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const svg = d3.select(svgElement);
    const width = svgElement.clientWidth;
    const height = svgElement.clientHeight;

    let g = svg.select<SVGGElement>(".main-group");
    if (g.empty()) {
      g = svg.append("g").attr("class", "main-group");
    }

    // グラデーションの定義 (石のような立体感を出すため)
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

    // Initialize simulation
    const linkForce = d3
      .forceLink<SimulationNode, SimulationLink>()
      .id((d) => d.id)
      .distance((d) => {
        const sourceDepth = (d.source as SimulationNode).depth;
        if (sourceDepth === 0) return 40; // トップレベルノードからの距離を短縮
        if (sourceDepth === 1) return 25; // 第二階層からの距離を短縮
        if (sourceDepth === 2) return 15; // 第三階層からの距離を短縮
        return 5; // それ以降の階層からの距離を短縮
      });

    simulationRef.current = d3
      .forceSimulation<SimulationNode, SimulationLink>()
      .force("link", linkForce)
      .force("charge", d3.forceManyBody().strength(-5000)) // 反発力を調整
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide<SimulationNode>()
          .radius((d) => getNodeRadius(d.name, d.depth) + 30)
          .iterations(3),
      )
      .force("x", d3.forceX(width / 2).strength(0.3))
      .force("y", d3.forceY(height / 2).strength(0.3));

    // Initialize zoom
    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        currentTransformRef.current = event.transform;
        // ホイールスクロールアクションを追跡
        if (event.sourceEvent && event.sourceEvent.type === "wheel") {
          setUserActions((prev) => ({ ...prev, scrolled: true }));
        }
      });
    svg.call(zoomRef.current);

    // Initial resize handler setup
    const handleResize = () => {
      const newWidth = svgElement.clientWidth;
      const newHeight = svgElement.clientHeight;
      if (simulationRef.current) {
        simulationRef.current.force(
          "center",
          d3.forceCenter(newWidth / 2, newHeight / 2),
        );
        simulationRef.current.force("x", d3.forceX(newWidth / 2).strength(0.3));
        simulationRef.current.force(
          "y",
          d3.forceY(newHeight / 2).strength(0.3),
        );
        simulationRef.current.alpha(1).restart(); // 強制的に再起動して初期配置を修正
      }
      // Trigger data update with new dimensions
      setExpandedNodeIds((prev) => new Set(prev)); // Force re-generation of nodes/links
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [data]); // Run only on mount and if data ref changes

  // 2. Data Generation (useCallback to prevent re-creation on every render)
  const generateNodesAndLinks = useCallback(() => {
    const svgElement = svgRef.current;
    if (!svgElement || !simulationRef.current) {
      console.warn("SVG element or simulation not ready for data generation.");
      return { newNodes: [], newLinks: [] };
    }
    const currentWidth = svgElement.clientWidth;
    const currentHeight = svgElement.clientHeight;

    const newNodes: SimulationNode[] = [];
    const newLinks: SimulationLink[] = [];
    const currentSimulationNodesMap = new Map<string, SimulationNode>(
      simulationRef.current.nodes().map((node) => [node.id, node]),
    );

    // 1. ノードマップと親→子の隣接リストを作成
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

    // 2. BFS（幅優先探索）で表示するノード、深さ、主要な親を決定
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
        newNode.x =
          currentWidth / 2 + (Math.random() - 0.5) * currentWidth * 1.0;
        newNode.y =
          currentHeight / 2 + (Math.random() - 0.5) * currentHeight * 1.0;
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
  }, [data, expandedNodeIds]);

  // 3. State Update Trigger (runs when expandedNodeIds changes, or on initial mount)
  useEffect(() => {
    if (!simulationRef.current || !svgRef.current) {
      return;
    }
    const { newNodes, newLinks } = generateNodesAndLinks();
    setNodes(newNodes);
    setLinks(newLinks);
  }, [expandedNodeIds, generateNodesAndLinks]);

  // 4. D3 Rendering & Simulation Tick (runs when nodes/links state changes)
  useEffect(() => {
    if (!simulationRef.current || nodes.length === 0 || !svgRef.current) {
      return;
    }

    // 子ノードを持っている（親である）ノードのセットを作成
    const hasChildrenSet = new Set<string>();
    data.forEach((node) => {
      if (node.parents) {
        node.parents.forEach((p) => hasChildrenSet.add(p));
      }
    });

    const simulation = simulationRef.current;
    const svg = d3.select(svgRef.current);
    const g = svg.select<SVGGElement>(".main-group");

    // Re-bind data
    simulation.nodes(nodes);
    const linkForce =
      simulation.force<d3.ForceLink<SimulationNode, SimulationLink>>("link");
    if (linkForce) {
      linkForce.links(links);
    }

    // Clear and redraw elements
    g.selectAll("*").remove();

    const link = g
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll<SVGLineElement, SimulationLink>("line")
      .data(links)
      .join("line");

    const dragBehavior = d3
      .drag<SVGGElement, SimulationNode>()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        setUserActions((prev) => ({
          ...prev,
          dragged: true,
          move_field: true,
        }));
      })
      .on("drag", function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const node = g
      .append("g")
      .selectAll<SVGGElement, SimulationNode>("g")
      .data(nodes)
      .join("g")
      .call(dragBehavior)
      .style("cursor", (d) => (d.data.url ? "pointer" : "grab"))
      .on("click", (event, d) => {
        setUserActions((prev) => ({ ...prev, clicked: true }));
        if (d.data.url) {
          window.open(d.data.url, "_blank");
          event.stopPropagation();
        } else {
          setExpandedNodeIds((prevIds) => {
            const newIds = new Set(prevIds);
            if (newIds.has(d.id)) {
              newIds.delete(d.id);
            } else {
              newIds.add(d.id);
            }
            return newIds;
          });
        }
      });

    node
      .append("ellipse")
      .attr("rx", (d) => getNodeRadius(d.name, d.depth))
      .attr("ry", (d) => getNodeRy(d.depth))
      .attr("fill", (d) =>
        d.themeColor
          ? `url(#themeGradient-${d.themeColor.replace(/[^\w]/g, "")})`
          : `url(#stoneGradient)`,
      )
      .attr("stroke", "none")
      .attr("stroke-width", 0)
      .style(
        "filter",
        "drop-shadow(3px 3px 6px rgba(0,0,0,0.25)) drop-shadow(-3px -3px 6px rgba(255,255,255,0.8))",
      )
      .attr("class", (d) => {
        const isPulse = hasChildrenSet.has(d.id) && !expandedNodeIds.has(d.id);
        return `node-ellipse ${isPulse ? "animate-reflective-pulse" : ""}`;
      });

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", (d) => {
        if (d.id === "X" || d.id === "Bluesky") {
          return "#333";
        }
        return d.data.url ? "#007bff" : "#333";
      })
      .style("font-size", (d) => {
        const baseSize = 22;
        let depthReduction: number;
        if (d.depth === 0) depthReduction = 0;
        else if (d.depth === 1) depthReduction = 12;
        else if (d.depth === 2) depthReduction = 20;
        else depthReduction = 24;

        let calculatedSize = Math.max(
          8,
          baseSize + (d.name.length < 5 ? 4 : 0) - depthReduction,
        );

        if (d.name.length > 8 && d.depth > 0) {
          calculatedSize *= 1 - (d.name.length - 8) * 0.04;
        }
        if (d.name.length > 12) {
          calculatedSize *= 0.7;
        }

        return `${Math.max(8, calculatedSize)}px`;
      })
      .style("font-weight", "bold")
      .style("text-decoration", (d) => {
        if (d.id === "X" || d.id === "Bluesky") {
          return "none";
        }
        return d.data.url ? "underline" : "none";
      })
      .text((d) => d.name)
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => {
          const s = d.source as SimulationNode;
          return s.x ?? 0;
        })
        .attr("y1", (d) => {
          const s = d.source as SimulationNode;
          return s.y ?? 0;
        })
        .attr("x2", (d) => {
          const t = d.target as SimulationNode;
          return t.x ?? 0;
        })
        .attr("y2", (d) => {
          const t = d.target as SimulationNode;
          return t.y ?? 0;
        });

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    const alphaToUse = nodes.some((n) => n.x === undefined || n.x === null)
      ? 1
      : 0.1;
    simulation.alpha(alphaToUse).restart();
  }, [nodes, links, expandedNodeIds]);

  // キーボードイベントハンドラ
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setUserActions((prev) => ({ ...prev, keyed: true, move_field: true }));
      let dx = 0;
      let dy = 0;
      const moveAmount = 50;

      switch (event.key) {
        case "ArrowUp":
        case "w":
          dy = -moveAmount;
          break;
        case "ArrowDown":
        case "s":
          dy = moveAmount;
          break;
        case "ArrowLeft":
        case "a":
          dx = -moveAmount;
          break;
        case "ArrowRight":
        case "d":
          dx = moveAmount;
          break;
        default:
          return;
      }
      event.preventDefault();

      const svgElement = svgRef.current;
      if (zoomRef.current && svgElement) {
        const svg = d3.select(svgElement);
        const newTransform = currentTransformRef.current.translate(dx, dy);
        svg.call(zoomRef.current.transform, newTransform);
        currentTransformRef.current = newTransform;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ヒントメッセージのロジック
  useEffect(() => {
    const showNextHintInSequence = () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }

      let nextHintKey: HintKey | null = null;
      const startIndex = hintSequenceIndexRef.current;

      for (let i = 0; i < hintOrder.length; i++) {
        const checkIndex = (startIndex + i) % hintOrder.length;
        const key = hintOrder[checkIndex];
        if (key === "move_field") {
          if (!userActions.move_field) {
            nextHintKey = key;
            hintSequenceIndexRef.current = checkIndex;
            break;
          }
        } else {
          if (!userActions[key]) {
            nextHintKey = key;
            hintSequenceIndexRef.current = checkIndex;
            break;
          }
        }
      }

      if (nextHintKey) {
        setCurrentHintMessage(hintMessagesMap[nextHintKey]);
        setIsFadingOut(false);

        hintTimerRef.current = setTimeout(() => {
          const actionPerformed =
            nextHintKey === "move_field"
              ? userActions.move_field
              : userActions[nextHintKey!];
          if (!actionPerformed) {
            setIsFadingOut(true);
            setTimeout(() => {
              hintSequenceIndexRef.current =
                (hintSequenceIndexRef.current + 1) % hintOrder.length;
              showNextHintInSequence();
            }, 500);
          } else {
            setCurrentHintMessage(null);
            setIsFadingOut(false);
            showNextHintInSequence();
          }
        }, HINT_DISPLAY_DURATION);
      } else {
        setCurrentHintMessage(null);
        setIsFadingOut(false);
        hintSequenceIndexRef.current = 0;
      }
    };

    if (
      Object.values(userActions).every((action) => !action) &&
      currentHintMessage === null
    ) {
      hintTimerRef.current = setTimeout(
        showNextHintInSequence,
        HINT_INITIAL_DELAY,
      );
    } else if (Object.values(userActions).some((action) => action)) {
      showNextHintInSequence();
    }

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [userActions]);

  return (
    <div className="app-container">
      <div className="svg-container">
        <svg ref={svgRef} className="network-svg"></svg>
      </div>

      {currentHintMessage && (
        <div
          key={currentHintMessage}
          className={`hint-toast ${isFadingOut ? "fade-out" : "fade-in-out"}`}
        >
          {currentHintMessage}
        </div>
      )}
    </div>
  );
};
