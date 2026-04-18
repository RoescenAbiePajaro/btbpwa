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
    <div className="gallery-container">
      <div className="gallery-header">
        <h2 className="gallery-title">Your Gallery</h2>
        <button onClick={onClose} className="gallery-close-btn">✕</button>
      </div>
      
      {works.length === 0 ? (
        <div className="gallery-empty">
          <p>No saved works yet. Start creating!</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {works.map(work => (
            <div key={work._id} className="gallery-item">
              <div className="gallery-item-content" onClick={() => handleLoad(work._id)}>
                <img src={work.thumbnail} alt={work.title} className="gallery-thumbnail" />
                <p className="gallery-item-title">{work.title}</p>
              </div>
              <div className="gallery-item-actions">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExport(work, 'image'); }}
                  className="gallery-action-btn gallery-action-btn--image"
                  title="Export as Image"
                >
                  PNG
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExport(work, 'pdf'); }}
                  className="gallery-action-btn gallery-action-btn--pdf"
                  title="Export as PDF"
                >
                  PDF
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExport(work, 'pptx'); }}
                  className="gallery-action-btn gallery-action-btn--pptx"
                  title="Export as PowerPoint"
                >
                  PPTX
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;