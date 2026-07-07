import { db, authReady } from './firebase.js';
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const productEl = document.getElementById("product");
const priceEl = document.getElementById("price");
const storeEl = document.getElementById("store");
const dashboardDiv = document.getElementById("dashboard");
const filterStoreEl = document.getElementById("filterStore");
const importCSVEl = document.getElementById("importCSV");
const searchEl = document.getElementById("search");

let charts = {};
let allRecords = []; // 本地 cache，避免每次 search 都重新 getDocs

// --------------------
// XSS Escape Helper
// --------------------
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// --------------------
// Chart cleanup helper (fix memory leak)
// --------------------
function destroyAllCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

// --------------------
// Fetch all records from Firestore (single source, cached in allRecords)
// --------------------
async function fetchAllRecords() {
  await authReady; // 等 Anonymous Auth 完成先讀寫 (配合 firestore.rules)
  const snapshot = await getDocs(collection(db, "records"));
  const records = [];
  snapshot.forEach(doc => records.push(doc.data()));
  allRecords = records;
  return records;
}

function populateStoreFilter(records) {
  const currentValue = filterStoreEl.value ?? "";
  const storeSet = new Set(records.map(r => r.store));
  filterStoreEl.innerHTML = '<ion-select-option value="">All Stores</ion-select-option>';
  storeSet.forEach(s => {
    filterStoreEl.innerHTML += `<ion-select-option value="${escapeHTML(s)}">${escapeHTML(s)}</ion-select-option>`;
  });
  // 保留返用戶原本揀嘅 filter（如果仲存在），避免每次 refresh 都彈返做 All Stores
  if ([...storeSet].includes(currentValue)) {
    filterStoreEl.value = currentValue;
  }
}

// --------------------
// Add Product
// --------------------
window.addRecord = async () => {
  const product = productEl.value.trim();
  const store = storeEl.value.trim();
  const price = parseFloat(priceEl.value);

  // Fix: 用 isNaN 檢查，容許 £0 贈品；擋走 NaN / 負數
  if (!product || !store || isNaN(price) || price < 0) {
    return alert("請填妥所有欄位（價錢必須係 0 或以上嘅數字）");
  }

  const productLower = product.toLowerCase();
  const storeLower = store.toLowerCase();

  const addBtn = document.getElementById("addBtn");
  if (addBtn) addBtn.disabled = true; // 防止重複提交

  try {
    await addDoc(collection(db, "records"), {
      product: productLower,
      store: storeLower,
      price,
      date: new Date().toISOString(),
      productOriginal: product,
      storeOriginal: store
    });

    productEl.value = "";
    priceEl.value = "";
    storeEl.value = "";

    await refreshAndRender();
  } catch (err) {
    console.error("[addRecord] failed:", err);
    alert("新增失敗，請檢查網絡連線後再試一次。");
  } finally {
    if (addBtn) addBtn.disabled = false;
  }
};

// --------------------
// Chart Colors
// --------------------
function getChartColors() {
  const isDark = document.body.classList.contains('dark');
  return {
    lineBorder: isDark ? 'white' : 'blue',
    lineBg: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,255,0.2)',
    barLowest: 'green',
    barOther: isDark ? 'lightblue' : 'blue'
  };
}

// --------------------
// Render Dashboard
// --------------------
function renderDashboard(records) {
  destroyAllCharts(); // Fix: 每次 render 前徹底清哂舊 chart，避免 memory leak
  dashboardDiv.innerHTML = "";

  if (!records.length) {
    dashboardDiv.innerHTML = `<p style="padding:10px;">未有任何紀錄，喺上面新增一筆啦。</p>`;
    return;
  }

  const productMap = {};
  records.forEach(r => {
    if (!productMap[r.product]) productMap[r.product] = [];
    productMap[r.product].push(r);
  });

  for (let prod in productMap) {
    const recs = productMap[prod].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = recs[0];
    const lowest = recs.reduce((m, r) => r.price < m.price ? r : m, recs[0]);

    // storeStats: 記錄「每間 store 嘅最低價」，同時記錄「嗰個價係咪嚟自最新一次購買」
    const storeStats = {};
    recs.forEach(r => {
      if (!storeStats[r.store] || r.price < storeStats[r.store].price) {
        storeStats[r.store] = { price: r.price, isLatestPurchase: false };
      }
    });
    // Fix logic: 只有「嗰間 store 顯示緊嘅價錢」真係嚟自最新一次購買時，先標記做 latest
    if (storeStats[latest.store] && storeStats[latest.store].price === latest.price) {
      storeStats[latest.store].isLatestPurchase = true;
    }

    const card = document.createElement("ion-card");

    // Store Table -- Fix: escape user input 防止 stored XSS
    let tableHTML = `<table class="store-table"><tr><th>Store</th><th>Lowest Price</th></tr>`;
    for (let s in storeStats) {
      const { price, isLatestPurchase } = storeStats[s];
      const cls = price === lowest.price ? 'lowest' : (isLatestPurchase ? 'latest' : '');
      tableHTML += `<tr><td>${escapeHTML(s)}</td><td class="${cls}">£${price}</td></tr>`;
    }
    tableHTML += `</table>`;

    card.innerHTML = `
      <ion-card-header><ion-card-title>${escapeHTML(latest.productOriginal)}</ion-card-title></ion-card-header>
      <ion-card-content>
        <p>Latest: £${latest.price} @ ${escapeHTML(latest.storeOriginal)} (${latest.date.split("T")[0]})</p>
        <p>Lowest: £${lowest.price} @ ${escapeHTML(lowest.storeOriginal)} (${lowest.date.split("T")[0]})</p>
        ${tableHTML}
        <canvas id="line-${prod}" style="margin-top:10px;"></canvas>
        <canvas id="bar-${prod}" style="margin-top:10px;"></canvas>
      </ion-card-content>
    `;
    dashboardDiv.appendChild(card);

    const colors = getChartColors();

    // Line Chart
    const lineCtx = document.getElementById(`line-${prod}`).getContext('2d');
    charts[`line-${prod}`] = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: recs.map(r => r.date.split("T")[0]),
        datasets: [{
          label: 'Price Trend',
          data: recs.map(r => r.price),
          borderColor: colors.lineBorder,
          backgroundColor: colors.lineBg
        }]
      }
    });

    // Bar Chart
    const barCtx = document.getElementById(`bar-${prod}`).getContext('2d');
    const storeNames = Object.keys(storeStats);
    charts[`bar-${prod}`] = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: storeNames,
        datasets: [{
          label: 'Lowest Price',
          data: storeNames.map(s => storeStats[s].price),
          backgroundColor: storeNames.map(s => storeStats[s].price === lowest.price ? colors.barLowest : colors.barOther)
        }]
      },
      options: { plugins: { legend: { display: false } } }
    });
  }
}

