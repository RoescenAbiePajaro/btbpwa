import React from 'react';

const GuideModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#112240] p-6 rounded-xl max-w-2xl">
        <img src="/guide.png" alt="Guide" className="w-full mb-4" />
        <button onClick={onClose} className="bg-[#64FFDA] text-black px-4 py-2 rounded">Close</button>
      </div>
    </div>
  );
};

export default GuideModal;