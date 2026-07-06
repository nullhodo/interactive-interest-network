import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { SimulationNode, SimulationLink, InterestNode } from "../types";
import {
  getNodeRadius,
  getNodeRy,
  getSuperellipsePath,
  getSafeSvgId,
} from "../utils/nodeUtils";
import { defineSvgGradients } from "../utils/svgDefs";
import { generateNodesAndLinks as buildGraphData, getHasChildrenSet } from "../utils/graphUtils";

import { useInteractionHints } from "../hooks/useInteractionHints";

interface WordCloudProps {
  data: InterestNode[];
}

export const WordCloud = ({ data }: WordCloudProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [links, setLinks] = useState<SimulationLink[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(),
  );

  const { currentHintMessage, isFadingOut, registerAction } = useInteractionHints();

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

    // グラデーション等の定義を外部ユーティリティに委譲
    defineSvgGradients(svg, data);

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
          .radius((d) => Math.max(getNodeRadius(d.name, d.depth), getNodeRy(d.name, d.depth)) + 30)
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
          registerAction({ scrolled: true });
        }
      });
    svg.call(zoomRef.current).on("dblclick.zoom", null);

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
      // HMR時やデータソース変更時に、古いD3要素が画面に残るのを防ぐための完全リセット
      if (svgElement) {
        d3.select(svgElement).selectAll("*").remove();
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

    const currentSimulationNodesMap = new Map<string, SimulationNode>(
      simulationRef.current.nodes().map((node) => [node.id, node]),
    );

    return buildGraphData(
      data,
      expandedNodeIds,
      currentSimulationNodesMap,
      currentWidth,
      currentHeight
    );
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

    // 子ノードを持っているノードのセットを作成
    const hasChildrenSet = getHasChildrenSet(data);

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

    // --- コンテナを1回だけ生成 ---
    let linksGroup = g.select<SVGGElement>(".links-group");
    if (linksGroup.empty()) {
      linksGroup = g.append("g").attr("class", "links-group");
    }
    let nodesGroup = g.select<SVGGElement>(".nodes-group");
    if (nodesGroup.empty()) {
      nodesGroup = g.append("g").attr("class", "nodes-group");
    }

    // --- Link のデータバインド ---
    const linkSelection = linksGroup
      .selectAll<SVGLineElement, SimulationLink>("line")
      .data(links, (d) => {
        const sourceId = typeof d.source === "object" ? d.source.id : d.source;
        const targetId = typeof d.target === "object" ? d.target.id : d.target;
        return `${sourceId}-${targetId}`;
      });

    const ANIMATION_DURATION = 350;

    const linkEnter = linkSelection
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0)
      .call((e) => e.transition().duration(ANIMATION_DURATION).attr("stroke-opacity", 0.6));

    const linkExit = linkSelection.exit();
    linkExit
      .transition()
      .duration(ANIMATION_DURATION)
      .style("opacity", 0)
      .remove();

    const link = linkSelection.merge(linkEnter);

    // --- Node のデータバインド ---
    const nodeSelection = nodesGroup
      .selectAll<SVGGElement, SimulationNode>("g.node")
      .data(nodes, (d) => d.id);

    const dragBehavior = d3
      .drag<SVGGElement, SimulationNode>()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        registerAction({ dragged: true, move_field: true });
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

    // Enter (新規ノードの追加)
    const nodeEnter = nodeSelection
      .enter()
      .append("g")
      .attr("class", "node")
      .each(function (d: any) {
        d._enterProgress = 0; // 出現アニメーション用進捗
      })
      .attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      .call(dragBehavior)
      .style("cursor", (d) => (d.data.url ? "pointer" : "grab"))
      .on("click", (event, d) => {
        registerAction({ clicked: true });

        // 展開・収納アニメーション中（ANIMATION_DURATION）は、クリックした親ノードの座標を固定してズレを防ぐ
        d.fx = d.x;
        d.fy = d.y;
        
        const targetId = d.id;
        setTimeout(() => {
          // 再生成されたシミュレーション内の最新のノードを見つけて固定を解除する
          if (simulationRef.current) {
            const latestNode = simulationRef.current
              .nodes()
              .find((n) => n.id === targetId);
            if (latestNode) {
              latestNode.fx = null;
              latestNode.fy = null;
            }
          }
        }, ANIMATION_DURATION);

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

    nodeEnter
      .transition()
      .duration(ANIMATION_DURATION)
      .tween("enterProgress", function (d: any) {
        return function (t) {
          d._enterProgress = t;
        };
      });

    // --- コンテンツ用グループ (scaleやopacityアニメーションをかける用) ---
    const nodeContentEnter = nodeEnter
      .append("g")
      .attr("class", "node-content")
      .attr("transform", "scale(0.1)")
      .style("opacity", 0);

    nodeContentEnter
      .transition()
      .duration(ANIMATION_DURATION)
      .ease(d3.easeCubicOut)
      .attr("transform", "scale(1)")
      .style("opacity", 1);

    // 1. 各ノードのsuperellipseクリップパスを定義
    nodeContentEnter
      .append("clipPath")
      .attr("id", (d) => `clip-${getSafeSvgId(d.id)}`)
      .append("path")
      .attr("d", (d) => {
        const rx = getNodeRadius(d.name, d.depth);
        const ry = getNodeRy(d.name, d.depth);
        return getSuperellipsePath(rx, ry);
      });

    // 2. メインのsuperellipseを描画
    nodeContentEnter
      .append("path")
      .attr("d", (d) => {
        const rx = getNodeRadius(d.name, d.depth);
        const ry = getNodeRy(d.name, d.depth);
        return getSuperellipsePath(rx, ry);
      })
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
        return `node-path ${isPulse ? "animate-reflective-pulse" : ""}`;
      });

    // 3. クリッピングされた反射光グループを追加
    const shineGroupEnter = nodeContentEnter
      .append("g")
      .attr("clip-path", (d) => `url(#clip-${getSafeSvgId(d.id)})`);

    shineGroupEnter
      .append("rect")
      .attr("x", (d) => -getNodeRadius(d.name, d.depth) * 2)
      .attr("y", (d) => -getNodeRy(d.name, d.depth) * 2)
      .attr("width", (d) => getNodeRadius(d.name, d.depth) * 4)
      .attr("height", (d) => getNodeRy(d.name, d.depth) * 4)
      .attr("fill", "url(#shineGradient)")
      .style("pointer-events", "none")
      .attr("class", (d) => {
        const isPulse = hasChildrenSet.has(d.id) && !expandedNodeIds.has(d.id);
        return isPulse ? "animate-shine" : "hidden-shine";
      });

    // 4. テキストを描画
    nodeContentEnter
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", (d) => (d.data.url ? "#4d91daff" : "#555"))
      .style("font-size", (d) => {
        const baseSize = 22;
        let depthReduction: number;
        if (d.depth === 0) depthReduction = 0;
        else if (d.depth === 1) depthReduction = 12;
        else if (d.depth === 2) depthReduction = 20;
        else depthReduction = 24;

        const lines = d.name.split("\n");
        const maxLineLength = Math.max(...lines.map((l) => l.length));

        let calculatedSize = Math.max(
          8,
          baseSize + (maxLineLength < 5 ? 4 : 0) - depthReduction,
        );

        if (maxLineLength > 8 && d.depth > 0) {
          calculatedSize *= 1 - (maxLineLength - 8) * 0.04;
        }
        if (maxLineLength > 12) {
          calculatedSize *= 0.7;
        }

        return `${Math.max(8, calculatedSize)}px`;
      })
      .style("font-weight", "bold")
      .attr("pointer-events", "none")
      .each(function (d) {
        const textElement = d3.select(this);
        const lines = d.name.split("\n");
        lines.forEach((line, i) => {
          textElement
            .append("tspan")
            .attr("x", 0)
            .attr("dy", i === 0 ? `-${(lines.length - 1) * 0.6}em` : "1.2em")
            .style("pointer-events", "none") // 明示的にtspanにも付与してマウスイベントのブロックを防止
            .text(line);
        });
      });

    // --- Update (既存ノードの状態更新) ---
    nodeSelection.select("path.node-path").attr("class", (d) => {
      const isPulse = hasChildrenSet.has(d.id) && !expandedNodeIds.has(d.id);
      return `node-path ${isPulse ? "animate-reflective-pulse" : ""}`;
    });
    nodeSelection.select("rect").attr("class", (d) => {
      const isPulse = hasChildrenSet.has(d.id) && !expandedNodeIds.has(d.id);
      return isPulse ? "animate-shine" : "hidden-shine";
    });

    // --- Exit (収納時アニメーション) ---
    const nodeExit = nodeSelection.exit();
    nodeExit.each(function (d: any) {
      d._exitProgress = 0; // 収納アニメーション用進捗
      const el = d3.select(this);

      el.transition()
        .duration(ANIMATION_DURATION)
        .ease(d3.easeCubicInOut)
        .tween("exitProgress", function () {
          return function (t) {
            d._exitProgress = t;
          };
        })
        .on("end", function () {
          el.remove();
        });

      el.select(".node-content")
        .transition()
        .duration(ANIMATION_DURATION)
        .ease(d3.easeCubicInOut)
        .attr("transform", "scale(0.1)")
        .style("opacity", 0);
    });

    // マージして最終的な selection にする
    const node = nodeSelection.merge(nodeEnter);

    // 子ノードが奥のレイヤーになるように、depthの降順でソート (DOM内の順序を並べ替える)
    node.sort((a, b) => b.depth - a.depth);

    // --- 物理シミュレーション (座標更新の完全制御) ---
    simulation.on("tick", () => {
      const posMap = new Map<string, { x: number; y: number }>();
      const simNodesMap = new Map<string, any>();
      simulation.nodes().forEach((n) => simNodesMap.set(n.id, n));

      // 1. Enter と Update のノード座標計算
      node.each(function (d: any) {
        let targetX = d.x ?? 0;
        let targetY = d.y ?? 0;

        // シミュレーション対象なら最新の座標を取得
        const sn = simNodesMap.get(d.id);
        if (sn) {
          targetX = sn.x;
          targetY = sn.y;
        }

        let renderX = targetX;
        let renderY = targetY;

        const pn = simNodesMap.get(d.parentId);
        // Enter時: d._enterProgress が 0 なら親の位置、1 なら自分の位置へ飛び出す
        if (d._enterProgress !== undefined && d._enterProgress < 1 && pn) {
          renderX = pn.x + (targetX - pn.x) * d._enterProgress;
          renderY = pn.y + (targetY - pn.y) * d._enterProgress;
        }

        posMap.set(d.id, { x: renderX, y: renderY });
        d3.select(this).attr("transform", `translate(${renderX},${renderY})`);
      });

      // 2. Exit 中のノード座標計算
      nodeExit.each(function (d: any) {
        const startX = d.x ?? 0;
        const startY = d.y ?? 0;
        let renderX = startX;
        let renderY = startY;

        // 常に最新の親の座標を追いかけて吸い込まれる
        const pn = simNodesMap.get(d.parentId);
        if (d._exitProgress !== undefined && pn) {
          renderX = startX + (pn.x - startX) * d._exitProgress;
          renderY = startY + (pn.y - startY) * d._exitProgress;
        }

        posMap.set(d.id, { x: renderX, y: renderY });
        d3.select(this).attr("transform", `translate(${renderX},${renderY})`);
      });

      // 3. Link (Update, Enter) の描画（全ノードの計算済み座標を参照）
      link
        .attr("x1", (d: any) => posMap.get(typeof d.source === "object" ? d.source.id : d.source)?.x ?? 0)
        .attr("y1", (d: any) => posMap.get(typeof d.source === "object" ? d.source.id : d.source)?.y ?? 0)
        .attr("x2", (d: any) => posMap.get(typeof d.target === "object" ? d.target.id : d.target)?.x ?? 0)
        .attr("y2", (d: any) => posMap.get(typeof d.target === "object" ? d.target.id : d.target)?.y ?? 0);

      // 4. Link (Exit) の描画 (親と一緒に縮みながら消える)
      linkExit
        .attr("x1", (d: any) => posMap.get(typeof d.source === "object" ? d.source.id : d.source)?.x ?? 0)
        .attr("y1", (d: any) => posMap.get(typeof d.source === "object" ? d.source.id : d.source)?.y ?? 0)
        .attr("x2", (d: any) => posMap.get(typeof d.target === "object" ? d.target.id : d.target)?.x ?? 0)
        .attr("y2", (d: any) => posMap.get(typeof d.target === "object" ? d.target.id : d.target)?.y ?? 0);
    });

    // --- 斥力の急な変化を防ぐための alpha 調節 ---
    // 現在の nodes.length と DOM上の .node の数を比較する
    const previousNodeCount = g.selectAll(".node").size();
    const currentNodeCount = nodes.length;

    let alphaToUse = 0.1;
    if (currentNodeCount < previousNodeCount) {
      alphaToUse = 0.08; // 減ったときは程よく静かに再配置（広がったまま固まるのを防ぐ）
    } else if (currentNodeCount > previousNodeCount) {
      alphaToUse = 0.08; // 増えたときも穏やかに配置（急な弾け飛びを防ぎつつ整列させる）
    }

    // 初回ロード時
    if (nodes.some((n) => n.x === undefined || n.x === null)) {
      alphaToUse = 1;
    }

    simulation.alpha(alphaToUse).restart();
  }, [nodes, links, expandedNodeIds]);

  // キーボードイベントハンドラ
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      registerAction({ keyed: true, move_field: true });
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
