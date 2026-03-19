import { db } from './firebase.js';
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");
const resultDiv = document.getElementById("result");
const dashboardDiv = document.getElementById("dashboard");
const filterStoreEl = document.getElementById("filterStore");
const importCSVEl = document.getElementById("importCSV");

let charts = {};

// ➕ Add Record + Auto Price Compare
window.addRecord = async () => {
  let product = productEl.value.trim();
  let store = storeEl.value.trim();
  const price = parseFloat(priceEl.value);

  if (!product || !price || !store) return alert("Please fill all fields");

  // case insensitive storage
  const productLower = product.toLowerCase();
  const storeLower = store.toLowerCase();

  await addDoc(collection(db, "records"), {
    product: productLower,
    store: storeLower,
    price,
    date: new Date().toISOString(),
    productOriginal: product,
    storeOriginal: store
  });

  // Auto compare
  const q = query(collection(db, "records"), where("product", "==", productLower));
  const snapshot = await getDocs(q);
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));
  const lowest = records.reduce((m,r)=> r.price < m.price ? r : m, records[0]);
  if (price <= lowest.price) alert(`🔥 New lowest price for ${product}: £${price} @ ${store}`);

  productEl.value = "";
  priceEl.value = "";
  storeEl.value = "";

  searchProduct();
};

// 🔍 Search + Dashboard
window.searchProduct = async () => {
  let keyword = document.getElementById("search").value.trim().toLowerCase();
  const storeFilter = filterStoreEl.value;

  let q = collection(db, "records");
  const snapshot = await getDocs(q);
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  // Filter keyword & store
  let filtered = records.filter(r => 
    (!keyword || r.product.includes(keyword)) &&
    (!storeFilter || r.store === storeFilter)
  );

  dashboardDiv.innerHTML = "";
  resultDiv.innerHTML = "";

  if (!filtered.length) return;

  // Group by product
  const productMap = {};
  filtered.forEach(r => {
    if (!productMap[r.product]) productMap[r.product] = [];
    productMap[r.product].push(r);
  });

  // Fill store select
  const storeSet = new Set(records.map(r=>r.store));
  filterStoreEl.innerHTML = '<ion-select-option value="">All Stores</ion-select-option>';
  storeSet.forEach(s => filterStoreEl.innerHTML += `<ion-select-option value="${s}">${s}</ion-select-option>`);

  for (let prod in productMap) {
    const recs = productMap[prod];
    recs.sort((a,b) => new Date(b.date) - new Date(a.date));

    const latest = recs[0];
    const lowest = recs.reduce((m,r)=> r.price < m.price ? r : m, recs[0]);

    // store stats
    const storeStats = {};
    recs.forEach(r => {
      if (!storeStats[r.store] || r.price < storeStats[r.store]) storeStats[r.store] = r.price;
    });

    const card = document.createElement("ion-card");
    let inner = `
      <ion-card-header><ion-card-title>${latest.productOriginal}</ion-card-title></ion-card-header>
      <ion-card-content>
        <p>Latest: £${latest.price} @ ${latest.storeOriginal} (${latest.date.split("T")[0]})</p>
        <p>Lowest: £${lowest.price} @ ${lowest.storeOriginal} (${lowest.date.split("T")[0]})</p>
        <h6>Store Stats:</h6>
    `;
    for (let s in storeStats) inner += `<p>${s}: £${storeStats[s]}</p>`;
    inner += `<canvas id="chart-${prod}"></canvas></ion-card-content>`;
    card.innerHTML = inner;
    dashboardDiv.appendChild(card);

    const ctx = document.getElementById(`chart-${prod}`).getContext('2d');
    if (charts[prod]) charts[prod].destroy();
    charts[prod] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: recs.map(r=>r.date.split("T")[0]),
        datasets: [{
          label: 'Price',
          data: recs.map(r=>r.price),
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.2)'
        }]
      }
    });
  }
};

// CSV Export
window.exportCSV = async () => {
  const snapshot = await getDocs(collection(db, "records"));
  const rows = [];
  snapshot.forEach(doc => rows.push(doc.data()));
  if (!rows.length) return alert("No data");

  let csv = "product,store,price,date\n";
  rows.forEach(r => {
    csv += `${r.productOriginal},${r.storeOriginal},${r.price},${r.date}\n`;
  });

  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shopping.csv";
  a.click();
  URL.revokeObjectURL(url);
};

// CSV Import
importCSVEl.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.split("\n").slice(1); // skip header
  for (let line of lines) {
    if (!line.trim()) continue;
    const [product, store, price, date] = line.split(",");
    if (!product || !store || !price) continue;
    await addDoc(collection(db,"records"), {
      product: product.toLowerCase().trim(),
      store: store.toLowerCase().trim(),
      price: parseFloat(price),
      date: date || new Date().toISOString(),
      productOriginal: product,
      storeOriginal: store
    });
  }
  searchProduct();
});
