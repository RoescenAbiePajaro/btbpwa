// src/main.jsx (or src/index.js)
import './tfhubFetchProxy.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as tf from '@tensorflow/tfjs';
import App from './App';
import './index.css';        // Tailwind CSS
import './styles/canvas.css'; // Custom component styles

// Initialize TensorFlow.js with WebGL backend for better performance
(async () => {
  try {
    // Set backend to WebGL (faster, uses GPU)
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('TensorFlow.js backend:', tf.getBackend());
  } catch (err) {
    console.warn('WebGL backend failed, falling back to CPU:', err);
    await tf.setBackend('cpu');
    await tf.ready();
    console.log('TensorFlow.js backend (fallback):', tf.getBackend());
  }

  // Render React app after TensorFlow is ready
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();