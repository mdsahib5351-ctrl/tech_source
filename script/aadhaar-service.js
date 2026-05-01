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
const db = firebase.firestore();
const auth = firebase.auth();

const CLOUD_NAME = "dsnuatuc8";
const UPLOAD_PRESET = "ml_default";
const CLOUDINARY_API = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_RESCHEDULE_COUNT = 2;

const $ = (id) => document.getElementById(id);
const digitsOnly = (value) => value.replace(/\D/g, "");
const isTenDigitMobile = (value) => /^[6-9]\d{9}$/.test(value);
const isAadhaar = (value) => /^\d{12}$/.test(value);
const todayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const maxAppointmentISO = () => {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const maskAadhaar = (value) => value ? `XXXX XXXX ${value.slice(-4)}` : "";
const maskMobile = (value) => value ? `${value.slice(0,2)}XXXXXX${value.slice(-2)}` : "";

const state = {
  currentUser: null,
  userProfile: {},
  selectedService: "",
  appointmentData: {},
  rescheduleAppointments: [],
  submitting: false,
  draftLoaded: false
};

let draftSaveTimer = null;

const draftFieldIds = [
  "name", "mobile", "aadhaar", "newAddress", "withoutDocNote", "relationType",
  "coName", "coAddress", "oldMobile", "newMobile", "docType", "docAddress",
  "appointmentDate", "appointmentTime"
];

const els = {
  authPage: $("authPage"),
  appPage: $("appPage"),
  loginTab: $("loginTab"),
  registerTab: $("registerTab"),
  loginForm: $("loginForm"),
  registerForm: $("registerForm"),
  authMessage: $("authMessage"),
  profileBox: $("profileBox"),
  guestBadge: $("guestBadge"),
  profileInitial: $("profileInitial"),
  profileName: $("profileName"),
  profileEmail: $("profileEmail"),
  profilePage: $("profilePage"),
  profilePageName: $("profilePageName"),
  profilePageEmail: $("profilePageEmail"),
  profilePageMobile: $("profilePageMobile"),
  profilePageInitial: $("profilePageInitial"),
  profileHeroName: $("profileHeroName"),
  profileHeroEmail: $("profileHeroEmail"),
  homePage: $("homePage"),
  bookPage: $("bookPage"),
  trackPage: $("trackPage"),
  historyPage: $("historyPage"),
  historyList: $("historyList"),
  reschedulePage: $("reschedulePage"),
  step1: $("step1"),
  step2: $("step2"),
  step3: $("step3"),
  step4: $("step4"),
  s1: $("s1"),
  s2: $("s2"),
  s3: $("s3"),
  s4: $("s4"),
  nameInput: $("name"),
  mobileInput: $("mobile"),
  aadhaarInput: $("aadhaar"),
  serviceOptions: $("serviceOptions"),
  selectedServiceText: $("selectedServiceText"),
  withoutDocSection: $("withoutDocSection"),
  coSection: $("coSection"),
  mobileUpdateSection: $("mobileUpdateSection"),
  docSection: $("docSection"),
  appointmentDate: $("appointmentDate"),
  appointmentTime: $("appointmentTime"),
  timeSlots: $("timeSlots"),
  newAddress: $("newAddress"),
  withoutDocNote: $("withoutDocNote"),
  relationType: $("relationType"),
  coName: $("coName"),
  coAddress: $("coAddress"),
  oldMobile: $("oldMobile"),
  newMobile: $("newMobile"),
  docType: $("docType"),
  documentFile: $("documentFile"),
  docAddress: $("docAddress"),
  reviewBox: $("reviewBox"),
  finalId: $("finalId"),
  submitBtn: $("submitBtn"),
  trackId: $("trackId"),
  trackResult: $("trackResult"),
  resOwnAppointments: $("resOwnAppointments"),
  resId: $("resId"),
  resDate: $("resDate"),
  resTime: $("resTime"),
  resTimeSlots: $("resTimeSlots"),
  resReason: $("resReason"),
  resResult: $("resResult"),
  resSelectedPreview: $("resSelectedPreview"),
  rescheduleConfirmPopup: $("rescheduleConfirmPopup"),
  resConfirmDetails: $("resConfirmDetails")
};

const slotList = [
  "10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM",
  "12:30 PM","02:00 PM","02:30 PM","03:00 PM","03:30 PM"
];

els.appointmentDate.min = todayISO();
els.appointmentDate.max = maxAppointmentISO();
els.resDate.min = todayISO();
els.resDate.max = maxAppointmentISO();

[els.mobileInput, els.aadhaarInput, els.oldMobile, els.newMobile, $("registerMobile")].forEach(input => {
  input.addEventListener("input", () => {
    input.value = digitsOnly(input.value).slice(0, Number(input.maxLength) || 12);
  });
});

document.querySelectorAll("#bookPage input, #bookPage select, #bookPage textarea").forEach(field => {
  if(field.type === "file"){
    field.addEventListener("change", () => showToast("Document selected. Files are not saved in draft."));
    return;
  }

  field.addEventListener("input", scheduleDraftSave);
  field.addEventListener("change", scheduleDraftSave);
});

function showMessage(target, message, type = "warn"){
  target.innerHTML = "";
  const div = document.createElement("div");
  div.className = `status ${type}`;
  div.textContent = message;
  target.appendChild(div);
}

function showToast(message, type = "success"){
  let stack = $("toastStack");

  if(!stack){
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);

  setTimeout(() => toast.classList.add("is-visible"), 20);
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function getDraftKey(){
  const owner = state.currentUser?.uid || state.currentUser?.email || "guest";
  return `aadhaarAppointmentDraft:${owner}`;
}

function collectDraftData(){
  const values = {};
  draftFieldIds.forEach(id => {
    const field = $(id);
    if(field) values[id] = field.value;
  });

  return {
    values,
    selectedService: state.selectedService,
    savedAt: Date.now()
  };
}

function saveDraft(silent = true){
  if(!state.currentUser) return;
  localStorage.setItem(getDraftKey(), JSON.stringify(collectDraftData()));
  if(!silent) showToast("Draft saved");
}

function scheduleDraftSave(){
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => saveDraft(true), 500);
}

function clearDraft(){
  if(!state.currentUser) return;
  localStorage.removeItem(getDraftKey());
  state.draftLoaded = false;
}

function loadDraft(){
  if(!state.currentUser || state.draftLoaded) return false;
  const raw = localStorage.getItem(getDraftKey());
  if(!raw) return false;

  try{
    const draft = JSON.parse(raw);
    Object.entries(draft.values || {}).forEach(([id, value]) => {
      const field = $(id);
      if(field && field.type !== "file") field.value = value || "";
    });

    state.selectedService = draft.selectedService || "";
    if(state.selectedService){
      const option = Array.from(document.querySelectorAll(".opt"))
        .find(opt => opt.textContent.trim() === state.selectedService);
      if(option) option.classList.add("active");
      showServices();
    }

    state.draftLoaded = true;
    showToast("Saved draft restored");
    return true;
  }catch(error){
    localStorage.removeItem(getDraftKey());
    return false;
  }
}

function addReviewRow(container, label, value){
  const p = document.createElement("p");
  const b = document.createElement("b");
  b.textContent = `${label}: `;
  p.appendChild(b);
  p.appendChild(document.createTextNode(value || "-"));
  container.appendChild(p);
}

function copyAppointmentId(id){
  if(!id) return;
  navigator.clipboard.writeText(id)
    .then(() => showToast("Appointment ID copied"))
    .catch(() => prompt("Copy Appointment ID:", id));
}

function generateAppointmentId(){
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString().slice(-4);
  return `TS-${Date.now().toString().slice(-6)}${random}`;
}

function validateFile(file){
  if(!file) return "Document upload karo";
  const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
  if(!allowed) return "Sirf image ya PDF upload karo";
  if(file.size > MAX_FILE_SIZE) return "Document 10 MB se chhota hona chahiye";
  return "";
}

async function uploadToCloudinary(file){
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_API, { method:"POST", body:formData });
  const data = await res.json().catch(() => ({}));

  if(!res.ok){
    throw new Error(data.error?.message || "Cloudinary upload failed. Upload preset check karo.");
  }

  return data.secure_url;
}

