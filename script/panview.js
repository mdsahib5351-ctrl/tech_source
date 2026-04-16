const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  databaseURL: "https://tech-source-bill-default-rtdb.firebaseio.com",
  projectId: "tech-source-bill",
  storageBucket: "tech-source-bill.firebasestorage.app",
  messagingSenderId: "690209240188",
  appId: "1:690209240188:web:6e54de365e7f839634c5f9"
};

// init firebase safely
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const container = document.getElementById("data");

if (!id) {
  container.innerHTML = "<p>Invalid ID</p>";
} else {

  db.collection("applications").doc(id)
    .onSnapshot(doc => {

      if (!doc.exists) {
        container.innerHTML = "<p>No application found</p>";
        return;
      }

      const d = doc.data();

      container.innerHTML = `
<div class="section">

  <div class="row"><span>Ack No</span><p onclick="copyText(this)">${d.ackNo || ""}</p></div>
  <div class="row"><span>Name</span><p onclick="copyText(this)">${d.name || ""}</p></div>
  <div class="row"><span>Name (Aadhaar)</span><p onclick="copyText(this)">${d.nameAadhar || ""}</p></div>
  <div class="row"><span>Gender</span><p onclick="copyText(this)">${d.gender || ""}</p></div>
  <div class="row"><span>DOB</span><p onclick="copyText(this)">${d.dob || ""}</p></div>
  <div class="row"><span>Phone</span><p onclick="copyText(this)">${d.phone || ""}</p></div>
  <div class="row"><span>Email</span><p onclick="copyText(this)">${d.email || ""}</p></div>
  <div class="row"><span>Father Name</span><p onclick="copyText(this)">${d.father || ""}</p></div>

  <h3>Address</h3>

  <div class="row"><span>Flat</span><p onclick="copyText(this)">${d.flatNo || ""}</p></div>
  <div class="row"><span>Village</span><p onclick="copyText(this)">${d.villageCity || ""}</p></div>
  <div class="row"><span>Post Office</span><p onclick="copyText(this)">${d.postOffice || ""}</p></div>
  <div class="row"><span>Sub Division</span><p onclick="copyText(this)">${d.subDivision || ""}</p></div>
  <div class="row"><span>District</span><p onclick="copyText(this)">${d.district || ""}</p></div>
  <div class="row"><span>State</span><p onclick="copyText(this)">${d.state || ""}</p></div>
  <div class="row"><span>PIN</span><p onclick="copyText(this)">${d.pinCode || ""}</p></div>

  <hr>

  <div class="row">
    <span>Application Status</span>
    <p style="color:${d.status==='approved'?'green':'orange'}; font-weight:bold;">
      ${d.status || "Pending"}
    </p>
  </div>

<div class="row">
  <span>Payment Status</span>
  <p style="color:${(d.paymentStatus || '').toLowerCase()==='paid'?'green':'red'}; font-weight:bold;">
    ${d.paymentStatus || "Unpaid"}
  </p>
</div>

  ${d.txnId ? `
    <div class="row">
      <span>Txn ID</span>
      <p onclick="copyText(this)">${d.txnId}</p>
    </div>
  ` : ""}

  ${d.paymentScreenshot ? `
    <div style="text-align:center; margin-top:10px;">
      <img src="${d.paymentScreenshot}" width="200" style="border-radius:10px; box-shadow:0 3px 10px rgba(0,0,0,0.2);"/>
    </div>
  ` : ""}

</div>
        <div class="section">
          <h3>Documents</h3>

          ${imgBox(d.photo, "Photo")}
          ${imgBox(d.signature, "Signature")}
          ${imgBox(d.aadhaarFront, "Aadhaar Front")}
          ${imgBox(d.aadhaarBack, "Aadhaar Back")}
          ${imgBox(d.dobProof, "DOB Proof")}

          ${d.isMinor ? `
            <h3>Guardian Documents</h3>
            ${imgBox(d.guardianFront, "Guardian Aadhaar Front")}
            ${imgBox(d.guardianBack, "Guardian Aadhaar Back")}
          ` : ""}
        </div>
      `;
    });
}


// ==========================
// IMAGE BOX (SMART RULE)
// ==========================
function imgBox(url, name) {
  if (!url) return `<p>${name}: Not uploaded</p>`;

  // JPG for photo & signature
  if (name === "Photo" || name === "Signature") {
    return `
      <div class="doc-box">
        <img src="${url}" alt="${name}">
        <br>
        <button class="download-btn" onclick="downloadJPG('${url}', '${name}')">
          Download ${name} JPG
        </button>
      </div>
    `;
  }

  // PDF for others
  return `
    <div class="doc-box">
      <img src="${url}" alt="${name}">
      <br>
      <button class="download-btn" onclick="downloadPDF('${url}', '${name}')">
        Download ${name} PDF
      </button>
    </div>
  `;
}


// ==========================
// JPG DOWNLOAD
// ==========================
function downloadJPG(url, name) {
  if (!url) return alert(name + " not available");

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = function () {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const link = document.createElement("a");
    link.download = name + ".jpg";
    link.href = canvas.toDataURL("image/jpeg");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  img.src = url;
}


// ==========================
// PDF DOWNLOAD (jsPDF)
// ==========================
async function downloadPDF(url, name) {
  if (!url) return alert(name + " not available");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const img = await fetch(url)
    .then(res => res.blob())
    .then(blob => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }));

  pdf.addImage(img, "JPEG", 10, 10, 180, 250);
  pdf.save(name + ".pdf");
}

function copyText(el) {
  const text = el.innerText;

  navigator.clipboard.writeText(text).then(() => {

    // small highlight
    el.style.background = "#d4edda";
    el.style.padding = "2px 5px";
    el.style.borderRadius = "4px";

    // toast message
    showToast("Copied ✔");

    setTimeout(() => {
      el.style.background = "";
    }, 800);
  });
}
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 1000);
}
