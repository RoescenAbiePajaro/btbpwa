// src/services/gestureProcessor.js
export const mapToCanvas = (point, videoElement, canvasElement) => {
  if (!videoElement || !canvasElement) {
    console.warn('Missing video or canvas element');
    return { x: 0, y: 0 };
  }
  
  // Get actual video dimensions (may be scaled)
  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;
  if (videoWidth === 0 || videoHeight === 0) {
    return { x: 0, y: 0 };
  }
  
  // Landmark coordinates are normalized relative to video dimensions
  const rawX = point[0];
  const rawY = point[1];
  
  // Normalized (0-1) within original video frame
  let normX = rawX / videoWidth;
  let normY = rawY / videoHeight;
  
  // Mirror correction: because we flip the video with CSS transform
  // The handpose model sees the raw video (not flipped), so we must flip X
  normX = 1 - normX;
  
  // Map to canvas coordinates
  const canvasRect = canvasElement.getBoundingClientRect();
  const canvasX = normX * canvasRect.width;
  const canvasY = normY * canvasRect.height;
  
  // Clamp to canvas boundaries
  return {
    x: Math.min(Math.max(0, canvasX), canvasRect.width),
    y: Math.min(Math.max(0, canvasY), canvasRect.height)
  };
};

export const isIndexFingerOnly = (landmarks) => {
  if (!landmarks || landmarks.length < 21) return false;
  // Tip of index finger (landmark 8) should be above tip of middle finger (landmark 12)
  // Y coordinate: smaller = higher up
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  // Index finger extended and higher than others
  const indexUp = indexTip[1] < middleTip[1] && indexTip[1] < ringTip[1] && indexTip[1] < pinkyTip[1];
  // Also ensure other fingers are not extended (optional, for precise gesture)
  // For drawing, we just need index finger pointing
  return indexUp;
};

let lastPoint = null;
export const resetLastPoint = () => { lastPoint = null; };
export const setLastPoint = (point) => { lastPoint = point; };
export const getLastPoint = () => lastPoint;