function requireLogin(){
  if(state.currentUser) return true;
  window.location.href = "login.html?next=aadhaar-service.html";
  return false;
}

function showLoggedOut(){
  window.location.href = "login.html?next=aadhaar-service.html";
}

async function showLoggedIn(user){
  state.currentUser = user;
  const profileSnap = await db.collection("users").doc(user.uid).get().catch(() => null);
  if(profileSnap && profileSnap.exists){
    state.userProfile = profileSnap.data();
  }else{
    state.userProfile = {
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      phone: "",
      mobile: "",
      city: "",
      address: "",
      photoUrl: user.photoURL || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.collection("users").doc(user.uid).set(state.userProfile, { merge:true });
  }

  const displayName = state.userProfile.name || user.displayName || user.email.split("@")[0];
  const mobile = state.userProfile.mobile || state.userProfile.phone || "";

  els.profileInitial.textContent = displayName.trim().charAt(0).toUpperCase() || "U";
  els.profileName.textContent = displayName;
  els.profileEmail.textContent = user.email;
  els.profilePageName.textContent = displayName;
  els.profilePageEmail.textContent = user.email;
  els.profilePageMobile.textContent = mobile || "-";
  els.profilePageInitial.textContent = displayName.trim().charAt(0).toUpperCase() || "U";
  els.profileHeroName.textContent = displayName;
  els.profileHeroEmail.textContent = user.email;
  els.nameInput.value = displayName;
  els.mobileInput.value = mobile;

  els.authPage.classList.add("hidden");
  els.appPage.classList.remove("hidden");
  els.profileBox.classList.remove("hidden");
  els.guestBadge.classList.add("hidden");
  goHome();
}

window.showAuthMode = function(mode){
  const isLogin = mode === "login";
  els.loginTab.classList.toggle("active", isLogin);
  els.registerTab.classList.toggle("active", !isLogin);
  els.loginForm.classList.toggle("hidden", !isLogin);
  els.registerForm.classList.toggle("hidden", isLogin);
  els.authMessage.innerHTML = "";
};

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if(!email || !password) return showMessage(els.authMessage, "Email aur password enter karo", "warn");

  try{
    showMessage(els.authMessage, "Logging in...", "warn");
    await auth.signInWithEmailAndPassword(email, password);
    els.loginForm.reset();
  }catch(error){
    showMessage(els.authMessage, error.message, "error");
  }
});

