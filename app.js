function getChartColors() {
  const isDark = document.body.classList.contains('dark');
  return {
    lineBorder: isDark ? 'white' : 'blue',
    lineBg: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,255,0.2)',
    barLowest: 'green',
    barOther: isDark ? 'lightblue' : 'blue'
  };
}

// 初始化/更新 Dashboard
async function renderDashboard(filteredRecords) {
  dashboardDiv.innerHTML = "";
  const productMap = {};
  filteredRecords.forEach(r => {
    if (!productMap[r.product]) productMap[r.product] = [];
    productMap[r.product].push(r);
  });

  for (let prod in productMap) {
    const recs = productMap[prod].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const latest = recs[0];
    const lowest = recs.reduce((m,r)=> r.price<m.price?r:m, recs[0]);

    // Store Stats
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

    // Chart Colors
    const colors = getChartColors();

    // Line Chart
    const lineCtx = document.getElementById(`line-${prod}`).getContext('2d');
    if (charts[`line-${prod}`]) charts[`line-${prod}`].destroy();
    charts[`line-${prod}`] = new Chart(lineCtx, {
      type:'line',
      data:{labels: recs.map(r=>r.date.split("T")[0]), datasets:[{
        label:'Price Trend',
        data: recs.map(r=>r.price),
        borderColor: colors.lineBorder,
        backgroundColor: colors.lineBg
      }]}
    });

    // Bar Chart
    const barCtx = document.getElementById(`bar-${prod}`).getContext('2d');
    if (charts[`bar-${prod}`]) charts[`bar-${prod}`].destroy();
    charts[`bar-${prod}`] = new Chart(barCtx, {
      type:'bar',
      data:{
        labels:Object.keys(storeStats),
        datasets:[{
          label:'Lowest Price',
          data:Object.values(storeStats),
          backgroundColor:Object.values(storeStats).map(p=> p===lowest.price ? colors.barLowest : colors.barOther)
        }]
      },
      options:{plugins:{legend:{display:false}}}
    });
  }
}

// Dark/Light Mode 切換時自動刷新 Charts
window.toggleDarkMode = () => {
  document.body.classList.toggle('dark');
  searchProduct(); // 重新渲染 Dashboard 以更新 Chart 顏色
};
