import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Gallery = ({ onClose, onLoad }) => {
  const [works, setWorks] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/gallery', { headers: { Authorization: `Bearer ${token}` } });
      setWorks(res.data);
    };
    fetch();
  }, []);

  const handleLoad = async (id) => {
    const token = localStorage.getItem('token');
    const res = await axios.get(`/api/gallery/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    onLoad(res.data.canvasData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#112240] p-6 rounded-xl w-3/4 max-h-[80vh] overflow-auto">
        <h2 className="text-2xl mb-4">Your Gallery</h2>
        <div className="grid grid-cols-3 gap-4">
          {works.map(work => (
            <div key={work._id} className="bg-[#1E3A5F] p-2 rounded cursor-pointer" onClick={() => handleLoad(work._id)}>
              <img src={work.thumbnail} alt={work.title} className="w-full h-32 object-contain" />
              <p className="text-center mt-2">{work.title}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 bg-red-500 px-4 py-2 rounded">Close</button>
      </div>
    </div>
  );
};

export default Gallery;