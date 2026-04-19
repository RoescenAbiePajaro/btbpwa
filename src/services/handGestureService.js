// src/services/handGestureService.js

class HandGestureService {
  constructor() {
    this.hands = null;
    this.onGestureDetected = null;
    this.videoElement = null;
    this.isRunning = false;
    this.animationId = null;
  }

  async initialize(videoElement, onGestureCallback) {
    this.videoElement = videoElement;
    this.onGestureDetected = onGestureCallback;

    // Check if MediaPipe is loaded
    if (typeof Hands === 'undefined') {
      console.error('MediaPipe Hands not loaded');
      return false;
    }

    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results) => this.onHandResults(results));

    // Start video processing
    this.processVideo();
    this.isRunning = true;
    return true;
  }

  processVideo() {
    if (!this.isRunning) return;
    
    if (this.videoElement && this.videoElement.readyState >= 2 && this.hands) {
      this.hands.send({ image: this.videoElement });
    }
    
    this.animationId = requestAnimationFrame(() => this.processVideo());
  }

  onHandResults(results) {
    if (!this.onGestureDetected) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const gesture = this.detectGesture(landmarks);
      const indexTip = landmarks[8];
      
      this.onGestureDetected({
        detected: true,
        gesture: gesture,
        indexTip: indexTip,
        landmarks: landmarks
      });
    } else {
      this.onGestureDetected({
        detected: false,
        gesture: null,
        indexTip: null,
        landmarks: null
      });
    }
  }

  detectGesture(landmarks) {
    const fingers = this.getFingerStates(landmarks);
    
    // Index finger only (drawing mode)
    if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky && !fingers.thumb) {
      return 'draw';
    }
    
    // Peace sign (index + middle) - stop drawing/erasing
    if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky && !fingers.thumb) {
      return 'stop';
    }
    
    // Thumbs up (for erasing)
    if (fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
      return 'erase';
    }
    
    return 'none';
  }

  getFingerStates(landmarks) {
    const fingerTips = {
      thumb: 4,
      index: 8,
      middle: 12,
      ring: 16,
      pinky: 20
    };
    
    const fingerBases = {
      thumb: 2,
      index: 5,
      middle: 9,
      ring: 13,
      pinky: 17
    };
    
    const states = {};
    
    for (const [finger, tipIdx] of Object.entries(fingerTips)) {
      const tip = landmarks[tipIdx];
      const base = landmarks[fingerBases[finger]];
      
      if (finger === 'thumb') {
        states[finger] = Math.abs(tip.x - base.x) > 0.05;
      } else {
        states[finger] = tip.y < base.y;
      }
    }
    
    return states;
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.hands) {
      this.hands.close();
    }
  }

  getIndexTipPosition(landmarks, canvasWidth, canvasHeight) {
    if (!landmarks || !landmarks[8]) return null;
    
    const tip = landmarks[8];
    return {
      x: tip.x * canvasWidth,
      y: tip.y * canvasHeight
    };
  }
}

export default HandGestureService;