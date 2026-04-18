// src/components/CanvasArea.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import Toolbar from './Toolbar';
import Gallery from './Gallery';
import GuideModal from './GuideModal';
import KeyboardText from './KeyboardText';
import { useHandGesture } from '../hooks/useHandGesture';
import { mapToCanvas, isIndexFingerOnly, resetLastPoint, setLastPoint, getLastPoint } from '../services/gestureProcessor';
import { drawLine, clearCanvas, undo, redo, saveCanvasState, restoreCanvasState } from '../services/drawing';
import { exportAsPDF, exportAsImage, exportAsPPTX } from '../services/exportUtils';
import { saveWorkToGallery } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_BRUSH_SIZE, DEFAULT_ERASER_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';

const CanvasArea = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [eraserSize, setEraserSize] = useState(DEFAULT_ERASER_SIZE);
  const [history, setHistory] = useState({ undoStack: [], redoStack: [] });
  const [showGuide, setShowGuide] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [keyboardText, setKeyboardText] = useState(null);
  const { logout } = useAuth();
  const [handDetected, setHandDetected] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const initialState = canvas.toDataURL();
    setHistory({ undoStack: [initialState], redoStack: [] });
  }, []);

  // Save state after drawing (throttled)
  const saveState = useCallback(() => {
    const newState = canvasRef.current.toDataURL();
    setHistory(prev => ({
      undoStack: [...prev.undoStack, newState],
      redoStack: []
    }));
  }, []);

  // Hand gesture callback with visual feedback
  const handleGesture = useCallback((landmarks, detected) => {
    setHandDetected(detected);
    if (mode === 'keyboard') return;
    if (!isIndexFingerOnly(landmarks)) {
      resetLastPoint();
      return;
    }
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (!canvas || !video) return;
    const point = landmarks[8];
    const { x, y } = mapToCanvas(point, video, canvas);
    const last = getLastPoint();
    if (last) {
      drawLine(canvas, x, y, mode === 'draw' ? brushColor : '#FFFFFF', mode === 'draw' ? brushSize : eraserSize, mode, saveState);
    } else {
      drawLine(canvas, x, y, mode === 'draw' ? brushColor : '#FFFFFF', mode === 'draw' ? brushSize : eraserSize, mode, saveState);
    }
    setLastPoint({ x, y });
  }, [mode, brushColor, brushSize, eraserSize, saveState]);

  useHandGesture(webcamRef, handleGesture);

  const handleUndo = () => {
    const newHistory = undo(canvasRef.current, history);
    if (newHistory) setHistory(newHistory);
  };
  const handleRedo = () => {
    const newHistory = redo(canvasRef.current, history);
    if (newHistory) setHistory(newHistory);
  };
  const handleClear = () => {
    clearCanvas(canvasRef.current);
    const newState = canvasRef.current.toDataURL();
    setHistory({ undoStack: [...history.undoStack, newState], redoStack: [] });
  };
  const handleSaveToGallery = async () => {
    const thumbnail = canvasRef.current.toDataURL();
    const canvasData = { imageData: thumbnail, texts: keyboardText };
    await saveWorkToGallery(thumbnail, canvasData);
    alert('Saved to gallery!');
  };
  const handleExport = async (type) => {
    if (type === 'pdf') await exportAsPDF(canvasRef.current);
    else if (type === 'image') await exportAsImage(canvasRef.current);
    else if (type === 'pptx') await exportAsPPTX(canvasRef.current);
  };
  const handleLoadFromGallery = (canvasData) => {
    restoreCanvasState(canvasRef.current, canvasData.imageData);
    if (canvasData.texts) setKeyboardText(canvasData.texts);
    setHistory({ undoStack: [canvasData.imageData], redoStack: [] });
  };

  return (
    <div className="canvas-container">
      <Toolbar
        mode={mode} setMode={setMode}
        brushColor={brushColor} setBrushColor={setBrushColor}
        brushSize={brushSize} setBrushSize={setBrushSize}
        eraserSize={eraserSize} setEraserSize={setEraserSize}
        onUndo={handleUndo} onRedo={handleRedo}
        onClear={handleClear}
        onSave={handleSaveToGallery}
        onExport={handleExport}
        onGuide={() => setShowGuide(true)}
        onGallery={() => setShowGallery(true)}
        onLogout={logout}
      />
      <div className="canvas-main">
        <canvas ref={canvasRef} className="drawing-canvas" />
        {mode === 'keyboard' && <KeyboardText setKeyboardText={setKeyboardText} />}
        <Webcam
          ref={webcamRef}
          className={`hand-cam ${handDetected ? 'hand-detected' : ''}`}
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: "user"
          }}
          mirrored={false}  // We handle mirroring in CSS and coordinate mapping
          style={{ transform: 'scaleX(-1)' }} // Mirror for natural feel
        />
      </div>
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      {showGallery && <Gallery onClose={() => setShowGallery(false)} onLoad={handleLoadFromGallery} />}
    </div>
  );
};

export default CanvasArea;