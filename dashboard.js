const CASES = '#38bdf8', DEATHS = '#f43f5e', VAX = '#34d399', REPRO = '#fbbf24';
const CONTINENT_COLORS = { 'Asia':'#38bdf8','Europe':'#a78bfa','Africa':'#fbbf24','North America':'#34d399','South America':'#f472b6','Oceania':'#22d3ee' };
const COUNTRY_COLORS = ['#38bdf8','#f43f5e','#34d399','#fbbf24','#a78bfa','#f472b6','#22d3ee','#fb923c','#84cc16','#e879f9','#60a5fa','#facc15'];

function fmt(v, type='number') {
  if (v === undefined || v === null || isNaN(v)) return '—';
  if (type === 'currency') v = v; // unused here
  if (type === 'percent') return v.toFixed(1) + '%';
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v/1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (v/1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (v/1e3).toFixed(1) + 'K';
  return Math.round(v).toLocaleString();
}

// ---------------- KPIs ----------------
document.getElementById('last-date').textContent = DATA.kpis.latest_date;
document.getElementById('kpi-cases').textContent = fmt(DATA.kpis.total_cases);
document.getElementById('kpi-deaths').textContent = fmt(DATA.kpis.total_deaths);
document.getElementById('kpi-peak').textContent = fmt(DATA.kpis.peak_daily_cases);
document.getElementById('kpi-peak-date').textContent = 'on ' + DATA.kpis.peak_daily_cases_date;
document.getElementById('kpi-vax').textContent = fmt(DATA.kpis.avg_fully_vaccinated_pct, 'percent');

// ---------------- Animated Choropleth Map (Plotly) ----------------
const MONTHS = DATA.map_months;
let currentMetric = 'total_cases_per_million';
let currentMonthIdx = MONTHS.length - 1;
let playing = false;
let playTimer = null;

const METRIC_CONFIG = {
  total_cases_per_million: { colorscale: [[0,'#0c1322'],[0.25,'#0e3a5f'],[0.5,'#1488c2'],[0.75,'#38bdf8'],[1,'#bae6fd']], title: 'Cases / million' },
  total_deaths_per_million: { colorscale: [[0,'#0c1322'],[0.25,'#5c1224'],[0.5,'#9f1c3a'],[0.75,'#f43f5e'],[1,'#fda4af']], title: 'Deaths / million' },
  people_fully_vaccinated_per_hundred: { colorscale: [[0,'#0c1322'],[0.25,'#0c4a3a'],[0.5,'#0f9d72'],[0.75,'#34d399'],[1,'#a7f3d0']], title: 'Fully vaccinated %' }
};

function buildMapFrame(monthIdx, metric) {
  const month = MONTHS[monthIdx];
  const rows = DATA.map_frames[month] || [];
  return {
    locations: rows.map(r => r.iso_code),
    z: rows.map(r => r[metric]),
  };
}

function renderMap() {
  const frame = buildMapFrame(currentMonthIdx, currentMetric);
  const cfg = METRIC_CONFIG[currentMetric];
  const trace = {
    type: 'choropleth',
    locationmode: 'ISO-3',
    locations: frame.locations,
    z: frame.z,
    colorscale: cfg.colorscale,
    zmin: 0,
    zmax: currentMetric === 'people_fully_vaccinated_per_hundred' ? 100 : (currentMetric === 'total_cases_per_million' ? 250000 : 3000),
    marker: { line: { color: '#1d2944', width: 0.5 } },
    colorbar: { title: { text: cfg.title, font: { color:'#7c87a3', size:11 } }, tickfont: { color:'#7c87a3', size:10 }, thickness: 14, len: 0.75 },
    hovertemplate: '%{location}<br>' + cfg.title + ': %{z:,.1f}<extra></extra>'
  };
  const layout = {
    geo: {
      showframe: false,
      showcoastlines: false,
      projection: { type: 'natural earth' },
      bgcolor: 'rgba(0,0,0,0)',
      landcolor: '#161f38',
      showland: true,
      showocean: false,
      lakecolor: '#0c1322'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t:10, b:10, l:0, r:0 },
    font: { color: '#eef1f8' }
  };
  Plotly.react('map-container', [trace], layout, { responsive:true, displayModeBar:false });
  document.getElementById('month-label').textContent = MONTHS[currentMonthIdx];
}

document.getElementById('month-slider').max = MONTHS.length - 1;
document.getElementById('month-slider').value = currentMonthIdx;
document.getElementById('month-slider').addEventListener('input', (e) => {
  currentMonthIdx = parseInt(e.target.value);
  renderMap();
});

document.querySelectorAll('#map-metric-toggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#map-metric-toggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMetric = btn.dataset.metric;
    renderMap();
  });
});

