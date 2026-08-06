import { useEffect, useRef, useState } from "react";

/** Fullscreen card viewer with wheel/pinch zoom and drag-to-pan. */
export function CardViewer({ url, label, onClose }: { url: string; label?: string; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const state = useRef({ zoom: 1, offset: { x: 0, y: 0 } });
  state.current = { zoom, offset };
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const cur = state.current;
      const next = Math.min(6, Math.max(1, cur.zoom * Math.exp(-dy * 0.0015)));
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const k = next / cur.zoom;
      setOffset({ x: px - (px - cur.offset.x) * k, y: py - (py - cur.offset.y) * k });
      setZoom(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function zoomBy(factor: number) {
    const el = boxRef.current;
    const cur = state.current;
    const next = Math.min(6, Math.max(1, cur.zoom * factor));
    const w = el ? el.clientWidth / 2 : 0;
    const h = el ? el.clientHeight / 2 : 0;
    const k = next / cur.zoom;
    setOffset({ x: w - (w - cur.offset.x) * k, y: h - (h - cur.offset.y) * k });
    setZoom(next);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-primary/40">
        <span className="font-display uppercase tracking-widest text-xs text-primary truncate">{label}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => zoomBy(1 / 1.4)} className="border border-primary/50 rounded px-3 py-1 text-sm">−</button>
          <button onClick={() => zoomBy(1.4)} className="border border-primary/50 rounded px-3 py-1 text-sm">+</button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="border border-primary/50 rounded px-2 py-1 text-[10px] uppercase tracking-widest">Nollaa</button>
          <button onClick={onClose} aria-label="Sulje" className="text-2xl text-muted-foreground hover:text-primary px-2">×</button>
        </div>
      </div>
      <div
        ref={boxRef}
        className="flex-1 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: "0 0" }} className="w-full h-full flex items-center justify-center">
          <img src={url} alt={label ?? "Kortti"} className="max-h-[80vh] max-w-full object-contain select-none" draggable={false} />
        </div>
      </div>
    </div>
  );
}
