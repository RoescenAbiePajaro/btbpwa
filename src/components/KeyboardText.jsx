// src/components/KeyboardText.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

const KeyboardText = ({ textObjects, setTextObjects, isActive, onSetActive, onTextDragging }) => {
  const [inputText, setInputText] = useState('');
  const [inputPos, setInputPos] = useState({ x: 720, y: 384 });
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dragStartPosRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingInput]);

  // Notify parent about dragging state
  useEffect(() => {
    if (onTextDragging) {
      onTextDragging(draggingIndex >= 0);
    }
  }, [draggingIndex, onTextDragging]);

  // Real-time text update for existing text objects
  const updateTextInRealTime = useCallback(() => {
    if (isEditingExisting && selectedIndex >= 0) {
      setTextObjects(prev => prev.map((obj, i) => 
        i === selectedIndex ? { ...obj, text: inputText } : obj
      ));
    }
  }, [inputText, isEditingExisting, selectedIndex, setTextObjects]);

  // Update text in real-time when input changes
  useEffect(() => {
    if (isEditingExisting && selectedIndex >= 0) {
      const timeoutId = setTimeout(() => {
        updateTextInRealTime();
      }, 100); // Debounce to avoid excessive updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [inputText, isEditingExisting, selectedIndex, updateTextInRealTime]);

  // Add new text object or update existing
  const addTextObject = useCallback(() => {
    if (!inputText.trim()) return;
    
    if (isEditingExisting && selectedIndex >= 0) {
      // Update existing text object (final update)
      setTextObjects(prev => prev.map((obj, i) => 
        i === selectedIndex ? { ...obj, text: inputText } : obj
      ));
    } else {
      // Add new text object
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
    }
    
    setInputText('');
    setIsEditingInput(false);
    setIsEditingExisting(false);
    setSelectedIndex(-1);
  }, [inputText, inputPos, isEditingExisting, selectedIndex, setTextObjects]);

  // Delete selected text object
  const deleteSelected = useCallback(() => {
    if (selectedIndex >= 0) {
      setTextObjects(prev => prev.filter((_, i) => i !== selectedIndex));
      setSelectedIndex(-1);
      setIsEditingExisting(false);
      setInputText('');
      setIsEditingInput(false);
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
    e.preventDefault();
    e.stopPropagation();
    
    const obj = textObjects[index];
    const startX = e.clientX;
    const startY = e.clientY;
    
    setDraggingIndex(index);
    setDragOffset({
      x: startX - obj.position.x,
      y: startY - obj.position.y
    });
    dragStartPosRef.current = { x: startX, y: startY };
    
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
      e.preventDefault();
      e.stopPropagation();
      
      const newPos = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      updateTextObject(draggingIndex, { position: newPos });
    }
  }, [draggingIndex, dragOffset, updateTextObject]);

  // Handle drag end
  const handleDragEnd = useCallback((e) => {
    if (draggingIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      
      // Start editing the dragged text
      const obj = textObjects[draggingIndex];
      setInputText(obj.text);
      setInputPos(obj.position);
      setIsEditingInput(true);
      setIsEditingExisting(true);
      setSelectedIndex(draggingIndex);
      
      setDraggingIndex(-1);
      dragStartPosRef.current = null;
    }
  }, [draggingIndex, textObjects]);

  // Done editing function
  const doneEdit = useCallback(() => {
    setIsEditingInput(false);
    setIsEditingExisting(false);
    setInputText('');
    setSelectedIndex(-1);
    setTextObjects(prev => prev.map(o => ({ ...o, selected: false })));
  }, [setTextObjects]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (!isActive) return;
    
    if (e.key === 'Enter' && isEditingInput) {
      e.preventDefault();
      addTextObject();
    } else if (e.key === 'Escape') {
      doneEdit();
    } else if (e.key === 'Delete') {
      if (selectedIndex >= 0 && !isEditingInput) {
        e.preventDefault();
        deleteSelected();
      }
    }
  }, [isActive, isEditingInput, addTextObject, selectedIndex, deleteSelected, doneEdit]);

  // Add keyboard event listener
  useEffect(() => {
    if (isActive) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);

  // Add mouse move/end listeners for dragging with capture to prevent interference
  useEffect(() => {
    if (draggingIndex >= 0) {
      // Use capture phase to ensure we get events before canvas
      window.addEventListener('mousemove', handleDragMove, true);
      window.addEventListener('mouseup', handleDragEnd, true);
      return () => {
        window.removeEventListener('mousemove', handleDragMove, true);
        window.removeEventListener('mouseup', handleDragEnd, true);
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
            background: 'rgba(0, 0, 0, 0.95)',
            padding: '16px 24px',
            borderRadius: '12px',
            zIndex: 1001,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            border: '2px solid #64FFDA',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
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
            onClick={isEditingExisting ? doneEdit : addTextObject}
            style={{
              background: isEditingExisting ? '#FFA500' : '#64FFDA',
              color: 'black',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isEditingExisting ? 'Done Edit' : 'Add Text'}
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
            setIsEditingExisting(true);
            setSelectedIndex(index);
          }}
          style={{
            position: 'fixed',
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
            zIndex: draggingIndex === index ? 1002 : 100,
            WebkitTextStroke: '1px black',
            pointerEvents: isActive ? 'auto' : 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {obj.text}
        </div>
      ))}
    </>
  );
};

export default KeyboardText;