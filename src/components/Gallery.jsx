// src/components/Gallery.jsx
import React, { useEffect, useState } from 'react';
import { getUserGallery, loadWorkFromGallery, deleteWorkFromGallery, deleteMultipleWorksFromGallery } from '../services/api';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';

const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 768;

const Gallery = ({ onClose, onLoad }) => {
  const [works, setWorks] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [templateImage, setTemplateImage] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const data = await getUserGallery();
      setWorks(data);
    };
    fetch();
  }, []);

  // Load template image on component mount
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setTemplateImage(img);
    img.onerror = () => console.error('Failed to load template image');
    img.src = '/template.png';
  }, []);

  // Function to composite artwork onto template
  const compositeWithTemplate = async (savedData) => {
    return new Promise((resolve, reject) => {
      if (!templateImage) {
        reject(new Error('Template image not loaded'));
        return;
      }

      // Extract canvas image from saved data
      const canvasImageData = typeof savedData === 'string' 
        ? savedData 
        : savedData.canvasImage;
      
      const textObjects = typeof savedData === 'object' && savedData.textObjects
        ? savedData.textObjects 
        : [];

      const artworkImg = new Image();
      artworkImg.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set canvas size to match template
          canvas.width = templateImage.width;
          canvas.height = templateImage.height;

          // Draw template first
          ctx.drawImage(templateImage, 0, 0);

          // Draw artwork on top, centered and scaled to fit
          const scale = Math.min(
            canvas.width / artworkImg.width,
            canvas.height / artworkImg.height
          ) * 0.85; // 85% to leave some margin

          const scaledWidth = artworkImg.width * scale;
          const scaledHeight = artworkImg.height * scale;
          const x = (canvas.width - scaledWidth) / 2;
          const y = (canvas.height - scaledHeight) / 2;

          ctx.drawImage(artworkImg, x, y, scaledWidth, scaledHeight);
          
          // Draw text objects on top if they exist
          if (textObjects && textObjects.length > 0) {
            const scaleX = canvas.width / CANVAS_WIDTH;
            const scaleY = canvas.height / CANVAS_HEIGHT;
            
            textObjects.forEach((obj) => {
              ctx.save();
              ctx.fillStyle = obj.color || '#000000';
              ctx.font = `${(obj.fontSize || 24) * scaleY}px ${obj.fontFamily || 'Arial'}`;
              ctx.textBaseline = 'top';
              ctx.textAlign = 'left';
              
              // Add shadow for better visibility
              ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
              ctx.shadowBlur = 2;
              ctx.shadowOffsetX = 1;
              ctx.shadowOffsetY = 1;
              
              ctx.fillText(
                obj.text, 
                obj.position.x * scaleX, 
                obj.position.y * scaleY
              );
              
              ctx.restore();
            });
          }

          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };
      artworkImg.onerror = () => reject(new Error('Failed to load artwork'));
      artworkImg.src = canvasImageData;
    });
  };

  const handleLoad = async (id) => {
    const savedData = await loadWorkFromGallery(id);
    onLoad(savedData);
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
      const compositedImage = await compositeWithTemplate(work.canvasData);
      const response = await fetch(compositedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${work.title}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Failed to export image');
    }
  };

  const exportAsPDF = async (work) => {
    try {
      const savedData = work.canvasData;
      const textObjects = typeof savedData === 'object' && savedData.textObjects
        ? savedData.textObjects
        : [];

      const compositedImage = await compositeWithTemplate(work.canvasData);
      const response = await fetch(compositedImage);
      const blob = await response.blob();

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      await exportAsPDFWithText(canvas, textObjects, work.title);

      URL.revokeObjectURL(img.src);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const exportAsPPTX = async (work) => {
    try {
      const savedData = work.canvasData;
      const textObjects = typeof savedData === 'object' && savedData.textObjects
        ? savedData.textObjects
        : [];

      const compositedImage = await compositeWithTemplate(work.canvasData);
      const response = await fetch(compositedImage);
      const blob = await response.blob();

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      await exportAsPPTXWithText(canvas, textObjects, work.title);

      URL.revokeObjectURL(img.src);
    } catch (error) {
      console.error('Error exporting PPTX:', error);
      alert('Failed to export PPTX');
    }
  };

  const handleExport = async (work, format) => {
    try {
      switch (format) {
        case 'image':
          await exportAsImage(work);
          break;
        case 'pdf':
          await exportAsPDF(work);
          break;
        case 'pptx':
          await exportAsPPTX(work);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  // Helper function to extract text content from text objects
  const extractTextContent = (textObjects, yThreshold = 78) => {
    if (!textObjects || textObjects.length === 0) return '';
    
    const filteredText = textObjects.filter(obj => {
      if (!obj.position || !obj.text) return false;
      const yPos = obj.position.y || 0;
      return yPos > yThreshold && obj.text.trim() !== '';
    });
    
    return filteredText
      .map(obj => obj.text || '')
      .filter(text => text.trim() !== '')
      .join('\n');
  };

  const exportCombinedPDF = async (selectedWorks) => {
    return new Promise(async (resolve, reject) => {
      try {
        const pdf = new jsPDF();
        let isFirstPage = true;
        
        for (let i = 0; i < selectedWorks.length; i++) {
          const work = selectedWorks[i];
          const savedData = work.canvasData;
          const textObjects = typeof savedData === 'object' && savedData.textObjects
            ? savedData.textObjects
            : [];
          
          // Extract text content for this work
          const textContent = extractTextContent(textObjects);
          const lines = textContent.split('\n').filter(line => line.trim() !== '');
          
          // Add text page if there's content
          if (lines.length > 0) {
            // Only add new page if this is NOT the first page
            if (!isFirstPage) {
              pdf.addPage();
            }
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // Add title/header for this work
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            const headerText = work.title || 'Beyond The Brush';
            const headerWidth = pdf.getTextWidth(headerText);
            pdf.text(headerText, (pageWidth - headerWidth) / 2, 20);
            
            // Add separator line
            pdf.setDrawColor(179, 179, 179);
            pdf.setLineWidth(0.5);
            pdf.line(20, 25, pageWidth - 20, 25);
            
            // Add text content
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            
            let textY = 35;
            const lineHeight = 7;
            const bottomMargin = 20;
            
            lines.forEach((line) => {
              if (textY > pdf.internal.pageSize.getHeight() - bottomMargin) {
                pdf.addPage();
                textY = 20;
              }
              pdf.text(line, 20, textY);
              textY += lineHeight;
            });
            
            isFirstPage = false;
          }
          
          // Add image page for this work
          // Always add new page for image if we already have content
          if (!isFirstPage) {
            pdf.addPage();
          }
          
          // Composite with template for export
          const compositedImage = await compositeWithTemplate(work.canvasData);
          const response = await fetch(compositedImage);
          const blob = await response.blob();
          
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
          });
          
          const imgWidth = 180;
          const imgHeight = (img.height * imgWidth) / img.width;
          const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
          const y = (pdf.internal.pageSize.getHeight() - imgHeight) / 2;
          
          pdf.addImage(img, 'PNG', x, y, imgWidth, imgHeight);
          URL.revokeObjectURL(img.src);
          
          isFirstPage = false;
        }
        
        pdf.save(`gallery-export-${Date.now()}.pdf`);
        resolve();
      } catch (error) {
        console.error('Error creating combined PDF:', error);
        reject(error);
      }
    });
  };

  const exportCombinedPPTX = async (selectedWorks) => {
    return new Promise(async (resolve, reject) => {
      try {
        const pptx = new PptxGenJS();
        
        for (const work of selectedWorks) {
          const savedData = work.canvasData;
          const textObjects = typeof savedData === 'object' && savedData.textObjects
            ? savedData.textObjects
            : [];
          
          // Extract text content for this work
          const textContent = extractTextContent(textObjects);
          const lines = textContent.split('\n').filter(line => line.trim() !== '');
          
          // Add text slide if there's content
          if (lines.length > 0) {
            const textSlide = pptx.addSlide();
            
            // Add title/header
            textSlide.addText(work.title || 'Beyond The Brush', {
              x: 0.5, y: 0.3, w: 9, h: 0.8,
              fontSize: 32, bold: true, align: 'center'
            });
            
            // Add separator line
            textSlide.addShape(pptx.ShapeType.line, {
              x: 0.5, y: 1.2, w: 9, h: 0,
              line: { color: 'B3B3B3', width: 1 }
            });
            
            // Add text content
            let y = 1.5;
            const lineHeight = 0.35;
            
            lines.forEach((line) => {
              if (y > 5) {
                console.warn('Text exceeds slide height');
              }
              textSlide.addText(line, {
                x: 0.5, y: y, w: 9, h: lineHeight,
                fontSize: 14, align: 'left'
              });
              y += lineHeight;
            });
          }
          
          // Add image slide for this work
          const imageSlide = pptx.addSlide();
          
          // Composite with template for export
          const compositedImage = await compositeWithTemplate(work.canvasData);
          const imageData = await fetch(compositedImage).then(res => res.arrayBuffer());
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
          
          imageSlide.addImage({
            data: `data:image/png;base64,${base64}`,
            x: 1,
            y: 0.8,
            w: 8,
            h: 4.5
          });
          
          // Add title at the bottom
          imageSlide.addText(work.title, {
            x: 1,
            y: 5.4,
            w: 8,
            h: 0.4,
            fontSize: 16,
            align: 'center',
            color: '666666'
          });
        }
        
        await pptx.writeFile({ fileName: `gallery-export-${Date.now()}.pptx` });
        resolve();
      } catch (error) {
        console.error('Error creating combined PPTX:', error);
        reject(error);
      }
    });
  };

  const exportCombinedImages = async (selectedWorks) => {
    return new Promise(async (resolve, reject) => {
      try {
        const zip = new JSZip();
        const imgFolder = zip.folder("gallery-images");
        
        for (const work of selectedWorks) {
          const compositedImage = await compositeWithTemplate(work.canvasData);
          const response = await fetch(compositedImage);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          
          const safeFileName = `${work.title.replace(/[^a-z0-9]/gi, '_')}.png`;
          imgFolder.file(safeFileName, arrayBuffer);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `gallery-images-${Date.now()}.zip`;
        a.click();
        
        URL.revokeObjectURL(url);
        resolve();
      } catch (error) {
        console.error('Error creating combined images ZIP:', error);
        reject(error);
      }
    });
  };

  const handleBatchExport = async (format) => {
    const selectedWorks = works.filter(work => selectedItems.has(work._id));
    
    if (selectedWorks.length === 0) return;
    
    try {
      console.log(`Creating combined ${format} export for ${selectedWorks.length} items`);
      
      switch (format) {
        case 'image':
          await exportCombinedImages(selectedWorks);
          break;
        case 'pdf':
          await exportCombinedPDF(selectedWorks);
          break;
        case 'pptx':
          await exportCombinedPPTX(selectedWorks);
          break;
        default:
          break;
      }
      
      console.log('Combined export completed successfully');
    } catch (error) {
      console.error('Combined export failed:', error);
      alert('Export failed. Please check the console for details.');
    } finally {
      setShowExportModal(false);
      setSelectedItems(new Set());
    }
  };

  const handleDeleteSingle = async (workId) => {
    if (!window.confirm('Are you sure you want to delete this work?')) {
      return;
    }
    
    try {
      await deleteWorkFromGallery(workId);
      const data = await getUserGallery();
      setWorks(data);
      const newSelected = new Set(selectedItems);
      newSelected.delete(workId);
      setSelectedItems(newSelected);
    } catch (error) {
      console.error('Error deleting work:', error);
      alert('Failed to delete work. Please try again.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.size} selected work(s)?`)) {
      return;
    }
    
    try {
      await deleteMultipleWorksFromGallery(Array.from(selectedItems));
      const data = await getUserGallery();
      setWorks(data);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error deleting works:', error);
      alert('Failed to delete works. Please try again.');
    }
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
                <>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="export-selected-btn"
                  >
                    Export Selected ({selectedItems.size})
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="delete-selected-btn"
                  >
                    Delete Selected ({selectedItems.size})
                  </button>
                </>
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
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSingle(work._id); }}
                  className="gallery-action-btn gallery-action-btn--delete"
                  title="Delete work"
                >
                  🗑️
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
                  <div className="export-option-title">Export as ZIP</div>
                  <div className="export-option-desc">All images in one ZIP file</div>
                </button>
                <button
                  onClick={() => handleBatchExport('pdf')}
                  className="export-option-btn export-option-btn--pdf"
                >
                  <div className="export-option-icon">📄</div>
                  <div className="export-option-title">Export as PDF</div>
                  <div className="export-option-desc">Multi-page PDF document</div>
                </button>
                <button
                  onClick={() => handleBatchExport('pptx')}
                  className="export-option-btn export-option-btn--pptx"
                >
                  <div className="export-option-icon">📊</div>
                  <div className="export-option-title">Export as PowerPoint</div>
                  <div className="export-option-desc">Multi-slide presentation</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for single exports
async function exportAsPDFWithText(canvas, textObjects, title) {
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Extract text content
  const filteredTextObjects = (textObjects || []).filter(obj => {
    if (!obj.position || !obj.text) return false;
    const yPos = obj.position.y || 0;
    return yPos > 78 && obj.text.trim() !== '';
  });
  
  const textContent = filteredTextObjects.map(obj => obj.text).join('\n');
  
  if (textContent.trim()) {
    const lines = textContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length > 0) {
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const headerText = title || 'Beyond The Brush';
      const headerWidth = pdf.getTextWidth(headerText);
      pdf.text(headerText, (pageWidth - headerWidth) / 2, 20);
      
      pdf.setDrawColor(179, 179, 179);
      pdf.setLineWidth(0.5);
      pdf.line(20, 25, pageWidth - 20, 25);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      let textY = 35;
      const lineHeight = 7;
      
      lines.forEach((line) => {
        pdf.text(line, 20, textY);
        textY += lineHeight;
      });
      
      pdf.addPage();
    }
  }
  
  pdf.addImage(imgData, 'PNG', 15, 15, 180, 0);
  pdf.save(`${title || 'beyond-the-brush'}.pdf`);
}

async function exportAsPPTXWithText(canvas, textObjects, title) {
  const pptx = new PptxGenJS();
  const imgData = canvas.toDataURL('image/png');
  
  const filteredTextObjects = (textObjects || []).filter(obj => {
    if (!obj.position || !obj.text) return false;
    const yPos = obj.position.y || 0;
    return yPos > 78 && obj.text.trim() !== '';
  });
  
  const textContent = filteredTextObjects.map(obj => obj.text).join('\n');
  
  if (textContent.trim()) {
    const lines = textContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length > 0) {
      const textSlide = pptx.addSlide();
      
      textSlide.addText(title || 'Beyond The Brush', {
        x: 1, y: 0.3, w: 8, h: 0.8,
        fontSize: 32, bold: true, align: 'center'
      });
      
      textSlide.addShape(pptx.ShapeType.line, {
        x: 1, y: 1.2, w: 8, h: 0,
        line: { color: 'B3B3B3', width: 1 }
      });
      
      let y = 1.5;
      const lineHeight = 0.35;
      
      lines.forEach((line) => {
        textSlide.addText(line, {
          x: 1, y: y, w: 8, h: lineHeight,
          fontSize: 14, align: 'left'
        });
        y += lineHeight;
      });
    }
  }
  
  const imageSlide = pptx.addSlide();
  imageSlide.addImage({
    data: imgData,
    x: 1,
    y: 0.8,
    w: 8,
    h: 4.5
  });
  
  imageSlide.addText(title || 'Beyond The Brush', {
    x: 1,
    y: 5.4,
    w: 8,
    h: 0.4,
    fontSize: 16,
    align: 'center',
    color: '666666'
  });
  
  await pptx.writeFile({ fileName: `${title || 'beyond-the-brush'}.pptx` });
}

export default Gallery;