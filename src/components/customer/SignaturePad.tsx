import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

interface SignaturePadProps {
  onSigned: (dataUrl: string) => void;
  onClear: () => void;
}

/** A finger or mouse signature. Calls onSigned with a PNG data URL after each stroke. */
export function SignaturePad({ onSigned, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const hasInk = useRef(false);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  // Keep the drawing buffer the same size as the box on screen (times the screen's pixel density).
  // Otherwise the browser stretches the buffer and the line lands beside the pointer.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (width === 0 || (canvas.width === width && canvas.height === height)) return;
      const hadInk = canvas.width > 0 && hasInk.current;
      canvas.width = width; // resizing wipes the canvas
      canvas.height = height;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (hadInk) {
        hasInk.current = false;
        setHasSigned(false);
        onClearRef.current();
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pen = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#001435";
    ctx.fillStyle = "#001435";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId); // keep drawing if the finger slips outside
    drawing.current = true;
    const p = point(e);
    last.current = p;
    pen(ctx);
    ctx.beginPath(); // a tap leaves a dot
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    pen(ctx);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk.current) {
      hasInk.current = true;
      setHasSigned(true);
    }
  };

  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (hasInk.current) onSigned(e.currentTarget.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    setHasSigned(false);
    onClear();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span id="qf-signature-label" className="text-[13px] font-bold text-muted">
          Signature
        </span>
        {hasSigned && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-[13px] font-bold text-muted hover:text-ink"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
      <div className="relative rounded-[14px] border border-line bg-white">
        <canvas
          ref={canvasRef}
          aria-labelledby="qf-signature-label"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="block w-full h-[120px] cursor-crosshair touch-none rounded-[14px]"
        />
        <div className="pointer-events-none absolute left-4 right-4 bottom-7 border-b border-dashed border-[#C9D2DE]" />
        {!hasSigned && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[15px] text-muted">
            Sign here with your finger or mouse
          </p>
        )}
      </div>
    </div>
  );
}
