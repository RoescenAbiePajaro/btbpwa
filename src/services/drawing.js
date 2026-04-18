
// src/services/drawing.js
let lastX = null, lastY = null;

export const drawLine = (canvas, x, y, color, size, mode, onDrawEnd) => {
  const ctx = canvas.getContext('2d');
  if (mode === 'erase') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
  }
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (lastX !== null && lastY !== null) {
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  lastX = x;
  lastY = y;
  if (onDrawEnd) onDrawEnd();
};

export const resetDrawingState = () => {
  lastX = null;
  lastY = null;
};

export const clearCanvas = (canvas) => {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  resetDrawingState();
};

export const saveCanvasState = (canvas) => canvas.toDataURL();

export const restoreCanvasState = (canvas, dataURL) => {
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    resetDrawingState();
  };
  img.src = dataURL;
};

export const undo = (canvas, history) => {
  if (history.undoStack.length <= 1) return history;
  const newUndoStack = [...history.undoStack];
  const previousState = newUndoStack.pop();
  const currentState = canvas.toDataURL();
  restoreCanvasState(canvas, previousState);
  return {
    undoStack: newUndoStack,
    redoStack: [...history.redoStack, currentState]
  };
};

export const redo = (canvas, history) => {
  if (history.redoStack.length === 0) return history;
  const newRedoStack = [...history.redoStack];
  const nextState = newRedoStack.pop();
  const currentState = canvas.toDataURL();
  restoreCanvasState(canvas, nextState);
  return {
    undoStack: [...history.undoStack, currentState],
    redoStack: newRedoStack
  };
};