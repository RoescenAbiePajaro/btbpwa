// src/components/Gallery.jsx
import React, { useEffect, useState } from 'react';
import { getUserGallery, loadWorkFromGallery } from '../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';

const Gallery = ({ onClose, onLoad }) => {
  const [works, setWorks] = useState([]);
  const [exportFormat, setExportFormat] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showExportModal, setShowExportModal] = useState(false);

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

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === works.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(works.map(work => work._id)));
    }
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

  const handleBatchExport = async (format) => {
    const selectedWorks = works.filter(work => selectedItems.has(work._id));
    
    for (const work of selectedWorks) {
      await handleExport(work, format);
      // Add small delay between exports to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setShowExportModal(false);
    setSelectedItems(new Set());
  };

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2 className="gallery-title">Your Gallery</h2>
        <div className="gallery-header-actions">
          {works.length > 0 && (
            <>
              <label className="select-all-container">
                <input
                  type="checkbox"
                  checked={selectedItems.size === works.length}
                  onChange={toggleSelectAll}
                  className="select-all-checkbox"
                />
                <span>Select All</span>
              </label>
              {selectedItems.size > 0 && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="export-selected-btn"
                >
                  Export Selected ({selectedItems.size})
                </button>
              )}
            </>
          )}
          <button onClick={onClose} className="gallery-close-btn">✕</button>
        </div>
      </div>
      
      {works.length === 0 ? (
        <div className="gallery-empty">
          <p>No saved works yet. Start creating!</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {works.map(work => (
            <div key={work._id} className={`gallery-item ${selectedItems.has(work._id) ? 'selected' : ''}`}>
              <div className="gallery-item-checkbox">
                <input
                  type="checkbox"
                  checked={selectedItems.has(work._id)}
                  onChange={() => toggleItemSelection(work._id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
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
      
      {/* Export Modal */}
      {showExportModal && (
        <div className="export-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="export-modal-header">
              <h3>Export Selected Items</h3>
              <button onClick={() => setShowExportModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="export-modal-content">
              <p>Choose export format for {selectedItems.size} selected item(s):</p>
              <div className="export-options">
                <button
                  onClick={() => handleBatchExport('image')}
                  className="export-option-btn export-option-btn--image"
                >
                  <div className="export-option-icon">🖼️</div>
                  <div className="export-option-title">Export as Images</div>
                  <div className="export-option-desc">PNG format</div>
                </button>
                <button
                  onClick={() => handleBatchExport('pdf')}
                  className="export-option-btn export-option-btn--pdf"
                >
                  <div className="export-option-icon">📄</div>
                  <div className="export-option-title">Export as PDFs</div>
                  <div className="export-option-desc">Individual PDF files</div>
                </button>
                <button
                  onClick={() => handleBatchExport('pptx')}
                  className="export-option-btn export-option-btn--pptx"
                >
                  <div className="export-option-icon">📊</div>
                  <div className="export-option-title">Export as PowerPoint</div>
                  <div className="export-option-desc">Individual PPTX files</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;