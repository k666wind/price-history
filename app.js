import { db } from './firebase.js';
import {
  collection, addDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let chartInstance = null;

// refs
const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");

// ➕ ADD record + Auto Price Compare
window.addRecord = async () => {
  const product = productEl.value.toLowerCase();
  const price = parseFloat(priceEl.value);
  const store = storeEl.value;

  await addDoc(collection(db, "records"), {
    product, price, store,
    date: new Date().toISOString()
  });

  // Auto Compare
  const q = query(collection(db, "records"), where("product", "==", product));
  const snapshot = await getDocs(q);
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  const lowest = records.reduce((m,r)=> r.price<m.price?r:m, records[0]);
  if (price <= lowest.price) {
    alert(`🔥 New lowest price for ${product}: £${price} at ${store}`);
  }

  alert("Saved");
};

// 🔍 Search + Table + Dashboard
let dashboard = document.getElementById("dashboard");
let chartCanvas = document.getElementById("chart");
let chartInstanceLocal = null;

window.searchProduct = async () => {
  const keyword = document.getElementById("search").value.toLowerCase();
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "Loading...";

  const q = query(collection(db, "records"), where("product", "==", keyword));
  const snapshot = await getDocs(q);
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  if (!records.length) {
    resultDiv.innerHTML = "No data";
    dashboard.innerHTML = "";
    return;
  }

  // sort 最新 → 最舊
  records.sort((a,b)=> new Date(b.date) - new Date(a.date));

  // Table
  let html = `
    <table class="striped">
      <thead>
        <tr><th>Product</th><th>Price</th><th>Store</th><th>Date</th></tr>
      </thead><tbody>
  `;
  records.forEach(r=>{
    html += `<tr>
      <td>${r.product}</td>
      <td>£${r.price}</td>
      <td>${r.store}</td>
      <td>${r.date.split("T")[0]}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  resultDiv.innerHTML = html;

  // Dashboard
  const lowest = records.reduce((m,r)=> r.price<m.price?r:m, records[0]);
  const latest = records[0];

  // store min
  const storeStats = {};
  records.forEach(r=>{
    if (!storeStats[r.store] || r.price < storeStats[r.store]) storeStats[r.store] = r.price;
  });

  let dashHtml = `<h5>📊 Dashboard</h5>
    <p>Latest: £${latest.price} at ${latest.store} (${latest.date.split("T")[0]})</p>
    <p>Lowest: £${lowest.price} at ${lowest.store} (${lowest.date.split("T")[0]})</p>
    <h6>Store Stats:</h6>
  `;
  for (let s in storeStats) {
    dashHtml += `<p>${s}: £${storeStats[s]}</p>`;
  }
  dashboard.innerHTML = dashHtml;

  // Chart
  if (chartInstanceLocal) chartInstanceLocal.destroy();
  chartInstanceLocal = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels: records.map(r=>r.date.split("T")[0]),
      datasets: [{ label: 'Price', data: records.map(r=>r.price) }]
    }
  });
};
