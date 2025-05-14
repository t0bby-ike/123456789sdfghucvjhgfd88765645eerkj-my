document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const splitBtn = document.getElementById('splitBtn');
  const previewContainer = document.getElementById('previewContainer');
  const pdfPreview = document.getElementById('pdfPreview');
  const pageRangeInput = document.getElementById('pageRange');
  const pageCountDisplay = document.getElementById('pageCount');

  // State
  let pdfDoc = null;
  let totalPages = 0;
  let selectedPages = [];

  // Initialize PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

  // Setup event listeners
  setupEventListeners();

  function setupEventListeners() {
    // Sidebar toggle
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && e.target !== hamburger) {
        sidebar.classList.remove('active');
      }
    });

    // File input
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    // Split button
    splitBtn.addEventListener('click', splitPdf);

    // Page range input
    pageRangeInput.addEventListener('input', updatePageSelection);
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight() {
    dropZone.classList.add('active');
  }

  function unhighlight() {
    dropZone.classList.remove('active');
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0 && files[0].name.endsWith('.pdf')) {
      fileInput.files = files;
      handleFileSelect({ target: fileInput });
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      splitBtn.disabled = true;
      splitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
      
      // Load PDF for preview
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      
      // Load PDF for processing
      pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      totalPages = pdfDoc.getPageCount();
      
      // Update UI
      pageCountDisplay.textContent = `${totalPages} pages in document`;
      pageRangeInput.placeholder = `1-${totalPages}`;
      
      // Generate preview
      await generatePdfPreview(pdf);
      
      previewContainer.style.display = 'block';
      splitBtn.disabled = false;
      splitBtn.innerHTML = '<i class="fas fa-cut"></i> Split PDF';
    } catch (error) {
      console.error("Error loading PDF:", error);
      alert("Error loading PDF. Please try another file.");
      splitBtn.innerHTML = '<i class="fas fa-cut"></i> Split PDF';
    }
  }

  async function generatePdfPreview(pdf) {
    pdfPreview.innerHTML = '';
    
    // Load first 3 pages for preview (or all if less than 3)
    const pageCount = Math.min(pdf.numPages, 3);
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page-preview';
      pageDiv.innerHTML = `
        <h5>Page ${i}</h5>
        <div class="page-content" id="page-${i}"></div>
      `;
      pdfPreview.appendChild(pageDiv);
      
      // Render PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      document.getElementById(`page-${i}`).appendChild(canvas);
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
    }
    
    if (pdf.numPages > 3) {
      const morePages = document.createElement('div');
      morePages.textContent = `... and ${pdf.numPages - 3} more pages`;
      morePages.style.textAlign = 'center';
      morePages.style.marginTop = '10px';
      morePages.style.color = '#666';
      pdfPreview.appendChild(morePages);
    }
  }

  function updatePageSelection() {
    const rangeText = pageRangeInput.value;
    selectedPages = Array(totalPages).fill(false);
    
    try {
      // Parse range input (e.g., "1-5,8,10-12")
      const parts = rangeText.split(',');
      parts.forEach(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          for (let i = start - 1; i < Math.min(end, totalPages); i++) {
            if (i >= 0) selectedPages[i] = true;
          }
        } else if (part.trim() !== '') {
          const page = Number(part) - 1;
          if (page >= 0 && page < totalPages) selectedPages[page] = true;
        }
      });
      
      // Highlight preview pages
      document.querySelectorAll('.page-preview').forEach((preview, i) => {
        preview.classList.toggle('selected', selectedPages[i]);
      });
    } catch (e) {
      console.error("Invalid page range", e);
    }
  }

  async function splitPdf() {
    if (!pdfDoc || selectedPages.filter(Boolean).length === 0) {
      alert("Please select pages to extract by entering a valid page range");
      return;
    }

    try {
      splitBtn.disabled = true;
      splitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      
      // Create new PDF with selected pages
      const newPdf = await PDFLib.PDFDocument.create();
      const pageIndices = selectedPages
        .map((selected, i) => selected ? i : -1)
        .filter(i => i !== -1);
      
      const pages = await newPdf.copyPages(pdfDoc, pageIndices);
      pages.forEach(page => newPdf.addPage(page));
      
      // Save the new PDF
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Generate filename
      const rangeText = pageRangeInput.value.replace(/[^\d,-]/g, '');
      const fileName = `stryk_splitter_${rangeText}_splitted.pdf`;
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error("Error splitting PDF:", error);
      alert("Error splitting PDF. Please try again.");
    } finally {
      splitBtn.disabled = false;
      splitBtn.innerHTML = '<i class="fas fa-cut"></i> Split PDF';
    }
  }
});