els.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = $("registerName").value.trim();
  const mobile = $("registerMobile").value.trim();
  const email = $("registerEmail").value.trim();
  const password = $("registerPassword").value;

  if(name.length < 3) return showMessage(els.authMessage, "Valid full name enter karo", "warn");
  if(!isTenDigitMobile(mobile)) return showMessage(els.authMessage, "Valid 10 digit mobile enter karo", "warn");
  if(!email) return showMessage(els.authMessage, "Email enter karo", "warn");
  if(password.length < 6) return showMessage(els.authMessage, "Password minimum 6 characters ka hona chahiye", "warn");

  try{
    showMessage(els.authMessage, "Creating account...", "warn");
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName:name });
    await db.collection("users").doc(cred.user.uid).set({
      name,
      mobile,
      phone: mobile,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    els.registerForm.reset();
  }catch(error){
    showMessage(els.authMessage, error.message, "error");
  }
});

window.logoutUser = async function(){
  await auth.signOut();
};

window.openProfile = function(){
  if(!requireLogin()) return;
  hideAll();
  els.profilePage.classList.remove("hidden");
};

auth.onAuthStateChanged((user) => {
  if(user) showLoggedIn(user);
  else showLoggedOut();
});

function getServiceExtraData(){
  if(state.selectedService === "Address Without Documents"){
    if(!els.newAddress.value.trim()) return { error:"New address enter karo" };
    return {
      data:{ newAddress: els.newAddress.value.trim(), note: els.withoutDocNote.value.trim() },
      rows:[["New Address", els.newAddress.value.trim()], ["Note", els.withoutDocNote.value.trim() || "-"]]
    };
  }

  if(state.selectedService === "C/O Update"){
    if(!els.relationType.value) return { error:"Relation select karo" };
    if(!els.coName.value.trim()) return { error:"C/O name enter karo" };
    return {
      data:{ relationType: els.relationType.value, coName: els.coName.value.trim(), coAddress: els.coAddress.value.trim() },
      rows:[["Relation", els.relationType.value], ["C/O Name", els.coName.value.trim()], ["Address", els.coAddress.value.trim() || "-"]]
    };
  }

  if(state.selectedService === "Mobile Number Update"){
    if(!isTenDigitMobile(els.oldMobile.value.trim())) return { error:"Old mobile valid enter karo" };
    if(!isTenDigitMobile(els.newMobile.value.trim())) return { error:"New mobile valid enter karo" };
    if(els.oldMobile.value.trim() === els.newMobile.value.trim()) return { error:"New mobile old mobile se different hona chahiye" };
    return {
      data:{ oldMobile: els.oldMobile.value.trim(), newMobile: els.newMobile.value.trim() },
      rows:[["Old Mobile", maskMobile(els.oldMobile.value.trim())], ["New Mobile", maskMobile(els.newMobile.value.trim())]]
    };
  }

  const fileError = validateFile(els.documentFile.files[0]);
  if(!els.docType.value) return { error:"Document type select karo" };
  if(fileError) return { error:fileError };
  if(!els.docAddress.value.trim()) return { error:"New address enter karo" };

  return {
    data:{ docType: els.docType.value, fileName: els.documentFile.files[0].name, docAddress: els.docAddress.value.trim() },
    rows:[["Document Type", els.docType.value], ["Uploaded File", els.documentFile.files[0].name], ["New Address", els.docAddress.value.trim()]]
  };
}

function renderReview(rows){
  els.reviewBox.innerHTML = "";
  rows.forEach(([label,value]) => addReviewRow(els.reviewBox, label, value));
}

function getAppointmentTimeline(data){
  const status = String(data.status || "Pending").toLowerCase();
  const submitted = true;
  const rescheduled = status === "rescheduled";
  const completed = status === "completed" || status === "approved";
  const rejected = status === "rejected" || status === "cancelled";

  return [
    { label:"Submitted", state:submitted ? "done" : "pending" },
    { label:rescheduled ? "Rescheduled" : "Scheduled", state:rescheduled || submitted ? "done" : "pending" },
    { label:"Under Review", state:completed || rejected ? "done" : "active" },
    {
      label:rejected ? "Rejected" : completed ? "Completed" : "Final Status",
      state:rejected ? "rejected" : completed ? "done" : "pending"
    }
  ];
}

