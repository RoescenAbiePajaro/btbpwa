// src/main.jsx (or src/index.js)
import './tfhubFetchProxy.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';        // Tailwind CSS
import './styles/canvas.css'; // Custom component styles



  // Render React app after TensorFlow is ready
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
;