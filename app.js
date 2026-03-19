import { db } from './firebase.js';
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");
const resultDiv = document.getElementById("result");
const dashboardDiv = document.getElementById("dashboard");

let charts = {}; // 儲存每個 product chart instance

// ➕ Add Record + Auto Price Compare
window.addRecord = async () => {
  const product = productEl.value.toLowerCase();
  const price = parseFloat(priceEl.value);
  const store = storeEl.value;

  if (!product || !price || !store) return alert("Please fill all fields");

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
  if (price <= lowest.price) alert(`🔥 New lowest price for ${product}: £${price} @ ${store}`);

  productEl.value = "";
  priceEl.value = "";
  storeEl.value = "";

  searchProduct(); // 更新 dashboard
};

// 🔍 Search + Dashboard
window.searchProduct = async () => {
  const keyword = document.getElementById("search").value.toLowerCase();
  const q = keyword 
    ? query(collection(db, "records"), where("product", "==", keyword))
    : query(collection(db, "records"));
    
  const snapshot = await getDocs(q);
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  dashboardDiv.innerHTML = "";
  resultDiv.innerHTML = "";

  if (!records.length) return;

  // group by product
  const productMap = {};
  records.forEach(r=>{
    if (!productMap[r.product]) productMap[r.product] = [];
    productMap[r.product].push(r);
  });

  for (let prod in productMap) {
    const recs = productMap[prod];
    recs.sort((a,b)=> new Date(b.date) - new Date(a.date));

    const latest = recs[0];
    const lowest = recs.reduce((m,r)=> r.price<m.price?r:m, recs[0]);

    // store stats
    const storeStats = {};
    recs.forEach(r=>{
      if (!storeStats[r.store] || r.price < storeStats[r.store]) storeStats[r.store] = r.price;
    });

    // create card
    const card = document.createElement("ion-card");
    let inner = `
      <ion-card-header><ion-card-title>${prod}</ion-card-title></ion-card-header>
      <ion-card-content>
        <p>Latest: £${latest.price} @ ${latest.store} (${latest.date.split("T")[0]})</p>
        <p>Lowest: £${lowest.price} @ ${lowest.store} (${lowest.date.split("T")[0]})</p>
        <h6>Store Stats:</h6>
    `;
    for (let s in storeStats) inner += `<p>${s}: £${storeStats[s]}</p>`;
    inner += `<canvas id="chart-${prod}"></canvas></ion-card-content>`;
    card.innerHTML = inner;
    dashboardDiv.appendChild(card);

    // Chart
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