function renderAppointmentCard(data, options = {}){
  const box = document.createElement("div");
  box.className = "appointment-card";
  const timeline = getAppointmentTimeline(data).map(step => `
    <div class="timeline-step ${step.state}">
      <span></span>
      <strong>${step.label}</strong>
    </div>
  `).join("");

  box.innerHTML = `
    <div class="appointment-card-head">
      <div>
        <span class="mini-label">Appointment ID</span>
        <h3>${data.appointmentId || "-"}</h3>
        <p>${data.service || "Aadhaar Service"}</p>
      </div>
      <span class="status-pill">${data.status || "Pending"}</span>
    </div>
    <div class="appointment-timeline">${timeline}</div>
    <div class="appointment-details">
      <div><small>Name</small><strong>${data.name || "-"}</strong></div>
      <div><small>Date</small><strong>${data.appointmentDate || "-"}</strong></div>
      <div><small>Time</small><strong>${data.appointmentTime || "-"}</strong></div>
      <div><small>Aadhaar</small><strong>${data.aadhaarMasked || maskAadhaar(data.aadhaar || "")}</strong></div>
      <div><small>Reschedules</small><strong>${data.rescheduleCount || 0}/${MAX_RESCHEDULE_COUNT}</strong></div>
    </div>
  `;

  if(data.rescheduleReason){
    const reason = document.createElement("div");
    reason.className = "reason-note";
    const label = document.createElement("small");
    const value = document.createElement("strong");
    label.textContent = "Reschedule Reason";
    value.textContent = data.rescheduleReason;
    reason.append(label, value);
    box.appendChild(reason);
  }

  const actionRow = document.createElement("div");
  actionRow.className = "inline-actions card-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "secondary mini-action";
  copyBtn.textContent = "Copy ID";
  copyBtn.onclick = () => copyAppointmentId(data.appointmentId || "");

  const receiptBtn = document.createElement("button");
  receiptBtn.type = "button";
  receiptBtn.className = "mini-action";
  receiptBtn.textContent = "Receipt";
  receiptBtn.onclick = () => downloadAppointmentReceipt(data);

  actionRow.append(copyBtn, receiptBtn);

  if(options.showReschedule){
    const rescheduleBtn = document.createElement("button");
    rescheduleBtn.type = "button";
    rescheduleBtn.className = "mini-action";
    rescheduleBtn.textContent = "Reschedule";
    rescheduleBtn.onclick = () => openReschedule(data.appointmentId || "");
    actionRow.appendChild(rescheduleBtn);
  }

  box.appendChild(actionRow);

  if(data.documentUrl){
    const actions = document.createElement("div");
    actions.className = "inline-actions";
    const link = document.createElement("a");
    link.className = "doc-link";
    link.href = data.documentUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open Document";
    actions.appendChild(link);
    box.appendChild(actions);
  }

  return box;
}

async function getAvailabilityRule(selectedDate){
  if(!selectedDate) return {};
  try{
    const doc = await db.collection("aadhaarAvailability").doc(selectedDate).get();
    return doc.exists ? doc.data() : {};
  }catch(error){
    console.warn("Availability rule load failed", error);
    return {};
  }
}

async function renderSlots(container, hiddenInput, selectedDate){
  hiddenInput.value = "";
  container.innerHTML = "";

  if(!selectedDate){
    container.innerHTML = `<p style="grid-column:1/-1;color:#777;">Please select date first</p>`;
    return;
  }

  container.innerHTML = `<p style="grid-column:1/-1;color:#777;">Checking availability...</p>`;

  const availability = await getAvailabilityRule(selectedDate);
  const blockedSlots = Array.isArray(availability.blockedSlots) ? availability.blockedSlots : [];

  if(availability.holiday){
    container.innerHTML = `<p style="grid-column:1/-1;color:#c62828;">Is date par holiday hai. ${availability.note || "Please another date select karo."}</p>`;
    return;
  }

  container.innerHTML = "";

  const isToday = selectedDate === todayISO();
  const now = new Date();

  slotList.forEach(slot => {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "time-slot";
    div.textContent = slot;

    const disabled = (isToday && isSlotPassed(slot, now)) || blockedSlots.includes(slot);
    if(disabled){
      div.classList.add("disabled");
      div.disabled = true;
      div.title = blockedSlots.includes(slot) ? "Admin unavailable for this slot" : "This slot has already passed";
    }

    div.onclick = () => {
      container.querySelectorAll(".time-slot").forEach(s => s.classList.remove("active"));
      div.classList.add("active");
      hiddenInput.value = slot;
    };

    container.appendChild(div);
  });

  if(!container.querySelector(".time-slot:not(.disabled)")){
    container.innerHTML = `<p style="grid-column:1/-1;color:#777;">Is date par koi slot available nahi hai. Please another date select karo.</p>`;
  }
}

function isSlotPassed(slot, now){
  const [time, meridiem] = slot.split(" ");
  const [hourRaw, minuteRaw] = time.split(":").map(Number);
  let hour = hourRaw;
  if(meridiem === "PM" && hour !== 12) hour += 12;
  if(meridiem === "AM" && hour === 12) hour = 0;
  const slotDate = new Date(now);
  slotDate.setHours(hour, minuteRaw, 0, 0);
  return slotDate <= now;
}

