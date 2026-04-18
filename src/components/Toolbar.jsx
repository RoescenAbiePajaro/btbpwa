// src/components/Toolbar.jsx
import React from 'react';

const Toolbar = ({ mode, setMode, brushColor, setBrushColor, brushSize, setBrushSize, eraserSize, setEraserSize, onUndo, onRedo, onClear, onSave, onExport, onGuide, onGallery, onLogout }) => {
  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Pink', value: '#FF69B4' },
    { name: 'Yellow', value: '#FFD700' },
    { name: 'Blue', value: '#0000FF' },
    { name: 'Green', value: '#00FF00' }
  ];

  return (
    <div className="glass-toolbar">
      <button onClick={() => setMode('draw')} className={`tool-btn ${mode === 'draw' ? 'active' : ''}`}>✏️ Draw</button>
      <button onClick={() => setMode('erase')} className={`tool-btn ${mode === 'erase' ? 'active' : ''}`}>🧽 Eraser</button>
      <button onClick={() => setMode('keyboard')} className={`tool-btn ${mode === 'keyboard' ? 'active' : ''}`}>⌨️ Keyboard</button>
      <button onClick={onUndo} className="tool-btn">↩️ Undo</button>
      <button onClick={onRedo} className="tool-btn">↪️ Redo</button>
      <button onClick={onClear} className="tool-btn">🗑️ Clear</button>
      
      {/* Color palette */}
      <div className="flex gap-2">
        {colors.map(c => (
          <button
            key={c.value}
            onClick={() => setBrushColor(c.value)}
            className="w-8 h-8 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
            style={{ backgroundColor: c.value }}
            title={c.name}
          />
        ))}
      </div>
      
      <label className="range-label">Brush: <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} /></label>
      <label className="range-label">Eraser: <input type="range" min="5" max="80" value={eraserSize} onChange={e => setEraserSize(parseInt(e.target.value))} /></label>
      <button onClick={onSave} className="tool-btn">💾 Save</button>
      <button onClick={() => onExport('image')} className="tool-btn">📸 Image</button>
      <button onClick={() => onExport('pdf')} className="tool-btn">📄 PDF</button>
      <button onClick={() => onExport('pptx')} className="tool-btn">📊 PPTX</button>
      <button onClick={onGuide} className="tool-btn">❓ Guide</button>
      <button onClick={onGallery} className="tool-btn">🖼️ Gallery</button>
      <button onClick={onLogout} className="tool-btn">🚪 Logout</button>
    </div>
  );
};

export default Toolbar;