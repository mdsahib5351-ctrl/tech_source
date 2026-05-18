const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  databaseURL: "https://tech-source-bill-default-rtdb.firebaseio.com",
  projectId: "tech-source-bill",
  storageBucket: "tech-source-bill.firebasestorage.app",
  messagingSenderId: "690209240188",
  appId: "1:690209240188:web:6e54de365e7f839634c5f9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const form = document.getElementById("rtpsForm");
const profileForm = document.getElementById("profileForm");
const loginForm = document.getElementById("loginForm");
const applicationList = document.getElementById("applicationList");
const statusInput = document.getElementById("statusInput");
const statusResult = document.getElementById("statusResult");
const successDialog = document.getElementById("successDialog");
const successText = document.getElementById("successText");
const authMessage = document.getElementById("authMessage");

let currentUser = null;
let userProfile = null;
let userApplications = [];
let selectedCertificate = "";
let selectedMode = "Normal";
let latestApplication = null;
let authAction = "login";

const digitsOnly = (value) => value.replace(/\D/g, "");
const isMobile = (value) => /^[6-9]\d{9}$/.test(value);
const isAadhaar = (value) => /^\d{12}$/.test(value);
const maskAadhaar = (value) => `XXXX XXXX ${value.slice(-4)}`;
const nowDate = () => new Date().toLocaleString("en-IN");
const autoHindiTouched = new Set();
const hindiWords = {
  bihar:"बिहार", patna:"पटना", gaya:"गया", nalanda:"नालंदा", bhojpur:"भोजपुर",
  buxar:"बक्सर", rohtas:"रोहतास", arrah:"आरा", ara:"आरा", chapra:"छपरा",
  saran:"सारण", siwan:"सिवान", gopalganj:"गोपालगंज", muzaffarpur:"मुजफ्फरपुर",
  vaishali:"वैशाली", hajipur:"हाजीपुर", sitamarhi:"सीतामढ़ी", sheohar:"शिवहर",
  darbhanga:"दरभंगा", madhubani:"मधुबनी", samastipur:"समस्तीपुर", begusarai:"बेगूसराय",
  khagaria:"खगड़िया", purnea:"पूर्णिया", katihar:"कटिहार", kishanganj:"किशनगंज",
  araria:"अररिया", bhagalpur:"भागलपुर", banka:"बांका", munger:"मुंगेर",
  jamui:"जमुई", lakhisarai:"लखीसराय", nawada:"नवादा", aurangabad:"औरंगाबाद",
  jehanabad:"जहानाबाद", arwal:"अरवल", kaimur:"कैमूर", saharsa:"सहरसा",
  madhepura:"मधेपुरा", supaul:"सुपौल", bettiah:"बेतिया", motihari:"मोतिहारी",
  district:"जिला", block:"प्रखंड", village:"गांव", ward:"वार्ड", panchayat:"पंचायत",
  post:"पोस्ट", office:"ऑफिस", road:"रोड", street:"स्ट्रीट", house:"हाउस",
  kumar:"कुमार", devi:"देवी", prasad:"प्रसाद", singh:"सिंह", yadav:"यादव",
  ram:"राम", mohan:"मोहन", sohan:"सोहन", raja:"राजा", rani:"रानी",
  sita:"सीता", geeta:"गीता", gita:"गीता", sunita:"सुनीता", anita:"अनीता",
  rekha:"रेखा", puja:"पूजा", pooja:"पूजा", rahul:"राहुल", rohit:"रोहित",
  ravi:"रवि", nitish:"नीतीश", manoj:"मनोज", sanjay:"संजय", vijay:"विजय",
  ajay:"अजय", krishna:"कृष्ण", shiv:"शिव", shiva:"शिव", laxmi:"लक्ष्मी",
  student:"छात्र", farmer:"किसान", business:"व्यवसाय", hindu:"हिन्दू", muslim:"मुस्लिम"
};
const consonants = [
  ["ksh","क्ष"],["gy","ज्ञ"],["jny","ज्ञ"],["chh","छ"],["sh","श"],["kh","ख"],["gh","घ"],["ch","च"],["jh","झ"],
  ["th","थ"],["dh","ध"],["ph","फ"],["bh","भ"],["f","फ"],["q","क"],["k","क"],["g","ग"],["j","ज"],
  ["z","ज़"],["t","त"],["d","द"],["n","न"],["p","प"],["b","ब"],["m","म"],["y","य"],["r","र"],["l","ल"],
  ["v","व"],["w","व"],["s","स"],["h","ह"]
];
const vowels = [
  ["aa","ा","आ"],["ee","ी","ई"],["ii","ी","ई"],["oo","ू","ऊ"],["uu","ू","ऊ"],["ai","ै","ऐ"],["au","ौ","औ"],
  ["a","","अ"],["i","ि","इ"],["u","ु","उ"],["e","े","ए"],["o","ो","ओ"]
];

