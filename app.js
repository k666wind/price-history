import { db } from './firebase.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");
const dashboardDiv = document.getElementById("dashboard");
const filterStoreEl = document.getElementById("filterStore");
const importCSVEl = document.getElementById("importCSV");

let charts = {};

window.addRecord = async () => {
  let product = productEl.value.trim();
  let store = storeEl.value.trim();
  const price = parseFloat(priceEl.value);
  if (!product || !store || !price) return alert("Please fill all fields");

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

  // Auto Compare
  const snapshot = await getDocs(collection(db, "records"));
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));
  const related = records.filter(r => r.product === productLower);
  const lowest = related.reduce((m,r)=> r.price<m.price?r:m, related[0]);
  if (price <= lowest.price) alert(`🔥 New lowest price for ${product}: £${price} @ ${store}`);

  productEl.value = "";
  priceEl.value = "";
  storeEl.value = "";

  searchProduct();
};

window.searchProduct = async () => {
  const keyword = document.getElementById("search").value.trim().toLowerCase();
  const storeFilter = filterStoreEl.value;

  const snapshot = await getDocs(collection(db, "records"));
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  let filtered = records.filter(r => 
    (!keyword || r.product.includes(keyword)) &&
    (!storeFilter || r.store === storeFilter)
  );

  dashboardDiv.innerHTML = "";
  if (!filtered.length) filtered = records;

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
    recs.sort((a,b)=>new Date(b.date)-new Date(a.date));
    const latest = recs[0];
    const lowest = recs.reduce((m,r)=> r.price<m.price?r:m, recs[0]);

    const storeStats = {};
    recs.forEach(r=>{
      if (!storeStats[r.store] || r.price < storeStats[r.store]) storeStats[r.store] = r.price;
    });

    const card = document.createElement("ion-card");

    // Store Table
    let tableHTML = `<table class="store-table"><tr><th>Store</th><th>Lowest Price</th></tr>`;
    for (let s in storeStats) {
      const price = storeStats[s];
      const cls = price===lowest.price ? 'lowest' : (s===latest.store ? 'latest':'');
      tableHTML += `<tr><td>${s}</td><td class="${cls}">£${price}</td></tr>`;
    }
    tableHTML += `</table>`;

    card.innerHTML = `
      <ion-card-header><ion-card-title>${latest.productOriginal}</ion-card-title></ion-card-header>
      <ion-card-content>
        <p>Latest: £${latest.price} @ ${latest.storeOriginal} (${latest.date.split("T")[0]})</p>
        <p>Lowest: £${lowest.price} @ ${lowest.storeOriginal} (${lowest.date.split("T")[0]})</p>
        ${tableHTML}
        <canvas id="line-${prod}" style="margin-top:10px;"></canvas>
        <canvas id="bar-${prod}" style="margin-top:10px;"></canvas>
      </ion-card-content>
    `;
    dashboardDiv.appendChild(card);

    // Line Chart
    const lineCtx = document.getElementById(`line-${prod}`).getContext('2d');
    if (charts[`line-${prod}`]) charts[`line-${prod}`].destroy();
    charts[`line-${prod}`] = new Chart(lineCtx, {
      type: 'line',
      data: { labels: recs.map(r=>r.date.split("T")[0]), datasets:[{label:'Price Trend', data: recs.map(r=>r.price), borderColor:'blue', backgroundColor:'rgba(0,0,255,0.2)'}]}
    });

    // Bar Chart
    const barCtx = document.getElementById(`bar-${prod}`).getContext('2d');
    if (charts[`bar-${prod}`]) charts[`bar-${prod}`].destroy();
    charts[`bar-${prod}`] = new Chart(barCtx, {
      type:'bar',
      data:{labels:Object.keys(storeStats), datasets:[{label:'Lowest Price', data:Object.values(storeStats), backgroundColor:Object.values(storeStats).map(p=>p===lowest.price?'green':'blue')}]},
      options:{plugins:{legend:{display:false}}}
    });
  }
};

// CSV Export / Import 保持不變
window.exportCSV = async () => {
  const snapshot = await getDocs(collection(db, "records"));
  const rows = [];
  snapshot.forEach(doc=>rows.push(doc.data()));
  if (!rows.length) return alert("No data");

  let csv = "product,store,price,date\n";
  rows.forEach(r=>csv += `${r.productOriginal},${r.storeOriginal},${r.price},${r.date}\n`);

  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shopping.csv";
  a.click();
  URL.revokeObjectURL(url);
};

importCSVEl.addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  const lines = text.split("\n").slice(1);
  for(let line of lines){
    if(!line.trim()) continue;
    const [product, store, price, date] = line.split(",");
    if(!product || !store || !price) continue;
    await addDoc(collection(db,"records"),{
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
