// src/hooks/useHandGesture.js
import { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

export const useHandGesture = (webcamRef, onGesture, setModelStatus) => {
  const [model, setModel] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const requestRef = useRef();
  const canvasRef = useRef(null); // for skeleton drawing

  // Load model with retry logic
  useEffect(() => {
    let isMounted = true;
    const loadModel = async () => {
      try {
        if (setModelStatus) setModelStatus('Loading model...');
        console.log('Loading handpose model...');
        
        // handpose.load() automatically fetches from its default CDN
        const handModel = await handpose.load();
        
        if (isMounted) {
          setModel(handModel);
          setIsModelReady(true);
          if (setModelStatus) setModelStatus('Ready');
          console.log('Handpose model loaded successfully');
        }
      } catch (err) {
        console.error('Failed to load handpose model:', err);
        if (setModelStatus) setModelStatus('Error: network issue');
      }
    };
    loadModel();
    return () => { isMounted = false; };
  }, [setModelStatus]);

  // Draw skeleton on a separate canvas overlay
  useEffect(() => {
    if (!model || !webcamRef.current) return;
    
    // Create an overlay canvas for skeleton drawing
    const videoElement = webcamRef.current.video;
    if (!videoElement) return;
    
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.zIndex = '20';
    webcamRef.current.parentElement.style.position = 'relative';
    webcamRef.current.parentElement.appendChild(overlayCanvas);
    canvasRef.current = overlayCanvas;
    
    const resizeObserver = new ResizeObserver(() => {
      if (videoElement) {
        overlayCanvas.width = videoElement.clientWidth;
        overlayCanvas.height = videoElement.clientHeight;
      }
    });
    resizeObserver.observe(videoElement);
    
    return () => {
      resizeObserver.disconnect();
      if (overlayCanvas) overlayCanvas.remove();
    };
  }, [model, webcamRef]);

  // Detection loop with skeleton drawing
  useEffect(() => {
    if (!model || !webcamRef.current) return;

    const detect = async () => {
      try {
        const webcam = webcamRef.current;
        if (!webcam || !webcam.video) {
          requestRef.current = requestAnimationFrame(detect);
          return;
        }
        
        const video = webcam.video;
        if (video.readyState !== 4 || video.videoWidth === 0) {
          requestRef.current = requestAnimationFrame(detect);
          return;
        }

        const predictions = await model.estimateHands(video);
        const hasHand = predictions && predictions.length > 0;
        
        // Draw skeleton on overlay canvas
        if (canvasRef.current && hasHand) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          const landmarks = predictions[0].landmarks;
          drawHandSkeleton(ctx, landmarks, canvasRef.current.width, canvasRef.current.height, video.videoWidth, video.videoHeight);
        } else if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        
        if (hasHand) {
          onGesture(predictions[0].landmarks, true);
        } else {
          onGesture(null, false);
        }
      } catch (err) {
        console.warn('Detection error:', err);
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [model, webcamRef, onGesture]);

  return { isModelReady };
};

// Helper: Draw hand skeleton
function drawHandSkeleton(ctx, landmarks, canvasW, canvasH, videoW, videoH) {
  if (!landmarks) return;
  
  // Define connections between landmarks (standard handpose connections)
  const connections = [
    [0,1], [1,2], [2,3], [3,4], // thumb
    [0,5], [5,6], [6,7], [7,8], // index
    [0,9], [9,10], [10,11], [11,12], // middle
    [0,13], [13,14], [14,15], [15,16], // ring
    [0,17], [17,18], [18,19], [19,20], // pinky
    [0,17], [0,5], [5,9], [9,13], [13,17] // palm
  ];
  
  // Scale landmarks to canvas size (mirroring applied)
  const scaleX = canvasW / videoW;
  const scaleY = canvasH / videoH;
  
  ctx.save();
  ctx.scale(-1, 1); // mirror to match webcam display
  ctx.translate(-canvasW, 0);
  
  ctx.beginPath();
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  
  for (let connection of connections) {
    const start = landmarks[connection[0]];
    const end = landmarks[connection[1]];
    if (start && end) {
      ctx.beginPath();
      ctx.moveTo(start[0] * scaleX, start[1] * scaleY);
      ctx.lineTo(end[0] * scaleX, end[1] * scaleY);
      ctx.stroke();
    }
  }
  
  // Draw keypoints
  for (let i = 0; i < landmarks.length; i++) {
    const [x, y] = landmarks[i];
    ctx.beginPath();
    ctx.arc(x * scaleX, y * scaleY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
  }
  
  ctx.restore();
}