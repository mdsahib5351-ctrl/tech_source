/**
 * Easy PVC Card & Passport Photo Print Pro Engine
 * Upgraded with:
 * 1. Plus/Minus Angle Rotation Controls
 * 2. Unfixed Crop Ratio (Free Crop)
 * 3. Auto High-Resolution PVC Card Output Rescaling
 */

const CARD_RATIO = 85.6 / 54;
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const CARD_WIDTH_A4 = 1012; 
const CARD_HEIGHT_A4 = Math.round(CARD_WIDTH_A4 / CARD_RATIO); // ~638px

// Passport Photo Standards for 300 DPI A4
const PASSPORT_WIDTH_A4 = 390;  // 33mm at 300 DPI
const PASSPORT_HEIGHT_A4 = 531; // 45mm at 300 DPI
const PASSPORT_CROP_RATIO = 33 / 45;

const state = {
  activeStep: 1, 
  activeSide: 'front', 
  mode: 'pvc', // 'pvc', 'passport', 'ayushman', 'pan', 'aadhaar'
  
  files: {
    front: null,
    back: null,
    passport: null
  },
  croppedCanvases: {
    front: null,
    back: null,
    passport: null
  },
  transforms: {
    front: { rotation: 0, flipH: 1, flipV: 1 },
    back: { rotation: 0, flipH: 1, flipV: 1 },
    passport: { rotation: 0, flipH: 1, flipV: 1 }
  },
  passportQty: 12,
  passportLayout: { photoMm: 33, gapXmm: 2, gapYmm: 8, borderMm: 0 },
  passportPeople: [],
  pvcPeople: [],
  cropEngine: {
    image: null,
    scale: 1,
    rotation: 0,
    minScale: 0.1,
    maxScale: 6,
    panX: 0,
    panY: 0,
    cropBox: { x: 0, y: 0, w: 0, h: 0 },
    isDragging: false,
    isPinchZoom: false,
    dragMode: null, 
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startCrop: {},
    pinchDist: 0,
    pinchCenter: { x: 0, y: 0 },
    isFixedRatio: false // Ratio fixed HATA DIYA GAYA HAI (Free-form Crop)
  }
};

let els = {};

function initElements() {
  els = {
    dashboardScreen: document.getElementById('dashboardScreen'),
    studioScreen: document.getElementById('studioScreen'),
    launchPvcBtn: document.getElementById('launchPvcBtn'),
    launchPassportBtn: document.getElementById('launchPassportBtn'),
    launchAyushmanBtn: document.getElementById('launchAyushmanBtn'),
    ayushmanFileInput: document.getElementById('ayushmanFileInput'),
    launchPanBtn: document.getElementById('launchPanBtn'),
    panFileInput: document.getElementById('panFileInput'),
    launchAadhaarBtn: document.getElementById('launchAadhaarBtn'),
    aadhaarFileInput: document.getElementById('aadhaarFileInput'),
    btnBackToDashboard: document.getElementById('btnBackToDashboard'),
    studioTitleHeader: document.getElementById('studioTitleHeader'),
    btnAddPvcPerson: document.getElementById('btnAddPvcPerson'),
    btnAddPassportPerson: document.getElementById('btnAddPassportPerson'),
    pvcPeopleList: document.getElementById('pvcPeopleList'),
    passportPeopleList: document.getElementById('passportPeopleList'),

    stepIndicator1: document.getElementById('stepIndicator1'),
    stepIndicator2: document.getElementById('stepIndicator2'),
    stepIndicator3: document.getElementById('stepIndicator3'),

    step1Section: document.getElementById('step1Section'),
    previewWorkspaceSection: document.getElementById('previewWorkspaceSection'),
    previewCardsList: document.getElementById('previewCardsList'),
    step3Section: document.getElementById('step3Section'),

    pvcUploadGrid: document.getElementById('pvcUploadGrid'),
    passportUploadGrid: document.getElementById('passportUploadGrid'),
    backSideUploadCard: document.getElementById('backSideUploadCard'),
    backWorkspaceCard: document.getElementById('backWorkspaceCard'),

    frontFileInput: document.getElementById('frontFileInput'),
    backFileInput: document.getElementById('backFileInput'),
    passportFileInput: document.getElementById('passportFileInput'),
    passportQtySelect: document.getElementById('passportQtySelect'),
    passportLayoutControls: document.getElementById('passportLayoutControls'),
    passportPhotoSize: document.getElementById('passportPhotoSize'),
    passportPhotoSizeValue: document.getElementById('passportPhotoSizeValue'),
    passportGapX: document.getElementById('passportGapX'),
    passportGapXValue: document.getElementById('passportGapXValue'),
    passportGapY: document.getElementById('passportGapY'),
    passportGapYValue: document.getElementById('passportGapYValue'),
    passportBorder: document.getElementById('passportBorder'),
    passportBorderValue: document.getElementById('passportBorderValue'),
    passportLayoutSummary: document.getElementById('passportLayoutSummary'),
    btnResetPassportLayout: document.getElementById('btnResetPassportLayout'),
    finalPhotoSizeStat: document.getElementById('finalPhotoSizeStat'),
    finalGapStat: document.getElementById('finalGapStat'),
    finalCopiesStat: document.getElementById('finalCopiesStat'),

    frontUploadCanvas: document.getElementById('frontUploadCanvas'),
    frontUploadPlaceholder: document.getElementById('frontUploadPlaceholder'),
    backUploadCanvas: document.getElementById('backUploadCanvas'),
    backUploadPlaceholder: document.getElementById('backUploadPlaceholder'),
    passportUploadCanvas: document.getElementById('passportUploadCanvas'),
    passportUploadPlaceholder: document.getElementById('passportUploadPlaceholder'),

    btnGoToStep2: document.getElementById('btnGoToStep2'),
    replaceFrontInput: document.getElementById('replaceFrontInput'),
    replaceBackInput: document.getElementById('replaceBackInput'),
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
    btnDownloadJPG: document.getElementById('btnDownloadJPG'),
    btnPrintA4: document.getElementById('btnPrintA4'),
    btnDownloadMenu: document.getElementById('btnDownloadMenu'),
    downloadMenuOverlay: document.getElementById('downloadMenuOverlay'),
    btnCloseDownloadMenu: document.getElementById('btnCloseDownloadMenu'),
    btnMenuPNG: document.getElementById('btnMenuPNG'),
    btnMenuJPG: document.getElementById('btnMenuJPG'),
    btnMenuPDF: document.getElementById('btnMenuPDF'),
    btnMenuPrint: document.getElementById('btnMenuPrint'),
    btnDownloadPDF: document.getElementById('btnDownloadPDF'),

    cropModalOverlay: document.getElementById('cropModalOverlay'),
    cropModalTitle: document.getElementById('cropModalTitle'),
    cropCanvas: document.getElementById('cropCanvas'),
    cropCanvasStage: document.getElementById('cropCanvasStage'),
    zoomSlider: document.getElementById('zoomSlider'),
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnFitImage: document.getElementById('btnFitImage'),
    btnResetCrop: document.getElementById('btnResetCrop'),
    btnCancelCrop: document.getElementById('btnCancelCrop'),
    btnApplyCrop: document.getElementById('btnApplyCrop'),

    cropRotateSlider: document.getElementById('cropRotateSlider'),
    btnRotateMinus: document.getElementById('btnRotateMinus'),
    btnRotatePlus: document.getElementById('btnRotatePlus'),
    rotateDegreeBadge: document.getElementById('rotateDegreeBadge'),
    btnResetRotate: document.getElementById('btnResetRotate'),

    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText')
  };
}

function showLoading(text = 'Processing...') {
  if (els.loadingText) els.loadingText.textContent = text;
  if (els.loadingOverlay) els.loadingOverlay.classList.remove('is-hidden');
}

function hideLoading() {
  if (els.loadingOverlay) els.loadingOverlay.classList.add('is-hidden');
}

