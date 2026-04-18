import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import Toolbar from './Toolbar';
import Gallery from './Gallery';
import GuideModal from './GuideModal';
import KeyboardText from './KeyboardText';
import { useHandGesture } from '../hooks/useHandGesture';
import { mapToCanvas, isIndexFingerOnly, resetLastPoint } from '../services/gestureProcessor';
import { drawLine, saveCanvasState, restoreCanvasState, clearCanvas, undo, redo, setBrushProps } from '../services/drawing';
import { exportAsPDF, exportAsImage, exportAsPPTX } from '../services/exportUtils';
import { saveWorkToGallery, loadWorkFromGallery } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_BRUSH_SIZE, DEFAULT_ERASER_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';

const CanvasArea = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [mode, setMode] = useState('draw'); // draw, erase, keyboard
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [eraserSize, setEraserSize] = useState(DEFAULT_ERASER_SIZE);
  const [history, setHistory] = useState({ undoStack: [], redoStack: [] });
  const [showGuide, setShowGuide] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [keyboardText, setKeyboardText] = useState(null);
  const { logout } = useAuth();

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // save initial state
    const initialState = canvas.toDataURL();
    setHistory({ undoStack: [initialState], redoStack: [] });
  }, []);

  // Hand gesture callback
  const handleGesture = useCallback((landmarks) => {
    if (mode === 'keyboard') return;
    if (!isIndexFingerOnly(landmarks)) {
      resetLastPoint();
      return;
    }
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (!canvas || !video) return;

    const point = landmarks[8]; // index finger tip
    const { x, y } = mapToCanvas(point, video, canvas);

    if (mode === 'draw') {
      drawLine(canvas, x, y, brushColor, brushSize, 'draw', () => {
        // after drawing, save state for undo (throttled)
        const newState = canvas.toDataURL();
        setHistory(prev => ({
          undoStack: [...prev.undoStack, newState],
          redoStack: []
        }));
      });
    } else if (mode === 'erase') {
      drawLine(canvas, x, y, '#FFFFFF', eraserSize, 'erase', () => {
        const newState = canvas.toDataURL();
        setHistory(prev => ({
          undoStack: [...prev.undoStack, newState],
          redoStack: []
        }));
      });
    }
  }, [mode, brushColor, brushSize, eraserSize]);

  useHandGesture(webcamRef, handleGesture);

  const handleUndo = () => {
    const newState = undo(canvasRef.current, history);
    if (newState) setHistory(newState);
  };
  const handleRedo = () => {
    const newState = redo(canvasRef.current, history);
    if (newState) setHistory(newState);
  };
  const handleClear = () => {
    clearCanvas(canvasRef.current);
    const newState = canvasRef.current.toDataURL();
    setHistory({ undoStack: [...history.undoStack, newState], redoStack: [] });
  };
  const handleSaveToGallery = async () => {
    const thumbnail = canvasRef.current.toDataURL();
    const canvasData = {
      imageData: thumbnail,
      texts: keyboardText,
      brushColor,
      brushSize
    };
    await saveWorkToGallery(thumbnail, canvasData);
    alert('Saved to gallery!');
  };
  const handleExport = async (type) => {
    if (type === 'pdf') await exportAsPDF(canvasRef.current);
    else if (type === 'image') await exportAsImage(canvasRef.current);
    else if (type === 'pptx') await exportAsPPTX(canvasRef.current);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A192F]">
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
      <div className="flex flex-1 relative">
        <canvas ref={canvasRef} className="bg-white shadow-lg m-4 rounded-lg" style={{ width: '80%', height: 'auto' }} />
        {mode === 'keyboard' && <KeyboardText setKeyboardText={setKeyboardText} />}
        <Webcam ref={webcamRef} className="absolute bottom-4 right-4 w-48 h-36 rounded-lg border-2 border-[#64FFDA]" mirrored />
      </div>
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      {showGallery && <Gallery onClose={() => setShowGallery(false)} onLoad={loadWorkFromGallery} />}
    </div>
  );
};

export default CanvasArea;