function resetBookingForm(){
  if(state.draftLoaded) return;

  state.selectedService = "";
  state.appointmentData = {};
  [
    els.aadhaarInput,els.newAddress,els.withoutDocNote,els.coName,els.coAddress,
    els.oldMobile,els.newMobile,els.docAddress
  ].forEach(input => input.value = "");
  els.nameInput.value = state.userProfile.name || state.currentUser?.displayName || "";
  els.mobileInput.value = state.userProfile.mobile || "";
  els.relationType.value = "";
  els.docType.value = "";
  els.documentFile.value = "";
  els.appointmentDate.value = "";
  els.appointmentTime.value = "";
  els.serviceOptions.classList.add("hidden");
  document.querySelectorAll(".opt").forEach(o => o.classList.remove("active"));
  renderSlots(els.timeSlots, els.appointmentTime, "");
}

window.handleCardKey = function(event, fn){
  if(event.key === "Enter" || event.key === " "){
    event.preventDefault();
    fn();
  }
};

window.handleServiceKey = function(event, el, service){
  if(event.key === "Enter" || event.key === " "){
    event.preventDefault();
    selectService(el, service);
  }
};

window.hideAll = function(){
  els.homePage.classList.add("hidden");
  els.profilePage.classList.add("hidden");
  els.bookPage.classList.add("hidden");
  els.trackPage.classList.add("hidden");
  els.historyPage.classList.add("hidden");
  els.reschedulePage.classList.add("hidden");
};

window.goHome = function(){
  if(!requireLogin()) return;
  hideAll();
  els.homePage.classList.remove("hidden");
};

window.openBook = function(){
  if(!requireLogin()) return;
  hideAll();
  resetBookingForm();
  els.bookPage.classList.remove("hidden");
  loadDraft();
  showOnlyStep(1);
};

window.openTrack = function(){
  if(!requireLogin()) return;
  hideAll();
  els.trackResult.innerHTML = "";
  els.trackPage.classList.remove("hidden");
};

window.openHistory = function(){
  if(!requireLogin()) return;
  hideAll();
  els.historyPage.classList.remove("hidden");
  loadAppointmentHistory();
};

window.openReschedule = function(appointmentId = ""){
  if(!requireLogin()) return;
  hideAll();
  els.resResult.innerHTML = "";
  els.resId.value = "";
  els.resDate.value = "";
  els.resTime.value = "";
  els.resReason.value = "";
  els.resSelectedPreview.innerHTML = "";
  els.resSelectedPreview.classList.add("hidden");
  renderSlots(els.resTimeSlots, els.resTime, els.resDate.value);
  els.reschedulePage.classList.remove("hidden");
  loadUserAppointmentsForReschedule(appointmentId);
};

window.showOnlyStep = function(n){
  [els.step1, els.step2, els.step3, els.step4].forEach(step => step.classList.add("hidden"));
  [els.s1, els.s2, els.s3, els.s4].forEach(step => step.className = "step");

  if(n === 1){ els.step1.classList.remove("hidden"); els.s1.classList.add("active"); }
  if(n === 2){ els.step2.classList.remove("hidden"); els.s1.classList.add("done"); els.s2.classList.add("active"); }
  if(n === 3){ els.step3.classList.remove("hidden"); els.s1.classList.add("done"); els.s2.classList.add("done"); els.s3.classList.add("active"); }
  if(n === 4){ els.step4.classList.remove("hidden"); els.s1.classList.add("done"); els.s2.classList.add("done"); els.s3.classList.add("done"); els.s4.classList.add("active"); }
};

window.showServices = function(){
  els.aadhaarInput.value = digitsOnly(els.aadhaarInput.value).slice(0, 12);
  if(isAadhaar(els.aadhaarInput.value.trim())){
    els.serviceOptions.classList.remove("hidden");
  }else{
    els.serviceOptions.classList.add("hidden");
    state.selectedService = "";
    document.querySelectorAll(".opt").forEach(o => o.classList.remove("active"));
  }
};

window.selectService = function(el, service){
  document.querySelectorAll(".opt").forEach(o => o.classList.remove("active"));
  el.classList.add("active");
  state.selectedService = service;
  scheduleDraftSave();
};

window.goStep2 = function(){
  const name = els.nameInput.value.trim();
  const mobile = els.mobileInput.value.trim();
  const aadhaar = els.aadhaarInput.value.trim();

  if(name.length < 3) return showToast("Valid full name enter karo", "error");
  if(!isTenDigitMobile(mobile)) return showToast("Valid 10 digit Indian mobile number enter karo", "error");
  if(!isAadhaar(aadhaar)) return showToast("Valid 12 digit Aadhaar number enter karo", "error");
  if(!state.selectedService) return showToast("Service select karo", "error");

  els.selectedServiceText.textContent = state.selectedService;
  [els.withoutDocSection, els.coSection, els.mobileUpdateSection, els.docSection].forEach(section => section.classList.add("hidden"));

  if(state.selectedService === "Address Without Documents") els.withoutDocSection.classList.remove("hidden");
  else if(state.selectedService === "C/O Update") els.coSection.classList.remove("hidden");
  else if(state.selectedService === "Mobile Number Update") els.mobileUpdateSection.classList.remove("hidden");
  else els.docSection.classList.remove("hidden");

  showOnlyStep(2);
  saveDraft(true);
};

