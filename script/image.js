// ===== CONFIG =====
const CLOUD_NAME = "dsnuatuc8";
const UPLOAD_PRESET = "ml_default";
const API = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// ===== ELEMENTS =====
const drop = document.getElementById("drop");
const fileInput = document.getElementById("file");
const preview = document.getElementById("preview");
const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewerImg");
const historyBox = document.getElementById("historyBox");

// ===== DROP EVENTS =====
drop.addEventListener("click", () => fileInput.click());

["dragover", "dragenter"].forEach(evt => {
  drop.addEventListener(evt, e => {
    e.preventDefault();
    drop.classList.add("hover");
  });
});

["dragleave", "drop"].forEach(evt => {
  drop.addEventListener(evt, () => {
    drop.classList.remove("hover");
  });
});

drop.addEventListener("drop", e => {
  e.preventDefault();
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", e => handleFiles(e.target.files));

// ===== HANDLE FILES =====
function handleFiles(files) {
  [...files].forEach(file => {

    if (!file.type.startsWith("image/")) {
      showToast("Only images allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Max 5MB allowed");
      return;
    }

    const ui = createPreview(file);
    upload(file, ui);
  });
}

// ===== CREATE PREVIEW =====
function createPreview(file) {

  const card = document.createElement("div");
  card.className = "preview-card";

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);

  img.addEventListener("click", () => {
    viewer.style.display = "flex";
    viewerImg.src = img.src;
  });

  const del = document.createElement("div");
  del.className = "delete";
  del.innerHTML = "×";
  del.onclick = () => card.remove();

  const progress = document.createElement("div");
  progress.className = "progress";

  const bar = document.createElement("div");
  bar.className = "bar";
  progress.appendChild(bar);

  const actions = document.createElement("div");
  actions.className = "actions";

  const copy = document.createElement("button");
  copy.textContent = "Copy";

  const download = document.createElement("button");
  download.textContent = "DL";

  actions.append(copy, download);

  card.append(img, del, progress, actions);
  preview.appendChild(card);

  return { bar, copy, download };
}

// ===== UPLOAD =====
function upload(file, ui) {

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", API);

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      ui.bar.style.width = (e.loaded / e.total * 100) + "%";
    }
  };

  xhr.onload = () => {
    try {
      const res = JSON.parse(xhr.responseText);

      if (res.secure_url) {

        const url = res.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");

        ui.copy.onclick = () => {
          navigator.clipboard.writeText(url);
          showToast("Copied!");
        };

        ui.download.onclick = () => window.open(url);

        saveHistory(url);

      } else {
        showToast(res.error?.message || "Upload failed");
      }

    } catch {
      showToast("Upload error");
    }
  };

  xhr.onerror = () => showToast("Network error");

  xhr.send(form);
}

// ===== HISTORY =====
function saveHistory(url) {
  const hist = JSON.parse(localStorage.getItem("imgHistory") || "[]");
  hist.push(url);
  localStorage.setItem("imgHistory", JSON.stringify(hist));
  loadHistory();
}

function loadHistory() {
  const hist = JSON.parse(localStorage.getItem("imgHistory") || "[]");
  historyBox.innerHTML = "";

  [...hist].reverse().forEach(url => {

    const card = document.createElement("div");
    card.className = "preview-card";

    const img = document.createElement("img");
    img.src = url;

    img.onclick = () => {
      viewer.style.display = "flex";
      viewerImg.src = url;
    };

    card.appendChild(img);
    historyBox.appendChild(card);
  });
}

function clearHistory() {
  localStorage.removeItem("imgHistory");
  loadHistory();
}

// ===== DARK MODE =====
function toggleDark() {
  document.body.classList.toggle("dark");
}

// ===== TAB SYSTEM (NEW) =====
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // active button
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // show tab
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ===== VIEWER CLOSE =====
viewer.addEventListener("click", () => {
  viewer.style.display = "none";
});

// ===== TOAST =====
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;

  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ===== INIT =====
loadHistory();
