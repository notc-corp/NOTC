"use client";

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";

export interface SignaturePadHandle {
  clear(): void;
  getDataUrl(): string | null;
  hasSignature(): boolean;
}

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [empty, setEmpty] = useState(true);
  const drawing = useRef(false);

  useImperativeHandle(ref, () => ({
    clear() {
      const c = canvasRef.current;
      if (!c) return;
      c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      setEmpty(true);
    },
    getDataUrl() {
      return empty ? null : (canvasRef.current?.toDataURL("image/png") ?? null);
    },
    hasSignature() {
      return !empty;
    },
  }));

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const resetCtx = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-36 border-2 border-slate-300 rounded-xl bg-white touch-none cursor-crosshair"
      onPointerDown={(e) => {
        drawing.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        resetCtx();
        const ctx = canvasRef.current!.getContext("2d")!;
        const { x, y } = pos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current!.getContext("2d")!;
        const { x, y } = pos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        if (empty) setEmpty(false);
      }}
      onPointerUp={() => { drawing.current = false; }}
    />
  );
});

export default SignaturePad;
