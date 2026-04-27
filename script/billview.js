const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  projectId: "tech-source-bill"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

let amount = 0;
let currentData = null;
let currentDocRef = null;
let cashfree = null;

const billDetails = document.getElementById("billDetails");
const payBtn = document.getElementById("payBtn");
const paidStamp = document.getElementById("paidStamp");
const gatewayText = document.getElementById("gatewayText");
const params = new URLSearchParams(window.location.search);
const billNo = params.get("billNo");
const docId = params.get("id");
const returnedCashfreeOrderId = params.get("cf_order_id");
const API_BASE_URL =
  window.location.protocol === "file:" ? "http://localhost:3000" : "";

payBtn.addEventListener("click", startCashfreePayment);

loadBill();

async function loadBill() {
  if (!billNo && !docId) {
    billDetails.innerHTML = "Bill ID missing";
    payBtn.style.display = "none";
    return;
  }

  try {
    let snapshot;

    if (docId) {
      currentDocRef = db.collection("bills").doc(docId);
      snapshot = await currentDocRef.get();

      if (!snapshot.exists) {
        billDetails.innerHTML = "Bill not found";
        payBtn.style.display = "none";
        return;
      }

      currentData = snapshot.data();
    } else {
      snapshot = await db.collection("bills").where("billNo", "==", billNo).get();

      if (snapshot.empty) {
        billDetails.innerHTML = "Bill not found";
        payBtn.style.display = "none";
        return;
      }

      currentDocRef = snapshot.docs[0].ref;
      currentData = snapshot.docs[0].data();
    }

    renderBill(currentData);

    if (returnedCashfreeOrderId) {
      await verifyCashfreePayment(returnedCashfreeOrderId);
    }
  } catch (error) {
    billDetails.innerHTML = "Bill load nahi ho paya";
    console.error(error);
  }
}

function renderBill(data) {
  const servicesHTML = (data.services || [])
    .map(
      (service) => `
        <tr>
          <td>${escapeHTML(service.name)}</td>
          <td>${Number(service.qty || 0)}</td>
          <td>₹${Number(service.price || 0)}</td>
          <td>₹${Number(service.qty || 0) * Number(service.price || 0)}</td>
        </tr>
      `
    )
    .join("");

  const totalAmount = Number(data.totalAmount || 0);
  const paidAmount = Number(data.paidAmount || 0);
  const dueAmount = Math.max(totalAmount - paidAmount, 0);
  amount = paidAmount <= 0 ? totalAmount : dueAmount;

  billDetails.innerHTML = `
    <p class="billno">
      <span><b>Bill No:</b> ${escapeHTML(data.billNo || "")}</span>
      <span><b>Date:</b> ${formatBillDate(data.date)}</span>
    </p>

    <p class="name"><b>Name:</b> ${escapeHTML(data.customerName || "")}</p>
    <p class="name"><b>Mobile:</b> ${escapeHTML(data.customerMobile || "")}</p>

    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${servicesHTML}</tbody>
    </table>

    <div class="summary-wrap">
      <table class="summary-table">
        ${
          Number(data.discount || 0) > 0
            ? `<tr><td>Subtotal</td><td>₹${Number(data.subtotal || 0)}</td></tr>`
            : ""
        }
        ${
          Number(data.discount || 0) > 0
            ? `<tr><td>Discount</td><td>₹${Number(data.discount || 0)}</td></tr>`
            : ""
        }
        <tr><td><b>Total</b></td><td><b>₹${totalAmount}</b></td></tr>
        ${
          paidAmount > 0
            ? `<tr><td>Paid</td><td style="color:green;">₹${paidAmount}</td></tr>`
            : ""
        }
        ${
          dueAmount > 0
            ? `<tr><td><b>Due</b></td><td style="color:red; font-weight:bold;">₹${dueAmount}</td></tr>`
            : ""
        }
      </table>

      <div class="payment-info">
        <p><b>Payment Status:</b> ${escapeHTML(data.paymentStatus || "Unpaid")}</p>
        ${
          data.paymentMode && data.paymentMode !== "Unpaid"
            ? `<p><b>Payment Mode:</b> ${escapeHTML(data.paymentMode)}</p>`
            : ""
        }
      </div>
    </div>
  `;

  updatePaymentUI(data.paymentStatus === "Paid" || amount <= 0);
}

