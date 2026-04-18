// src/components/Gallery.jsx
import React, { useEffect, useState } from 'react';
import { getUserGallery, loadWorkFromGallery } from '../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';

const Gallery = ({ onClose, onLoad }) => {
  const [works, setWorks] = useState([]);
  const [exportFormat, setExportFormat] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const data = await getUserGallery();
      setWorks(data);
    };
    fetch();
  }, []);

  const handleLoad = async (id) => {
    const canvasData = await loadWorkFromGallery(id);
    onLoad(canvasData);
    onClose();
  };

  const exportAsImage = async (work) => {
    try {
      const response = await fetch(work.thumbnail);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${work.title}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting image:', error);
    }
  };

  const exportAsPDF = async (work) => {
    try {
      const pdf = new jsPDF();
      const response = await fetch(work.thumbnail);
      const blob = await response.blob();
      
      const img = new Image();
      img.onload = () => {
        const imgWidth = 180;
        const imgHeight = (img.height * imgWidth) / img.width;
        const x = (pdf.internal.pageSize.width - imgWidth) / 2;
        const y = 20;
        
        pdf.text(work.title, pdf.internal.pageSize.width / 2, y, { align: 'center' });
        pdf.addImage(img, 'PNG', x, y + 10, imgWidth, imgHeight);
        pdf.save(`${work.title}.pdf`);
      };
      img.src = URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const exportAsPPTX = async (work) => {
    try {
      const pptx = new PptxGenJS();
      const slide = pptx.addSlide();
      
      slide.addText(work.title, { 
        x: 1, 
        y: 0.5, 
        fontSize: 24, 
        bold: true, 
        align: 'center',
        color: '363636'
      });
      
      const response = await fetch(work.thumbnail);
      const blob = await response.blob();
      const imageData = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
      
      slide.addImage({
        data: `data:image/png;base64,${base64}`,
        x: 1,
        y: 1.5,
        w: 8,
        h: 4
      });
      
      pptx.writeFile({ fileName: `${work.title}.pptx` });
    } catch (error) {
      console.error('Error exporting PPTX:', error);
    }
  };

  const handleExport = (work, format) => {
    switch (format) {
      case 'image':
        exportAsImage(work);
        break;
      case 'pdf':
        exportAsPDF(work);
        break;
      case 'pptx':
        exportAsPPTX(work);
        break;
      default:
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#112240] p-6 rounded-xl w-3/4 max-h-[80vh] overflow-auto">
        <h2 className="text-2xl mb-4">Your Gallery</h2>
        <div className="grid grid-cols-3 gap-4">
          {works.map(work => (
            <div key={work._id} className="bg-[#1E3A5F] p-2 rounded">
              <div className="cursor-pointer" onClick={() => handleLoad(work._id)}>
                <img src={work.thumbnail} alt={work.title} className="w-full h-32 object-contain" />
                <p className="text-center mt-2">{work.title}</p>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExport(work, 'image'); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                  title="Export as Image"
                >
                  PNG
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExport(work, 'pdf'); }}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                  title="Export as PDF"
                >
                  PDF
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExport(work, 'pptx'); }}
                  className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded"
                  title="Export as PowerPoint"
                >
                  PPTX
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 bg-red-500 px-4 py-2 rounded">Close</button>
      </div>
    </div>
  );
};

export default Gallery;