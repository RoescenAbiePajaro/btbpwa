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
  
  // Add header
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Beyond The Brush', 105, 20, { align: 'center' });
  
  // Add separator line
  pdf.setDrawColor(128, 128, 128);
  pdf.line(20, 25, 190, 25);
  
  // Extract and add text content if available
  const textContent = extractTextContent(textObjects);
  if (textContent.trim()) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Text Content:', 20, 40);
    
    const lines = textContent.split('\n');
    let y = 50;
    lines.forEach(line => {
      if (line.trim()) {
        pdf.text(line, 20, y);
        y += 10;
      }
    });
    
    // Add new page for canvas image
    pdf.addPage();
  }
  
  // Add canvas image
  pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
  
  pdf.save('beyond-the-brush.pdf');
};

export const exportAsPPTX = async (canvas, textObjects) => {
  const pptx = new PptxGenJS();
  const imgData = canvas.toDataURL('image/png');
  
  // Extract text content
  const textContent = extractTextContent(textObjects);
  
  // Add title slide with text content if available
  if (textContent.trim()) {
    const titleSlide = pptx.addSlide();
    titleSlide.addText('Beyond The Brush', { 
      x: 1, y: 0.5, w: 8, h: 1, 
      fontSize: 36, bold: true, align: 'center' 
    });
    
    const lines = textContent.split('\n');
    let y = 2;
    lines.forEach(line => {
      if (line.trim()) {
        titleSlide.addText(line, { x: 1, y, w: 8, h: 0.5, fontSize: 18 });
        y += 0.6;
      }
    });
  }
  
  // Add slide with canvas image
  const imageSlide = pptx.addSlide();
  imageSlide.addImage({ data: imgData, x: 0.5, y: 0.5, w: 9, h: 5 });
  
  await pptx.writeFile({ fileName: 'beyond-the-brush.pptx' });
};