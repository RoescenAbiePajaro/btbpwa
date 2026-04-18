// src/services/gestureProcessor.js
export const mapToCanvas = (point, videoElement, canvasElement) => {
  if (!videoElement || !canvasElement) return { x: 0, y: 0 };

  const videoRect = videoElement.getBoundingClientRect();
  const canvasRect = canvasElement.getBoundingClientRect();

  // Relative position inside video (0..1)
  let relX = point[0] / videoElement.videoWidth;
  const relY = point[1] / videoElement.videoHeight;

  // If the video is mirrored (CSS transform scaleX(-1)), flip X
  const computedStyle = window.getComputedStyle(videoElement);
  const transform = computedStyle.transform;
  const isMirrored = transform.includes('scaleX(-1)') || transform.includes('matrix(-1, 0, 0, 1');
  if (isMirrored) {
    relX = 1 - relX;
  }

  return {
    x: relX * canvasRect.width,
    y: relY * canvasRect.height
  };
};

export const isIndexFingerOnly = (landmarks) => {
  if (!landmarks) return false;
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  // Index finger tip higher (lower Y) than middle finger tip
  return indexTip[1] < middleTip[1];
};

let lastPoint = null;
export const resetLastPoint = () => { lastPoint = null; };
export const setLastPoint = (point) => { lastPoint = point; };
export const getLastPoint = () => lastPoint;