function transliterateWord(word){
  const lower = word.toLowerCase();
  if(hindiWords[lower]) return hindiWords[lower];
  let out = "";
  let i = 0;

  while(i < lower.length){
    const consonant = consonants.find(([from]) => lower.startsWith(from, i));
    if(consonant){
      out += consonant[1];
      i += consonant[0].length;
      const vowel = vowels.find(([from]) => lower.startsWith(from, i));
      if(vowel){
        out += vowel[1];
        i += vowel[0].length;
      }else if(i < lower.length && consonants.some(([from]) => lower.startsWith(from, i))){
        out += "्";
      }
      continue;
    }

    const vowel = vowels.find(([from]) => lower.startsWith(from, i));
    if(vowel){
      out += vowel[2];
      i += vowel[0].length;
      continue;
    }

    out += word[i];
    i += 1;
  }

  return out;
}

function autoHindi(value){
  return value
    .split(/(\s+|,|\.|-|\/)/)
    .map((part) => /^[a-zA-Z]+$/.test(part) ? transliterateWord(part) : part)
    .join("");
}

async function googleHindi(value){
  const clean = value.trim();
  if(!clean) return "";
  try{
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(clean)}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`;
    const response = await fetch(url);
    const data = await response.json();
    const candidates = data?.[1]?.[0]?.[1] || [];
    if(!candidates.length) return autoHindi(value);
    if(/z/i.test(clean)){
      return candidates.find((item) => /ज़|ज़/.test(item)) || candidates[0];
    }
    return candidates[0];
  }catch(error){
    return autoHindi(value);
  }
}

async function transliterateHindiField(field){
  field.value = await googleHindi(field.value);
  field.setSelectionRange(field.value.length, field.value.length);
}

function setupHindiAutoFill(){
  form.querySelectorAll("[data-hi-target]").forEach((source) => {
    const target = form.elements[source.dataset.hiTarget];
    if(!target) return;
    target.addEventListener("input", () => autoHindiTouched.add(target.name));
    target.addEventListener("keyup", async (event) => {
      if(event.key === " "){
        await transliterateHindiField(target);
      }
    });
    target.addEventListener("blur", async () => {
      await transliterateHindiField(target);
    });
    source.addEventListener("input", () => {
      if(autoHindiTouched.has(target.name)) return;
      target.value = autoHindi(source.value);
    });
  });
}

function feeFor(certificate, mode){
  if(certificate === "EWS Certificate") return mode === "Tatkal" ? 300 : 100;
  return mode === "Tatkal" ? 200 : 50;
}

function makeId(){
  return `RTPS-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
}

function showMessage(message){
  authMessage.textContent = message || "";
}

function showApp(){
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("appView").classList.remove("hidden");
  document.getElementById("mainNav").classList.remove("hidden");
  document.getElementById("welcomeText").textContent = `Welcome, ${userProfile?.name || currentUser.email}`;
  fillProfile();
  loadHistory();
  showView("home");
}

function showLogin(){
  document.getElementById("loginView").classList.remove("hidden");
  document.getElementById("appView").classList.add("hidden");
  document.getElementById("mainNav").classList.add("hidden");
}

function showView(view){
  ["home","history","profile"].forEach((name) => {
    document.getElementById(`${name}View`).classList.toggle("hidden", name !== view);
  });
  if(view === "history") loadHistory();
  if(view === "profile") fillProfile();
}

