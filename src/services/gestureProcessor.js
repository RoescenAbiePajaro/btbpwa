// Maps webcam coordinates to canvas coordinates
export const mapToCanvas = (point, videoElement, canvasElement) => {
  if (!videoElement || !canvasElement) return { x: 0, y: 0 };
  const videoRect = videoElement.getBoundingClientRect();
  const canvasRect = canvasElement.getBoundingClientRect();

  // Scale factor from video to canvas
  const scaleX = canvasRect.width / videoRect.width;
  const scaleY = canvasRect.height / videoRect.height;

  // Relative position inside video (0-1)
  const relX = point[0] / videoElement.videoWidth;
  const relY = point[1] / videoElement.videoHeight;

  // Canvas coordinates
  const canvasX = relX * canvasRect.width;
  const canvasY = relY * canvasRect.height;

  return { x: canvasX, y: canvasY };
};

// Check if index finger is extended (simplified: thumb tip vs index tip distance)
export const isIndexFingerOnly = (landmarks) => {
  if (!landmarks) return false;
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexExtended = indexTip[1] < middleTip[1]; // y smaller means higher up
  const othersRetracted = middleTip[1] > indexTip[1] && ringTip[1] > indexTip[1] && pinkyTip[1] > indexTip[1];
  return indexExtended && othersRetracted;
};

// For continuous drawing: track previous point
let lastPoint = null;

export const processDrawingGesture = (currentPoint, canvas, drawCallback) => {
  if (lastPoint) {
    drawCallback(lastPoint, currentPoint);
  }
  lastPoint = currentPoint;
};

export const resetLastPoint = () => {
  lastPoint = null;
};