import { useEffect, useRef, useState } from 'react';
import * as handpose from '@tensorflow-models/handpose';

export const useHandGesture = (webcamRef, onGesture) => {
  const [model, setModel] = useState(null);
  const requestRef = useRef();

  useEffect(() => {
    const loadModel = async () => {
      const handModel = await handpose.load();
      setModel(handModel);
    };
    loadModel();
  }, []);

  useEffect(() => {
    if (!model || !webcamRef.current) return;
    const detect = async () => {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const predictions = await model.estimateHands(video);
        if (predictions.length > 0) {
          onGesture(predictions[0].landmarks);
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };
    requestRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(requestRef.current);
  }, [model, webcamRef, onGesture]);
};