async function saveProfile(profile){
  await db.collection("rtpsUsers").doc(currentUser.uid).set({
    ...profile,
    email: currentUser.email,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
  userProfile = { ...userProfile, ...profile, email: currentUser.email };
}

async function loadProfile(){
  const snap = await db.collection("rtpsUsers").doc(currentUser.uid).get();
  if(snap.exists){
    userProfile = snap.data();
  }else{
    userProfile = {
      name: currentUser.displayName || currentUser.email.split("@")[0],
      email: currentUser.email,
      mobile: "",
      address: ""
    };
    await saveProfile(userProfile);
  }
}

function fillProfile(){
  profileForm.name.value = userProfile?.name || "";
  profileForm.mobile.value = userProfile?.mobile || "";
  profileForm.email.value = currentUser?.email || "";
  profileForm.address.value = userProfile?.address || "";
}

function prefillForm(){
  form.name.value = userProfile?.name || "";
  form.mobile.value = userProfile?.mobile || "";
  form.address.value = userProfile?.address || "";
}

function updateFee(){
  const fee = feeFor(selectedCertificate, selectedMode);
  document.getElementById("selectedTitle").textContent = selectedCertificate;
  document.getElementById("selectedMode").textContent = selectedMode;
  document.getElementById("selectedFee").textContent = `Rs. ${fee}`;
  form.certificateType.value = selectedCertificate;
  form.applyMode.value = selectedMode;
  form.fee.value = fee;
  document.querySelectorAll(".mode-switch button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === selectedMode);
  });
}

function openApplication(certificate){
  selectedCertificate = certificate;
  selectedMode = "Normal";
  document.querySelectorAll(".service-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.certificate === certificate);
  });
  document.getElementById("applyPanel").classList.remove("hidden");
  prefillForm();
  updateFee();
  document.getElementById("applyPanel").scrollIntoView({ behavior:"smooth" });
}

function collectForm(){
  return Object.fromEntries(new FormData(form).entries());
}

function validate(data){
  if(!selectedCertificate) return "Pehle certificate card select karo";
  if((data.name || "").trim().length < 3) return "Applicant name valid enter karo";
  if((data.guardian || "").trim().length < 3) return "Father/Husband name valid enter karo";
  if(!isMobile(data.mobile || "")) return "Valid 10 digit mobile number enter karo";
  if(!isAadhaar(data.aadhaar || "")) return "Valid 12 digit Aadhaar number enter karo";
  if(!data.dob) return "Date of birth select karo";
  if(!data.gender) return "Gender select karo";
  if(!data.category) return "Category select karo";
  if(!data.district || !data.block || !data.panchayat || !data.village || !data.address) return "Address details complete karo";
  if((selectedCertificate === "Income Certificate" || selectedCertificate === "EWS Certificate") && !data.income) return `${selectedCertificate} ke liye annual income enter karo`;
  if(selectedCertificate === "Caste Certificate" && !data.caste) return "Caste certificate ke liye caste/sub caste enter karo";
  if(data.pin && !/^\d{6}$/.test(data.pin)) return "PIN code 6 digit hona chahiye";
  if(!data.declaration) return "Declaration accept karo";
  return "";
}

function collectDocuments(data){
  return ["docAadhaar","docPhoto","docRation","docIncome","docCaste","docOther"]
    .filter((key) => data[key])
    .map((key) => data[key]);
}

function statusFor(application){
  return application.status || "Submitted";
}

function renderApplicationCard(application){
  const ready = statusFor(application) === "Approved";
  return `
    <article class="app-card">
      <div class="app-top">
        <div>
          <h3>${application.applicationId}</h3>
          <p>${application.certificateType} | ${application.applyMode} | Fee Rs. ${application.fee}</p>
          <p>${application.name} | Submitted: ${application.submittedAt || "-"}</p>
        </div>
        <span class="status-pill ${ready ? "ready" : ""}">${statusFor(application)}</span>
      </div>
      <div class="action-row">
        <button type="button" class="primary" data-download="${application.applicationId}">Download Receipt</button>
        <button type="button" class="secondary" data-track="${application.applicationId}">Track</button>
      </div>
    </article>
  `;
}

