import { db } from './firebase.js';
import {
  collection, addDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.addRecord = async function () {
  const product = productEl.value.toLowerCase();
  const price = parseFloat(priceEl.value);
  const store = storeEl.value;

  await addDoc(collection(db, "records"), {
    product, price, store, date: new Date().toISOString()
  });

  alert("Saved");
}

const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");

window.searchProduct = async function () {
  const keyword = document.getElementById("search").value.toLowerCase();

  const q = query(collection(db, "records"), where("product", "==", keyword));
  const snapshot = await getDocs(q);

  let records = [];
  snapshot.forEach(doc => records.push(doc.data()));

  if (!records.length) return;

  records.sort((a,b)=> new Date(b.date)-new Date(a.date));

  const latest = records[0];
  const cheapest = records.reduce((m,r)=> r.price<m.price?r:m, records[0]);

  // 📊 chart
  const ctx = document.getElementById("chart");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: records.map(r=>r.date.split("T")[0]),
      datasets: [{ label: 'Price', data: records.map(r=>r.price) }]
    }
  });

  // 🏪 store stats
  const stats = {};
  records.forEach(r=>{
    if (!stats[r.store] || r.price < stats[r.store]) {
      stats[r.store] = r.price;
    }
  });

  let html = `
    <p>Latest: £${latest.price} (${latest.store})</p>
    <p>Cheapest: £${cheapest.price} (${cheapest.store})</p>
    <h6>Store Stats</h6>
  `;

  for (let s in stats) {
    html += `<p>${s}: £${stats[s]}</p>`;
  }

  document.getElementById("result").innerHTML = html;

  // 🔔 alert check
  const threshold = 1.0;
  if (cheapest.price < threshold) {
    alert("🔥 Price dropped!");
  }
}
