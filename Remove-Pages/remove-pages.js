// Set PDF.js worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

class PDFPageRemover {
  constructor() {
    this.pdfFile = null;
    this.pdfJsDoc = null;
    this.pagesToKeep = [];
    this.initialize();
  }

  initialize() {
    // DOM elements
    this.fileInput = document.getElementById('fileInput');
    this.dropZone = document.getElementById('dropZone');
    this.pdfPreview = document.getElementById('pdfPreview');
    this.pagesContainer = document.getElementById('pagesContainer');
    this.removePagesBtn = document.getElementById('removePagesBtn');
    this.downloadModal = document.getElementById('downloadModal');
    this.fileNameDisplay = document.getElementById('fileNameDisplay');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.scrollToBottomBtn = document.getElementById('scrollToBottomBtn');

    this.setupEventListeners();
  }

  setupEventListeners() {
    // File selection
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.loadPDF(e.target.files[0]);
      }
    });

    // Drag and drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('active');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('active');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('active');
      const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
      if (files.length > 0) {
        this.loadPDF(files[0]);
      }
    });

    // Remove pages button
    this.removePagesBtn.addEventListener('click', () => {
      this.generateNewPDF();
    });

    // Download button
    this.downloadBtn.addEventListener('click', () => {
      if (this.modifiedPdfBlob) {
        const url = URL.createObjectURL(this.modifiedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.generateFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.downloadModal.style.display = 'none';
      }
    });

    // Scroll to bottom button
    this.scrollToBottomBtn.addEventListener('click', () => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    });

    // Show/hide scroll button based on scroll position
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        this.scrollToBottomBtn.style.display = 'flex';
      } else {
        this.scrollToBottomBtn.style.display = 'none';
      }
    });
  }

  async loadPDF(file) {
    this.pdfFile = file;
    this.pagesToKeep = [];
    this.pdfPreview.innerHTML = `
      <div class="file-preview">
        <i class="fas fa-file-pdf"></i>
        <p>${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
      </div>
    `;

    // Load with PDF.js to render pages
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    this.pdfJsDoc = await loadingTask.promise;

    // Show pages container
    this.pagesContainer.style.display = 'grid';
    this.pagesContainer.innerHTML = '';
    this.removePagesBtn.disabled = false;

    // Initialize all pages to be kept
    this.pagesToKeep = Array(this.pdfJsDoc.numPages).fill(true);

    // Render each page
    for (let i = 1; i <= this.pdfJsDoc.numPages; i++) {
      await this.renderPage(i);
    }

    // Scroll to show the pages
    setTimeout(() => {
      this.pagesContainer.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  }

  async renderPage(pageNumber) {
    const page = await this.pdfJsDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.5 });
    
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page-thumbnail';
    pageDiv.dataset.pageNumber = pageNumber;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.className = 'page-canvas';
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    const pageNumberLabel = document.createElement('div');
    pageNumberLabel.className = 'page-number';
    pageNumberLabel.textContent = `Page ${pageNumber}`;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-page-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => {
      this.togglePageRemoval(pageNumber);
    });
    
    pageDiv.appendChild(canvas);
    pageDiv.appendChild(pageNumberLabel);
    pageDiv.appendChild(removeBtn);
    this.pagesContainer.appendChild(pageDiv);
  }

  togglePageRemoval(pageNumber) {
    // Toggle whether to keep this page (1-indexed)
    const index = pageNumber - 1;
    this.pagesToKeep[index] = !this.pagesToKeep[index];
    
    // Update UI
    const pageDiv = document.querySelector(`.page-thumbnail[data-page-number="${pageNumber}"]`);
    if (pageDiv) {
      pageDiv.style.opacity = this.pagesToKeep[index] ? '1' : '0.5';
      pageDiv.style.borderColor = this.pagesToKeep[index] ? '#ddd' : '#ff6b6b';
    }
  }

  async generateNewPDF() {
    if (!this.pdfFile || !this.pdfJsDoc) return;
    
    this.removePagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    this.removePagesBtn.disabled = true;
    
    try {
      const { PDFDocument } = PDFLib;
      
      // Load the original PDF
      const arrayBuffer = await this.pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Create a new PDF
      const newPdf = await PDFDocument.create();
      
      // Copy only the pages we want to keep
      for (let i = 0; i < this.pagesToKeep.length; i++) {
        if (this.pagesToKeep[i]) {
          const [page] = await newPdf.copyPages(pdfDoc, [i]);
          newPdf.addPage(page);
        }
      }
      
      // Save the modified PDF
      const modifiedBytes = await newPdf.save();
      this.modifiedPdfBlob = new Blob([modifiedBytes], { type: 'application/pdf' });
      
      // Show download modal
      this.fileNameDisplay.textContent = this.generateFileName();
      this.downloadModal.style.display = 'block';
      
    } catch (error) {
      alert('Error generating PDF: ' + error.message);
    } finally {
      this.removePagesBtn.innerHTML = '<i class="fas fa-file-export"></i> Generate New PDF';
      this.removePagesBtn.disabled = false;
    }
  }

  generateFileName() {
    const randomId = Math.random().toString(36).substring(2, 8);
    const originalName = this.pdfFile.name.split('.')[0];
    return `Stryks_modified_${randomId}-${originalName}.pdf`;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.pdfPageRemover = new PDFPageRemover();
});