async function loadHistory(){
  if(!currentUser) return;
  applicationList.innerHTML = `<div class="empty">Loading history...</div>`;
  const snap = await db.collection("rtpsApplications").where("userId", "==", currentUser.uid).get();
  userApplications = snap.docs
    .map((doc) => ({ firestoreId: doc.id, ...doc.data() }))
    .sort((a, b) => String(b.createdAtMillis || 0).localeCompare(String(a.createdAtMillis || 0)));
  renderHistory();
}

function renderHistory(){
  applicationList.innerHTML = userApplications.length
    ? userApplications.map(renderApplicationCard).join("")
    : `<div class="empty">Aapki history abhi empty hai.</div>`;
}

function findApplication(id){
  return userApplications.find((item) => item.applicationId === id);
}

function showStatus(application){
  if(!application){
    statusResult.innerHTML = `<div class="status-card"><p>Application not found. ID check karo ya login account match nahi hai.</p></div>`;
    return;
  }
  statusResult.innerHTML = `
    <div class="status-card">
      <div class="app-top">
        <div>
          <h3>${application.applicationId}</h3>
          <p>${application.certificateType} | ${application.applyMode}</p>
          <p>Fee: Rs. ${application.fee}</p>
          <p>Applicant: ${application.name}</p>
          <p>Aadhaar: ${maskAadhaar(application.aadhaar)}</p>
          <p>Submitted: ${application.submittedAt || "-"}</p>
        </div>
        <span class="status-pill">${statusFor(application)}</span>
      </div>
      <p>Current update: Application received. Documents verification pending.</p>
      <button type="button" class="primary" data-download="${application.applicationId}">Download Receipt</button>
    </div>
  `;
}

function downloadPdf(application){
  if(!application) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y = 18;
  const add = (label, value) => {
    const lines = pdf.splitTextToSize(`${label}: ${value || "-"}`, 170);
    pdf.text(lines, 20, y);
    y += lines.length * 7 + 2;
    if(y > 275){ pdf.addPage(); y = 18; }
  };
  pdf.setFontSize(16);
  pdf.text("TECH SOURCE - RTPS Application Receipt", 20, y);
  y += 12;
  pdf.setFontSize(11);
  add("Application ID", application.applicationId);
  add("Certificate Type", application.certificateType);
  add("Apply Mode", application.applyMode);
  add("Fee/MRP", `Rs. ${application.fee}`);
  add("Applicant Name", application.name);
  add("Applicant Name Hindi", application.nameHi);
  add("Father/Husband Name", application.guardian);
  add("Father/Husband Name Hindi", application.guardianHi);
  add("Mother Name", application.mother);
  add("Mother Name Hindi", application.motherHi);
  add("Mobile", application.mobile);
  add("Aadhaar", maskAadhaar(application.aadhaar));
  add("DOB", application.dob);
  add("Gender", application.gender);
  add("State", application.stateName);
  add("State Hindi", application.stateNameHi);
  add("Category", application.category);
  add("Caste/Sub Caste", application.caste);
  add("Caste/Sub Caste Hindi", application.casteHi);
  add("Religion", application.religion);
  add("Annual Income", application.income);
  add("Occupation", application.occupation);
  add("District", application.district);
  add("District Hindi", application.districtHi);
  add("Subdivision", application.subdivision);
  add("Block/Circle", application.block);
  add("Block/Circle Hindi", application.blockHi);
  add("Panchayat/Ward", application.panchayat);
  add("Village/Mohalla", application.village);
  add("Village/Mohalla Hindi", application.villageHi);
  add("Post Office", application.postOffice);
  add("PIN", application.pin);
  add("Address", application.address);
  add("Address Hindi", application.addressHi);
  add("Documents", Array.isArray(application.documentList) ? application.documentList.join(", ") : "");
  add("Document Notes", application.documents);
  add("Purpose", application.purpose);
  add("Purpose Details", application.purposeDetails);
  add("Purpose Details Hindi", application.purposeDetailsHi);
  add("Status", statusFor(application));
  add("Submitted At", application.submittedAt);
  pdf.save(`${application.applicationId}.pdf`);
}