document.getElementById('play-btn').addEventListener('click', () => {
  playing = !playing;
  document.getElementById('play-btn').textContent = playing ? '⏸' : '▶';
  if (playing) {
    playTimer = setInterval(() => {
      currentMonthIdx = (currentMonthIdx + 1) % MONTHS.length;
      document.getElementById('month-slider').value = currentMonthIdx;
      renderMap();
      if (currentMonthIdx === MONTHS.length - 1) {
        clearInterval(playTimer);
        playing = false;
        document.getElementById('play-btn').textContent = '▶';
      }
    }, 450);
  } else {
    clearInterval(playTimer);
  }
});

renderMap();

// ---------------- Global trend chart ----------------
const trendCtx = document.getElementById('chart-trend').getContext('2d');
new Chart(trendCtx, {
  type: 'line',
  data: {
    labels: DATA.world_trend.dates,
    datasets: [
      { label: 'New cases (smoothed)', data: DATA.world_trend.new_cases, borderColor: CASES, backgroundColor: CASES+'22', borderWidth: 1.6, pointRadius: 0, fill: true, tension: 0.25, yAxisID: 'y' },
      { label: 'New deaths (smoothed)', data: DATA.world_trend.new_deaths, borderColor: DEATHS, backgroundColor: DEATHS+'22', borderWidth: 1.6, pointRadius: 0, fill: true, tension: 0.25, yAxisID: 'y1' }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#7c87a3', usePointStyle: true, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { ticks: { color: '#4d5775', maxTicksLimit: 8, font:{size:10} }, grid: { color: '#1d2944' } },
      y: { position:'left', ticks: { color: CASES, callback: v=>fmt(v), font:{size:10} }, grid: { color: '#1d2944' } },
      y1: { position:'right', ticks: { color: DEATHS, callback: v=>fmt(v), font:{size:10} }, grid: { display:false } }
    }
  }
});

// ---------------- Reproduction rate chart ----------------
const reproCtx = document.getElementById('chart-repro').getContext('2d');
const reproData = DATA.world_trend.reproduction_rate.map(v => v === 0 ? null : v);
new Chart(reproCtx, {
  type: 'line',
  data: {
    labels: DATA.world_trend.dates,
    datasets: [{ label: 'Reproduction rate', data: reproData, borderColor: REPRO, backgroundColor: REPRO+'15', borderWidth: 1.6, pointRadius: 0, fill: true, tension: 0.25, spanGaps: true }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { ticks: { color: '#4d5775', maxTicksLimit: 8, font:{size:10} }, grid: { color: '#1d2944' } },
      y: { ticks: { color: '#7c87a3', font:{size:10} }, grid: { color: '#1d2944' }, suggestedMin: 0, suggestedMax: 2 }
    },
    plugins: {
      legend: { display:false },
      annotation: undefined
    }
  }
});

// ---------------- Country comparison chart with toggle chips ----------------
const chipContainer = document.getElementById('country-chips');
const activeCountries = new Set(DATA.top_countries.slice(0,5));
DATA.top_countries.forEach((country, i) => {
  const chip = document.createElement('div');
  chip.className = 'chip' + (activeCountries.has(country) ? ' active' : '');
  chip.textContent = country;
  chip.style.borderColor = COUNTRY_COLORS[i];
  if (activeCountries.has(country)) chip.style.background = COUNTRY_COLORS[i];
  chip.onclick = () => {
    if (activeCountries.has(country)) { activeCountries.delete(country); chip.classList.remove('active'); chip.style.background = 'var(--bg-panel-alt)'; }
    else { activeCountries.add(country); chip.classList.add('active'); chip.style.background = COUNTRY_COLORS[i]; }
    updateCountryChart();
  };
  chipContainer.appendChild(chip);
});

