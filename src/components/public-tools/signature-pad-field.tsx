"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

type SignaturePadFieldProps = {
  name: string;
  label: string;
  signerName: string;
};

export function SignaturePadField({
  name,
  label,
  signerName,
}: SignaturePadFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<Point[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [value, setValue] = useState("");

  const redraw = useCallback((nextStrokes: Point[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));

    const context = canvas.getContext("2d");
    if (!context) return;

    context.scale(ratio, ratio);
    context.clearRect(0, 0, rect.width, rect.height);
    context.strokeStyle = "#14213D";
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const stroke of nextStrokes) {
      if (stroke.length < 2) continue;
      context.beginPath();
      context.moveTo(stroke[0].x * rect.width, stroke[0].y * rect.height);
      for (const point of stroke.slice(1)) {
        context.lineTo(point.x * rect.width, point.y * rect.height);
      }
      context.stroke();
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    redraw(strokes);
    const observer = new ResizeObserver(() => redraw(strokes));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [isOpen, redraw, strokes]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function finishStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = [];
    if (stroke.length > 1) setStrokes((current) => [...current, stroke]);
  }

  function saveSignature() {
    if (strokes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setValue(canvas.toDataURL("image/png"));
    setIsOpen(false);
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <p className="text-sm font-bold text-text-strong">{label}</p>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 flex min-h-20 w-full items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-border-soft bg-white px-4 py-3 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary-soft"
      >
        {value ? "Signature added - tap to change" : "Sign here (optional)"}
      </button>
      {!value && signerName.trim() ? (
        <p className="mt-2 text-xs text-text-muted">
          If left blank, {signerName.trim()} will appear in a signature style.
        </p>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl rounded-card bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-text-strong">{label}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Draw with your finger, mouse or stylus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-2xl font-bold text-text-muted"
                aria-label="Close signature pad"
              >
                ×
              </button>
            </div>

            <canvas
              ref={canvasRef}
              className="mt-5 h-52 w-full touch-none rounded-[10px] border-2 border-dashed border-border-soft bg-white"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                drawingRef.current = true;
                activeStrokeRef.current = [pointFromEvent(event)];
              }}
              onPointerMove={(event) => {
                if (!drawingRef.current) return;
                activeStrokeRef.current.push(pointFromEvent(event));
                redraw([...strokes, activeStrokeRef.current]);
              }}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
            />

            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStrokes([])}
                className="min-h-11 rounded-button border border-border-soft font-bold text-text-strong"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setStrokes((current) => current.slice(0, -1))}
                disabled={strokes.length === 0}
                className="min-h-11 rounded-button border border-border-soft font-bold text-text-strong disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={saveSignature}
                disabled={strokes.length === 0}
                className="min-h-11 rounded-button bg-primary font-bold text-white disabled:opacity-40"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ReceiptStampField() {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div>
      <input type="hidden" name="stampImage" value={value} />
      <label className="text-sm font-bold text-text-strong">
        Stamp image <span className="font-medium text-text-muted">(optional)</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="mt-2 block w-full rounded-[10px] border-[1.5px] border-border-soft bg-white px-3 py-3 text-sm text-text-normal file:mr-3 file:rounded-button file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-bold file:text-primary"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setMessage("");
            if (!file) {
              setValue("");
              return;
            }
            if (file.size > 500_000) {
              setMessage("Choose an image smaller than 500 KB.");
              event.target.value = "";
              return;
            }
            const reader = new FileReader();
            reader.onload = () => setValue(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      <p className="mt-2 text-xs text-text-muted">
        If left blank, BOPA adds a simple PAID stamp to Pro receipts.
      </p>
      {message ? <p className="mt-1 text-xs font-semibold text-danger">{message}</p> : null}
    </div>
  );
}
