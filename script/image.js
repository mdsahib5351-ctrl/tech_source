// ===== CONFIG =====
const CLOUD_NAME = "dsnuatuc8";
const UPLOAD_PRESET = "ml_default";
const API = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const HISTORY_KEY = "imgHistory";
const DARK_KEY = "imageUploaderDark";
const OCR_API = "https://api.ocr.space/parse/image";
const OCR_KEY = "helloworld";
const QR_API = "https://api.qrserver.com/v1/create-qr-code/";
const COMPRESS_MAX_SIZE = 1600;
const COMPRESS_QUALITY = 0.82;

// ===== ELEMENTS =====
const drop = document.getElementById("drop");
const fileInput = document.getElementById("file");
const preview = document.getElementById("preview");
const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewerImg");
const viewerUrl = document.getElementById("viewerUrl");
const historyBox = document.getElementById("historyBox");
const ocrPopup = document.getElementById("ocrPopup");
const ocrText = document.getElementById("ocrText");
let currentViewerUrl = "";

// ===== DROP EVENTS =====
drop.addEventListener("click", (event) => {
  if (event.target !== fileInput) fileInput.click();
});

["dragover", "dragenter"].forEach((eventName) => {
  drop.addEventListener(eventName, (event) => {
    event.preventDefault();
    drop.classList.add("hover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  drop.addEventListener(eventName, () => {
    drop.classList.remove("hover");
  });
});

drop.addEventListener("drop", (event) => {
  event.preventDefault();
  handleFiles(event.dataTransfer.files);
});

fileInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
  fileInput.value = "";
});

// ===== HANDLE FILES =====
function handleFiles(files) {
  [...files].forEach((file) => {
    if (!file.type.startsWith("image/")) {
      showToast("Only images allowed", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Max 5MB allowed", "error");
      return;
    }

    const ui = createPreview(file);
    prepareAndUpload(file, ui);
  });
}

async function prepareAndUpload(file, ui) {
  try {
    ui.status.textContent = "Compressing...";
    const compressedFile = await compressImage(file);
    if (compressedFile.size < file.size) {
      const saved = Math.round((1 - compressedFile.size / file.size) * 100);
      ui.status.textContent = `Compressed ${saved}%`;
    }
    upload(compressedFile, ui);
  } catch {
    ui.status.textContent = "Compression skipped";
    upload(file, ui);
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, COMPRESS_MAX_SIZE / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 900 * 1024) {
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Compression failed"));
          return;
        }

        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now()
        }));
      }, "image/jpeg", COMPRESS_QUALITY);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image read failed"));
    };

    img.src = objectUrl;
  });
}

// ===== CREATE PREVIEW =====
function createPreview(file) {
  const card = document.createElement("div");
  card.className = "preview-card";

  const img = document.createElement("img");
  const localUrl = URL.createObjectURL(file);
  img.src = localUrl;
  img.addEventListener("click", () => openViewer(localUrl));

  const del = document.createElement("div");
  del.className = "delete";
  del.textContent = "x";
  del.onclick = () => {
    URL.revokeObjectURL(localUrl);
    card.remove();
  };

  const progress = document.createElement("div");
  progress.className = "progress";

  const bar = document.createElement("div");
  bar.className = "bar";
  progress.appendChild(bar);

  const status = document.createElement("p");
  status.className = "upload-status";
  status.textContent = "Waiting...";

  const actions = document.createElement("div");
  actions.className = "actions";

  const copy = document.createElement("button");
  copy.textContent = "Copy";
  copy.disabled = true;

  const open = document.createElement("button");
  open.textContent = "Open";
  open.disabled = true;

  const qr = document.createElement("button");
  qr.textContent = "QR";
  qr.disabled = true;

  const ocr = document.createElement("button");
  ocr.textContent = "OCR";
  ocr.disabled = true;

  const pdf = document.createElement("button");
  pdf.textContent = "PDF";
  pdf.disabled = true;

  actions.append(copy, open, qr, ocr, pdf);
  card.append(img, del, progress, status, actions);
  preview.appendChild(card);

  return { card, img, bar, status, copy, open, qr, ocr, pdf };
}

// ===== UPLOAD =====
function upload(file, ui) {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", API);

  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;
    const percent = Math.round((event.loaded / event.total) * 100);
    ui.bar.style.width = `${percent}%`;
    ui.status.textContent = `Uploading ${percent}%`;
  };

  xhr.onload = () => {
    try {
      const response = JSON.parse(xhr.responseText);

      if (response.secure_url) {
        const url = response.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
        ui.card.classList.add("is-uploaded");
        ui.status.textContent = "Complete";
        ui.copy.disabled = false;
        ui.open.disabled = false;
        ui.img.onclick = () => openViewer(url);
        ui.copy.onclick = () => copyText(url);
        ui.open.onclick = () => openImage(url);
        ui.qr.disabled = false;
        ui.ocr.disabled = false;
        ui.pdf.disabled = false;
        ui.qr.onclick = () => showQr(url);
        ui.ocr.onclick = () => runOcr(url);
        ui.pdf.onclick = () => imageToPdf(url);
        saveHistory(url);
        showToast("Upload complete");
        return;
      }

      ui.card.classList.add("is-error");
      ui.status.textContent = "Failed";
      showToast(response.error?.message || "Upload failed", "error");
    } catch {
      ui.card.classList.add("is-error");
      ui.status.textContent = "Upload error";
      showToast("Upload error", "error");
    }
  };

  xhr.onerror = () => {
    ui.card.classList.add("is-error");
    ui.status.textContent = "Network error";
    showToast("Network error", "error");
  };

  ui.status.textContent = "Starting upload...";
  xhr.send(form);
}

