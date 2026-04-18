import React from 'react';

const Toolbar = ({ mode, setMode, brushColor, setBrushColor, brushSize, setBrushSize, eraserSize, setEraserSize, onUndo, onRedo, onSave, onExport, onGuide, onGallery, onLogout }) => {
  const colors = ['#000000', '#0000FF', '#FFFF00', '#00FF00', '#FFC0CB']; // black, blue, yellow, green, pink

  return (
    <div className="bg-[#112240] p-4 flex flex-wrap gap-4 items-center shadow-lg">
      <button onClick={() => setMode('draw')} className={`px-4 py-2 rounded ${mode === 'draw' ? 'bg-[#64FFDA] text-black' : 'bg-[#1E3A5F]'}`}>✏️ Draw</button>
      <button onClick={() => setMode('erase')} className={`px-4 py-2 rounded ${mode === 'erase' ? 'bg-[#64FFDA] text-black' : 'bg-[#1E3A5F]'}`}>🧽 Eraser</button>
      <button onClick={() => setMode('keyboard')} className={`px-4 py-2 rounded ${mode === 'keyboard' ? 'bg-[#64FFDA] text-black' : 'bg-[#1E3A5F]'}`}>⌨️ Keyboard Mode</button>
      <button onClick={onUndo} className="bg-[#1E3A5F] px-3 py-2 rounded">↩️ Undo</button>
      <button onClick={onRedo} className="bg-[#1E3A5F] px-3 py-2 rounded">↪️ Redo</button>
      <div className="flex gap-2">
        {colors.map(c => (
          <button key={c} onClick={() => setBrushColor(c)} className="w-8 h-8 rounded-full border-2 border-white" style={{ backgroundColor: c }} />
        ))}
      </div>
      <label>Brush Size: <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} /></label>
      <label>Eraser Size: <input type="range" min="5" max="80" value={eraserSize} onChange={e => setEraserSize(parseInt(e.target.value))} /></label>
      <button onClick={onSave} className="bg-green-600 px-3 py-2 rounded">💾 Save to Gallery</button>
      <button onClick={onClear} className="bg-orange-600 px-3 py-2 rounded">🗑️ Clear All</button>
      <button onClick={() => onExport('image')} className="bg-blue-600 px-3 py-2 rounded">📸 Export Image</button>
      <button onClick={() => onExport('pdf')} className="bg-red-600 px-3 py-2 rounded">📄 Export PDF</button>
      <button onClick={() => onExport('pptx')} className="bg-purple-600 px-3 py-2 rounded">📊 Export PPTX</button>
      <button onClick={onGuide} className="bg-yellow-600 px-3 py-2 rounded">❓ Guide</button>
      <button onClick={onGallery} className="bg-indigo-600 px-3 py-2 rounded">🖼️ Gallery</button>
      <button onClick={onLogout} className="bg-gray-700 px-3 py-2 rounded">🚪 Logout</button>
    </div>
  );
};

export default Toolbar;