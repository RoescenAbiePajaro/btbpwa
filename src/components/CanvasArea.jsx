// src/components/CanvasArea.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Toolbar from './Toolbar';
import Gallery from './Gallery';
import GuideModal from './GuideModal';
import KeyboardText from './KeyboardText';
import { useAuth } from '../context/AuthContext';
import { saveWorkToGallery } from '../services/api';
import { exportAsImage, exportAsPDF, exportAsPPTX } from '../services/exportUtils';

const CANVAS_WIDTH = 1440;
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
  const [textObjects, setTextObjects] = useState([]);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const { logout } = useAuth();

  const lastPointRef = useRef(null);
  const handsRef = useRef(null);
  const animationRef = useRef(null);
  const brushSizeRef = useRef(DEFAULT_BRUSH_SIZE);
  const eraserSizeRef = useRef(DEFAULT_ERASER_SIZE);
  const pointBufferRef = useRef([]);
  const shapeStartRef = useRef(null);
  const isDrawingShapeRef = useRef(false);
  const canvasSnapshotRef = useRef(null);
  const isDraggingTextRef = useRef(false); // Track if we're dragging text

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const initialState = {
        canvas: canvas.toDataURL(),
        textObjects: []
      };
      setHistory({ undoStack: [initialState], redoStack: [] });
      console.log('Canvas initialized');
    }
  }, []);

  // Save state function
  const saveState = useCallback(() => {
    const newState = {
      canvas: canvasRef.current.toDataURL(),
      textObjects: [...textObjects]
    };
    setHistory(prev => ({
      undoStack: [...prev.undoStack, newState],
      redoStack: []
    }));
  }, [textObjects]);

  // Smooth coordinates using moving average to reduce jitter
  const smoothCoordinates = useCallback((x, y) => {
    const bufferSize = 3;
    pointBufferRef.current.push({ x, y });
    
    if (pointBufferRef.current.length > bufferSize) {
      pointBufferRef.current.shift();
    }
    
    if (pointBufferRef.current.length < bufferSize) {
      return { x, y };
    }
    
    const sumX = pointBufferRef.current.reduce((sum, p) => sum + p.x, 0);
    const sumY = pointBufferRef.current.reduce((sum, p) => sum + p.y, 0);
    
    return {
      x: sumX / bufferSize,
      y: sumY / bufferSize
    };
  }, []);

  // Drawing function with smoothing and proper erasing
  const drawLine = useCallback((fromX, fromY, toX, toY, color, size, isErasing) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Save context state
    ctx.save();
    
    if (isErasing) {
      // Use destination-out for proper erasing (makes pixels transparent)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Use quadratic curve for smoother lines
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    
    // Calculate midpoint for smooth quadratic curve
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    
    ctx.quadraticCurveTo(fromX, fromY, midX, midY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Restore context state
    ctx.restore();
  }, []);

  // Shape drawing functions (Microsoft Paint style)
  const drawShapeLine = useCallback((fromX, fromY, toX, toY, color, size) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawShapeRectangle = useCallback((fromX, fromY, toX, toY, color, size) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.rect(fromX, fromY, toX - fromX, toY - fromY);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawShapeSquare = useCallback((fromX, fromY, toX, toY, color, size) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    
    const sideLength = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
    const directionX = toX > fromX ? 1 : -1;
    const directionY = toY > fromY ? 1 : -1;
    
    ctx.beginPath();
    ctx.rect(fromX, fromY, sideLength * directionX, sideLength * directionY);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawShapeCircle = useCallback((fromX, fromY, toX, toY, color, size) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    
    const radius = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    ctx.beginPath();
    ctx.arc(fromX, fromY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawShapeTriangle = useCallback((fromX, fromY, toX, toY, color, size) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    
    const width = toX - fromX;
    const height = toY - fromY;
    
    ctx.beginPath();
    ctx.moveTo(fromX + width / 2, fromY);
    ctx.lineTo(fromX, toY);
    ctx.lineTo(toX, toY);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }, []);

  // Restore canvas from snapshot (for shape preview)
  const restoreCanvasSnapshot = useCallback(() => {
    if (canvasSnapshotRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = canvasSnapshotRef.current;
    }
  }, []);

  // Save canvas snapshot (for shape preview)
  const saveCanvasSnapshot = useCallback(() => {
    canvasSnapshotRef.current = canvasRef.current.toDataURL();
  }, []);

  // Handle drawing with coordinate transformation for mirror
  const handleDrawing = useCallback((x, y) => {
    // Don't draw if we're dragging text or in keyboard mode
    if (!isDrawingEnabled || isDraggingTextRef.current || isKeyboardMode) return;

    const isErasing = mode === 'erase';
    const color = isErasing ? '#FFFFFF' : brushColor;
    const size = isErasing ? eraserSizeRef.current : brushSizeRef.current;

    // Apply smoothing to reduce jitter
    const smoothed = smoothCoordinates(x, y);

    // Transform X coordinate for mirror (flip horizontally)
    const canvas = canvasRef.current;
    const transformedX = canvas.width - smoothed.x;

    if (lastPointRef.current) {
      drawLine(
        lastPointRef.current.x,
        lastPointRef.current.y,
        transformedX,
        smoothed.y,
        color,
        size,
        isErasing
      );
      saveState();
    }

    lastPointRef.current = { x: transformedX, y: smoothed.y };
  }, [mode, brushColor, isDrawingEnabled, drawLine, saveState, smoothCoordinates, isKeyboardMode]);

  // Handle shape drawing with preview (Microsoft Paint style)
  const handleShapeDrawing = useCallback((x, y, isDrawing) => {
    // Don't draw shapes if we're dragging text or in keyboard mode
    if (!isDrawingEnabled || isDraggingTextRef.current || isKeyboardMode) return;

    const canvas = canvasRef.current;
    const transformedX = canvas.width - x;
    const color = brushColor;
    const size = brushSizeRef.current;

    // Check if we're in a shape mode
    const shapeModes = ['line', 'rectangle', 'square', 'circle', 'triangle'];
    const isShapeMode = shapeModes.includes(mode);

    if (!isShapeMode) return;

    if (isDrawing) {
      // Start drawing shape
      if (!isDrawingShapeRef.current) {
        // Save canvas state for preview
        saveCanvasSnapshot();
        shapeStartRef.current = { x: transformedX, y };
        isDrawingShapeRef.current = true;
      } else {
        // Update shape preview
        if (shapeStartRef.current && canvasSnapshotRef.current) {
          restoreCanvasSnapshot();
          const start = shapeStartRef.current;
          
          // Draw preview based on mode
          setTimeout(() => {
            switch (mode) {
              case 'line':
                drawShapeLine(start.x, start.y, transformedX, y, color, size);
                break;
              case 'rectangle':
                drawShapeRectangle(start.x, start.y, transformedX, y, color, size);
                break;
              case 'square':
                drawShapeSquare(start.x, start.y, transformedX, y, color, size);
                break;
              case 'circle':
                drawShapeCircle(start.x, start.y, transformedX, y, color, size);
                break;
              case 'triangle':
                drawShapeTriangle(start.x, start.y, transformedX, y, color, size);
                break;
            }
          }, 10);
        }
      }
    } else {
      // Finish drawing shape
      if (isDrawingShapeRef.current && shapeStartRef.current) {
        restoreCanvasSnapshot();
        const start = shapeStartRef.current;
        
        // Finalize shape
        switch (mode) {
          case 'line':
            drawShapeLine(start.x, start.y, transformedX, y, color, size);
            break;
          case 'rectangle':
            drawShapeRectangle(start.x, start.y, transformedX, y, color, size);
            break;
          case 'square':
            drawShapeSquare(start.x, start.y, transformedX, y, color, size);
            break;
          case 'circle':
            drawShapeCircle(start.x, start.y, transformedX, y, color, size);
            break;
          case 'triangle':
            drawShapeTriangle(start.x, start.y, transformedX, y, color, size);
            break;
        }
        
        saveState();
        shapeStartRef.current = null;
        isDrawingShapeRef.current = false;
        canvasSnapshotRef.current = null;
      }
    }
  }, [mode, brushColor, isDrawingEnabled, brushSizeRef, saveCanvasSnapshot, restoreCanvasSnapshot, drawShapeLine, drawShapeRectangle, drawShapeSquare, drawShapeCircle, drawShapeTriangle, saveState, isKeyboardMode]);

  const resetDrawing = useCallback(() => {
    lastPointRef.current = null;
    pointBufferRef.current = [];
    shapeStartRef.current = null;
    isDrawingShapeRef.current = false;
    canvasSnapshotRef.current = null;
  }, []);

  // Sync refs with state for brush/eraser sizes
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    eraserSizeRef.current = eraserSize;
  }, [eraserSize]);

  // Initialize MediaPipe Hands - separate from mode changes
  useEffect(() => {
    const initHandTracking = async () => {
      try {
        setModelStatus('Requesting camera...');
        
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 } 
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

        handsRef.current = hands;
        setModelStatus('Ready! Show your hand to draw');

        // Process frames
        const processFrame = async () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && handsRef.current) {
            // Skip processing if in keyboard mode or dragging text
            if (!isKeyboardMode && !isDraggingTextRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
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
  }, [isKeyboardMode]); // Only re-initialize when keyboard mode changes

  // Update hands results handler when mode or drawing state changes
  useEffect(() => {
    if (handsRef.current) {
      handsRef.current.onResults((results) => {
        // Skip hand tracking if in keyboard mode or dragging text
        if (isKeyboardMode || isDraggingTextRef.current) {
          return;
        }
        
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
            
            // Check if we're in a shape mode
            const shapeModes = ['line', 'rectangle', 'square', 'circle', 'triangle'];
            const isShapeMode = shapeModes.includes(mode);
            
            // Handle shape drawing
            if (isShapeMode && isDrawingEnabled) {
              handleShapeDrawing(x, y, gesture === 'draw');
            }
            // Draw or erase based on gesture and mode
            else if (gesture === 'draw' && mode === 'draw' && isDrawingEnabled) {
              handleDrawing(x, y);
            } else if (mode === 'erase' && isDrawingEnabled && (gesture === 'erase' || gesture === 'draw')) {
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
    }
  }, [mode, isDrawingEnabled, handleDrawing, handleShapeDrawing, resetDrawing, isKeyboardMode]);

  // Detect gesture from landmarks
  const detectGesture = (landmarks) => {
    try {
      if (!landmarks || landmarks.length < 21) {
        return 'none';
      }
      
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
    } catch (error) {
      console.error('Error in detectGesture:', error);
      return 'none';
    }
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
    img.src = restoreState.canvas;
    
    setTextObjects(restoreState.textObjects || []);
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
    img.src = lastState.canvas;
    
    setTextObjects(lastState.textObjects || []);
    setHistory({ undoStack: newUndoStack, redoStack: newRedoStack });
  };

  const handleClear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const newState = {
      canvas: canvasRef.current.toDataURL(),
      textObjects: []
    };
    setTextObjects([]);
    setHistory({ undoStack: [...history.undoStack, newState], redoStack: [] });
  };

  const toggleDrawing = () => {
    setIsDrawingEnabled(!isDrawingEnabled);
    resetDrawing();
  };

  const toggleKeyboardMode = () => {
    const newKeyboardMode = !isKeyboardMode;
    setIsKeyboardMode(newKeyboardMode);
    // Reset text dragging when toggling modes
    isDraggingTextRef.current = false;
    // When text mode is on, turn drawing off; when text mode is off, turn drawing on
    setIsDrawingEnabled(!newKeyboardMode);
  };

  // Set text dragging state from KeyboardText component
  const setTextDragging = useCallback((isDragging) => {
    isDraggingTextRef.current = isDragging;
  }, []);

  const handleSave = async () => {
    try {
      const canvas = canvasRef.current;
      
      // Create a temporary canvas to composite text objects
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      
      // Draw the original canvas
      ctx.drawImage(canvas, 0, 0);
      
      // Draw text objects on top
      console.log('Saving canvas with text objects:', textObjects);
      if (textObjects && textObjects.length > 0) {
        textObjects.forEach((obj, index) => {
          console.log(`Drawing text ${index}:`, obj);
          // Set text properties with better defaults
          ctx.fillStyle = obj.color || '#000000'; // Default to black instead of white
          ctx.font = `${obj.fontSize || 24}px ${obj.fontFamily || 'Arial'}`;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          
          // Add shadow for better visibility
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          ctx.fillText(obj.text, obj.position.x, obj.position.y);
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        });
      } else {
        console.log('No text objects to save');
      }
      
      const thumbnail = tempCanvas.toDataURL('image/png', 0.1);
      const canvasData = tempCanvas.toDataURL();
      console.log('Canvas data length:', canvasData.length);
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
        await exportAsImage(canvas, textObjects);
      } else if (format === 'pdf') {
        await exportAsPDF(canvas, textObjects);
      } else if (format === 'pptx') {
        await exportAsPPTX(canvas, textObjects);
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
    console.log('Loading from gallery, canvas data length:', canvasData.length);
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded, drawing to canvas');
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0);
      const newState = {
        canvas: canvasRef.current.toDataURL(),
        textObjects: [] // Text should already be composited in the image
      };
      setTextObjects([]); // Clear text objects since they're baked into the canvas
      setHistory({ undoStack: [newState], redoStack: [] });
      console.log('Gallery item loaded successfully');
    };
    img.onerror = () => {
      console.error('Failed to load image from gallery');
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
        <div> {modelStatus}</div>
        <div> Hand: {handDetected ? ' Detected' : ' No Hand'}</div>
        <div> Gesture: {currentGesture}</div>
        <div> Mode: {mode}</div>
        <div>{isDrawingEnabled ? ' Drawing ON' : ' Drawing OFF'}</div>
        <div>{isKeyboardMode ? ' ✏️ Keyboard Mode ACTIVE' : ' ⌨️ Keyboard Mode OFF'}</div>
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
        isKeyboardMode={isKeyboardMode}
        onToggleKeyboardMode={toggleKeyboardMode}
      />

      <div className="canvas-main">
        <canvas ref={canvasRef} className="drawing-canvas" />
        
        {/* Camera feed - visible and mirrored for natural POV */}
        <div className="camera-container" style={{ opacity: isKeyboardMode ? 0.5 : 1 }}>
          <video
            ref={videoRef}
            className="hand-camera"
            width={480}
            height={360}
            autoPlay
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }} // Mirror for natural POV
          />
          <div className={`camera-overlay ${handDetected ? 'hand-detected' : ''}`}>
            <span>{isKeyboardMode ? '⌨️ Keyboard Mode - Hand tracking paused' : (handDetected ? '✋ Hand Detected' : '✋ Show Your Hand')}</span>
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

      <KeyboardText 
        textObjects={textObjects}
        setTextObjects={setTextObjects}
        isActive={isKeyboardMode}
        onSetActive={() => setIsKeyboardMode(true)}
        onTextDragging={setTextDragging}
      />
    </div>
  );
};

export default CanvasArea;