// ===== HISTORY =====
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(url) {
  const history = getHistory().filter((item) => item !== url);
  history.push(url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-60)));
  loadHistory();
}

function loadHistory() {
  const history = getHistory();
  historyBox.innerHTML = "";

  if (!history.length) {
    historyBox.innerHTML = `
      <div class="empty-history">
        <i class="fa-solid fa-image"></i>
        <h3>No uploads yet</h3>
        <p>Your uploaded image links will appear here.</p>
      </div>
    `;
    return;
  }

  [...history].reverse().forEach((url) => {
    const card = document.createElement("div");
    card.className = "preview-card";

    const img = document.createElement("img");
    img.src = url;
    img.onclick = () => openViewer(url);

    const actions = document.createElement("div");
    actions.className = "actions";

    const copy = document.createElement("button");
    copy.textContent = "Copy";
    copy.onclick = () => copyText(url);

    const open = document.createElement("button");
    open.textContent = "Open";
    open.onclick = () => openImage(url);

    const qr = document.createElement("button");
    qr.textContent = "QR";
    qr.onclick = () => showQr(url);

    const ocr = document.createElement("button");
    ocr.textContent = "OCR";
    ocr.onclick = () => runOcr(url);

    const pdf = document.createElement("button");
    pdf.textContent = "PDF";
    pdf.onclick = () => imageToPdf(url);

    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.className = "danger-action";
    remove.onclick = () => deleteHistoryItem(url);

    actions.append(copy, open, qr, ocr, pdf, remove);
    card.append(img, actions);
    historyBox.appendChild(card);
  });
}

function clearHistory() {
  if (!getHistory().length) {
    showToast("History already empty");
    return;
  }

  if (!confirm("Clear all upload history?")) return;
  localStorage.removeItem(HISTORY_KEY);
  loadHistory();
  showToast("History cleared");
}

function deleteHistoryItem(url) {
  if (!confirm("Delete this image from history?")) return;
  const history = getHistory().filter((item) => item !== url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  loadHistory();
  showToast("Deleted from history");
}

// ===== VIEWER =====
function openViewer(url) {
  currentViewerUrl = url;
  viewerImg.src = url;
  viewerUrl.value = url;
  viewer.style.display = "flex";
  viewer.setAttribute("aria-hidden", "false");
}

function closeViewer() {
  viewer.style.display = "none";
  viewer.setAttribute("aria-hidden", "true");
  viewerImg.src = "";
  viewerUrl.value = "";
  currentViewerUrl = "";
}

function copyViewerUrl() {
  if (currentViewerUrl) copyText(currentViewerUrl);
}

function openViewerUrl() {
  if (currentViewerUrl) openImage(currentViewerUrl);
}

function showQr(url) {
  const qrUrl = `${QR_API}?size=320x320&data=${encodeURIComponent(url)}`;
  openViewer(qrUrl);
  viewerUrl.value = url;
  currentViewerUrl = url;
}

async function runOcr(url) {
  showToast("OCR processing...");
  const form = new FormData();
  form.append("apikey", OCR_KEY);
  form.append("url", url);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");

  try {
    const response = await fetch(OCR_API, { method: "POST", body: form });
    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      showToast(data.ErrorMessage?.[0] || "OCR failed", "error");
      return;
    }

    const text = (data.ParsedResults || [])
      .map((item) => item.ParsedText)
      .join("\n")
      .trim();

    openOcrPopup(text || "No text found.");
  } catch {
    showToast("OCR network error", "error");
  }
}

function openOcrPopup(text) {
  ocrText.value = text;
  ocrPopup.classList.remove("hidden");
  ocrPopup.setAttribute("aria-hidden", "false");
}

function closeOcrPopup() {
  ocrPopup.classList.add("hidden");
  ocrPopup.setAttribute("aria-hidden", "true");
}

function copyOcrText() {
  if (ocrText.value.trim()) copyText(ocrText.value);
}

function imageToPdf(url) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: image.width > image.height ? "landscape" : "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.92);

    pdf.addImage(imageData, "JPEG", x, y, width, height);
    pdf.save("image.pdf");
    showToast("PDF downloaded");
  };
  image.onerror = () => showToast("PDF image load failed", "error");
  image.src = url;
}

viewer.addEventListener("click", (event) => {
  if (event.target === viewer) closeViewer();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && viewer.style.display === "flex") closeViewer();
  if (event.key === "Escape" && !ocrPopup.classList.contains("hidden")) closeOcrPopup();
});

// ===== HELPERS =====
function openImage(url) {
  window.open(url, "_blank", "noopener");
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast("Copied!"))
    .catch(() => {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
      showToast("Copied!");
    });
}

// ===== DARK MODE =====
function toggleDark() {
  document.body.classList.toggle("dark");
  localStorage.setItem(DARK_KEY, document.body.classList.contains("dark") ? "1" : "0");
}

// ===== TAB SYSTEM =====
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

document.querySelectorAll(".social a").forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

document.querySelector(".newsletter")?.addEventListener("submit", (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  showToast("Thanks for subscribing!");
});

// ===== TOAST =====
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// ===== INIT =====
if (localStorage.getItem(DARK_KEY) === "1") {
  document.body.classList.add("dark");
}

loadHistory();