window.backStep1 = function(){ showOnlyStep(1); };
window.backStep2 = function(){ showOnlyStep(2); };

window.goReview = function(){
  if(!els.appointmentDate.value) return showToast("Appointment date select karo", "error");
  if(els.appointmentDate.value < todayISO()) return showToast("Past date allowed nahi hai", "error");
  if(els.appointmentDate.value > maxAppointmentISO()) return showToast("Appointment maximum 15 din ke andar book ho sakta hai", "error");
  if(!els.appointmentTime.value) return showToast("Appointment time select karo", "error");

  const extra = getServiceExtraData();
  if(extra.error) return showToast(extra.error, "error");

  state.appointmentData = {
    appointmentId: generateAppointmentId(),
    userId: state.currentUser.uid,
    userEmail: state.currentUser.email,
    name: els.nameInput.value.trim(),
    mobile: els.mobileInput.value.trim(),
    aadhaar: els.aadhaarInput.value.trim(),
    service: state.selectedService,
    appointmentDate: els.appointmentDate.value,
    appointmentTime: els.appointmentTime.value,
    status: "Pending",
    documentUrl: "",
    ...extra.data
  };

  renderReview([
    ["Appointment ID", state.appointmentData.appointmentId],
    ["Name", state.appointmentData.name],
    ["Mobile", maskMobile(state.appointmentData.mobile)],
    ["Aadhaar", maskAadhaar(state.appointmentData.aadhaar)],
    ["Service", state.appointmentData.service],
    ...extra.rows,
    ["Date", state.appointmentData.appointmentDate],
    ["Time", state.appointmentData.appointmentTime],
    ["Status", state.appointmentData.status]
  ]);

  showOnlyStep(3);
  saveDraft(true);
};

