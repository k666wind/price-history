let records = JSON.parse(localStorage.getItem('records')) || [];
let product = '', price = '', store = '';
let searchText = '';

// Add entry
function addEntry() {
  if(!product || !price || !store) return alert("Fill all fields!");
  records.push({ product, price: Number(price), store, date: new Date().toISOString() });
  saveRecords();
  clearInputs();
  renderChart();
}

// Remove entry
function removeEntry(record) {
  records = records.filter(r => r !== record);
  saveRecords();
  renderChart();
}

// Save to localStorage
function saveRecords() {
  localStorage.setItem('records', JSON.stringify(records));
}

// Clear input fields
function clearInputs() {
  product = price = store = '';
  document.querySelectorAll('ion-input').forEach(input => input.value = '');
}

// Filtered records by search
function filteredRecords() {
  return records.filter(r => !searchText || r.product.toLowerCase().includes(searchText.toLowerCase()));
}

// Chart
function renderChart() {
  const ctx = document.getElementById('priceChart').getContext('2d');
  if(window.priceChart) window.priceChart.destroy();
  const labels = records.map(r => r.product);
  const data = records.map(r => r.price);
  window.priceChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets:[{ label:'Price', data, borderColor:'#007aff', fill:false }] }
  });
}

// Initialize chart
document.addEventListener('DOMContentLoaded', renderChart);
