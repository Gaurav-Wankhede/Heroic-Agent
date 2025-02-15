const fs = require('fs');
const path = require('path');

// Source and destination paths
const workerSrc = path.join(
  __dirname,
  '../node_modules/pdfjs-dist/build/pdf.worker.min.js'
);
const workerDest = path.join(__dirname, '../public/pdf.worker.min.js');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy the worker file
try {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('PDF.js worker file copied successfully!');
} catch (error) {
  console.error('Error copying PDF.js worker file:', error);
  process.exit(1);
} 