window.submitAppointment = async function(){
  if(state.submitting || !requireLogin()) return;

  try{
    state.submitting = true;
    els.submitBtn.disabled = true;
    els.submitBtn.textContent = "Uploading / Saving...";

    if(state.selectedService === "Address With Documents"){
      state.appointmentData.documentUrl = await uploadToCloudinary(els.documentFile.files[0]);
    }

    await db.collection("appointments").add({
      ...state.appointmentData,
      aadhaarMasked: maskAadhaar(state.appointmentData.aadhaar),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    downloadPDF();
    clearDraft();
    showToast("Appointment submitted");
    els.finalId.textContent = state.appointmentData.appointmentId;
    showOnlyStep(4);
  }catch(error){
    showToast("Error: " + error.message, "error");
    console.error(error);
  }finally{
    state.submitting = false;
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = "Submit & Download PDF";
  }
};

window.downloadPDF = function(){
  if(!state.appointmentData.appointmentId){
    showToast("PDF ke liye appointment data available nahi hai", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const data = state.appointmentData;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const primary = [11, 94, 215];
  const dark = [23, 32, 51];
  const muted = [102, 112, 133];
  const line = [216, 226, 242];

  function infoRow(label, value, x, y, width){
    pdf.setTextColor(muted[0], muted[1], muted[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(label.toUpperCase(), x, y);
    pdf.setTextColor(23, 32, 51);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(String(value || "-"), width), x, y + 6);
  }

  function sectionTitle(title, y){
    pdf.setTextColor(dark[0], dark[1], dark[2]);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(title, margin, y);
    pdf.setDrawColor(line[0], line[1], line[2]);
    pdf.line(margin, y + 4, pageWidth - margin, y + 4);
  }

  pdf.setFillColor(247, 249, 252);
  pdf.rect(0, 0, pageWidth, 297, "F");

  pdf.setFillColor(primary[0], primary[1], primary[2]);
  pdf.roundedRect(margin, 14, contentWidth, 38, 4, 4, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("TECH SOURCE", margin + 12, 29);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Aadhaar Appointment Receipt", margin + 12, 39);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("SERVICE FEE", pageWidth - margin - 44, 28);
  pdf.setFontSize(16);
  pdf.text("Rs. 150", pageWidth - margin - 44, 40);

  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, 60, contentWidth, 35, 4, 4, "F");
  pdf.setDrawColor(line[0], line[1], line[2]);
  pdf.roundedRect(margin, 60, contentWidth, 35, 4, 4, "S");
  infoRow("Appointment ID", data.appointmentId, margin + 10, 73, 58);
  infoRow("Service", data.service, margin + 78, 73, 62);
  infoRow("Status", data.status, margin + 150, 73, 30);

  sectionTitle("Applicant Details", 112);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, 122, contentWidth, 52, 4, 4, "F");
  pdf.setDrawColor(line[0], line[1], line[2]);
  pdf.roundedRect(margin, 122, contentWidth, 52, 4, 4, "S");
  infoRow("Name", data.name, margin + 10, 136, 72);
  infoRow("Mobile", maskMobile(data.mobile), margin + 98, 136, 38);
  infoRow("Aadhaar", data.aadhaarMasked || maskAadhaar(data.aadhaar || ""), margin + 148, 136, 36);
  infoRow("Date", data.appointmentDate, margin + 10, 158, 45);
  infoRow("Time", data.appointmentTime, margin + 72, 158, 45);
  infoRow("Created", new Date().toLocaleDateString("en-IN"), margin + 132, 158, 45);

  sectionTitle("Service Details", 190);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, 200, contentWidth, 48, 4, 4, "F");
  pdf.setDrawColor(line[0], line[1], line[2]);
  pdf.roundedRect(margin, 200, contentWidth, 48, 4, 4, "S");
  infoRow("Service", data.service, margin + 10, 214, 70);
  infoRow("Document", data.docType || data.fileName || "Not required", margin + 96, 214, 78);

  const detailText = data.rescheduleReason || data.newAddress || data.docAddress || data.coAddress || data.note || data.coName || data.newMobile || "No additional note";
  infoRow("Update Detail", detailText, margin + 10, 236, 160);

  pdf.setFillColor(227, 242, 253);
  pdf.roundedRect(margin, 260, contentWidth, 16, 4, 4, "F");
  pdf.setTextColor(primary[0], primary[1], primary[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Please carry original documents and this receipt at the appointment time.", margin + 10, 270);

  pdf.setTextColor(muted[0], muted[1], muted[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Generated by Tech Source Aadhaar Service Portal", margin, 286);

  pdf.save(`${state.appointmentData.appointmentId}.pdf`);
  showToast("PDF downloaded");
};

function downloadAppointmentReceipt(data){
  if(!data?.appointmentId){
    showToast("Receipt data not available", "error");
    return;
  }

  const previousData = state.appointmentData;
  state.appointmentData = { ...data };
  downloadPDF();
  state.appointmentData = previousData;
}

window.trackAppointment = async function(){
  try{
    if(!requireLogin()) return;
    const id = els.trackId.value.trim().toUpperCase();
    if(!id) return showMessage(els.trackResult, "Appointment ID enter karo", "warn");

    showMessage(els.trackResult, "Loading...", "warn");

    const snap = await db.collection("appointments")
      .where("appointmentId", "==", id)
      .where("userId", "==", state.currentUser.uid)
      .get();

    if(snap.empty){
      showMessage(els.trackResult, "Appointment not found for this login", "error");
      return;
    }

    els.trackResult.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      els.trackResult.appendChild(renderAppointmentCard(data));
    });
  }catch(error){
    showMessage(els.trackResult, `Firebase Error: ${error.message}`, "error");
  }
};

window.loadAppointmentHistory = async function(){
  if(!requireLogin()) return;
  els.historyList.innerHTML = `<div class="status warn">Loading history...</div>`;

  try{
    const snap = await db.collection("appointments")
      .where("userId", "==", state.currentUser.uid)
      .get();

    if(snap.empty){
      els.historyList.innerHTML = `
        <div class="empty-state">
          <h3>No appointment history</h3>
          <p>Abhi tak is account se koi Aadhaar appointment book nahi hua.</p>
          <button type="button" onclick="openBook()">Book Appointment</button>
        </div>
      `;
      return;
    }

    const appointments = snap.docs
      .map(docSnap => docSnap.data())
      .sort((a, b) => String(b.appointmentDate || "").localeCompare(String(a.appointmentDate || "")));

    els.historyList.innerHTML = "";
    appointments.forEach(app => els.historyList.appendChild(renderAppointmentCard(app, { showReschedule:true })));
  }catch(error){
    showMessage(els.historyList, `Firebase Error: ${error.message}`, "error");
  }
};

window.rescheduleAppointment = async function(){
  if(!requireLogin()) return;

  const id = els.resId.value.trim().toUpperCase();
  const reason = els.resReason.value.trim();

  if(!id) return showToast("Apna appointment select karo", "error");
  if(!els.resDate.value) return showToast("New date select karo", "error");
  if(els.resDate.value < todayISO()) return showToast("Past date allowed nahi hai", "error");
  if(els.resDate.value > maxAppointmentISO()) return showToast("Appointment maximum 15 din ke andar reschedule ho sakta hai", "error");
  if(!els.resTime.value) return showToast("New time select karo", "error");
  if(reason.length < 3) return showToast("Reschedule reason enter karo", "error");

  const selected = state.rescheduleAppointments.find(app => app.appointmentId === id);
  if((selected?.rescheduleCount || 0) >= MAX_RESCHEDULE_COUNT){
    return showToast(`Is appointment ko maximum ${MAX_RESCHEDULE_COUNT} baar reschedule kiya ja chuka hai`, "error");
  }

  els.resConfirmDetails.innerHTML = "";

  [
    ["Appointment ID", id],
    ["Service", selected?.service || "-"],
    ["Current Date", selected?.appointmentDate || "-"],
    ["Current Time", selected?.appointmentTime || "-"],
    ["New Date", els.resDate.value],
    ["New Time", els.resTime.value],
    ["Reschedule Used", `${selected?.rescheduleCount || 0}/${MAX_RESCHEDULE_COUNT}`],
    ["Reason", reason]
  ].forEach(([label, value]) => addReviewRow(els.resConfirmDetails, label, value));

  els.rescheduleConfirmPopup.classList.remove("hidden");
  els.rescheduleConfirmPopup.setAttribute("aria-hidden", "false");
};

window.closeRescheduleConfirm = function(){
  els.rescheduleConfirmPopup.classList.add("hidden");
  els.rescheduleConfirmPopup.setAttribute("aria-hidden", "true");
};

window.confirmRescheduleAppointment = async function(){
  try{
    if(!requireLogin()) return;
    const id = els.resId.value.trim().toUpperCase();
    const reason = els.resReason.value.trim();

    closeRescheduleConfirm();
    showMessage(els.resResult, "Loading...", "warn");

    const snap = await db.collection("appointments")
      .where("appointmentId", "==", id)
      .where("userId", "==", state.currentUser.uid)
      .get();

    if(snap.empty){
      showMessage(els.resResult, "Appointment not found for this login", "error");
      return;
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data();
    const currentCount = data.rescheduleCount || 0;

    if(data.userId !== state.currentUser.uid){
      showMessage(els.resResult, "Permission denied. Ye appointment aapke login account ka nahi hai.", "error");
      return;
    }

    if(currentCount >= MAX_RESCHEDULE_COUNT){
      showMessage(els.resResult, `Is appointment ko maximum ${MAX_RESCHEDULE_COUNT} baar reschedule kiya ja chuka hai.`, "error");
      return;
    }

    await db.collection("appointments").doc(docSnap.id).update({
      appointmentDate: els.resDate.value,
      appointmentTime: els.resTime.value,
      rescheduleReason: reason,
      rescheduleCount: currentCount + 1,
      lastRescheduledAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "Rescheduled",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    els.resResult.innerHTML = "";
    const box = document.createElement("div");
    box.className = "review-box";
    addReviewRow(box, "Appointment Rescheduled", id);
    addReviewRow(box, "New Date", els.resDate.value);
    addReviewRow(box, "New Time", els.resTime.value);
    addReviewRow(box, "Reschedule Count", `${currentCount + 1}/${MAX_RESCHEDULE_COUNT}`);
    addReviewRow(box, "Reason", reason);
    els.resResult.appendChild(box);
    showToast("Appointment rescheduled");
    loadUserAppointmentsForReschedule();
  }catch(error){
    showMessage(els.resResult, `Firebase Error: ${error.message}`, "error");
  }
};

window.renderTimeSlots = function(){
  renderSlots(els.timeSlots, els.appointmentTime, els.appointmentDate.value);
  scheduleDraftSave();
};

window.renderRescheduleSlots = function(){
  renderSlots(els.resTimeSlots, els.resTime, els.resDate.value);
};

window.loadUserAppointmentsForReschedule = async function(preselectId = ""){
  if(!requireLogin()) return;

  els.resOwnAppointments.innerHTML = `<option value="">Loading your appointments...</option>`;

  try{
    const snap = await db.collection("appointments")
      .where("userId", "==", state.currentUser.uid)
      .get();

    if(snap.empty){
      state.rescheduleAppointments = [];
      els.resOwnAppointments.innerHTML = `<option value="">No appointment found in your account</option>`;
      return;
    }

    const appointments = snap.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => String(b.appointmentDate || "").localeCompare(String(a.appointmentDate || "")));

    state.rescheduleAppointments = appointments;
    els.resOwnAppointments.innerHTML = `<option value="">Select your appointment</option>`;
    appointments.forEach(app => {
      const option = document.createElement("option");
      option.value = app.appointmentId || "";
      option.textContent = `${app.appointmentId || "No ID"} - ${app.service || "Service"} - ${app.appointmentDate || "No date"} ${app.appointmentTime || ""}`;
      els.resOwnAppointments.appendChild(option);
    });

    if(preselectId){
      els.resOwnAppointments.value = preselectId;
      selectRescheduleAppointment();
    }
  }catch(error){
    els.resOwnAppointments.innerHTML = `<option value="">Unable to load appointments</option>`;
    showMessage(els.resResult, `Firebase Error: ${error.message}`, "error");
  }
};

window.selectRescheduleAppointment = function(){
  const id = els.resOwnAppointments.value || "";
  els.resId.value = id;
  els.resResult.innerHTML = "";
  els.resSelectedPreview.innerHTML = "";
  els.resSelectedPreview.classList.add("hidden");

  const selected = state.rescheduleAppointments.find(app => app.appointmentId === id);
  if(selected){
    els.resSelectedPreview.classList.remove("hidden");
    els.resSelectedPreview.appendChild(renderAppointmentCard(selected));
  }
};
