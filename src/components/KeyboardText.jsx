// src/components/KeyboardText.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

const KeyboardText = ({ textObjects, setTextObjects, isActive, onSetActive }) => {
  const [inputText, setInputText] = useState('');
  const [inputPos, setInputPos] = useState({ x: 720, y: 384 });
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingInput]);

  // Add new text object
  const addTextObject = useCallback(() => {
    if (!inputText.trim()) return;
    
    const newTextObject = {
      id: Date.now(),
      text: inputText,
      position: { x: inputPos.x, y: inputPos.y },
      color: '#FFFFFF',
      fontSize: 24,
      fontFamily: 'Arial',
      selected: false
    };
    
    setTextObjects(prev => [...prev, newTextObject]);
    setInputText('');
    setIsEditingInput(false);
  }, [inputText, inputPos, setTextObjects]);

  // Delete selected text object
  const deleteSelected = useCallback(() => {
    if (selectedIndex >= 0) {
      setTextObjects(prev => prev.filter((_, i) => i !== selectedIndex));
      setSelectedIndex(-1);
    }
  }, [selectedIndex, setTextObjects]);

  // Update text object
  const updateTextObject = useCallback((index, updates) => {
    setTextObjects(prev => prev.map((obj, i) => 
      i === index ? { ...obj, ...updates } : obj
    ));
  }, [setTextObjects]);

  // Handle drag start
  const handleDragStart = useCallback((e, index) => {
    if (!isActive) return;
    e.stopPropagation();
    
    const obj = textObjects[index];
    setDraggingIndex(index);
    setDragOffset({
      x: e.clientX - obj.position.x,
      y: e.clientY - obj.position.y
    });
    
    // Select this object
    setSelectedIndex(index);
    setTextObjects(prev => prev.map((o, i) => ({
      ...o,
      selected: i === index
    })));
  }, [isActive, textObjects, setTextObjects]);

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (draggingIndex >= 0) {
      const newPos = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      updateTextObject(draggingIndex, { position: newPos });
    }
  }, [draggingIndex, dragOffset, updateTextObject]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingIndex(-1);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (!isActive) return;
    
    if (e.key === 'Enter' && isEditingInput) {
      addTextObject();
    } else if (e.key === 'Escape') {
      setIsEditingInput(false);
      setInputText('');
      setSelectedIndex(-1);
      setTextObjects(prev => prev.map(o => ({ ...o, selected: false })));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIndex >= 0 && !isEditingInput) {
        deleteSelected();
      }
    }
  }, [isActive, isEditingInput, addTextObject, selectedIndex, deleteSelected, setTextObjects]);

  // Add keyboard event listener
  useEffect(() => {
    if (isActive) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);

  // Add mouse move/end listeners for dragging
  useEffect(() => {
    if (draggingIndex >= 0) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggingIndex, handleDragMove, handleDragEnd]);

  return (
    <>
      {/* Text Input Area */}
      {isActive && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.85)',
            padding: '16px 24px',
            borderRadius: '12px',
            zIndex: 1000,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            border: '2px solid #64FFDA'
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setIsEditingInput(true)}
            placeholder="Type text and press Enter..."
            style={{
              background: 'white',
              color: 'black',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '16px',
              border: 'none',
              width: '300px',
              outline: 'none'
            }}
          />
          <button
            onClick={addTextObject}
            style={{
              background: '#64FFDA',
              color: 'black',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Add Text
          </button>
          {selectedIndex >= 0 && (
            <button
              onClick={deleteSelected}
              style={{
                background: '#FF4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Delete Selected
            </button>
          )}
          <div style={{ color: '#64FFDA', fontSize: '12px' }}>
            Press Enter to add, Delete to remove selected
          </div>
        </div>
      )}

      {/* Render Text Objects */}
      {textObjects.map((obj, index) => (
        <div
          key={obj.id}
          onMouseDown={(e) => handleDragStart(e, index)}
          onDoubleClick={() => {
            setInputText(obj.text);
            setInputPos(obj.position);
            setIsEditingInput(true);
            setSelectedIndex(index);
          }}
          style={{
            position: 'absolute',
            left: obj.position.x,
            top: obj.position.y,
            cursor: draggingIndex === index ? 'grabbing' : 'grab',
            color: obj.color,
            fontSize: `${obj.fontSize}px`,
            fontFamily: obj.fontFamily,
            userSelect: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            background: obj.selected ? 'rgba(100, 255, 218, 0.3)' : 'transparent',
            border: obj.selected ? '2px solid #64FFDA' : 'none',
            zIndex: 100,
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          {obj.text}
        </div>
      ))}
    </>
  );
};

export default KeyboardText;