import { useCallback, useEffect, useRef, useState } from "react";
import { PenTool, RotateCcw } from "lucide-react";
import { soundFX } from "@/lib/sound";

interface SignaturePadProps {
  accentHex: string;
  autoSignName: string;
  shouldAutoSign: boolean;
  onSigned: (dataUrl: string) => void;
  onClear: () => void;
}

export function SignaturePad({
  accentHex,
  autoSignName,
  shouldAutoSign,
  onSigned,
  onClear,
}: SignaturePadProps) {
  const [hasSigned, setHasSigned] = useState<boolean>(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  const initSignatureCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#E5E0D8";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 22);
    ctx.lineTo(canvas.width - 20, canvas.height - 22);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawAutoSignature = useCallback(
    (nameText: string) => {
      const canvas = sigCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      initSignatureCanvas();
      ctx.save();
      ctx.font = 'italic 28px "Instrument Serif", Georgia, serif';
      ctx.fillStyle = "#141413";
      ctx.fillText(nameText || "Alex Rivera", 28, canvas.height - 28);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, canvas.height - 18);
      ctx.quadraticCurveTo(120, canvas.height - 28, 225, canvas.height - 15);
      ctx.stroke();
      ctx.restore();
      setHasSigned(true);
      onSigned(canvas.toDataURL("image/png"));
      soundFX.playToggle(true);
    },
    [accentHex, initSignatureCanvas, onSigned]
  );

  useEffect(() => {
    if (shouldAutoSign) {
      setTimeout(() => {
        drawAutoSignature(autoSignName);
      }, 60);
    }
  }, [shouldAutoSign, drawAutoSignature, autoSignName]);

  const handleSigPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    ctx.strokeStyle = "#141413";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSigPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const handleSigPointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = sigCanvasRef.current;
    if (canvas) {
      onSigned(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    initSignatureCanvas();
    setHasSigned(false);
    onClear();
    soundFX.playTick(400);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-slate-400" />
          <span>Customer Approval Signature</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => drawAutoSignature(autoSignName)}
            className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          >
            ✨ 1-Click Auto-Sign
          </button>
          <button
            type="button"
            onClick={clearSignature}
            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-[#E5E0D8] bg-[#FAF8F5] overflow-hidden relative">
        <canvas
          ref={sigCanvasRef}
          width={340}
          height={88}
          onPointerDown={handleSigPointerDown}
          onPointerMove={handleSigPointerMove}
          onPointerUp={handleSigPointerUp}
          onPointerLeave={handleSigPointerUp}
          className="w-full h-[88px] cursor-crosshair touch-none"
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400">
            Sign here with mouse/finger or click Auto-Sign
          </div>
        )}
      </div>
    </div>
  );
}
