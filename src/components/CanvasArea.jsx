import React, { useRef, useState, useEffect, useCallback } from 'react';
import Toolbar from './Toolbar';
import Gallery from './Gallery';
import GuideModal from './GuideModal';
import KeyboardText from './KeyboardText';
import { useAuth } from '../context/AuthContext';
import { saveWorkToGallery } from '../services/api';
import { exportAsImage, exportAsPDF, exportAsPPTX } from '../services/exportUtils';

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 768;
const DEFAULT_BRUSH_SIZE = 5;
const DEFAULT_ERASER_SIZE = 20;

const CanvasArea = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [mode, setMode] = useState('draw');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [eraserSize, setEraserSize] = useState(DEFAULT_ERASER_SIZE);
  const [history, setHistory] = useState({ undoStack: [], redoStack: [] });
  const [handDetected, setHandDetected] = useState(false);
  const [modelStatus, setModelStatus] = useState('Initializing...');
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(true);
  const [currentGesture, setCurrentGesture] = useState('none');
  const [showGallery, setShowGallery] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [keyboardText, setKeyboardText] = useState({ text: '', pos: { x: 200, y: 200 } });
  const { logout } = useAuth();

  const lastPointRef = useRef(null);
  const handsRef = useRef(null);
  const animationRef = useRef(null);
  const brushSizeRef = useRef(DEFAULT_BRUSH_SIZE);
  const eraserSizeRef = useRef(DEFAULT_ERASER_SIZE);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const initialState = canvas.toDataURL();
      setHistory({ undoStack: [initialState], redoStack: [] });
      console.log('Canvas initialized');
    }
  }, []);

  // Save state function
  const saveState = useCallback(() => {
    const newState = canvasRef.current.toDataURL();
    setHistory(prev => ({
      undoStack: [...prev.undoStack, newState],
      redoStack: []
    }));
  }, []);

  // Drawing function
  const drawLine = useCallback((fromX, fromY, toX, toY, color, size, isErasing) => {
    const canvas = canvasRef.current;
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

  // Handle drawing with coordinate transformation for mirror
  const handleDrawing = useCallback((x, y) => {
    if (!isDrawingEnabled) return;

    const isErasing = mode === 'erase';
    const color = isErasing ? '#FFFFFF' : brushColor;
    const size = isErasing ? eraserSizeRef.current : brushSizeRef.current;

    // Transform X coordinate for mirror (flip horizontally)
    const canvas = canvasRef.current;
    const transformedX = canvas.width - x;

    if (lastPointRef.current) {
      drawLine(
        lastPointRef.current.x,
        lastPointRef.current.y,
        transformedX,
        y,
        color,
        size,
        isErasing
      );
      saveState();
    }

    lastPointRef.current = { x: transformedX, y };
  }, [mode, brushColor, isDrawingEnabled, drawLine, saveState]);

  const resetDrawing = useCallback(() => {
    lastPointRef.current = null;
  }, []);

  // Sync refs with state for brush/eraser sizes
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    eraserSizeRef.current = eraserSize;
  }, [eraserSize]);

  // Initialize MediaPipe Hands
  useEffect(() => {
    const initHandTracking = async () => {
      try {
        setModelStatus('Requesting camera...');
        
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setModelStatus('Camera ready, loading hand detector...');
        }

        // Wait for MediaPipe to be available
        const waitForMediaPipe = () => {
          return new Promise((resolve) => {
            if (window.Hands) {
              resolve();
            } else {
              const checkInterval = setInterval(() => {
                if (window.Hands) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
            }
          });
        };

        await waitForMediaPipe();
        setModelStatus('Initializing hand detector...');

        // Initialize Hands
        const hands = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true);
            const landmarks = results.multiHandLandmarks[0];
            const gesture = detectGesture(landmarks);
            setCurrentGesture(gesture);
            
            // Get index finger tip position
            const indexTip = landmarks[8];
            const canvas = canvasRef.current;
            
            if (canvas && indexTip) {
              // Don't transform here, transform in handleDrawing
              const x = indexTip.x * canvas.width;
              const y = indexTip.y * canvas.height;
              
              // Draw or erase based on gesture and mode
              if (gesture === 'draw' && mode === 'draw' && isDrawingEnabled) {
                handleDrawing(x, y);
              } else if (gesture === 'erase' && mode === 'erase' && isDrawingEnabled) {
                handleDrawing(x, y);
              } else {
                resetDrawing();
              }
            }
          } else {
            setHandDetected(false);
            setCurrentGesture('none');
            resetDrawing();
          }
        });

        handsRef.current = hands;
        setModelStatus('Ready! Show your hand to draw');

        // Process frames
        const processFrame = async () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
          animationRef.current = requestAnimationFrame(processFrame);
        };

        processFrame();
        
      } catch (error) {
        console.error('Error:', error);
        setModelStatus(`Error: ${error.message}`);
      }
    };

    initHandTracking();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [mode, isDrawingEnabled, handleDrawing, resetDrawing]);

  // Detect gesture from landmarks
  const detectGesture = (landmarks) => {
    // Get finger states
    const fingers = {
      thumb: landmarks[4].y < landmarks[2].y,
      index: landmarks[8].y < landmarks[6].y,
      middle: landmarks[12].y < landmarks[10].y,
      ring: landmarks[16].y < landmarks[14].y,
      pinky: landmarks[20].y < landmarks[18].y
    };
    
    // Index finger only
    if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'draw';
    }
    
    // Peace sign (index + middle)
    if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'stop';
    }
    
    // Thumb up
    if (fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'erase';
    }
    
    return 'none';
  };

  // Undo/Redo/Clear functions
  const handleUndo = () => {
    if (history.undoStack.length <= 1) return;
    const newUndoStack = [...history.undoStack];
    const lastState = newUndoStack.pop();
    const newRedoStack = [...history.redoStack, lastState];
    const restoreState = newUndoStack[newUndoStack.length - 1];
    
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0);
    };
    img.src = restoreState;
    
    setHistory({ undoStack: newUndoStack, redoStack: newRedoStack });
  };

  const handleRedo = () => {
    if (history.redoStack.length === 0) return;
    const newRedoStack = [...history.redoStack];
    const lastState = newRedoStack.pop();
    const newUndoStack = [...history.undoStack, lastState];
    
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0);
    };
    img.src = lastState;
    
    setHistory({ undoStack: newUndoStack, redoStack: newRedoStack });
  };

  const handleClear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const newState = canvasRef.current.toDataURL();
    setHistory({ undoStack: [...history.undoStack, newState], redoStack: [] });
  };

  const toggleDrawing = () => {
    setIsDrawingEnabled(!isDrawingEnabled);
    resetDrawing();
  };

  const handleSave = async () => {
    try {
      const canvas = canvasRef.current;
      const thumbnail = canvas.toDataURL('image/png', 0.1);
      const canvasData = canvas.toDataURL();
      await saveWorkToGallery(thumbnail, canvasData);
      alert('Saved to gallery successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save to gallery');
    }
  };

  const handleExport = async (format) => {
    try {
      const canvas = canvasRef.current;
      if (format === 'image') {
        await exportAsImage(canvas);
      } else if (format === 'pdf') {
        await exportAsPDF(canvas);
      } else if (format === 'pptx') {
        await exportAsPPTX(canvas);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export');
    }
  };

  const handleGuide = () => {
    setShowGuide(true);
  };

  const handleGallery = () => {
    setShowGallery(true);
  };

  const handleLoadFromGallery = (canvasData) => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0);
      const newState = canvasRef.current.toDataURL();
      setHistory({ undoStack: [newState], redoStack: [] });
    };
    img.src = canvasData;
  };

  return (
    <div className="canvas-container">
      {/* Status Indicator */}
      <div style={{
        position: 'fixed',
        top: 60,
        left: 10,
        background: 'rgba(0,0,0,0.85)',
        color: '#64FFDA',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: 'monospace',
        zIndex: 1000,
        borderLeft: `3px solid ${handDetected ? '#64FFDA' : '#FF4444'}`
      }}>
        <div>🤖 {modelStatus}</div>
        <div>✋ Hand: {handDetected ? '✓ Detected' : '✗ No Hand'}</div>
        <div>🎯 Gesture: {currentGesture}</div>
        <div>🎨 Mode: {mode}</div>
        <div>{isDrawingEnabled ? '✅ Drawing ON' : '🔒 Drawing OFF'}</div>
      </div>

      <Toolbar
        mode={mode}
        setMode={setMode}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        eraserSize={eraserSize}
        setEraserSize={setEraserSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={handleSave}
        onExport={handleExport}
        onGuide={handleGuide}
        onGallery={handleGallery}
        onLogout={logout}
        onToggleDrawing={toggleDrawing}
        isDrawingEnabled={isDrawingEnabled}
      />

      <div className="canvas-main">
        <canvas ref={canvasRef} className="drawing-canvas" />
        
        {/* Camera feed - visible and mirrored for natural POV */}
        <div className="camera-container">
          <video
            ref={videoRef}
            className="hand-camera"
            width={320}
            height={240}
            autoPlay
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }} // Mirror for natural POV
          />
          <div className={`camera-overlay ${handDetected ? 'hand-detected' : ''}`}>
            <span>{handDetected ? '✋ Hand Detected' : '✋ Show Your Hand'}</span>
          </div>
        </div>
      </div>

      {/* Modals and Overlays */}
      {showGallery && (
        <Gallery
          onClose={() => setShowGallery(false)}
          onLoad={handleLoadFromGallery}
        />
      )}

      {showGuide && (
        <GuideModal onClose={() => setShowGuide(false)} />
      )}

      <KeyboardText setKeyboardText={setKeyboardText} />
    </div>
  );
};

export default CanvasArea;