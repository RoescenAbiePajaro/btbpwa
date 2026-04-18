import { useCallback, useRef } from 'react';

const useDrawing = (canvasRef, mode, brushColor, brushSize, eraserSize, saveState) => {
  const lastPointRef = useRef(null);
  const isDrawingRef = useRef(false);

  const drawLine = useCallback((canvas, fromX, fromY, toX, toY, color, size, isErasing) => {
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = isErasing ? '#FFFFFF' : color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  const handleDrawing = useCallback((position, shouldDraw) => {
    const canvas = canvasRef.current;
    if (!canvas || !shouldDraw) {
      lastPointRef.current = null;
      isDrawingRef.current = false;
      return;
    }

    const { x, y } = position;
    const isErasing = mode === 'erase';
    const color = isErasing ? '#FFFFFF' : brushColor;
    const size = isErasing ? eraserSize : brushSize;

    if (lastPointRef.current) {
      drawLine(canvas, lastPointRef.current.x, lastPointRef.current.y, x, y, color, size, isErasing);
      saveState();
    }

    lastPointRef.current = { x, y };
    isDrawingRef.current = true;
  }, [canvasRef, mode, brushColor, brushSize, eraserSize, saveState, drawLine]);

  const resetDrawing = useCallback(() => {
    lastPointRef.current = null;
    isDrawingRef.current = false;
  }, []);

  return { handleDrawing, resetDrawing, isDrawing: isDrawingRef };
};

export default useDrawing;