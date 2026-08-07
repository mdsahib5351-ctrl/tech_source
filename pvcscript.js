/**
 * Easy PVC Card Print v2.0 - Core Engine
 * Standard PVC Dimensions: 85.6mm x 54mm (Aspect Ratio ~1.585)
 * A4 Size @ 300 DPI: 2480px x 3508px
 */

const CARD_RATIO = 85.6 / 54;
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const CARD_WIDTH_A4 = 1012; // Standard High-Res Width on A4
const CARD_HEIGHT_A4 = Math.round(CARD_WIDTH_A4 / CARD_RATIO);

// Central State Architecture
const state = {
  activeStep: 1, // 1: Front, 2: Back, 3: Download
  activeSide: 'front', // 'front' | 'back'
  
  // File Holders (Both original uploaded files and cropped renders)
  files: {
    front: null,
    back: null
  },
  croppedCanvases: {
    front: null,
    back: null
  },
  transforms: {
    front: { rotation: 0, flipH: 1, flipV: 1 },
    back: { rotation: 0, flipH: 1, flipV: 1 }
  },

  // Crop Interactive Canvas Engine Parameters
  cropEngine: {
    image: null,
    scale: 1,
    minScale: 0.2,
    maxScale: 5,
    panX: 0,
    panY: 0,
    cropBox: { x: 0, y: 0, w: 0, h: 0 },
    isDragging: false,
    dragMode: null, // 'pan' | 'nw' | 'ne' | 'sw' | 'se' | 'move'
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startCrop: {},
    pinchDist: 0,
    history: []
  }
};

// DOM Elements Registry
const els = {
  dashboardScreen: document.getElementById('dashboardScreen'),
  studioScreen: document.getElementById('studioScreen'),
  launchPvcBtn: document.getElementById('launchPvcBtn'),
  btnBackToDashboard: document.getElementById('btnBackToDashboard'),
  pvcNavTrigger: document.getElementById('pvcNavTrigger'),

  stepIndicator1: document.getElementById('stepIndicator1'),
  stepIndicator2: document.getElementById('stepIndicator2'),
  stepIndicator3: document.getElementById('stepIndicator3'),

  step1Section: document.getElementById('step1Section'),
  step2Section: document.getElementById('step2Section'),
  step3Section: document.getElementById('step3Section'),
  previewWorkspaceSection: document.getElementById('previewWorkspaceSection'),

  frontFileInput: document.getElementById('frontFileInput'),
  backFileInput: document.getElementById('backFileInput'),
  btnUseSameImage: document.getElementById('btnUseSameImage'),

  frontPreviewCanvas: document.getElementById('frontPreviewCanvas'),
  backPreviewCanvas: document.getElementById('backPreviewCanvas'),
  btnReplaceFront: document.getElementById('btnReplaceFront'),
  btnRecropFront: document.getElementById('btnRecropFront'),
  btnReplaceBack: document.getElementById('btnReplaceBack'),
  btnRecropBack: document.getElementById('btnRecropBack'),

  btnPrepareA4: document.getElementById('btnPrepareA4'),
  a4Canvas: document.getElementById('a4Canvas'),
  btnDownloadPNG: document.getElementById('btnDownloadPNG'),
  btnDownloadPDF: document.getElementById('btnDownloadPDF'),

  // Modal Elements
  cropModalOverlay: document.getElementById('cropModalOverlay'),
  cropModalTitle: document.getElementById('cropModalTitle'),
  cropCanvas: document.getElementById('cropCanvas'),
  cropCanvasStage: document.getElementById('cropCanvasStage'),
  zoomSlider: document.getElementById('zoomSlider'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  btnFitImage: document.getElementById('btnFitImage'),
  btnUndoCrop: document.getElementById('btnUndoCrop'),
  btnResetCrop: document.getElementById('btnResetCrop'),
  btnCancelCrop: document.getElementById('btnCancelCrop'),
  btnApplyCrop: document.getElementById('btnApplyCrop'),

  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingText: document.getElementById('loadingText')
};

// UI Feedback & Screen Switching Logic
function showLoading(text = 'Processing...') {
  els.loadingText.textContent = text;
  els.loadingOverlay.classList.remove('is-hidden');
}

function hideLoading() {
  els.loadingOverlay.classList.add('is-hidden');
}

function openStudio() {
  els.dashboardScreen.classList.add('is-hidden');
  els.studioScreen.classList.remove('is-hidden');
  updateStepProgress(1);
}

function closeStudio() {
  els.studioScreen.classList.add('is-hidden');
  els.dashboardScreen.classList.remove('is-hidden');
}

function updateStepProgress(step) {
  state.activeStep = step;
  const items = [els.stepIndicator1, els.stepIndicator2, els.stepIndicator3];
  items.forEach((item, index) => {
    const idx = index + 1;
    item.classList.toggle('active', idx === step);
    item.classList.toggle('completed', idx < step);
  });

  els.step1Section.classList.toggle('is-hidden', step !== 1);
  els.step2Section.classList.toggle('is-hidden', step !== 2);
  els.step3Section.classList.toggle('is-hidden', step !== 3);
}

// Image & PDF Loading Pipeline
async function processUploadedFile(file) {
  showLoading('Loading document...');
  try {
    let img;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      img = await loadPdfAsImage(file);
    } else {
      img = await loadImageFile(file);
    }
    hideLoading();
    return img;
  } catch (err) {
    hideLoading();
    alert('Failed to load file: ' + err.message);
    throw err;
  }
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadPdfAsImage(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library is not ready.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 3.0 }); // High scale for crisp rendering

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport: viewport }).promise;

  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  await new Promise((res) => (img.onload = res));
  return img;
}

