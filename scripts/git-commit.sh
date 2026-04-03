#!/bin/bash

cd /vercel/share/v0-project

# Aggiungi i file modificati
git add frontend/src/components/BarcodeScanner.jsx
git add frontend/src/pages/ScannerBarcode.jsx
git add mobile-app/src/components/BarcodeScanner/BarcodeScanner.tsx
git add mobile-app/src/components/BarcodeScanner/BarcodeScanner.module.css

# Crea il commit
git commit -m "feat: improve barcode scanner reading on both web and mobile

Enhancements:
- Frontend Scanner:
  * Increased FPS from 20 to 30 for faster detection
  * Upgraded video resolution to Full HD (1920x1080)
  * Added support for more barcode formats (CODE_39, ITF, CODABAR, DATA_MATRIX)
  * Added scan mode selector (Auto, Barcode, QR Code)
  * Implemented torch/flashlight control for low-light environments
  * Added continuous autofocus, exposure, and white balance
  * Optimized scanning regions for different barcode types

- Mobile App Scanner:
  * Enhanced ZXing configuration with TRY_HARDER hint for better accuracy
  * Upgraded to Full HD camera resolution (1920x1080)
  * Added torch control button with availability detection
  * Implemented scan mode selector UI
  * Added haptic feedback on successful barcode detection
  * Improved video track management and cleanup
  * Added visual feedback with scan line animation
  * Dynamic reticle sizing based on scan mode

- UI/UX Improvements:
  * Mode selector buttons for choosing scan type
  * Enhanced visual feedback with corner accents on reticle
  * Torch button with state indicators
  * Better error messaging and status display
  * Improved accessibility with ARIA labels
  * Smooth animations and transitions"