loginForm.addEventListener("click", (event) => {
  const button = event.target.closest("[data-auth]");
  if(button) authAction = button.dataset.auth;
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());
  data.mobile = digitsOnly(data.mobile || "").slice(0, 10);
  if(data.name.trim().length < 3) return showMessage("Valid name enter karo");
  if(!isMobile(data.mobile)) return showMessage("Valid mobile enter karo");
  if(!data.email) return showMessage("Email enter karo");
  if((data.password || "").length < 6) return showMessage("Password minimum 6 characters ka hona chahiye");
  if(!data.address.trim()) return showMessage("Address enter karo");

  try{
    showMessage(authAction === "register" ? "Creating account..." : "Logging in...");
    if(authAction === "register"){
      const cred = await auth.createUserWithEmailAndPassword(data.email, data.password);
      await cred.user.updateProfile({ displayName:data.name });
      currentUser = cred.user;
      await saveProfile({ name:data.name, mobile:data.mobile, address:data.address });
    }else{
      const cred = await auth.signInWithEmailAndPassword(data.email, data.password);
      currentUser = cred.user;
      await loadProfile();
      await saveProfile({ name:data.name, mobile:data.mobile, address:data.address });
    }
    showMessage("");
  }catch(error){
    showMessage(error.message);
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(profileForm).entries());
  data.mobile = digitsOnly(data.mobile || "").slice(0, 10);
  if(!isMobile(data.mobile)) return alert("Valid mobile enter karo");
  await saveProfile({ name:data.name, mobile:data.mobile, address:data.address });
  document.getElementById("welcomeText").textContent = `Welcome, ${userProfile.name}`;
  alert("Profile saved in Firebase");
});

document.getElementById("serviceGrid").addEventListener("click", (event) => {
  const card = event.target.closest("[data-certificate]");
  if(card) openApplication(card.dataset.certificate);
});

document.querySelectorAll(".mode-switch button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedMode = button.dataset.mode;
    updateFee();
  });
});

form.addEventListener("input", () => {
  form.mobile.value = digitsOnly(form.mobile.value).slice(0, 10);
  form.aadhaar.value = digitsOnly(form.aadhaar.value).slice(0, 12);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = collectForm();
  const error = validate(data);
  if(error) return alert(error);
  await saveProfile({ name:data.name, mobile:data.mobile, address:data.address });

  const application = {
    ...data,
    documentList: collectDocuments(data),
    applicationId: `RTPS-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`,
    status: "Submitted",
    submittedAt: nowDate(),
    createdAtMillis: Date.now(),
    userId: currentUser.uid,
    userEmail: currentUser.email
  };

  await db.collection("rtpsApplications").add({
    ...application,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  latestApplication = application;
  userApplications.unshift(application);
  renderHistory();
  form.reset();
  prefillForm();
  updateFee();
  successText.textContent = `${application.applicationId} Firebase me submit ho gaya. ${application.applyMode} fee Rs. ${application.fee}.`;
  successDialog.showModal();
});

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if(viewButton) showView(viewButton.dataset.view);
  const downloadButton = event.target.closest("[data-download]");
  if(downloadButton) downloadPdf(findApplication(downloadButton.dataset.download));
  const trackButton = event.target.closest("[data-track]");
  if(trackButton){
    showView("history");
    statusInput.value = trackButton.dataset.track;
    showStatus(findApplication(trackButton.dataset.track));
  }
});

document.getElementById("checkStatus").addEventListener("click", async () => {
  if(!userApplications.length) await loadHistory();
  showStatus(findApplication(statusInput.value.trim().toUpperCase()));
});
document.getElementById("clearForm").addEventListener("click", () => {
  form.reset();
  prefillForm();
  updateFee();
});
document.getElementById("closeDialog").addEventListener("click", () => successDialog.close());
document.getElementById("downloadLatest").addEventListener("click", () => downloadPdf(latestApplication));
document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());
setupHindiAutoFill();

auth.onAuthStateChanged(async (firebaseUser) => {
  currentUser = firebaseUser;
  if(firebaseUser){
    await loadProfile();
    showApp();
  }else{
    currentUser = null;
    userProfile = null;
    userApplications = [];
    showLogin();
  }
});
