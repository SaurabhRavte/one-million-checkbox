import { useRef, useEffect, useCallback, useState } from "react";
import { useAuth } from "../lib/AuthContext";

const CELL_SIZE = 14;
const GAP = 1;
const STEP = CELL_SIZE + GAP;
const TOTAL = 1_000_000;

interface GridProps {
  getBit: (index: number) => boolean;
  onToggle: (index: number) => void;
  loadViewport: (startIndex: number) => void;
  rerender: number; // increment to trigger rerender
}

export function CheckboxGrid({ getBit, onToggle, loadViewport, rerender }: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [cols, setCols] = useState(0);
  const scrollTop = useRef(0);
  const animatingCells = useRef<Map<number, number>>(new Map()); // index -> startTime

  const getLayout = useCallback(() => {
    if (!containerRef.current) return { cols: 0, rows: 0 };
    const w = containerRef.current.clientWidth;
    const c = Math.floor(w / STEP);
    const rows = Math.ceil(TOTAL / c);
    return { cols: c, rows };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const { cols: c } = getLayout();
    if (c === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viewH = container.clientHeight;
    const st = scrollTop.current;
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // Clear
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const startRow = Math.floor(st / STEP);
    const endRow = Math.min(Math.ceil((st + viewH) / STEP) + 1, Math.ceil(TOTAL / c));

    const startIndex = startRow * c;
    const endIndex = Math.min(endRow * c, TOTAL);

    // Load this viewport
    loadViewport(startIndex);

    const now = performance.now();

    for (let i = startIndex; i < endIndex; i++) {
      const row = Math.floor(i / c);
      const col = i % c;
      const x = col * STEP;
      const y = row * STEP - st;

      const checked = getBit(i);
      const animStart = animatingCells.current.get(i);
      let scale = 1;

      if (animStart !== undefined) {
        const elapsed = now - animStart;
        if (elapsed < 150) {
          const t = elapsed / 150;
          scale = 1 + 0.3 * Math.sin(t * Math.PI);
        } else {
          animatingCells.current.delete(i);
        }
      }

      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;
      const s = CELL_SIZE * scale;
      const rx = cx - s / 2;
      const ry = cy - s / 2;

      if (checked) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(rx, ry, s, s);
      } else {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(rx, ry, s, s);
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 0.5, s - 1, s - 1);
      }
    }

    // If any animations running, schedule next frame
    if (animatingCells.current.size > 0) {
      requestAnimationFrame(draw);
    }
  }, [getBit, getLayout, loadViewport]);

  // Setup canvas size
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const { cols: c } = getLayout();
    setCols(c);
    draw();
  }, [draw, getLayout]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resize]);

  // Redraw on external state changes
  useEffect(() => {
    draw();
  }, [rerender, draw]);

  // Scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollTop.current = (e.target as HTMLDivElement).scrollTop;
    draw();
  }, [draw]);

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!user) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + scrollTop.current;

    const { cols: c } = getLayout();
    if (c === 0) return;

    const col = Math.floor(x / STEP);
    const row = Math.floor(y / STEP);
    if (col >= c) return;

    const index = row * c + col;
    if (index < 0 || index >= TOTAL) return;

    // Add animation
    animatingCells.current.set(index, performance.now());
    onToggle(index);
    requestAnimationFrame(draw);
  }, [user, getLayout, onToggle, draw]);

  // Calculate total scroll height
  const { rows } = getLayout();
  const totalHeight = rows * STEP;

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto overflow-x-hidden"
      style={{ height: "100%", cursor: user ? "pointer" : "default" }}
      onScroll={handleScroll}
    >
      {/* Scroll spacer */}
      <div style={{ height: totalHeight, position: "relative" }}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{
            position: "sticky",
            top: 0,
            display: "block",
            width: "100%",
          }}
        />
      </div>

      {!user && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-[#111] border border-[#333] px-4 py-2 text-xs text-[#888] font-mono">
            Sign in to toggle checkboxes
          </div>
        </div>
      )}
    </div>
  );
}
