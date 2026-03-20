import { db } from './firebase.js';
import { collection, addDoc, getDocs, deleteDoc, doc } 
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");
const dashboardDiv = document.getElementById("dashboard");
const filterStoreEl = document.getElementById("filterStore");
const importCSVEl = document.getElementById("importCSV");

let charts = {};

// --------------------
// Add Product
// --------------------
window.addRecord = async () => {
  const product = productEl.value.trim();
  const store = storeEl.value.trim();
  const price = parseFloat(priceEl.value);
  if (!product || !store || !price) return alert("Please fill all fields");

  await addDoc(collection(db, "records"), {
    product: product.toLowerCase(),
    store: store.toLowerCase(),
    price,
    date: new Date().toISOString(),
    productOriginal: product,
    storeOriginal: store
  });

  productEl.value = "";
  priceEl.value = "";
  storeEl.value = "";

  showToast("Added!");
  window.searchProduct();
};

// --------------------
// DELETE (Swipe)
// --------------------
window.deleteRecord = async (id) => {
  await deleteDoc(doc(db, "records", id));
  showToast("Deleted");
  window.searchProduct();
};

// --------------------
// Chart Colors
// --------------------
function getChartColors() {
  const isDark = document.body.classList.contains('dark');
  return {
    lineBorder: isDark ? 'white' : '#007aff',
    lineBg: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,122,255,0.2)',
    barLowest: '#34c759',
    barOther: isDark ? '#64d2ff' : '#007aff'
  };
}

// --------------------
// Render Dashboard
// --------------------
function renderDashboard(records) {

  // remove skeleton
  dashboardDiv.innerHTML = "";

  const productMap = {};
  records.forEach(r => {
    if (!productMap[r.product]) productMap[r.product] = [];
    productMap[r.product].push(r);
  });

  for (let prod in productMap) {

    const recs = productMap[prod].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const latest = recs[0];
    const lowest = recs.reduce((m,r)=> r.price<m.price?r:m, recs[0]);

    const card = document.createElement("ion-card");

    card.innerHTML = `
      <ion-card-header>
        <ion-card-title>${latest.productOriginal}</ion-card-title>
      </ion-card-header>
      <ion-card-content>

        ${recs.map(r => `
          <ion-item-sliding>
            <ion-item>
              £${r.price} @ ${r.storeOriginal}
            </ion-item>

            <ion-item-options side="end">
              <ion-item-option color="danger" onclick="deleteRecord('${r.id}')">
                Delete
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        `).join("")}

        <canvas id="line-${prod}"></canvas>
        <canvas id="bar-${prod}"></canvas>

      </ion-card-content>
    `;

    dashboardDiv.appendChild(card);

    const colors = getChartColors();

    // Chart animation
    const lineCtx = document.getElementById(`line-${prod}`).getContext('2d');
    charts[`line-${prod}`] = new Chart(lineCtx, {
      type:'line',
      data:{
        labels: recs.map(r=>r.date.split("T")[0]),
        datasets:[{
          data: recs.map(r=>r.price),
          borderColor: colors.lineBorder,
          backgroundColor: colors.lineBg,
          tension: 0.4
        }]
      },
      options:{
        animation:{duration:800}
      }
    });

    const barCtx = document.getElementById(`bar-${prod}`).getContext('2d');
    charts[`bar-${prod}`] = new Chart(barCtx, {
      type:'bar',
      data:{
        labels: recs.map(r=>r.storeOriginal),
        datasets:[{
          data: recs.map(r=>r.price),
          backgroundColor: colors.barOther
        }]
      },
      options:{
        animation:{duration:800},
        plugins:{legend:{display:false}}
      }
    });
  }
}

// --------------------
// Search
// --------------------
window.searchProduct = async function() {

  // show skeleton
  dashboardDiv.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;

  const keyword = document.getElementById("search").value.trim().toLowerCase();

  const snapshot = await getDocs(collection(db, "records"));
  const records = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id; // ⭐重要
    records.push(data);
  });

  let filtered = records.filter(r =>
    (!keyword || r.product.includes(keyword))
  );

  renderDashboard(filtered);
};

// --------------------
// CSV Export / Import（保持）
// --------------------
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

// --------------------
document.addEventListener('DOMContentLoaded', window.searchProduct);
