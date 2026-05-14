import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type Options = {
  fileName: string;
  marginMm?: number;
  scale?: number;
};

const pxToMm = (px: number, dpi = 96) => (px * 25.4) / dpi;

export async function downloadElementAsPdf(
  element: HTMLElement,
  { fileName, marginMm = 12, scale = 2 }: Options
) {
  const previous = {
    maxHeight: element.style.maxHeight,
    height: element.style.height,
    overflow: element.style.overflow
  };

  element.style.maxHeight = 'none';
  element.style.height = 'auto';
  element.style.overflow = 'visible';

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const printableWidth = pageWidth - marginMm * 2;
    const printableHeight = pageHeight - marginMm * 2;

    const canvasWidthMm = pxToMm(canvas.width);
    const canvasHeightMm = pxToMm(canvas.height);
    const renderScale = printableWidth / canvasWidthMm;
    const renderedHeightMm = canvasHeightMm * renderScale;

    const pageCanvas = document.createElement('canvas');
    const pageCtx = pageCanvas.getContext('2d');
    if (!pageCtx) throw new Error('Unable to get canvas context');

    const pageHeightPx = Math.floor((printableHeight / renderScale) * (canvas.width / canvasWidthMm));
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPx;

    const pageCount = Math.max(1, Math.ceil(renderedHeightMm / printableHeight));

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const sourceY = pageIndex * pageHeightPx;
      const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY);

      pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      const imgData = pageCanvas.toDataURL('image/png');
      if (pageIndex > 0) pdf.addPage();

      const sliceHeightMm = pxToMm(sliceHeight) * renderScale;
      pdf.addImage(imgData, 'PNG', marginMm, marginMm, printableWidth, sliceHeightMm, undefined, 'FAST');
    }

    pdf.save(fileName);
  } finally {
    element.style.maxHeight = previous.maxHeight;
    element.style.height = previous.height;
    element.style.overflow = previous.overflow;
  }
}