// Professional Interactive Cropper Engine
function openCropModal(side, img) {
  state.activeSide = side;
  const ce = state.cropEngine;
  ce.image = img;
  ce.history = [];

  els.cropModalTitle.textContent = side === 'front' ? 'Crop Front Side' : 'Crop Back Side';
  els.cropModalOverlay.classList.remove('is-hidden');

  resizeCropCanvas();
  resetCropEngine();
  renderCropCanvas();
}

function closeCropModal() {
  els.cropModalOverlay.classList.add('is-hidden');
}

function resizeCropCanvas() {
  const rect = els.cropCanvasStage.getBoundingClientRect();
  els.cropCanvas.width = rect.width;
  els.cropCanvas.height = rect.height;
}

function resetCropEngine() {
  const ce = state.cropEngine;
  const cw = els.cropCanvas.width;
  const ch = els.cropCanvas.height;

  // Fit image inside canvas stage initially
  const scaleX = (cw * 0.8) / ce.image.width;
  const scaleY = (ch * 0.8) / ce.image.height;
  ce.scale = Math.min(scaleX, scaleY, 1);
  ce.minScale = ce.scale * 0.5;

  ce.panX = (cw - ce.image.width * ce.scale) / 2;
  ce.panY = (ch - ce.image.height * ce.scale) / 2;

  // Set default crop box matching CARD_RATIO
  let cropW = cw * 0.65;
  let cropH = cropW / CARD_RATIO;
  if (cropH > ch * 0.65) {
    cropH = ch * 0.65;
    cropW = cropH * CARD_RATIO;
  }

  ce.cropBox = {
    x: (cw - cropW) / 2,
    y: (ch - cropH) / 2,
    w: cropW,
    h: cropH
  };

  els.zoomSlider.value = ce.scale;
}

function saveCropState() {
  const ce = state.cropEngine;
  if (ce.history.length > 20) ce.history.shift();
  ce.history.push({
    scale: ce.scale,
    panX: ce.panX,
    panY: ce.panY,
    cropBox: { ...ce.cropBox }
  });
}

function undoCropState() {
  const ce = state.cropEngine;
  if (ce.history.length > 0) {
    const prev = ce.history.pop();
    ce.scale = prev.scale;
    ce.panX = prev.panX;
    ce.panY = prev.panY;
    ce.cropBox = { ...prev.cropBox };
    els.zoomSlider.value = ce.scale;
    renderCropCanvas();
  }
}

