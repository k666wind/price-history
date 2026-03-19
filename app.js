import { db, auth } from './firebase.js';
import {
  collection, addDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let currentUser = null;
let chartInstance = null;

// 👤 LOGIN
window.login = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  currentUser = result.user;
  alert("Logged in: " + currentUser.email);
};

// ➕ ADD
window.addRecord = async () => {
  if (!currentUser) return alert("Login first");

  const product = productEl.value.toLowerCase();
  const price = parseFloat(priceEl.value);
  const store = storeEl.value;

  await addDoc(collection(db, "records"), {
    product, price, store,
    userId: currentUser.uid,
    date: new Date().toISOString()
  });

  alert("Saved");
};

// 🔍 SEARCH（FIXED + TABLE）
window.searchProduct = async function () {
  if (!currentUser) return;

  const keyword = document.getElementById("search").value.toLowerCase();
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "Loading...";

  const q = query(
    collection(db, "records"),
    where("product", "==", keyword),
    where("userId", "==", currentUser.uid)
  );

  const snapshot = await getDocs(q);

  let records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  if (!records.length) {
    resultDiv.innerHTML = "No data";
    return;
  }

  // 排序
  records.sort((a,b)=> new Date(b.date) - new Date(a.date));

  // destroy chart
  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById("chart");
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: records.map(r=>r.date.split("T")[0]),
      datasets: [{ label: 'Price', data: records.map(r=>r.price) }]
    }
  });

  // table
  let html = `
    <table class="striped">
      <thead>
        <tr>
          <th>Product</th>
          <th>Price</th>
          <th>Store</th>
          <th>Date</th>
        </tr>
      </thead><tbody>
  `;

  records.forEach(r=>{
    html += `
      <tr>
        <td>${r.product}</td>
        <td>£${r.price}</td>
        <td>${r.store}</td>
        <td>${r.date.split("T")[0]}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";

  resultDiv.innerHTML = html;

  // 🔔 alert
  const cheapest = records.reduce((m,r)=> r.price<m.price?r:m, records[0]);
  if (cheapest.price < 1) {
    new Notification("🔥 Price Drop", {
      body: `${keyword} now £${cheapest.price}`
    });
  }
};

// 📦 BARCODE + lookup
async function lookupProduct(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
  const data = await res.json();
  return data.product?.product_name || code;
}

const scanner = new Html5Qrcode("reader");

scanner.start(
  { facingMode: "environment" },
  {},
  async (code) => {
    const name = await lookupProduct(code);
    document.getElementById("product").value = name;
  }
);

// refs
const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");
