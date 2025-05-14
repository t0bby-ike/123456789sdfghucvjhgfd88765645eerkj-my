class PDFMerger {
  constructor() {
    this.pdfFiles = [];
    this.dragStartIndex = null;
    this.initialize();
  }

  initialize() {
    this.fileInput = document.getElementById('fileInput');
    this.dropZone = document.getElementById('dropZone');
    this.fileList = document.getElementById('fileList');
    this.mergeBtn = document.getElementById('mergeBtn');
    this.addMoreBtn = document.getElementById('addMoreBtn');
    this.downloadModal = document.getElementById('downloadModal');
    this.fileNameDisplay = document.getElementById('fileNameDisplay');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.mergedPdfBlob = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // File selection
    this.fileInput.addEventListener('change', (e) => {
      this.addFiles(Array.from(e.target.files));
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
        this.addFiles(files);
      }
    });

    // Add more files
    this.addMoreBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Merge button
    this.mergeBtn.addEventListener('click', () => {
      this.mergePDFs();
    });

    // Download button in modal
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => {
        if (this.mergedPdfBlob) {
          const url = URL.createObjectURL(this.mergedPdfBlob);
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
    }
  }

  addFiles(files) {
    this.pdfFiles = [...this.pdfFiles, ...files];
    this.renderFileList();
  }

  renderFileList() {
    this.fileList.innerHTML = '';
    
    if (this.pdfFiles.length === 0) {
      this.fileList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-file-upload"></i>
          <p>Drag & drop PDFs here or click above</p>
        </div>
      `;
      this.addMoreBtn.classList.remove('visible');
      this.mergeBtn.disabled = true;
      return;
    }

    this.addMoreBtn.classList.add('visible');
    this.mergeBtn.disabled = false;
    
    this.pdfFiles.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.draggable = true;
      fileItem.dataset.index = index;
      fileItem.innerHTML = `
        <div class="file-info">
          <i class="fas fa-file-pdf"></i>
          <div>
            <p class="file-name">${file.name}</p>
            <p class="file-size">${(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        <button class="remove-btn" onclick="pdfMerger.removeFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // Drag events
      fileItem.addEventListener('dragstart', (e) => {
        this.dragStartIndex = +fileItem.dataset.index;
        fileItem.classList.add('dragging');
        e.dataTransfer.setData('text/plain', '');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      fileItem.addEventListener('dragend', () => {
        fileItem.classList.remove('dragging');
      });
      
      // Touch events for mobile
      fileItem.addEventListener('touchstart', () => {
        setTimeout(() => {
          fileItem.classList.add('hold-active');
        }, 600);
      }, { passive: true });
      
      fileItem.addEventListener('touchend', () => {
        fileItem.classList.remove('hold-active');
      }, { passive: true });
      
      this.fileList.appendChild(fileItem);
    });

    // Setup drop zone
    this.fileList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingItem = this.fileList.querySelector('.dragging');
      if (!draggingItem) return;
      
      const afterElement = this.getDragAfterElement(this.fileList, e.clientY);
      if (afterElement) {
        this.fileList.insertBefore(draggingItem, afterElement);
      } else {
        this.fileList.appendChild(draggingItem);
      }
    });

    this.fileList.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggingItem = this.fileList.querySelector('.dragging');
      if (!draggingItem) return;
      
      const newIndex = this.calculateNewIndex(e.clientY);
      if (newIndex >= 0) {
        this.reorderFiles(this.dragStartIndex, newIndex);
      }
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  calculateNewIndex(y) {
    return Array.from(this.fileList.children).findIndex(item => {
      const rect = item.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
  }

  reorderFiles(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [movedFile] = this.pdfFiles.splice(fromIndex, 1);
    this.pdfFiles.splice(toIndex, 0, movedFile);
    this.renderFileList();
  }

  removeFile(index) {
    event.stopPropagation();
    this.pdfFiles.splice(index, 1);
    this.renderFileList();
  }

  async mergePDFs() {
    if (this.pdfFiles.length === 0) return;

    this.mergeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merging...';
    this.mergeBtn.disabled = true;

    try {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();

      for (const file of this.pdfFiles) {
        const fileBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBytes);
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      this.mergedPdfBlob = new Blob([mergedBytes], { type: 'application/pdf' });
      this.showDownloadModal();
      
    } catch (error) {
      alert('Error merging PDFs: ' + error.message);
    } finally {
      this.mergeBtn.innerHTML = '<i class="fas fa-merge"></i> Merge PDFs';
      this.mergeBtn.disabled = false;
    }
  }

  showDownloadModal() {
    if (!this.downloadModal) return;
    this.fileNameDisplay.textContent = this.generateFileName();
    this.downloadModal.style.display = 'block';
  }

  generateFileName() {
    const randomId = Math.random().toString(36).substring(2, 8);
    const firstFileName = this.pdfFiles[0].name.split('.')[0];
    return `Stryks_all_pdf_${randomId}-${firstFileName}.pdf`;
  }
}

// Initialize the PDF merger when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.pdfMerger = new PDFMerger();
});