function resetJobState() {
  state.files = { front: null, back: null, passport: null };
  state.croppedCanvases = { front: null, back: null, passport: null };
  state.transforms = { front: { rotation: 0, flipH: 1, flipV: 1 }, back: { rotation: 0, flipH: 1, flipV: 1 }, passport: { rotation: 0, flipH: 1, flipV: 1 } };
  state.passportPeople = [];
  state.passportLayout = { photoMm: 33, gapXmm: 2, gapYmm: 8, borderMm: 0 };
  state.pvcPeople = [];
  document.querySelectorAll('.dynamic-person-card').forEach(el => el.remove());
  ['frontFileInput','backFileInput','passportFileInput','panFileInput','aadhaarFileInput','ayushmanFileInput'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
}

function openStudio(mode = 'pvc', preserveData = false) {
  if (!preserveData) resetJobState();
  state.mode = mode;
  let title = 'PVC Card Print Studio';
  
  if (els.pvcUploadGrid) els.pvcUploadGrid.classList.remove('is-hidden');
  if (els.passportUploadGrid) els.passportUploadGrid.classList.add('is-hidden');
  if (els.backWorkspaceCard) els.backWorkspaceCard.classList.remove('is-hidden');

  if (mode === 'passport') {
    title = 'Passport Photo Print Studio';
    if (els.pvcUploadGrid) els.pvcUploadGrid.classList.add('is-hidden');
    if (els.passportUploadGrid) els.passportUploadGrid.classList.remove('is-hidden');
    if (els.backWorkspaceCard) els.backWorkspaceCard.classList.add('is-hidden');
  } else if (mode === 'ayushman') {
    title = 'Ayushman Bharat Studio';
  } else if (mode === 'pan') {
    title = 'e-PAN Card Print Studio';
  } else if (mode === 'aadhaar') {
    title = 'e-Aadhaar Card Print Studio';
  }
  
  if (els.studioTitleHeader) els.studioTitleHeader.textContent = title;
  if (els.btnAddPvcPerson) els.btnAddPvcPerson.classList.toggle('is-hidden', mode !== 'pvc');
  if (els.btnAddPassportPerson) els.btnAddPassportPerson.classList.toggle('is-hidden', mode !== 'passport');
  if (els.dashboardScreen) els.dashboardScreen.classList.add('is-hidden');
  if (els.studioScreen) els.studioScreen.classList.remove('is-hidden');
  updateStepProgress(1);
}

function closeStudio() {
  if (els.studioScreen) els.studioScreen.classList.add('is-hidden');
  if (els.dashboardScreen) els.dashboardScreen.classList.remove('is-hidden');
}

function goBackOneStep() {
  if (state.activeStep > 1) {
    updateStepProgress(state.activeStep - 1);
  } else {
    closeStudio();
  }
}

function updateStepProgress(step) {
  state.activeStep = step;
  if (els.studioScreen) els.studioScreen.dataset.step = String(step);
  const items = [els.stepIndicator1, els.stepIndicator2, els.stepIndicator3];
  items.forEach((item, index) => {
    if (!item) return;
    const idx = index + 1;
    item.classList.toggle('active', idx === step);
    item.classList.toggle('completed', idx < step);
  });

  if (els.step1Section) els.step1Section.classList.toggle('is-hidden', step !== 1);
  if (els.previewWorkspaceSection) els.previewWorkspaceSection.classList.toggle('is-hidden', step !== 2);
  if (els.step3Section) els.step3Section.classList.toggle('is-hidden', step !== 3);
  if (step === 2) renderStep2Preview();
}

function getPvcPreviewPairs() {
  const pairs = [];
  state.pvcPeople.forEach((p, i) => {
    if (p.front || p.back) {
      pairs.push({
        index: i + 1,
        front: p.front || null,
        back: p.back || null,
        frontTf: p.frontTf || {rotation:0,flipH:1,flipV:1},
        backTf: p.backTf || {rotation:0,flipH:1,flipV:1}
      });
    }
  });
  if (state.croppedCanvases.front || state.croppedCanvases.back) {
    pairs.push({
      index: pairs.length + 1,
      front: state.croppedCanvases.front || null,
      back: state.croppedCanvases.back || null,
      frontTf: state.transforms.front,
      backTf: state.transforms.back
    });
  }
  return pairs;
}

function drawPreviewCanvas(canvas, source, tf) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!source) return;
  const ratio = source.width / source.height;
  let w = canvas.width - 16;
  let h = w / ratio;
  if (h > canvas.height - 16) { h = canvas.height - 16; w = h * ratio; }
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(((tf?.rotation || 0) * Math.PI) / 180);
  ctx.scale(tf?.flipH || 1, tf?.flipV || 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function renderStep2Preview() {
  const list = els.previewCardsList;
  if (!list) return;
  list.innerHTML = '';

  if (state.mode === 'pvc' || ['pan','aadhaar','ayushman'].includes(state.mode)) {
    const pairs = getPvcPreviewPairs();
    if (!pairs.length) {
      list.innerHTML = '<div class="preview-empty">No preview available</div>';
      return;
    }
    pairs.forEach((pair) => {
      const group = document.createElement('section');
      group.className = 'preview-person-group';
      const titlePrefix = pairs.length === 1 ? '' : `Person ${pair.index} `;
      group.innerHTML = `
        <div class="preview-person-title">${titlePrefix}Front Side</div>
        <div class="preview-person-card"><canvas width="900" height="568"></canvas></div>
        <div class="preview-person-title">${titlePrefix}Back Side</div>
        <div class="preview-person-card"><canvas width="900" height="568"></canvas></div>`;
      const canvases = group.querySelectorAll('canvas');
      drawPreviewCanvas(canvases[0], pair.front, pair.frontTf);
      drawPreviewCanvas(canvases[1], pair.back, pair.backTf);
      list.appendChild(group);
    });
  } else {
    const items = [];
    if (state.croppedCanvases.passport) items.push({index:1, canvas:state.croppedCanvases.passport});
    state.passportPeople.forEach((p,i)=>p.canvas && items.push({index:i+2,canvas:p.canvas}));
    if (!items.length) { list.innerHTML='<div class="preview-empty">No preview available</div>'; return; }
    items.forEach(item=>{
      const group=document.createElement('section');
      group.className='preview-person-group';
      group.innerHTML=`<div class="preview-person-title">${items.length===1?'Passport Photo':`Person ${item.index} Passport Photo`}</div><div class="preview-person-card passport-preview-card"><canvas width="700" height="900"></canvas></div>`;
      drawPreviewCanvas(group.querySelector('canvas'),item.canvas,{rotation:0,flipH:1,flipV:1});
      list.appendChild(group);
    });
  }
}

function hasAnyPassportContent(){ return !!state.croppedCanvases.passport || state.passportPeople.some(p=>!!p.canvas); }
function hasAnyPvcContent(){ return !!state.croppedCanvases.front || state.pvcPeople.some(p=>!!p.front); }
function checkStep1ReadyStatus(){
  if(!els.btnGoToStep2) return;
  els.btnGoToStep2.disabled = state.mode==='passport' ? !hasAnyPassportContent() : !hasAnyPvcContent();
}
function checkA4ReadyStatus(){
  if(!els.btnPrepareA4) return;
  els.btnPrepareA4.disabled = state.mode==='passport' ? !hasAnyPassportContent() : !hasAnyPvcContent();
}

async function processUploadedFile(file, pageNum = 1) {
  showLoading('Loading document...');
  try {
    let img;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      img = await loadPdfAsImage(file, pageNum);
    } else {
      img = await loadImageFile(file);
    }
    hideLoading();
    return img;
  } catch (err) {
    hideLoading();
    if (err.name !== 'PasswordCancelled') {
      alert('Failed to load file: ' + err.message);
    }
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

async function ensurePdfJsLoaded() {
  if (window.pdfjsLib) return window.pdfjsLib;
  const urls = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'
  ];
  for (const src of urls) {
    try {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-pdfjs-src="${src}"]`);
        if (existing) {
          if (window.pdfjsLib) resolve();
          else existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.pdfjsSrc = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      if (window.pdfjsLib) return window.pdfjsLib;
    } catch (_) {}
  }
  throw new Error('PDF reader library could not be loaded. Connect to the internet once and try again.');
}

async function loadPdfAsImage(file, pageNum = 1, password = null) {
  const pdfjs = await ensurePdfJsLoaded();
  // PDF.js worker + standard fonts. This prevents the
  // "Cannot load system font: Helvetica" warning when rendering PDFs.
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  pdfjs.GlobalWorkerOptions.standardFontDataUrl =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/';
  pdfjs.GlobalWorkerOptions.cMapUrl =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/';
  pdfjs.GlobalWorkerOptions.cMapPacked = true;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer, password });
  loadingTask.onPassword = (updatePassword, reason) => {
    const msg = reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD
      ? 'Incorrect password. Enter PDF password:'
      : 'Enter PDF password:';
    const userPassword = prompt(msg);
    if (userPassword) updatePassword(userPassword);
    else {
      const error = new Error('Password entry cancelled');
      error.name = 'PasswordCancelled';
      throw error;
    }
  };

  const pdf = await loadingTask.promise;
  const targetPageNum = Math.min(Math.max(1, pageNum), pdf.numPages);
  const page = await pdf.getPage(targetPageNum);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, Math.max(1.5, 1800 / Math.max(base.width, base.height)));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const img = new Image();
  img.src = canvas.toDataURL('image/jpeg', 0.94);
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
  return img;
}

// Auto-Process PDF Handlers
async function handleAyushmanPdfUpload(file) {
  showLoading('Processing 2-Page Ayushman PDF...');
  try {
    const frontImg = await loadPdfAsImage(file, 1);
    const backImg = await loadPdfAsImage(file, 2);

    state.croppedCanvases.front = convertImgToPvcCanvas(frontImg);
    state.croppedCanvases.back = convertImgToPvcCanvas(backImg);

    openStudio('ayushman', true);
    updateUploadStepCanvas('front');
    updateUploadStepCanvas('back');
    renderPreview('front');
    renderPreview('back');
    enableTransformsForSide('front');
    enableTransformsForSide('back');
    checkA4ReadyStatus();
    updateStepProgress(2);
    hideLoading();
  } catch (err) {
    hideLoading();
  }
}

async function handlePanPdfUpload(file) {
  showLoading('Processing e-PAN PDF...');
  try {
    const fullPageImg = await loadPdfAsImage(file, 1);
    const panCanvases = cropDetectedPair(fullPageImg) || cropPanCardSides(fullPageImg);

    state.croppedCanvases.front = panCanvases.front;
    state.croppedCanvases.back = panCanvases.back;

    openStudio('pan', true);
    updateUploadStepCanvas('front');
    updateUploadStepCanvas('back');
    renderPreview('front');
    renderPreview('back');
    enableTransformsForSide('front');
    enableTransformsForSide('back');
    checkA4ReadyStatus();
    updateStepProgress(2);
    hideLoading();
  } catch (err) {
    hideLoading();
  }
}

function detectContentBounds(img) {
  const maxW=1200, scale=Math.min(1,maxW/img.width), w=Math.max(1,Math.round(img.width*scale)), h=Math.max(1,Math.round(img.height*scale));
  const c=document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  const d=ctx.getImageData(0,0,w,h).data; let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let y=0;y<h;y+=2){for(let x=0;x<w;x+=2){const i=(y*w+x)*4; const r=d[i],g=d[i+1],b=d[i+2]; if((r+g+b)/3<242){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}}}
  if(maxX<0) return null;
  const padX=Math.round(w*.015),padY=Math.round(h*.015);
  return {x:Math.max(0,minX-padX)/scale,y:Math.max(0,minY-padY)/scale,w:Math.min(w,maxX+padX)-Math.max(0,minX-padX),h:Math.min(h,maxY+padY)-Math.max(0,minY-padY)};
}

function cropDetectedPair(img) {
  const bounds=detectContentBounds(img);
  if(!bounds) return null;
  const ratio=bounds.w/bounds.h;
  if(ratio>2.25){
    const gap=Math.round(bounds.w*.02); const half=(bounds.w-gap)/2;
    const make=(x,w)=>{const c=document.createElement('canvas');c.width=CARD_WIDTH_A4;c.height=CARD_HEIGHT_A4;const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(img,x,bounds.y,w,bounds.h,0,0,c.width,c.height);return c;};
    return {front:make(bounds.x,half),back:make(bounds.x+half+gap,half)};
  }
  return null;
}

function cropPanCardSides(img) {
  const imgW = img.width;
  const imgH = img.height;

  const cropY = Math.round(imgH * 0.778); 
  const cropH = Math.round(imgH * 0.194); 
  const frontX = Math.round(imgW * 0.061);
  const frontW = Math.round(imgW * 0.412);
  const backX = Math.round(imgW * 0.527);
  const backW = Math.round(imgW * 0.412);

  const createCard = (sx, sy, sw, sh) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH_A4;
    canvas.height = CARD_HEIGHT_A4;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CARD_WIDTH_A4, CARD_HEIGHT_A4);
    return canvas;
  };

  return {
    front: createCard(frontX, cropY, frontW, cropH),
    back: createCard(backX, cropY, backW, cropH)
  };
}

async function handleAadhaarPdfUpload(file) {
  showLoading('Processing e-Aadhaar Document...');
  try {
    let fullPageImg = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
      ? await loadPdfAsImage(file, 1)
      : await loadImageFile(file);

    const aadhaarCanvases = cropDetectedPair(fullPageImg) || cropAadhaarCardSides(fullPageImg);

    state.croppedCanvases.front = aadhaarCanvases.front;
    state.croppedCanvases.back = aadhaarCanvases.back;

    openStudio('aadhaar', true);
    updateUploadStepCanvas('front');
    updateUploadStepCanvas('back');
    renderPreview('front');
    renderPreview('back');
    enableTransformsForSide('front');
    enableTransformsForSide('back');
    checkA4ReadyStatus();
    updateStepProgress(2);
    hideLoading();
  } catch (err) {
    hideLoading();
  }
}

function cropAadhaarCardSides(img) {
  const imgW = img.width;
  const imgH = img.height;

  const cropY = Math.round(imgH * 0.72);   
  const cropH = Math.round(imgH * 0.21);   
  const frontX = Math.round(imgW * 0.07);  
  const frontW = Math.round(imgW * 0.43);  
  const backX = Math.round(imgW * 0.52);   
  const backW = Math.round(imgW * 0.41);   

  const createCard = (sx, sy, sw, sh) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH_A4;
    canvas.height = CARD_HEIGHT_A4;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CARD_WIDTH_A4, CARD_HEIGHT_A4);
    return canvas;
  };

  return {
    front: createCard(frontX, cropY, frontW, cropH),
    back: createCard(backX, cropY, backW, cropH)
  };
}

function convertImgToPvcCanvas(img) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH_A4;
  canvas.height = CARD_HEIGHT_A4;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, CARD_WIDTH_A4, CARD_HEIGHT_A4);
  return canvas;
}

// CROP MODAL ENGINE
function openCropModal(side, img) {
  state.activeSide = side;
  const ce = state.cropEngine;
  ce.image = img;
  ce.isFixedRatio = false;
  const ratioControls = els.passportCropRatioControls;
  if (ratioControls) ratioControls.classList.add('is-hidden');
  if (side === 'passport') {
    const fixedBtn = document.getElementById('btnPassportFixedRatio');
    const freeBtn = document.getElementById('btnPassportFreeCrop');
    if (fixedBtn) fixedBtn.classList.toggle('active', ce.isFixedRatio);
    if (freeBtn) freeBtn.classList.toggle('active', !ce.isFixedRatio);
  }

  if (els.cropModalTitle) {
    if (side === 'front') els.cropModalTitle.textContent = 'Crop Front Side';
    else if (side === 'back') els.cropModalTitle.textContent = 'Crop Back Side';
    else els.cropModalTitle.textContent = 'Crop Passport Photo';
  }
  
  document.body.classList.add('modal-open');
  if (els.cropModalOverlay) els.cropModalOverlay.classList.remove('is-hidden');

  resizeCropCanvas();
  resetCropEngine();
  renderCropCanvas();
}

function closeCropModal() {
  document.body.classList.remove('modal-open');
  if (els.cropModalOverlay) els.cropModalOverlay.classList.add('is-hidden');
}

function resizeCropCanvas() {
  if (!els.cropCanvasStage || !els.cropCanvas) return;
  const rect = els.cropCanvasStage.getBoundingClientRect();
  els.cropCanvas.width = rect.width || 800;
  els.cropCanvas.height = rect.height || 600;
}

function resetCropEngine() {
  const ce = state.cropEngine;
  const cw = els.cropCanvas.width;
  const ch = els.cropCanvas.height;

  ce.rotation = 0;
  if (els.cropRotateSlider) els.cropRotateSlider.value = 0;
  if (els.rotateDegreeBadge) els.rotateDegreeBadge.textContent = '0°';

  const scaleX = (cw * 0.85) / ce.image.width;
  const scaleY = (ch * 0.85) / ce.image.height;
  ce.scale = Math.min(scaleX, scaleY, 1);
  ce.minScale = ce.scale * 0.2;

  ce.panX = (cw - ce.image.width * ce.scale) / 2;
  ce.panY = (ch - ce.image.height * ce.scale) / 2;

  // Initial Unfixed Box
  let cropW = cw * 0.75;
  const activeRatio = (state.activeSide === 'passport' && ce.isFixedRatio) ? PASSPORT_CROP_RATIO : CARD_RATIO;
  let cropH = cropW / activeRatio;
  if (cropH > ch * 0.75) {
    cropH = ch * 0.75;
    cropW = cropH * activeRatio;
  }

  ce.cropBox = {
    x: (cw - cropW) / 2,
    y: (ch - cropH) / 2,
    w: cropW,
    h: cropH
  };

  if (els.zoomSlider) els.zoomSlider.value = ce.scale;
}

function getCropHandles(cb) {
  return [
    { name: 'nw', x: cb.x, y: cb.y },
    { name: 'ne', x: cb.x + cb.w, y: cb.y },
    { name: 'se', x: cb.x + cb.w, y: cb.y + cb.h },
    { name: 'sw', x: cb.x, y: cb.y + cb.h },
    { name: 'n',  x: cb.x + cb.w / 2, y: cb.y },
    { name: 's',  x: cb.x + cb.w / 2, y: cb.y + cb.h },
    { name: 'e',  x: cb.x + cb.w,     y: cb.y + cb.h / 2 },
    { name: 'w',  x: cb.x,             y: cb.y + cb.h / 2 }
  ];
}

function renderCropCanvas() {
  const ce = state.cropEngine;
  const canvas = els.cropCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);
  if (!ce.image) return;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const imgW = ce.image.width * ce.scale;
  const imgH = ce.image.height * ce.scale;
  const centerX = ce.panX + imgW / 2;
  const centerY = ce.panY + imgH / 2;

  ctx.translate(centerX, centerY);
  ctx.rotate((ce.rotation * Math.PI) / 180);
  ctx.drawImage(ce.image, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.restore();

  // Overlay Darkening Outside Crop Area
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.rect(ce.cropBox.x, ce.cropBox.y, ce.cropBox.w, ce.cropBox.h);
  ctx.fill('evenodd');
  ctx.restore();

  const cb = ce.cropBox;

  // Grid Lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cb.x + cb.w / 3, cb.y);
  ctx.lineTo(cb.x + cb.w / 3, cb.y + cb.h);
  ctx.moveTo(cb.x + (cb.w * 2) / 3, cb.y);
  ctx.lineTo(cb.x + (cb.w * 2) / 3, cb.y + cb.h);
  ctx.moveTo(cb.x, cb.y + cb.h / 3);
  ctx.lineTo(cb.x + cb.w, cb.y + cb.h / 3);
  ctx.moveTo(cb.x, cb.y + (cb.h * 2) / 3);
  ctx.lineTo(cb.x + cb.w, cb.y + (cb.h * 2) / 3);
  ctx.stroke();
  ctx.restore();

  // Crop Border & Handles
  ctx.save();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);

  const handles = getCropHandles(cb);
  handles.forEach((h) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (['nw', 'ne', 'se', 'sw'].includes(h.name)) {
      ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
    } else {
      ctx.rect(h.x - 6, h.y - 6, 12, 12);
    }
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function getPointerPos(e) {
  const rect = els.cropCanvas.getBoundingClientRect();
  let clientX = e.touches ? e.touches[0].clientX : e.clientX;
  let clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function hitTestCrop(pos) {
  const cb = state.cropEngine.cropBox;
  const handles = getCropHandles(cb);
  for (const h of handles) {
    if (Math.hypot(pos.x - h.x, pos.y - h.y) <= 18) return h.name;
  }
  if (pos.x >= cb.x && pos.x <= cb.x + cb.w && pos.y >= cb.y && pos.y <= cb.y + cb.h) {
    return 'move';
  }
  return 'pan';
}

function handlePointerDown(e) {
  const ce = state.cropEngine;

  // Double Finger Pinch-Zoom
  if (e.touches && e.touches.length === 2) {
    e.preventDefault();
    ce.isPinchZoom = true;
    ce.isDragging = false;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    
    const rect = els.cropCanvas.getBoundingClientRect();
    ce.pinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    
    ce.pinchCenter = {
      x: ((t1.clientX + t2.clientX) / 2) - rect.left,
      y: ((t1.clientY + t2.clientY) / 2) - rect.top
    };
    return;
  }

  if (e.touches && e.touches.length > 1) return;

  const pos = getPointerPos(e);
  ce.isPinchZoom = false;
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

  if (ce.isPinchZoom && e.touches && e.touches.length === 2) {
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const rect = els.cropCanvas.getBoundingClientRect();
    
    const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const newCenter = {
      x: ((t1.clientX + t2.clientX) / 2) - rect.left,
      y: ((t1.clientY + t2.clientY) / 2) - rect.top
    };

    if (ce.pinchDist > 0) {
      const zoomFactor = newDist / ce.pinchDist;
      const targetScale = Math.max(ce.minScale, Math.min(ce.maxScale, ce.scale * zoomFactor));

      if (targetScale !== ce.scale) {
        const focalX = newCenter.x;
        const focalY = newCenter.y;

        ce.panX = focalX - (focalX - ce.panX) * (targetScale / ce.scale);
        ce.panY = focalY - (focalY - ce.panY) * (targetScale / ce.scale);
        ce.scale = targetScale;

        if (els.zoomSlider) els.zoomSlider.value = ce.scale;
      }
      ce.pinchDist = newDist;
      ce.pinchCenter = newCenter;
      renderCropCanvas();
    }
    return;
  }

  if (!ce.isDragging) {
    const pos = getPointerPos(e);
    const mode = hitTestCrop(pos);
    if (mode === 'nw' || mode === 'se') els.cropCanvas.style.cursor = 'nwse-resize';
    else if (mode === 'ne' || mode === 'sw') els.cropCanvas.style.cursor = 'nesw-resize';
    else if (mode === 'e' || mode === 'w') els.cropCanvas.style.cursor = 'ew-resize';
    else if (mode === 'n' || mode === 's') els.cropCanvas.style.cursor = 'ns-resize';
    else if (mode === 'move') els.cropCanvas.style.cursor = 'move';
    else els.cropCanvas.style.cursor = 'grab';
    return;
  }

  if (e.touches) e.preventDefault();
  const pos = getPointerPos(e);
  const dx = pos.x - ce.startX;
  const dy = pos.y - ce.startY;
  const cw = els.cropCanvas.width;
  const ch = els.cropCanvas.height;

  if (ce.dragMode === 'pan') {
    ce.panX = ce.startPanX + dx;
    ce.panY = ce.startPanY + dy;
  } else if (ce.dragMode === 'move') {
    ce.cropBox.x = ce.startCrop.x + dx;
    ce.cropBox.y = ce.startCrop.y + dy;
  } else if (ce.dragMode) {
    let { x, y, w, h } = { ...ce.startCrop };
    const minDim = 30;

    if (ce.isFixedRatio) {
      const ratio = PASSPORT_CROP_RATIO;
      let nw = ce.startCrop.w, nh = ce.startCrop.h, nx = ce.startCrop.x, ny = ce.startCrop.y;
      if (ce.dragMode === 'se') { nw = Math.max(minDim, ce.startCrop.w + dx); nh = nw / ratio; }
      else if (ce.dragMode === 'sw') { nw = Math.max(minDim, ce.startCrop.w - dx); nh = nw / ratio; nx = ce.startCrop.x + dx; ny = ce.startCrop.y + (ce.startCrop.h - nh); }
      else if (ce.dragMode === 'ne') { nw = Math.max(minDim, ce.startCrop.w + dx); nh = nw / ratio; ny = ce.startCrop.y + (ce.startCrop.h - nh); }
      else if (ce.dragMode === 'nw') { nw = Math.max(minDim, ce.startCrop.w - dx); nh = nw / ratio; nx = ce.startCrop.x + dx; ny = ce.startCrop.y + (ce.startCrop.h - nh); }
      else if (ce.dragMode === 'e') { nw = Math.max(minDim, ce.startCrop.w + dx); nh = nw / ratio; ny = ce.startCrop.y + (ce.startCrop.h - nh) / 2; }
      else if (ce.dragMode === 'w') { nw = Math.max(minDim, ce.startCrop.w - dx); nh = nw / ratio; nx = ce.startCrop.x + dx; ny = ce.startCrop.y + (ce.startCrop.h - nh) / 2; }
      else if (ce.dragMode === 's') { nh = Math.max(minDim, ce.startCrop.h + dy); nw = nh * ratio; nx = ce.startCrop.x + (ce.startCrop.w - nw) / 2; }
      else if (ce.dragMode === 'n') { nh = Math.max(minDim, ce.startCrop.h - dy); nw = nh * ratio; nx = ce.startCrop.x + (ce.startCrop.w - nw) / 2; ny = ce.startCrop.y + dy; }
      w=nw; h=nh; x=nx; y=ny;
    } else {
      if (ce.dragMode.includes('e')) w = Math.max(minDim, ce.startCrop.w + dx);
      if (ce.dragMode.includes('s')) h = Math.max(minDim, ce.startCrop.h + dy);
      if (ce.dragMode.includes('w')) {
        const possibleW = ce.startCrop.w - dx;
        if (possibleW > minDim) { w = possibleW; x = ce.startCrop.x + dx; }
      }
      if (ce.dragMode.includes('n')) {
        const possibleH = ce.startCrop.h - dy;
        if (possibleH > minDim) { h = possibleH; y = ce.startCrop.y + dy; }
      }
    }
    x = Math.max(0, Math.min(cw - w, x)); y = Math.max(0, Math.min(ch - h, y));
    ce.cropBox = { x, y, w, h };
  }
  renderCropCanvas();
}

function handlePointerUp(e) {
  const ce = state.cropEngine;
  if (e && e.touches && e.touches.length > 0) {
    if (e.touches.length === 1) {
      ce.isPinchZoom = false;
    }
    return;
  }
  ce.isDragging = false;
  ce.isPinchZoom = false;
  ce.pinchDist = 0;
  if (els.cropCanvas) els.cropCanvas.style.cursor = 'grab';
}

function zoomCropEngine(targetScale) {
  const ce = state.cropEngine;
  targetScale = Math.max(ce.minScale, Math.min(ce.maxScale, targetScale));
  
  const cw = els.cropCanvas.width;
  const ch = els.cropCanvas.height;
  const centerX = cw / 2;
  const centerY = ch / 2;

  ce.panX = centerX - (centerX - ce.panX) * (targetScale / ce.scale);
  ce.panY = centerY - (centerY - ce.panY) * (targetScale / ce.scale);
  ce.scale = targetScale;

  if (els.zoomSlider) els.zoomSlider.value = ce.scale;
  renderCropCanvas();
}

function updateRotationAngle(delta) {
  const ce = state.cropEngine;
  let newAngle = ce.rotation + delta;
  
  if (newAngle > 180) newAngle -= 360;
  if (newAngle < -180) newAngle += 360;

  ce.rotation = newAngle;
  if (els.cropRotateSlider) els.cropRotateSlider.value = newAngle;
  if (els.rotateDegreeBadge) els.rotateDegreeBadge.textContent = `${newAngle}°`;
  renderCropCanvas();
}

function executeCrop() {
  const ce = state.cropEngine;
  const cb = ce.cropBox;

  // Step 1: Render full image onto a temp canvas with rotation applied
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = ce.image.width;
  tempCanvas.height = ce.image.height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
  tempCtx.rotate((ce.rotation * Math.PI) / 180);
  tempCtx.drawImage(ce.image, -tempCanvas.width / 2, -tempCanvas.height / 2);

  // Step 2: Map on-screen crop box to raw image coordinates
  const sourceX = (cb.x - ce.panX) / ce.scale;
  const sourceY = (cb.y - ce.panY) / ce.scale;
  const sourceW = cb.w / ce.scale;
  const sourceH = cb.h / ce.scale;

  // Step 3: Automatically Rescale Cropped Region into Standard Auto PVC Size (1012x638)
  const croppedCanvas = document.createElement('canvas');
  if (state.activeSide === 'passport') {
    croppedCanvas.width = PASSPORT_WIDTH_A4;
    croppedCanvas.height = PASSPORT_HEIGHT_A4;
  } else {
    // Standard High-Resolution PVC Dimensions
    croppedCanvas.width = CARD_WIDTH_A4;
    croppedCanvas.height = CARD_HEIGHT_A4;
  }

  const ctx = croppedCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw and fit cropped custom area perfectly into Standard PVC Size
  ctx.drawImage(
    tempCanvas,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height
  );

  const active = state.activeSide;
  if (active.startsWith('passportPerson:')) {
    const id=active.split(':')[1]; const person=state.passportPeople.find(p=>p.id===id);
    if(person){ person.canvas=croppedCanvas; updateDynamicPersonPreview(person,'passport'); }
  } else if (active.startsWith('pvcPersonFront:') || active.startsWith('pvcPersonBack:')) {
    const parts=active.split(':'); const id=parts[1]; const person=state.pvcPeople.find(p=>p.id===id);
    if(person){ if(active.startsWith('pvcPersonFront:')) person.front=croppedCanvas; else person.back=croppedCanvas; updateDynamicPersonPreview(person,'pvc'); }
  } else {
    state.croppedCanvases[active] = croppedCanvas;
    updateUploadStepCanvas(active);
    renderPreview(active);
    enableTransformsForSide(active);
    checkStep1ReadyStatus();
    checkA4ReadyStatus();
  }
  closeCropModal();
}

function updateUploadStepCanvas(side) {
  let targetCanvas, placeholder;
  if (side === 'front') {
    targetCanvas = els.frontUploadCanvas;
    placeholder = els.frontUploadPlaceholder;
  } else if (side === 'back') {
    targetCanvas = els.backUploadCanvas;
    placeholder = els.backUploadPlaceholder;
  } else if (side === 'passport') {
    targetCanvas = els.passportUploadCanvas;
    placeholder = els.passportUploadPlaceholder;
  }

  const source = state.croppedCanvases[side];
  if (!source || !targetCanvas) return;

  targetCanvas.classList.remove('is-hidden');
  if (placeholder) placeholder.classList.add('is-hidden');

  const ctx = targetCanvas.getContext('2d');
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  ctx.drawImage(source, 0, 0, targetCanvas.width, targetCanvas.height);
}

function renderPreview(side) {
  const canvas = side === 'front' ? els.frontPreviewCanvas : els.backPreviewCanvas;
  const source = state.croppedCanvases[side];
  if (!source || !canvas) return;

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

// A4 Layout Sheet Generator
function drawCardToA4(ctx, src, posX, posY, tf = {rotation:0,flipH:1,flipV:1}) {
  if (!src) return;
  ctx.save();
  ctx.translate(posX + CARD_WIDTH_A4 / 2, posY + CARD_HEIGHT_A4 / 2);
  ctx.rotate((tf.rotation * Math.PI) / 180);
  ctx.scale(tf.flipH, tf.flipV);
  ctx.drawImage(src, -CARD_WIDTH_A4 / 2, -CARD_HEIGHT_A4 / 2, CARD_WIDTH_A4, CARD_HEIGHT_A4);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.strokeRect(posX, posY, CARD_WIDTH_A4, CARD_HEIGHT_A4);
  ctx.restore();
}

function makeA4Canvas() {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH;
  canvas.height = A4_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,A4_WIDTH,A4_HEIGHT);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return canvas;
}

function generatePassportItems() {
  const items = [];
  if (state.croppedCanvases.passport) items.push({src: state.croppedCanvases.passport, qty: state.passportQty || 12, label:'Person 1'});
  state.passportPeople.forEach((p, i) => { if (p.canvas) items.push({src:p.canvas, qty:p.qty || 12, label:`Person ${i+2}`}); });
  return items;
}

function getPassportLayoutMetrics() {
  const L = state.passportLayout || { photoMm: 33, gapXmm: 2, gapYmm: 8, borderMm: 0 };
  const pxPerMm = 300 / 25.4;
  const photoW = Math.round(L.photoMm * pxPerMm);
  const photoH = Math.round(photoW * (45 / 33));
  const gapX = Math.round(L.gapXmm * pxPerMm);
  const gapY = Math.round(L.gapYmm * pxPerMm);
  const border = Math.max(0, Math.round((L.borderMm || 0) * pxPerMm));
  const marginX = Math.max(18, Math.round(5 * pxPerMm));
  const marginY = Math.max(18, Math.round(5 * pxPerMm));
  const cols = Math.max(1, Math.floor((A4_WIDTH - marginX * 2 + gapX) / (photoW + gapX)));
  return { photoW, photoH, gapX, gapY, border, marginX, marginY, cols, rowsMax: Math.floor((A4_HEIGHT - marginY * 2 + gapY) / (photoH + gapY)) };
}

function updatePassportLayoutUI(redraw = true) {
  const L = state.passportLayout;
  if (!els.passportLayoutControls || state.mode !== 'passport') return;
  if (els.passportPhotoSize) els.passportPhotoSize.value = L.photoMm;
  if (els.passportGapX) els.passportGapX.value = L.gapXmm;
  if (els.passportGapY) els.passportGapY.value = L.gapYmm;
  if (els.passportBorder) els.passportBorder.value = L.borderMm || 0;
  if (els.passportPhotoSizeValue) els.passportPhotoSizeValue.textContent = `${L.photoMm} mm`;
  if (els.passportGapXValue) els.passportGapXValue.textContent = `${L.gapXmm} mm`;
  if (els.passportGapYValue) els.passportGapYValue.textContent = `${L.gapYmm} mm`;
  if (els.passportBorderValue) els.passportBorderValue.textContent = `${(L.borderMm || 0).toFixed(1)} mm`;
  const m = getPassportLayoutMetrics();
  if (els.passportLayoutSummary) els.passportLayoutSummary.textContent = `${m.cols} photos per row`;
  if (els.finalPhotoSizeStat) els.finalPhotoSizeStat.innerHTML = `<span>Photo Size</span><b>${L.photoMm} × ${(L.photoMm * 45 / 33).toFixed(1)} mm</b>`;
  if (els.finalGapStat) els.finalGapStat.innerHTML = `<span>Photo Gap</span><b>${L.gapXmm} × ${L.gapYmm} mm</b>`;
  const total = generatePassportItems().reduce((n, x) => n + (x.qty || 0), 0);
  if (els.finalCopiesStat) els.finalCopiesStat.textContent = total || state.passportQty || 12;
  if (redraw && els.a4Canvas && els.a4Canvas.width) renderPassportSheet(els.a4Canvas);
}

function renderPassportSheet(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
  const m = getPassportLayoutMetrics();
  const items = generatePassportItems();
  let index = 0;
  for (const item of items) {
    for (let n = 0; n < item.qty; n++) {
      const row = Math.floor(index / m.cols);
      const col = index % m.cols;
      if (row >= m.rowsMax) break;
      const usedW = m.cols * m.photoW + (m.cols - 1) * m.gapX;
      const startX = Math.round((A4_WIDTH - usedW) / 2);
      const x = startX + col * (m.photoW + m.gapX);
      const y = m.marginY + row * (m.photoH + m.gapY);
      ctx.drawImage(item.src, x, y, m.photoW, m.photoH);
      if (m.border > 0) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = m.border;
        ctx.strokeRect(x + m.border / 2, y + m.border / 2, m.photoW - m.border, m.photoH - m.border);
        ctx.restore();
      }
      index++;
    }
  }
}

function generateA4Layout() {
  if (state.mode === 'passport') {
    if (!generatePassportItems().length) return alert('Please select at least one passport photo.');
  } else if (!hasAnyPvcContent()) {
    return alert('Please select at least one PVC front side.');
  }
  showLoading('Preparing A4 preview...');
  requestAnimationFrame(() => {
    try {
      const canvas = els.a4Canvas;
      if (!canvas) return;
      canvas.width = A4_WIDTH; canvas.height = A4_HEIGHT;
      const ctx = canvas.getContext('2d', { alpha:false });
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,A4_WIDTH,A4_HEIGHT);
      ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';

      if (state.mode === 'passport') {
        if (els.passportLayoutControls) els.passportLayoutControls.classList.remove('is-hidden');
        renderPassportSheet(canvas);
        updatePassportLayoutUI(false);
      } else {
        if (els.passportLayoutControls) els.passportLayoutControls.classList.add('is-hidden');
        const gap = 24;
        const topY = 170;
        const totalW = CARD_WIDTH_A4 * 2 + gap;
        const leftX = Math.round((A4_WIDTH - totalW) / 2);
        const rightX = leftX + CARD_WIDTH_A4 + gap;
        const pairs=[];
        if(state.croppedCanvases.front) pairs.push({front:state.croppedCanvases.front,back:state.croppedCanvases.back,frontTf:state.transforms.front,backTf:state.transforms.back});
        state.pvcPeople.filter(p=>p.front).forEach(p=>pairs.push({front:p.front,back:p.back,frontTf:p.frontTf,backTf:p.backTf}));
        let y=topY;
        for(const pair of pairs){
          if(y + CARD_HEIGHT_A4 > A4_HEIGHT - 20) break;
          drawCardToA4(ctx,pair.front,leftX,y,pair.frontTf||{rotation:0,flipH:1,flipV:1});
          if(pair.back) drawCardToA4(ctx,pair.back,rightX,y,pair.backTf||{rotation:0,flipH:1,flipV:1});
          if(pair.back){
            const foldX=leftX+CARD_WIDTH_A4+gap/2;
            ctx.save();ctx.strokeStyle='#2563eb';ctx.lineWidth=3;ctx.setLineDash([12,10]);
            ctx.beginPath();ctx.moveTo(foldX,y-12);ctx.lineTo(foldX,y+CARD_HEIGHT_A4+12);ctx.stroke();ctx.restore();
          }
          y += CARD_HEIGHT_A4 + 90;
        }
      }
      updateStepProgress(3);
    } finally { hideLoading(); }
  });
}

function downloadPNG() {
  if (!els.a4Canvas) return;
  const link = document.createElement('a');
  link.download = `${state.mode.toUpperCase()}_Print_300DPI_A4.png`;
  link.href = els.a4Canvas.toDataURL('image/png', 1.0);
  link.click();
}

function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes;
}

function buildSingleImagePdf(canvas) {
  const jpeg = dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.92));
  const enc = new TextEncoder();
  const chunks=[]; const offsets=[0]; let pos=0;
  const add=(s)=>{const b=enc.encode(s); chunks.push(b); pos+=b.length;};
  const addBytes=(b)=>{chunks.push(b); pos+=b.length;};
  add('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    null
  ];
  offsets[1]=pos; add(objects[0]); offsets[2]=pos; add(objects[1]); offsets[3]=pos; add(objects[2]);
  offsets[4]=pos; add(objects[3]); addBytes(jpeg); add('\nendstream\nendobj\n');
  const content='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
  offsets[5]=pos; add(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
  const xref=pos; add(`xref\n0 6\n0000000000 65535 f \n`);
  for(let i=1;i<=5;i++) add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const total = chunks.reduce((n,b)=>n+b.length,0); const out=new Uint8Array(total); let at=0;
  chunks.forEach(b=>{out.set(b,at);at+=b.length;}); return out;
}

function downloadPDF() {
  if (!els.a4Canvas || !els.a4Canvas.width) return alert('Generate A4 preview first.');
  try {
    showLoading('Creating PDF...');
    setTimeout(()=>{
      const bytes=buildSingleImagePdf(els.a4Canvas);
      const blob=new Blob([bytes],{type:'application/pdf'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`${state.mode.toUpperCase()}_Print_Ready.pdf`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000); hideLoading();
    },30);
  } catch(e){ hideLoading(); alert('PDF creation failed: '+e.message); }
}

function downloadJPG() {
  if (!els.a4Canvas || !els.a4Canvas.width) return alert('Generate A4 preview first.');
  const link = document.createElement('a');
  link.download = `${state.mode.toUpperCase()}_Print_300DPI_A4.jpg`;
  link.href = els.a4Canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

function printA4() {
  if (!els.a4Canvas || !els.a4Canvas.width) return alert('Generate A4 preview first.');
  const data = els.a4Canvas.toDataURL('image/png', 1.0);
  const win = window.open('', '_blank');
  if (!win) return alert('Please allow pop-ups to print the A4 sheet.');
  win.document.write(`<!doctype html><html><head><title>A4 Print</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}img{width:210mm;height:297mm;display:block}</style></head><body><img src="${data}" onload="window.print();setTimeout(()=>window.close(),500)"></body></html>`);
  win.document.close();
}

function renumberPeople(type){
  const arr=type==='passport'?state.passportPeople:state.pvcPeople;
  const list=type==='passport'?els.passportPeopleList:els.pvcPeopleList;
  arr.forEach((p,i)=>{p.index=i+1; const el=list?.querySelector(`[data-person-id=\"${p.id}\"] strong`); if(el) el.textContent=`Person ${p.index}`;});
}

function clearBaseUploadSlot(type){
  if(type==='passport'){
    state.files.passport=null; state.croppedCanvases.passport=null;
    const c=els.passportUploadCanvas, ph=els.passportUploadPlaceholder;
    if(c){c.classList.add('is-hidden');c.getContext('2d').clearRect(0,0,c.width,c.height);}
    if(ph) ph.classList.remove('is-hidden');
    if(els.passportFileInput) els.passportFileInput.value='';
  }else{
    state.files.front=null; state.files.back=null; state.croppedCanvases.front=null; state.croppedCanvases.back=null;
    [['frontUploadCanvas','frontUploadPlaceholder'],['backUploadCanvas','backUploadPlaceholder']].forEach(([cid,pid])=>{const c=els[cid],ph=els[pid];if(c){c.classList.add('is-hidden');c.getContext('2d').clearRect(0,0,c.width,c.height);}if(ph)ph.classList.remove('is-hidden');});
    if(els.frontFileInput) els.frontFileInput.value=''; if(els.backFileInput) els.backFileInput.value='';
    if(els.frontUploadState) els.frontUploadState.textContent='Waiting'; if(els.backUploadState) els.backUploadState.textContent='Waiting';
  }
  checkStep1ReadyStatus(); checkA4ReadyStatus();
}

function renderPersonCard(person, container, type='passport') {
  const card=document.createElement('article'); card.className='dynamic-person-card'; card.dataset.personId=person.id;
  if(type==='passport'){
    card.innerHTML=`<div class=\"person-card-head\"><strong>Person ${person.index}</strong><button type=\"button\" class=\"btn btn-small btn-danger\" data-remove>Remove</button></div><div class=\"person-photo-row\"><div class=\"dynamic-preview\"><canvas data-preview width=280 height=360></canvas><span data-empty>Saved photo</span></div><div class=\"person-actions\"><label class=\"btn btn-primary file-label\">Replace Photo<input type=\"file\" accept=\"image/*,.pdf\" data-file class=\"is-hidden\"></label><label>Copies<select data-qty class=\"form-control\"><option>6</option><option ${person.qty===12?'selected':''}>12</option><option ${person.qty===18?'selected':''}>18</option><option ${person.qty===24?'selected':''}>24</option><option ${person.qty===30?'selected':''}>30</option><option ${person.qty===36?'selected':''}>36</option><option ${person.qty===48?'selected':''}>48</option></select></label></div></div>`;
    const input=card.querySelector('[data-file]'),preview=card.querySelector('[data-preview]'),empty=card.querySelector('[data-empty]'),qty=card.querySelector('[data-qty]');
    input.addEventListener('change',async()=>{if(!input.files[0])return;person.file=input.files[0];openCropModal('passportPerson:'+person.id,await processUploadedFile(person.file));});
    qty.addEventListener('change',()=>{person.qty=parseInt(qty.value,10);checkA4ReadyStatus();});
    card.querySelector('[data-remove]').addEventListener('click',()=>{state.passportPeople=state.passportPeople.filter(p=>p.id!==person.id);card.remove();renumberPeople('passport');checkStep1ReadyStatus();checkA4ReadyStatus();});
    person.preview=preview;person.empty=empty;
    if(person.canvas) updateDynamicPersonPreview(person,'passport');
  }else{
    card.innerHTML=`<div class=\"person-card-head\"><strong>Person ${person.index}</strong><button type=\"button\" class=\"btn btn-small btn-danger\" data-remove>Remove</button></div><div class=\"person-pvc-grid\"><div><span>FRONT</span><canvas data-front width=360 height=227></canvas><label class=\"btn btn-primary file-label\">Replace Front<input type=\"file\" accept=\"image/*,.pdf\" data-front-input class=\"is-hidden\"></label></div><div><span>BACK</span><canvas data-back width=360 height=227></canvas><label class=\"btn btn-primary file-label\">Replace Back<input type=\"file\" accept=\"image/*,.pdf\" data-back-input class=\"is-hidden\"></label></div></div>`;
    const fi=card.querySelector('[data-front-input]'),bi=card.querySelector('[data-back-input]');
    fi.addEventListener('change',async()=>{if(!fi.files[0])return;person.frontFile=fi.files[0];openCropModal('pvcPersonFront:'+person.id,await processUploadedFile(person.frontFile));});
    bi.addEventListener('change',async()=>{if(!bi.files[0])return;person.backFile=bi.files[0];openCropModal('pvcPersonBack:'+person.id,await processUploadedFile(person.backFile));});
    card.querySelector('[data-remove]').addEventListener('click',()=>{state.pvcPeople=state.pvcPeople.filter(p=>p.id!==person.id);card.remove();renumberPeople('pvc');checkStep1ReadyStatus();checkA4ReadyStatus();});
    person.frontPreview=card.querySelector('[data-front]');person.backPreview=card.querySelector('[data-back]');
    if(person.front||person.back) updateDynamicPersonPreview(person,'pvc');
  }
  container.appendChild(card); return card;
}

function addPassportPerson(){
  if(!state.croppedCanvases.passport) return alert('Select and crop the current passport photo first.');
  const person={id:'p'+Date.now()+Math.random().toString(16).slice(2),index:state.passportPeople.length+1,qty:state.passportQty||12,canvas:state.croppedCanvases.passport,file:state.files.passport};
  state.passportPeople.push(person); renderPersonCard(person,els.passportPeopleList,'passport'); clearBaseUploadSlot('passport');
}
function addPvcPerson(){
  if(!state.croppedCanvases.front) return alert('Select and crop the current person Front first.');
  const person={id:'v'+Date.now()+Math.random().toString(16).slice(2),index:state.pvcPeople.length+1,front:state.croppedCanvases.front,back:state.croppedCanvases.back,frontFile:state.files.front,backFile:state.files.back};
  state.pvcPeople.push(person); renderPersonCard(person,els.pvcPeopleList,'pvc'); clearBaseUploadSlot('pvc');
}

function updateDynamicPersonPreview(person, type){
  if(type==='passport' && person.preview && person.canvas){person.preview.classList.remove('is-hidden'); const c=person.preview,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(person.canvas,0,0,c.width,c.height);if(person.empty)person.empty.style.display='none';}
  if(type==='pvc' && person.frontPreview && person.front){const c=person.frontPreview,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(person.front,0,0,c.width,c.height);}
  if(type==='pvc' && person.backPreview && person.back){const c=person.backPreview,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(person.back,0,0,c.width,c.height);}
}

function applyKeyboardCrop(e){
  const ce=state.cropEngine;
  if(!els.cropModalOverlay || els.cropModalOverlay.classList.contains('is-hidden')) return;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  const step=e.shiftKey||e.ctrlKey?5:3; const cb=ce.cropBox;
  if (ce.isFixedRatio) {
    const ratio = PASSPORT_CROP_RATIO;
    if (e.shiftKey) {
      let w = cb.w, h = cb.h, x = cb.x, y = cb.y;
      if (e.key === 'ArrowUp') { h += step; w = h * ratio; y -= step; }
      if (e.key === 'ArrowDown') { h += step; w = h * ratio; }
      if (e.key === 'ArrowLeft') { w += step; h = w / ratio; x -= step; }
      if (e.key === 'ArrowRight') { w += step; h = w / ratio; }
      cb.x = Math.max(0, Math.min(els.cropCanvas.width - w, x)); cb.y = Math.max(0, Math.min(els.cropCanvas.height - h, y)); cb.w=w; cb.h=h;
    } else if (e.ctrlKey) {
      let w = cb.w, h = cb.h, x = cb.x, y = cb.y;
      if (e.key === 'ArrowUp') { h=Math.max(30,h-step); w=h*ratio; y+=step; }
      if (e.key === 'ArrowDown') { h=Math.max(30,h-step); w=h*ratio; }
      if (e.key === 'ArrowLeft') { w=Math.max(30,w-step); h=w/ratio; x+=step; }
      if (e.key === 'ArrowRight') { w=Math.max(30,w-step); h=w/ratio; }
      cb.x=Math.max(0,Math.min(els.cropCanvas.width-w,x)); cb.y=Math.max(0,Math.min(els.cropCanvas.height-h,y)); cb.w=w; cb.h=h;
    } else { if(e.key==='ArrowUp')cb.y-=step; if(e.key==='ArrowDown')cb.y+=step; if(e.key==='ArrowLeft')cb.x-=step; if(e.key==='ArrowRight')cb.x+=step; }
  } else {
    if(e.shiftKey){ if(e.key==='ArrowUp') cb.y-=step,cb.h+=step; if(e.key==='ArrowDown') cb.h+=step; if(e.key==='ArrowLeft') cb.x-=step,cb.w+=step; if(e.key==='ArrowRight') cb.w+=step; }
    else if(e.ctrlKey){ if(e.key==='ArrowUp'){cb.h=Math.max(30,cb.h-step); } if(e.key==='ArrowDown'){cb.y+=step;cb.h=Math.max(30,cb.h-step);} if(e.key==='ArrowLeft'){cb.w=Math.max(30,cb.w-step);} if(e.key==='ArrowRight'){cb.x+=step;cb.w=Math.max(30,cb.w-step);} }
    else { if(e.key==='ArrowUp')cb.y-=step; if(e.key==='ArrowDown')cb.y+=step; if(e.key==='ArrowLeft')cb.x-=step; if(e.key==='ArrowRight')cb.x+=step; }
  }
  cb.x=Math.max(0,Math.min(els.cropCanvas.width-cb.w,cb.x)); cb.y=Math.max(0,Math.min(els.cropCanvas.height-cb.h,cb.y));
  renderCropCanvas();
}


function setupDropZones() {
  document.querySelectorAll('.drop-zone[data-drop-target]').forEach(zone => {
    const target = zone.dataset.dropTarget;
    ['dragenter','dragover'].forEach(type => zone.addEventListener(type, e => {
      e.preventDefault(); e.stopPropagation(); zone.classList.add('drag-over');
    }));
    ['dragleave','drop'].forEach(type => zone.addEventListener(type, e => {
      e.preventDefault(); e.stopPropagation(); zone.classList.remove('drag-over');
    }));
    zone.addEventListener('drop', async e => {
      const file = [...(e.dataTransfer?.files || [])][0];
      if (!file || !(file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) return;
      try {
        state.files[target] = file;
        const img = await processUploadedFile(file);
        openCropModal(target, img);
      } catch (_) {}
    });
  });
}

function bindEvents() {
  if (els.launchPvcBtn) els.launchPvcBtn.addEventListener('click', () => openStudio('pvc'));
  if (els.launchPassportBtn) els.launchPassportBtn.addEventListener('click', () => openStudio('passport'));

  if (els.launchAyushmanBtn && els.ayushmanFileInput) {
    els.launchAyushmanBtn.addEventListener('click', () => els.ayushmanFileInput.click());
    els.ayushmanFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleAyushmanPdfUpload(e.target.files[0]);
    });
  }

  if (els.launchPanBtn && els.panFileInput) {
    els.launchPanBtn.addEventListener('click', () => els.panFileInput.click());
    els.panFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handlePanPdfUpload(e.target.files[0]);
    });
  }

  if (els.launchAadhaarBtn && els.aadhaarFileInput) {
    els.launchAadhaarBtn.addEventListener('click', () => els.aadhaarFileInput.click());
    els.aadhaarFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleAadhaarPdfUpload(e.target.files[0]);
    });
  }

  if (els.btnBackToDashboard) els.btnBackToDashboard.addEventListener('click', goBackOneStep);

  if (els.frontFileInput) {
    els.frontFileInput.addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      state.files.front = e.target.files[0];
      const img = await processUploadedFile(state.files.front);
      openCropModal('front', img);
    });
  }

  if (els.backFileInput) {
    els.backFileInput.addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      state.files.back = e.target.files[0];
      const img = await processUploadedFile(state.files.back);
      openCropModal('back', img);
    });
  }

  if (els.passportFileInput) {
    els.passportFileInput.addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      state.files.passport = e.target.files[0];
      const img = await processUploadedFile(state.files.passport);
      openCropModal('passport', img);
    });
  }

  if (els.passportQtySelect) {
    els.passportQtySelect.addEventListener('change', (e) => {
      state.passportQty = parseInt(e.target.value, 10);
    });
  }

  if (els.btnGoToStep2) {
    els.btnGoToStep2.addEventListener('click', () => updateStepProgress(2));
  }

  if (els.replaceFrontInput) {
    els.replaceFrontInput.addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      state.files.front = e.target.files[0];
      const img = await processUploadedFile(state.files.front);
      openCropModal('front', img);
    });
  }

  if (els.replaceBackInput) {
    els.replaceBackInput.addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      state.files.back = e.target.files[0];
      const img = await processUploadedFile(state.files.back);
      openCropModal('back', img);
    });
  }

  if (els.btnUseSameImage) {
    els.btnUseSameImage.addEventListener('click', async () => {
      if (!state.files.front) {
        alert('Please upload front side image first.');
        return;
      }
      state.files.back = state.files.front;
      const img = await processUploadedFile(state.files.back);
      openCropModal('back', img);
    });
  }

  if (els.btnRecropFront) {
    els.btnRecropFront.addEventListener('click', async () => {
      if (state.files.front) {
        const img = await processUploadedFile(state.files.front);
        openCropModal('front', img);
      }
    });
  }

  if (els.btnRecropBack) {
    els.btnRecropBack.addEventListener('click', async () => {
      if (state.files.back) {
        const img = await processUploadedFile(state.files.back);
        openCropModal('back', img);
      }
    });
  }

  if (els.btnReplaceFront) {
    els.btnReplaceFront.addEventListener('click', () => {
      if (els.replaceFrontInput) els.replaceFrontInput.click();
    });
  }

  if (els.btnReplaceBack) {
    els.btnReplaceBack.addEventListener('click', () => {
      if (els.replaceBackInput) els.replaceBackInput.click();
    });
  }

  if (els.cropCanvas) {
    els.cropCanvas.addEventListener('mousedown', handlePointerDown);
    els.cropCanvas.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    els.cropCanvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    els.cropCanvas.addEventListener('touchmove', handlePointerMove, { passive: false });
    els.cropCanvas.addEventListener('touchend', handlePointerUp);
    els.cropCanvas.addEventListener('touchcancel', handlePointerUp);

    els.cropCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      zoomCropEngine(state.cropEngine.scale * zoomFactor);
    }, { passive: false });
  }

  if (els.zoomSlider) els.zoomSlider.addEventListener('input', (e) => zoomCropEngine(parseFloat(e.target.value)));
  if (els.btnZoomIn) els.btnZoomIn.addEventListener('click', () => zoomCropEngine(state.cropEngine.scale * 1.15));
  if (els.btnZoomOut) els.btnZoomOut.addEventListener('click', () => zoomCropEngine(state.cropEngine.scale * 0.85));

  const fixedRatioBtn = document.getElementById('btnPassportFixedRatio');
  const freeCropBtn = document.getElementById('btnPassportFreeCrop');
  if (fixedRatioBtn) fixedRatioBtn.addEventListener('click', () => {
    state.cropEngine.isFixedRatio = false;
    fixedRatioBtn.classList.remove('active');
    freeCropBtn?.classList.add('active');
    renderCropCanvas();
  });
  if (freeCropBtn) freeCropBtn.addEventListener('click', () => {
    state.cropEngine.isFixedRatio = false;
    fixedRatioBtn?.classList.remove('active');
    freeCropBtn.classList.add('active');
    renderCropCanvas();
  });
  if (els.btnFitImage) els.btnFitImage.addEventListener('click', resetCropEngine);
  if (els.btnResetCrop) els.btnResetCrop.addEventListener('click', resetCropEngine);
  if (els.btnCancelCrop) els.btnCancelCrop.addEventListener('click', closeCropModal);
  if (els.btnApplyCrop) els.btnApplyCrop.addEventListener('click', executeCrop);

  // Rotation Control Events
  if (els.cropRotateSlider) {
    els.cropRotateSlider.addEventListener('input', (e) => {
      const angle = parseInt(e.target.value, 10);
      state.cropEngine.rotation = angle;
      if (els.rotateDegreeBadge) els.rotateDegreeBadge.textContent = `${angle}°`;
      renderCropCanvas();
    });
  }

  if (els.btnRotateMinus) els.btnRotateMinus.addEventListener('click', () => updateRotationAngle(-1));
  if (els.btnRotatePlus) els.btnRotatePlus.addEventListener('click', () => updateRotationAngle(1));

  if (els.btnResetRotate) {
    els.btnResetRotate.addEventListener('click', () => {
      state.cropEngine.rotation = 0;
      if (els.cropRotateSlider) els.cropRotateSlider.value = 0;
      if (els.rotateDegreeBadge) els.rotateDegreeBadge.textContent = '0°';
      renderCropCanvas();
    });
  }

  if (els.btnAddPassportPerson) els.btnAddPassportPerson.addEventListener('click', addPassportPerson);
  if (els.btnAddPvcPerson) els.btnAddPvcPerson.addEventListener('click', addPvcPerson);
  window.addEventListener('keydown', applyKeyboardCrop);
  setupDropZones();

  const bindLayoutRange = (el, key) => {
    if (!el) return;
    el.addEventListener('input', () => {
      state.passportLayout[key] = parseFloat(el.value);
      updatePassportLayoutUI(true);
    });
  };
  bindLayoutRange(els.passportPhotoSize, 'photoMm');
  bindLayoutRange(els.passportGapX, 'gapXmm');
  bindLayoutRange(els.passportGapY, 'gapYmm');
  bindLayoutRange(els.passportBorder, 'borderMm');
  if (els.btnResetPassportLayout) {
    els.btnResetPassportLayout.addEventListener('click', () => {
      state.passportLayout = { photoMm: 33, gapXmm: 2, gapYmm: 8, borderMm: 0 };
      updatePassportLayoutUI(true);
    });
  }

  if (els.btnPrepareA4) els.btnPrepareA4.addEventListener('click', generateA4Layout);
  if (els.btnDownloadPNG) els.btnDownloadPNG.addEventListener('click', downloadPNG);
  if (els.btnDownloadPDF) els.btnDownloadPDF.addEventListener('click', downloadPDF);
  if (els.btnDownloadJPG) els.btnDownloadJPG.addEventListener('click', downloadJPG);
  if (els.btnPrintA4) els.btnPrintA4.addEventListener('click', printA4);

  const closeDownloadMenu = () => els.downloadMenuOverlay?.classList.add('is-hidden');
  const openDownloadMenu = () => els.downloadMenuOverlay?.classList.remove('is-hidden');
  if (els.btnDownloadMenu) els.btnDownloadMenu.addEventListener('click', openDownloadMenu);
  if (els.btnCloseDownloadMenu) els.btnCloseDownloadMenu.addEventListener('click', closeDownloadMenu);
  if (els.downloadMenuOverlay) els.downloadMenuOverlay.addEventListener('click', (e) => { if (e.target === els.downloadMenuOverlay) closeDownloadMenu(); });
  if (els.btnMenuPNG) els.btnMenuPNG.addEventListener('click', () => { closeDownloadMenu(); downloadPNG(); });
  if (els.btnMenuJPG) els.btnMenuJPG.addEventListener('click', () => { closeDownloadMenu(); downloadJPG(); });
  if (els.btnMenuPDF) els.btnMenuPDF.addEventListener('click', () => { closeDownloadMenu(); downloadPDF(); });
  if (els.btnMenuPrint) els.btnMenuPrint.addEventListener('click', () => { closeDownloadMenu(); printA4(); });
}

window.addEventListener('DOMContentLoaded', () => {
  initElements();
  bindEvents();
});