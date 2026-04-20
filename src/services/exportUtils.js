// src/services/exportUtils.js
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';

// Extract text content from text objects
const extractTextContent = (textObjects) => {
  if (!textObjects || textObjects.length === 0) return '';
  return textObjects
    .map(obj => obj.text || '')
    .filter(text => text.trim() !== '')
    .join('\n');
};

export const exportAsImage = async (canvas, textObjects) => {
  // Create a temporary canvas to combine drawing and text
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const ctx = tempCanvas.getContext('2d');
  
  // Draw the original canvas
  ctx.drawImage(canvas, 0, 0);
  
  // Draw text objects on top
  if (textObjects && textObjects.length > 0) {
    textObjects.forEach(obj => {
      ctx.fillStyle = obj.color || '#FFFFFF';
      ctx.font = `${obj.fontSize || 24}px ${obj.fontFamily || 'Arial'}`;
      ctx.fillText(obj.text, obj.position.x, obj.position.y);
    });
  }
  
  const link = document.createElement('a');
  link.download = 'beyond-the-brush.png';
  link.href = tempCanvas.toDataURL();
  link.click();
};

export const exportAsPDF = async (canvas, textObjects) => {
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Extract text content, filtering text below header area (y > 78 pixels equivalent)
  const filteredTextObjects = (textObjects || []).filter(obj => {
    if (!obj.position || !obj.text) return false;
    // Filter text that's below the header area (similar to Python's y > 78 check)
    const yPos = obj.position.y || 0;
    const yPosInches = yPos / 96; // Convert pixels to inches (assuming 96 DPI)
    const yPosMm = yPosInches * 25.4; // Convert to mm
    return yPos > 78 && obj.text.trim() !== '';
  });
  
  const textContent = extractTextContent(filteredTextObjects);
  
  // Add text on separate pages if text exists (like Python implementation)
  if (textContent.trim()) {
    const lines = textContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length > 0) {
      // Add header to text page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const headerText = 'Beyond The Brush';
      const headerWidth = pdf.getTextWidth(headerText);
      pdf.text(headerText, (pageWidth - headerWidth) / 2, 20);
      
      // Add separator line below header
      pdf.setDrawColor(179, 179, 179);
      pdf.setLineWidth(0.5);
      pdf.line(20, 25, pageWidth - 20, 25);
      
      // Add text content with proper spacing
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      let textY = 35;
      const lineHeight = 7;
      const bottomMargin = 20;
      
      lines.forEach((line, index) => {
        // Check if we need a new page
        if (textY > pageHeight - bottomMargin) {
          pdf.addPage();
          
          // Add header to new page
          pdf.setFontSize(24);
          pdf.setFont('helvetica', 'bold');
          const headerWidth = pdf.getTextWidth(headerText);
          pdf.text(headerText, (pageWidth - headerWidth) / 2, 20);
          
          // Add separator line
          pdf.setDrawColor(179, 179, 179);
          pdf.setLineWidth(0.5);
          pdf.line(20, 25, pageWidth - 20, 25);
          
          // Reset font for text
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          textY = 35;
        }
        
        pdf.text(line, 20, textY);
        textY += lineHeight;
      });
      
      // Add new page for canvas image
      pdf.addPage();
    }
  }
  
  // Add canvas image as full-resolution page (like Python's _draw_pil_image_full_res)
  // Calculate aspect ratio to fit page while maintaining resolution
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const pageWidthMm = pageWidth;
  const pageHeightMm = pageHeight;
  
  // Calculate scaling to fit page
  const scaleX = (pageWidthMm - 20) / (canvasWidth / 3.78); // Convert pixels to mm
  const scaleY = (pageHeightMm - 20) / (canvasHeight / 3.78);
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
  
  const imgWidthMm = (canvasWidth / 3.78) * scale;
  const imgHeightMm = (canvasHeight / 3.78) * scale;
  
  // Center the image on the page
  const x = (pageWidthMm - imgWidthMm) / 2;
  const y = (pageHeightMm - imgHeightMm) / 2;
  
  pdf.addImage(imgData, 'PNG', x, y, imgWidthMm, imgHeightMm, undefined, 'FAST');
  
  pdf.save('beyond-the-brush.pdf');
};

export const exportAsPPTX = async (canvas, textObjects) => {
  const pptx = new PptxGenJS();
  const imgData = canvas.toDataURL('image/png');

  // Filter text objects below header area (similar to Python's y > 78 check)
  const filteredTextObjects = (textObjects || []).filter(obj => {
    if (!obj.position || !obj.text) return false;
    const yPos = obj.position.y || 0;
    return yPos > 78 && obj.text.trim() !== '';
  });

  const textContent = extractTextContent(filteredTextObjects);

  // Add title slide with text content if available (editable text on separate slide)
  if (textContent.trim()) {
    const lines = textContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length > 0) {
      const textSlide = pptx.addSlide();

      // Add header
      textSlide.addText('Beyond The Brush', {
        x: 1, y: 0.3, w: 8, h: 0.8,
        fontSize: 32, bold: true, align: 'center'
      });

      // Add separator line (using a shape)
      textSlide.addShape(pptx.ShapeType.line, {
        x: 1, y: 1.2, w: 8, h: 0,
        line: { color: 'B3B3B3', width: 1 }
      });

      // Add text content with proper spacing
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

  // Add slide with canvas image (full-resolution drawing)
  const imageSlide = pptx.addSlide();
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Calculate aspect ratio for PPTX slide (10x5.625 inches)
  const slideWidth = 10;
  const slideHeight = 5.625;
  const margin = 0.5;

  const availableWidth = slideWidth - (margin * 2);
  const availableHeight = slideHeight - (margin * 2);

  const scaleX = availableWidth / canvasWidth;
  const scaleY = availableHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY);

  const imgWidth = canvasWidth * scale;
  const imgHeight = canvasHeight * scale;

  // Center the image on the slide
  const x = (slideWidth - imgWidth) / 2;
  const y = (slideHeight - imgHeight) / 2;

  imageSlide.addImage({
    data: imgData,
    x: x,
    y: y,
    w: imgWidth,
    h: imgHeight
  });

  await pptx.writeFile({ fileName: 'beyond-the-brush.pptx' });
};