// --------------------
// Apply current search + filter on cached allRecords (本地 filter，唔再重新 fetch)
// --------------------
function applyFilters() {
  const keyword = searchEl.value.trim().toLowerCase();
  const storeFilter = filterStoreEl.value ?? "";

  const filtered = allRecords.filter(r =>
    (!keyword || r.product.includes(keyword)) &&
    (!storeFilter || r.store === storeFilter)
  );

  renderDashboard(filtered);
}

// --------------------
// Debounce helper (避免每次 keystroke 都觸發 render / re-fetch)
// --------------------
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
const debouncedApplyFilters = debounce(applyFilters, 250);

// --------------------
// 對外公開：新增/CSV import 之後用嚟重新讀取 Firestore + 重新 render
// --------------------
async function refreshAndRender() {
  const records = await fetchAllRecords();
  populateStoreFilter(records);
  applyFilters(); // 保留現有 search / filter 狀態，唔會自動 reset
}

// searchProduct 保留做 window 方法，向下相容 (index.html 冇改的話仍然行得通)
window.searchProduct = async function () {
  await refreshAndRender();
};

// --------------------
// Export CSV
// --------------------
window.exportCSV = async () => {
  if (!allRecords.length) return alert("No data");

  let csv = "product,store,price,date\n";
  allRecords.forEach(r => csv += `${r.productOriginal},${r.storeOriginal},${r.price},${r.date}\n`);

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shopping.csv";
  a.click();
  URL.revokeObjectURL(url);
};

// --------------------
// Import CSV
// --------------------
importCSVEl.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.split("\n").slice(1);

  let successCount = 0;
  let skippedCount = 0;

  for (let line of lines) {
    if (!line.trim()) continue;
    const [product, store, price, date] = line.split(",");
    const parsedPrice = parseFloat(price);

    // Fix: 加返 isNaN 檢查，避免垃圾價錢寫入 Firestore
    if (!product || !store || isNaN(parsedPrice) || parsedPrice < 0) {
      skippedCount++;
      continue;
    }

    // Fix: 驗證 date 欄位，避免 Invalid Date 影響排序
    const parsedDate = date && !isNaN(new Date(date).getTime()) ? new Date(date).toISOString() : new Date().toISOString();

    try {
      await addDoc(collection(db, "records"), {
        product: product.toLowerCase().trim(),
        store: store.toLowerCase().trim(),
        price: parsedPrice,
        date: parsedDate,
        productOriginal: product.trim(),
        storeOriginal: store.trim()
      });
      successCount++;
    } catch (err) {
      console.error("[importCSV] row failed:", err);
      skippedCount++;
    }
  }

  alert(`匯入完成：成功 ${successCount} 筆，跳過 ${skippedCount} 筆（格式錯誤或寫入失敗）。`);
  importCSVEl.value = ""; // 清空 input，容許重複匯入同一個檔案
  await refreshAndRender();
});

// --------------------
// Search / Filter events
// --------------------
searchEl.addEventListener('ionInput', debouncedApplyFilters);
filterStoreEl.addEventListener('ionChange', applyFilters);

// --------------------
// ⚡ Reliable Initialization (Ionic-friendly)
// --------------------
async function initializeDashboard() {
  try {
    const records = await fetchAllRecords();

    // Wait a short moment to let Ionic render the select
    setTimeout(() => {
      populateStoreFilter(records);
      renderDashboard(records);
    }, 50);
  } catch (err) {
    console.error("[initializeDashboard] failed:", err);
    dashboardDiv.innerHTML = `<p style="padding:10px;color:red;">讀取資料失敗，請檢查網絡連線後重新整理頁面。</p>`;
  }
}

// --------------------
// DOM Loaded
// --------------------
document.addEventListener('DOMContentLoaded', initializeDashboard);
