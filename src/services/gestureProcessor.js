
// src/services/gestureProcessor.js
export const mapToCanvas = (point, videoElement, canvasElement) => {
  if (!videoElement || !canvasElement) return { x: 0, y: 0 };
  const videoRect = videoElement.getBoundingClientRect();
  const canvasRect = canvasElement.getBoundingClientRect();
  const scaleX = canvasRect.width / videoRect.width;
  const scaleY = canvasRect.height / videoRect.height;
  const relX = point[0] / videoElement.videoWidth;
  const relY = point[1] / videoElement.videoHeight;
  return { x: relX * canvasRect.width, y: relY * canvasRect.height };
};

export const isIndexFingerOnly = (landmarks) => {
  if (!landmarks) return false;
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  return indexTip[1] < middleTip[1];
};

let lastPoint = null;
export const resetLastPoint = () => { lastPoint = null; };
export const setLastPoint = (point) => { lastPoint = point; };
export const getLastPoint = () => lastPoint;