async function startCashfreePayment() {
  if (!currentData) {
    alert("Bill abhi load nahi hua");
    return;
  }

  if (amount <= 0) {
    alert("No payment due");
    return;
  }

  payBtn.disabled = true;
  payBtn.textContent = "Opening...";

  try {
    const cashfreeSdk = await getCashfree();
    const response = await fetch(apiUrl("/api/cashfree/create-order"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billNo: currentData.billNo,
        docId,
        amount,
        customerName: currentData.customerName,
        customerMobile: currentData.customerMobile,
        customerEmail: currentData.customerEmail
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.message || "Cashfree order create failed");
    }

    await cashfreeSdk.checkout({
      paymentSessionId: data.payment_session_id,
      redirectTarget: "_self"
    });
  } catch (error) {
    alert(error.message || "Payment start nahi ho paya");
    payBtn.disabled = false;
    payBtn.textContent = "Pay Now";
  }
}

async function getCashfree() {
  if (cashfree) return cashfree;

  const response = await fetch(apiUrl("/api/cashfree/config"));
  const config = await response.json();
  cashfree = Cashfree({ mode: config.mode || "sandbox" });
  return cashfree;
}

async function verifyCashfreePayment(orderId) {
  try {
    gatewayText.textContent = "Payment verify ho raha hai...";

    const response = await fetch(apiUrl(`/api/cashfree/order-status/${encodeURIComponent(orderId)}`));
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Payment status check failed");
    }

    if (data.order_status === "PAID") {
      await markBillPaid(data);
      gatewayText.textContent = "Payment completed by Cashfree";
      paidStamp.style.display = "block";
      payBtn.style.display = "none";
      alert("Payment successful");
    } else {
      gatewayText.textContent = `Payment status: ${data.order_status}`;
      payBtn.disabled = false;
      payBtn.textContent = "Pay Now";
    }
  } catch (error) {
    gatewayText.textContent = "Payment verify nahi ho paya";
    console.error(error);
  }
}

async function markBillPaid(cashfreeOrder) {
  if (!currentDocRef) return;

  const paidAmount = Number(cashfreeOrder.order_amount || amount);
  const totalAmount = Number(currentData.totalAmount || paidAmount);

  await currentDocRef.update({
    paidAmount: totalAmount,
    paymentStatus: "Paid",
    paymentMode: "Cashfree",
    cashfreeOrderId: cashfreeOrder.order_id,
    cashfreeCfOrderId: cashfreeOrder.cf_order_id || "",
    cashfreePaidAmount: paidAmount,
    cashfreeUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  currentData = {
    ...currentData,
    paidAmount: totalAmount,
    paymentStatus: "Paid",
    paymentMode: "Cashfree"
  };

  amount = 0;
  renderBill(currentData);
}

function updatePaymentUI(isPaid) {
  if (isPaid) {
    paidStamp.style.display = "block";
    gatewayText.textContent = "Payment Completed";
    payBtn.style.display = "none";
    return;
  }

  paidStamp.style.display = "none";
  gatewayText.textContent = "Secure online payment by Cashfree";
  payBtn.style.display = "block";
  payBtn.disabled = false;
  payBtn.textContent = "Pay Now";
}

async function downloadPDF() {
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((button) => {
    button.style.display = "none";
  });

  const invoice = document.getElementById("invoice");
  const canvas = await html2canvas(invoice, {
    scale: 1.5,
    useCORS: true
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.8);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = 210;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Bill-${currentData?.billNo || "TECH-SOURCE"}.pdf`);

  buttons.forEach((button) => {
    button.style.display = "inline-block";
  });
  updatePaymentUI(currentData?.paymentStatus === "Paid" || amount <= 0);
}

function printBill() {
  window.print();
}

function formatBillDate(value) {
  if (!value) return "";

  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("en-GB").replace(/\//g, "-");
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