function renderCropCanvas() {
  const ce = state.cropEngine;
  const canvas = els.cropCanvas;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  if (!ce.image) return;

  // 1. Draw transformed background image
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(ce.image, ce.panX, ce.panY, ce.image.width * ce.scale, ce.image.height * ce.scale);
  ctx.restore();

  // 2. Dark Overlay for non-crop areas
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.rect(ce.cropBox.x, ce.cropBox.y, ce.cropBox.w, ce.cropBox.h);
  ctx.fill('evenodd');
  ctx.restore();

  // 3. Draw Rule of Thirds Grid & Crop Box Border
  const cb = ce.cropBox;
  ctx.save();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);

  // Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    // Vertical
    ctx.beginPath();
    ctx.moveTo(cb.x + (cb.w / 3) * i, cb.y);
    ctx.lineTo(cb.x + (cb.w / 3) * i, cb.y + cb.h);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(cb.x, cb.y + (cb.h / 3) * i);
    ctx.lineTo(cb.x + cb.w, cb.y + (cb.h / 3) * i);
    ctx.stroke();
  }

  // Corner Resize Handles
  const handles = getCropHandles(cb);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  handles.forEach((h) => {
    ctx.beginPath();
    ctx.arc(h.x, h.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function getCropHandles(cb) {
  return [
    { name: 'nw', x: cb.x, y: cb.y },
    { name: 'ne', x: cb.x + cb.w, y: cb.y },
    { name: 'sw', x: cb.x, y: cb.y + cb.h },
    { name: 'se', x: cb.x + cb.w, y: cb.y + cb.h }
  ];
}

// Crop Pointer, Touch & Mouse Control Handlers
function getPointerPos(e) {
  const rect = els.cropCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function hitTestCrop(pos) {
  const ce = state.cropEngine;
  const cb = ce.cropBox;
  const handles = getCropHandles(cb);

  for (const h of handles) {
    if (Math.hypot(pos.x - h.x, pos.y - h.y) <= 12) {
      return h.name;
    }
  }

  if (pos.x >= cb.x && pos.x <= cb.x + cb.w && pos.y >= cb.y && pos.y <= cb.y + cb.h) {
    return 'move';
  }

  return 'pan';
}

function handlePointerDown(e) {
  if (e.touches && e.touches.length === 2) {
    // Pinch Start
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    state.cropEngine.pinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    return;
  }

  saveCropState();
  const ce = state.cropEngine;
  const pos = getPointerPos(e);
  ce.isDragging = true;
  ce.dragMode = hitTestCrop(pos);
  ce.startX = pos.x;
  ce.startY = pos.y;
  ce.startPanX = ce.panX;
  ce.startPanY = ce.panY;
  ce.startCrop = { ...ce.cropBox };
}

function handlePointerMove(e) {
  const ce = state.cropEngine;

  if (e.touches && e.touches.length === 2) {
    // Pinch Zooming
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    if (ce.pinchDist > 0) {
      const factor = dist / ce.pinchDist;
      zoomCropEngine(ce.scale * factor);
      ce.pinchDist = dist;
    }
    return;
  }

  if (!ce.isDragging) return;

  const pos = getPointerPos(e);
  const dx = pos.x - ce.startX;
  const dy = pos.y - ce.startY;

  if (ce.dragMode === 'pan') {
    ce.panX = ce.startPanX + dx;
    ce.panY = ce.startPanY + dy;
  } else if (ce.dragMode === 'move') {
    ce.cropBox.x = ce.startCrop.x + dx;
    ce.cropBox.y = ce.startCrop.y + dy;
  } else if (ce.dragMode) {
    // Corner Resize preserving aspect ratio
    let newW = ce.startCrop.w;
    if (ce.dragMode.includes('e')) newW += dx;
    if (ce.dragMode.includes('w')) newW -= dx;

    newW = Math.max(80, newW);
    let newH = newW / CARD_RATIO;

    let newX = ce.startCrop.x;
    let newY = ce.startCrop.y;

    if (ce.dragMode.includes('w')) newX = ce.startCrop.x + (ce.startCrop.w - newW);
    if (ce.dragMode.includes('n')) newY = ce.startCrop.y + (ce.startCrop.h - newH);

    ce.cropBox = { x: newX, y: newY, w: newW, h: newH };
  }

  renderCropCanvas();
}

function handlePointerUp() {
  const ce = state.cropEngine;
  ce.isDragging = false;
  ce.dragMode = null;
  ce.pinchDist = 0;
}

function handleWheelZoom(e) {
  e.preventDefault();
  saveCropState();
  const ce = state.cropEngine;
  const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
  zoomCropEngine(ce.scale * zoomFactor);
}

function zoomCropEngine(targetScale) {
  const ce = state.cropEngine;
  targetScale = Math.max(ce.minScale, Math.min(ce.maxScale, targetScale));

  const cw = els.cropCanvas.width / 2;
  const ch = els.cropCanvas.height / 2;

  ce.panX = cw - (cw - ce.panX) * (targetScale / ce.scale);
  ce.panY = ch - (ch - ce.panY) * (targetScale / ce.scale);
  ce.scale = targetScale;

  els.zoomSlider.value = ce.scale;
  renderCropCanvas();
}

// Generate Cropped Result Canvas
function executeCrop() {
  const ce = state.cropEngine;
  const cb = ce.cropBox;

  // Calculate crop rectangle relative to source image coordinate space
  const sourceX = (cb.x - ce.panX) / ce.scale;
  const sourceY = (cb.y - ce.panY) / ce.scale;
  const sourceW = cb.w / ce.scale;
  const sourceH = cb.h / ce.scale;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = CARD_WIDTH_A4;
  croppedCanvas.height = CARD_HEIGHT_A4;

  const ctx = croppedCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    ce.image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    0,
    0,
    CARD_WIDTH_A4,
    CARD_HEIGHT_A4
  );

  state.croppedCanvases[state.activeSide] = croppedCanvas;
  renderPreview(state.activeSide);

  closeCropModal();

  // Workflow Routing Logic
  els.previewWorkspaceSection.classList.remove('is-hidden');
  if (state.activeSide === 'front') {
    updateStepProgress(2);
  } else {
    els.btnPrepareA4.disabled = false;
    els.btnReplaceBack.disabled = false;
    els.btnRecropBack.disabled = false;
    enableTransformsForSide('back');
  }
}

// Preview Rendering & Transformations
function renderPreview(side) {
  const canvas = side === 'front' ? els.frontPreviewCanvas : els.backPreviewCanvas;
  const source = state.croppedCanvases[side];
  if (!source) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const tf = state.transforms[side];

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((tf.rotation * Math.PI) / 180);
  ctx.scale(tf.flipH, tf.flipV);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(source, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();
}

function enableTransformsForSide(side) {
  const btns = document.querySelectorAll(`.tool-btn[data-side="${side}"]`);
  btns.forEach((btn) => (btn.disabled = false));
}

function handleTransformAction(side, action) {
  const tf = state.transforms[side];
  if (action === 'rotate-left') tf.rotation = (tf.rotation - 90) % 360;
  if (action === 'rotate-right') tf.rotation = (tf.rotation + 90) % 360;
  if (action === 'flip-h') tf.flipH *= -1;
  if (action === 'flip-v') tf.flipV *= -1;

  renderPreview(side);
}

// 300 DPI A4 Layout Generation
function generateA4Layout() {
  showLoading('Generating 300 DPI A4 Document...');

  setTimeout(() => {
    const canvas = els.a4Canvas;
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

    // Layout Calculations
    const marginX = Math.round((A4_WIDTH - CARD_WIDTH_A4 * 2) / 3);
    const topY = 180;

    const renderCardToA4 = (side, posX, posY) => {
      const src = state.croppedCanvases[side];
      if (!src) return;

      const tf = state.transforms[side];

      ctx.save();
      ctx.translate(posX + CARD_WIDTH_A4 / 2, posY + CARD_HEIGHT_A4 / 2);
      ctx.rotate((tf.rotation * Math.PI) / 180);
      ctx.scale(tf.flipH, tf.flipV);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(src, -CARD_WIDTH_A4 / 2, -CARD_HEIGHT_A4 / 2, CARD_WIDTH_A4, CARD_HEIGHT_A4);
      ctx.restore();

      // Thin trim line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(posX, posY, CARD_WIDTH_A4, CARD_HEIGHT_A4);
    };

    // Draw Front and Back side top-aligned
    renderCardToA4('front', marginX, topY);
    renderCardToA4('back', marginX * 2 + CARD_WIDTH_A4, topY);

    hideLoading();
    updateStepProgress(3);
  }, 200);
}

// Download Handlers
function downloadPNG() {
  const link = document.createElement('a');
  link.download = 'PVC_Card_Print_300DPI_A4.png';
  link.href = els.a4Canvas.toDataURL('image/png', 1.0);
  link.click();
}

function downloadPDF() {
  if (!window.jspdf) {
    alert('PDF library not ready.');
    return;
  }
  showLoading('Creating PDF document...');
  setTimeout(() => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = els.a4Canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    pdf.save('PVC_Card_Print_Ready.pdf');
    hideLoading();
  }, 100);
}

// Event Bindings
function bindEvents() {
  // Navigation Transitions
  els.launchPvcBtn.addEventListener('click', openStudio);
  els.pvcNavTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    openStudio();
  });
  els.btnBackToDashboard.addEventListener('click', closeStudio);

  // File Selections
  els.frontFileInput.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    state.files.front = e.target.files[0];
    const img = await processUploadedFile(state.files.front);
    openCropModal('front', img);
  });

  els.backFileInput.addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    state.files.back = e.target.files[0];
    const img = await processUploadedFile(state.files.back);
    openCropModal('back', img);
  });

  els.btnUseSameImage.addEventListener('click', async () => {
    if (!state.files.front) return;
    state.files.back = state.files.front;
    const img = await processUploadedFile(state.files.back);
    openCropModal('back', img);
  });

  // Re-crop & Replace Controls
  els.btnRecropFront.addEventListener('click', async () => {
    if (state.files.front) {
      const img = await processUploadedFile(state.files.front);
      openCropModal('front', img);
    }
  });

  els.btnRecropBack.addEventListener('click', async () => {
    if (state.files.back) {
      const img = await processUploadedFile(state.files.back);
      openCropModal('back', img);
    }
  });

  els.btnReplaceFront.addEventListener('click', () => els.frontFileInput.click());
  els.btnReplaceBack.addEventListener('click', () => els.backFileInput.click());

  // Cropper Controls & Modal Events
  els.cropCanvas.addEventListener('mousedown', handlePointerDown);
  els.cropCanvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  els.cropCanvas.addEventListener('touchstart', handlePointerDown, { passive: false });
  els.cropCanvas.addEventListener('touchmove', handlePointerMove, { passive: false });
  els.cropCanvas.addEventListener('touchend', handlePointerUp);

  els.cropCanvas.ad
