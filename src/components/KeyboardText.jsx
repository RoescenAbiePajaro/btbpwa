import React, { useState, useEffect, useRef } from 'react';

const KeyboardText = ({ setKeyboardText }) => {
  const [text, setText] = useState('Double-click to edit');
  const [pos, setPos] = useState({ x: 200, y: 200 });
  const [isEditing, setIsEditing] = useState(false);
  const divRef = useRef(null);

  useEffect(() => {
    setKeyboardText({ text, pos });
  }, [text, pos]);

  const handleDrag = (e) => {
    if (isEditing) return;
    setPos({ x: e.clientX - 50, y: e.clientY - 20 });
  };

  return (
    <div
      ref={divRef}
      onMouseDown={handleDrag}
      onDoubleClick={() => setIsEditing(true)}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        cursor: isEditing ? 'text' : 'grab',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontFamily: 'Arial',
        fontSize: '20px',
        zIndex: 10,
      }}
    >
      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setIsEditing(false)}
          style={{ background: 'white', color: 'black' }}
        />
      ) : (
        text
      )}
    </div>
  );
};

export default KeyboardText;