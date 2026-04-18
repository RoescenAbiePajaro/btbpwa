
// src/services/exportUtils.js
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';

export const exportAsImage = async (canvas) => {
  const link = document.createElement('a');
  link.download = 'beyond-the-brush.png';
  link.href = canvas.toDataURL();
  link.click();
};

export const exportAsPDF = async (canvas) => {
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF();
  pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
  pdf.save('drawing.pdf');
};

export const exportAsPPTX = async (canvas) => {
  const pptx = new PptxGenJS();
  const imgData = canvas.toDataURL('image/png');
  const slide = pptx.addSlide();
  slide.addImage({ data: imgData, x: 1, y: 1, w: 8, h: 5 });
  await pptx.writeFile({ fileName: 'drawing.pptx' });
};