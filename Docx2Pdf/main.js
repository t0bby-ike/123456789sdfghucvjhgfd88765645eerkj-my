document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const outputDiv = document.getElementById('output');
  const convertBtn = document.getElementById('convertBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const modal = document.getElementById('downloadModal');
  const closeModal = document.querySelector('.close-modal');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const previewContainer = document.getElementById('previewContainer');

  // State
  let currentFileName = 'document.pdf';

  // Initialize UI
  previewContainer.style.display = 'none';

  // Toggle sidebar
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && e.target !== hamburger) {
      sidebar.classList.remove('active');
    }
  });

  // Handle file selection
  fileInput.addEventListener('change', handleFileSelect);
  
  // Set up drag and drop
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

  // Modal controls
  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Convert button click
  convertBtn.addEventListener('click', convertToPdf);

  // Download button handler
  downloadBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    convertToPdf();
  });

  // Prevent default drag behaviors
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone
  function highlight() {
    dropZone.classList.add('active');
  }

  // Unhighlight drop zone
  function unhighlight() {
    dropZone.classList.remove('active');
  }

  // Handle dropped files
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0 && files[0].name.endsWith('.docx')) {
      fileInput.files = files;
      handleFileSelect({ target: fileInput });
    }
  }

  // Handle file selection
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      convertBtn.disabled = true;
      outputDiv.innerHTML = '<p>Converting document...</p>';
      previewContainer.style.display = 'block';

      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      
      // Display preview
      outputDiv.innerHTML = result.value;
      convertBtn.disabled = false;
      
      // Set filename for download
      currentFileName = file.name.replace('.docx', '.pdf');
      fileNameDisplay.textContent = currentFileName;
      
    } catch (error) {
      console.error("Conversion error:", error);
      outputDiv.innerHTML = `<p style="color:red">Error converting file: ${error.message}</p>`;
      convertBtn.disabled = true;
    }
  }

  // Convert to PDF (using browser print)
  function convertToPdf() {
    // Create a temporary container for print content
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '800px';
    printContainer.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentFileName}</title>
        <style>
          body {
            font-family: "Times New Roman", serif;
            line-height: 1.5;
            padding: 1in;
            margin: 0;
          }
          .docx-content {
            max-width: 100%;
          }
          .align-left { text-align: left; }
          .align-center { text-align: center; }
          .align-right { text-align: right; }
          .align-justify { text-align: justify; }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
          }
          table, th, td {
            border: 1px solid #000;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <div class="docx-content">
          ${outputDiv.innerHTML}
        </div>
      </body>
      </html>
    `;
    
    document.body.appendChild(printContainer);
    
    // Wait briefly for styles to apply
    setTimeout(() => {
      // Focus and print the content
      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(printContainer.innerHTML);
      printWindow.document.close();
      
      // Wait for content to load
      printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        
        // Close after printing
        setTimeout(() => {
          printWindow.close();
          document.body.removeChild(printContainer);
          modal.style.display = 'block';
        }, 500);
      };
    }, 100);
  }
});