let countryChart;
function updateCountryChart() {
  const datasets = DATA.top_countries.map((country, i) => {
    if (!activeCountries.has(country)) return null;
    const s = DATA.country_series[country];
    return { label: country, data: s.dates.map((d,idx) => ({x:d, y:s.new_cases[idx]})), borderColor: COUNTRY_COLORS[i], backgroundColor: COUNTRY_COLORS[i]+'15', borderWidth: 1.8, pointRadius: 0, tension: 0.25 };
  }).filter(Boolean);

  if (countryChart) { countryChart.data.datasets = datasets; countryChart.update('none'); return; }

  const ctx = document.getElementById('chart-countries').getContext('2d');
  countryChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { display:false }, tooltip: { mode:'index', intersect:false } },
      scales: {
        x: { type:'category', ticks: { color:'#4d5775', maxTicksLimit: 10, font:{size:10} }, grid:{ color:'#1d2944' } },
        y: { ticks: { color:'#7c87a3', callback: v=>fmt(v), font:{size:10} }, grid:{ color:'#1d2944' } }
      }
    }
  });
}
updateCountryChart();

// ---------------- Continent stacked chart ----------------
const continentNames = Object.keys(DATA.continent_series);
const allMonths = [...new Set(continentNames.flatMap(c => DATA.continent_series[c].months))].sort();
const continentDatasets = continentNames.map(c => {
  const s = DATA.continent_series[c];
  const lookup = Object.fromEntries(s.months.map((m,i) => [m, s.new_cases[i]]));
  return { label: c, data: allMonths.map(m => lookup[m] || 0), backgroundColor: (CONTINENT_COLORS[c]||'#888')+'CC', borderRadius: 2 };
});
new Chart(document.getElementById('chart-continent').getContext('2d'), {
  type: 'bar',
  data: { labels: allMonths, datasets: continentDatasets },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color:'#7c87a3', usePointStyle:true, font:{size:11} } }, tooltip: { mode:'index', intersect:false } },
    scales: {
      x: { stacked:true, ticks: { color:'#4d5775', maxTicksLimit: 12, font:{size:9} }, grid:{ display:false } },
      y: { stacked:true, ticks: { color:'#7c87a3', callback: v=>fmt(v), font:{size:10} }, grid:{ color:'#1d2944' } }
    }
  }
});

// ---------------- Vaccination leaderboard ----------------
const vaxSorted = [...DATA.vax_data].sort((a,b) => a.people_fully_vaccinated_per_hundred - b.people_fully_vaccinated_per_hundred);
new Chart(document.getElementById('chart-vax').getContext('2d'), {
  type: 'bar',
  data: {
    labels: vaxSorted.map(r => r.location),
    datasets: [{ label: '% fully vaccinated', data: vaxSorted.map(r => r.people_fully_vaccinated_per_hundred), backgroundColor: VAX+'CC', borderRadius: 3 }]
  },
  options: {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display:false }, tooltip: { callbacks: { label: c => c.parsed.x + '%' } } },
    scales: {
      x: { ticks: { color:'#7c87a3', callback: v=>v+'%', font:{size:10} }, grid:{ color:'#1d2944' }, max:100 },
      y: { ticks: { color:'#7c87a3', font:{size:9.5} }, grid:{ display:false } }
    }
  }
});

// ---------------- Scatter: cases vs deaths per million ----------------
const scatterByContinent = {};
DATA.scatter_data.forEach(r => {
  if (!scatterByContinent[r.continent]) scatterByContinent[r.continent] = [];
  scatterByContinent[r.continent].push({ x: r.total_cases_per_million, y: r.total_deaths_per_million, label: r.location });
});
const scatterDatasets = Object.keys(scatterByContinent).map(cont => ({
  label: cont,
  data: scatterByContinent[cont],
  backgroundColor: (CONTINENT_COLORS[cont]||'#888')+'CC',
  pointRadius: 4,
  pointHoverRadius: 6
}));
new Chart(document.getElementById('chart-scatter').getContext('2d'), {
  type: 'scatter',
  data: { datasets: scatterDatasets },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color:'#7c87a3', usePointStyle:true, font:{size:11} } },
      tooltip: { callbacks: { label: c => `${c.raw.label}: ${fmt(c.raw.x)} cases/M, ${fmt(c.raw.y)} deaths/M` } }
    },
    scales: {
      x: { title: { display:true, text:'Total cases per million', color:'#7c87a3', font:{size:11} }, ticks: { color:'#4d5775', font:{size:10} }, grid:{ color:'#1d2944' } },
      y: { title: { display:true, text:'Total deaths per million', color:'#7c87a3', font:{size:11} }, ticks: { color:'#4d5775', font:{size:10} }, grid:{ color:'#1d2944' } }
    }
  }
});
