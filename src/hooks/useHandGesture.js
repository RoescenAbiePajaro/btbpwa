// src/hooks/useHandGesture.js
import { useEffect, useRef, useState } from 'react';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs'; // Required backend

export const useHandGesture = (webcamRef, onGesture, setModelStatus) => {
  const [model, setModel] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const requestRef = useRef();
  const lastCallTime = useRef(0);
  const THROTTLE_MS = 50; // Reduce CPU usage

  useEffect(() => {
    let isMounted = true;
    const loadModel = async () => {
      try {
        if (setModelStatus) setModelStatus('Loading TensorFlow...');
        console.log('Loading handpose model...');
        const handModel = await handpose.load();
        if (isMounted) {
          setModel(handModel);
          setIsModelReady(true);
          if (setModelStatus) setModelStatus('Ready');
          console.log('Handpose model loaded successfully');
        }
      } catch (error) {
        console.error('Failed to load handpose model:', error);
        if (setModelStatus) setModelStatus('Error: ' + error.message);
      }
    };
    loadModel();
    return () => { isMounted = false; };
  }, [setModelStatus]);

  useEffect(() => {
    if (!model || !webcamRef.current) return;

    const detect = async () => {
      try {
        const now = Date.now();
        if (now - lastCallTime.current < THROTTLE_MS) {
          requestRef.current = requestAnimationFrame(detect);
          return;
        }
        lastCallTime.current = now;

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
        
        if (hasHand) {
          onGesture(predictions[0].landmarks, true);
        } else {
          onGesture(null, false);
        }
      } catch (err) {
        console.warn('Hand detection error:', err);
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [model, webcamRef, onGesture]);

  return { isModelReady };
};