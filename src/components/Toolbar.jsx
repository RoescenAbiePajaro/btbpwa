import React from 'react';

const Toolbar = ({ 
  mode, setMode, brushColor, setBrushColor, brushSize, setBrushSize, 
  eraserSize, setEraserSize, onUndo, onRedo, onClear, onSave, onExport, 
  onGuide, onGallery, onLogout, onToggleDrawing, isDrawingEnabled 
}) => {
  const colors = [
    '#000000', '#FF0000', '#FF69B4', '#FFD700', '#0000FF', '#00FF00', '#800080', '#FFA500'
  ];

  return (
    <div className="glass-toolbar">
      <div className="toolbar-section">
        <button onClick={() => setMode('draw')} className={`tool-btn ${mode === 'draw' ? 'active' : ''}`}>
          ✏️ Draw
        </button>
        <button onClick={() => setMode('erase')} className={`tool-btn ${mode === 'erase' ? 'active' : ''}`}>
          🧽 Eraser
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={onToggleDrawing} className={`tool-btn ${isDrawingEnabled ? 'active' : 'inactive'}`}>
          {isDrawingEnabled ? '✋ Drawing ON' : '🔒 Drawing OFF'}
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={onUndo} className="tool-btn">↩️ Undo</button>
        <button onClick={onRedo} className="tool-btn">↪️ Redo</button>
        <button onClick={onClear} className="tool-btn">🗑️ Clear</button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <div className="color-palette">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setBrushColor(color)}
              className={`color-btn ${brushColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <label className="range-label">
          Brush: {brushSize}px
          <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} />
        </label>
        <label className="range-label">
          Eraser: {eraserSize}px
          <input type="range" min="5" max="80" value={eraserSize} onChange={e => setEraserSize(parseInt(e.target.value))} />
        </label>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={onSave} className="tool-btn">💾 Save</button>
        <button onClick={() => onExport('image')} className="tool-btn">📸 Export</button>
        <button onClick={onGuide} className="tool-btn">❓ Guide</button>
        <button onClick={onGallery} className="tool-btn">🖼️ Gallery</button>
        <button onClick={onLogout} className="tool-btn">🚪 Logout</button>
      </div>
    </div>
  );
};

export default Toolbar;