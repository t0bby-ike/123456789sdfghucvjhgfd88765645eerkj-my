document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const pdfInput = document.getElementById('pdfInput');
  const imageInput = document.getElementById('imageInput');
  const pdfDropZone = document.getElementById('pdfDropZone');
  const imageDropZone = document.getElementById('imageDropZone');
  const pdfProgress = document.getElementById('pdfProgress');
  const imageProgress = document.getElementById('imageProgress');
  const pdfFileInfo = document.getElementById('pdfFileInfo');
  const imageFileInfo = document.getElementById('imageFileInfo');
  const addImagesBtn = document.getElementById('addImagesBtn');
  const previewContainer = document.getElementById('previewContainer');
  const pdfPreview = document.getElementById('pdfPreview');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const imagePreviews = document.getElementById('previewScroll');
  const imageCount = document.getElementById('imageCount');

  // PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

  // State
  let pdfDoc = null;
  let pdfBytes = null;
  let images = [];
  let currentPage = 1;
  let totalPages = 1;

  // Initialize
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

    // PDF file input
    pdfInput.addEventListener('change', handlePdfUpload);
    
    // Image file input
    imageInput.addEventListener('change', handleImageUpload);

    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      pdfDropZone.addEventListener(eventName, preventDefaults, false);
      imageDropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      pdfDropZone.addEventListener(eventName, () => highlight(pdfDropZone), false);
      imageDropZone.addEventListener(eventName, () => highlight(imageDropZone), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      pdfDropZone.addEventListener(eventName, () => unhighlight(pdfDropZone), false);
      imageDropZone.addEventListener(eventName, () => unhighlight(imageDropZone), false);
    });

    pdfDropZone.addEventListener('drop', handlePdfDrop, false);
    imageDropZone.addEventListener('drop', handleImageDrop, false);

    // Page navigation
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));

    // Add images button
    addImagesBtn.addEventListener('click', addImagesToPdf);
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight(element) {
    element.classList.add('active');
  }

  function unhighlight(element) {
    element.classList.remove('active');
  }

  function handlePdfDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0 && files[0].name.endsWith('.pdf')) {
      pdfInput.files = files;
      handlePdfUpload({ target: pdfInput });
    }
  }

  function handleImageDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0 && 
        (files[0].type.match('image.*') || 
         files[0].name.match(/\.(jpg|jpeg|png|gif)$/i))) {
      imageInput.files = files;
      handleImageUpload({ target: imageInput });
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Show loading state
      pdfProgress.classList.add('active');
      pdfFileInfo.innerHTML = `Loading ${file.name} <span class="status-badge">Processing</span>`;
      addImagesBtn.disabled = true;
      
      const arrayBuffer = await file.arrayBuffer();
      pdfBytes = arrayBuffer;
      
      // Load with PDF.js for preview
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;
      
      // Update UI
      pdfFileInfo.innerHTML = `${file.name} <span class="status-badge status-loaded">Loaded</span>`;
      pageIndicator.textContent = `Page 1 of ${totalPages}`;
      previewContainer.style.display = 'block';
      
      // Render first page
      await renderPage(1);
      
      updateAddImagesButton();
    } catch (error) {
      console.error("Error loading PDF:", error);
      pdfFileInfo.innerHTML = `Error loading file <span class="status-badge status-error">Error</span>`;
      alert("Error loading PDF. Please try another file.");
    } finally {
      pdfProgress.classList.remove('active');
    }
  }

  async function renderPage(pageNum) {
    try {
      pdfPreview.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading page...</p></div>';
      
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      pdfPreview.innerHTML = '';
      pdfPreview.appendChild(canvas);
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
    } catch (error) {
      console.error("Error rendering page:", error);
      pdfPreview.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading page</p></div>';
    }
  }

  function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage > 0 && newPage <= totalPages) {
      currentPage = newPage;
      document.getElementById('pageNumber').value = currentPage;
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
      renderPage(currentPage);
    }
  }

  function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter only image files
    const imageFiles = files.filter(file => 
      file.type.match('image.*') || 
      file.name.match(/\.(jpg|jpeg|png|gif)$/i)
    );

    if (imageFiles.length === 0) {
      alert("Please select valid image files (JPG, PNG, GIF)");
      return;
    }

    // Store images
    images = imageFiles;
    imageCount.textContent = `(${images.length})`;
    
    // Update file info
    if (images.length === 1) {
      imageFileInfo.textContent = images[0].name;
    } else {
      imageFileInfo.textContent = `${images.length} images selected`;
    }
    
    // Display thumbnails
    displayImagePreviews();
    updateAddImagesButton();
  }

  function displayImagePreviews() {
    imagePreviews.innerHTML = '';
    
    if (images.length === 0) {
      imagePreviews.innerHTML = '<div class="empty-images"><i class="fas fa-image"></i><p>No images selected</p></div>';
      return;
    }
    
    images.forEach((image, index) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const thumb = document.createElement('div');
        thumb.className = 'image-thumbnail';
        
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = image.name;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => removeImage(index);
        
        thumb.appendChild(img);
        thumb.appendChild(removeBtn);
        imagePreviews.appendChild(thumb);
      };
      reader.readAsDataURL(image);
    });
  }

  function removeImage(index) {
    images.splice(index, 1);
    imageCount.textContent = `(${images.length})`;
    
    if (images.length === 0) {
      imageFileInfo.textContent = 'No images selected';
    } else if (images.length === 1) {
      imageFileInfo.textContent = images[0].name;
    } else {
      imageFileInfo.textContent = `${images.length} images selected`;
    }
    
    displayImagePreviews();
    updateAddImagesButton();
  }

  function updateAddImagesButton() {
    const pdfLoaded = pdfDoc !== null;
    const hasImages = images.length > 0;
    
    addImagesBtn.disabled = !(pdfLoaded && hasImages);
    
    if (pdfLoaded && hasImages) {
      addImagesBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Add ${images.length} Image${images.length !== 1 ? 's' : ''} to PDF`;
    } else {
      addImagesBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Images to PDF';
    }
  }

  async function addImagesToPdf() {
    if (!pdfDoc || images.length === 0) return;

    try {
      addImagesBtn.disabled = true;
      addImagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      
      // Clone the original PDF to work with
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      // Get target page (default to first page if invalid)
      const targetPageNum = parseInt(document.getElementById('pageNumber').value) || 1;
      const targetPageIndex = Math.min(Math.max(targetPageNum - 1, 0), pages.length - 1);
      const page = pages[targetPageIndex];
      
      // Get position and size values
      const x = parseFloat(document.getElementById('positionX').value) || 20;
      const y = parseFloat(document.getElementById('positionY').value) || 20;
      const width = parseFloat(document.getElementById('imageWidth').value) || 50;
      
      // Convert mm to PDF points (1mm = 2.83465 points)
      const xPt = x * 2.83465;
      const yPt = y * 2.83465;
      const widthPt = width * 2.83465;
      
      // Add each image to the page
      for (const imageFile of images) {
        const imageBytes = await imageFile.arrayBuffer();
        let image;
        
        if (imageFile.type === 'image/jpeg' || imageFile.name.match(/\.jpe?g$/i)) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (imageFile.type === 'image/png' || imageFile.name.match(/\.png$/i)) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          console.warn(`Unsupported image format: ${imageFile.name}`);
          continue;
        }
        
        // Calculate height maintaining aspect ratio
        const heightPt = (image.height / image.width) * widthPt;
        
        // Draw image on page
        page.drawImage(image, {
          x: xPt,
          y: page.getHeight() - yPt - heightPt, // PDF y=0 is bottom of page
          width: widthPt,
          height: heightPt,
        });
      }
      
      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      
      // Generate filename
      const originalName = pdfInput.files[0].name.replace('.pdf', '');
      const imageCount = images.length;
      const fileName = `${originalName}_with_${imageCount}_images.pdf`;
      
      // Show download modal
      document.getElementById('fileNameDisplay').textContent = fileName;
      document.getElementById('downloadModal').style.display = 'block';
      
      // Set up download button
      document.getElementById('downloadBtn').onclick = () => {
        saveAs(blob, fileName);
        document.getElementById('downloadModal').style.display = 'none';
      };
      
    } catch (error) {
      console.error("Error adding images to PDF:", error);
      alert("Error processing PDF. Please try again.");
    } finally {
      addImagesBtn.disabled = false;
      addImagesBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Images to PDF';
    }
  }

  // Close modal when clicking X
  document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('downloadModal').style.display = 'none';
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('downloadModal')) {
      document.getElementById('downloadModal').style.display = 'none';
    }
  });
});