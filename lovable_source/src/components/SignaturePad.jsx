import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

const SignaturePad = ({ value, onChange, label, penColor = '#1a3a6b', className = '' }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const getPoint = (canvas, clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i += 1) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    };

    strokesRef.current.forEach(drawStroke);
    drawStroke(currentStrokeRef.current);
  };

  const syncCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  };

  const emitValue = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) {
      onChangeRef.current?.(null);
      return;
    }
    onChangeRef.current?.(canvas.toDataURL('image/png'));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const handlePointerDown = (event) => {
      event.preventDefault();
      drawingRef.current = true;
      currentStrokeRef.current = [getPoint(canvas, event.clientX, event.clientY)];
      canvas.setPointerCapture(event.pointerId);
      redraw();
    };

    const handlePointerMove = (event) => {
      if (!drawingRef.current) return;
      event.preventDefault();
      currentStrokeRef.current.push(getPoint(canvas, event.clientX, event.clientY));
      redraw();
    };

    const finishStroke = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push([...currentStrokeRef.current]);
      }
      currentStrokeRef.current = [];
      redraw();
      emitValue();
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
    canvas.addEventListener('pointerleave', finishStroke);

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', finishStroke);
      canvas.removeEventListener('pointercancel', finishStroke);
      canvas.removeEventListener('pointerleave', finishStroke);
    };
  }, [penColor]);

  useEffect(() => {
    if (!value) {
      strokesRef.current = [];
      currentStrokeRef.current = [];
      redraw();
    }
  }, [value]);

  const handleClear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    drawingRef.current = false;
    redraw();
    onChangeRef.current?.(null);
  };

  return (
    <div className={className}>
      {label ? (
        <p className="text-[11px] text-[#7a8da6] mb-1.5 tracking-wide">{label}</p>
      ) : null}
      <div className="rounded border border-[#2c4a6e] bg-white">
        <canvas ref={canvasRef} className="h-28 w-full touch-none" aria-label={label || 'Unterschrift'} />
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-2 no-print" onClick={handleClear}>
        Löschen
      </Button>
    </div>
  );
};

export default SignaturePad;
