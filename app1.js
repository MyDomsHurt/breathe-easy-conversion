const DATA = window.DASHBOARD_DATA;
const COLORS = {
  'Referral': '#4ECDC4',
  'Affiliate': '#F4A261',
  'Website': '#9B8AA6',
  'Facebook': '#6B9AC4',
  'Instagram': '#E07A7A',
  'Meta Ads': '#7BA38A',
  'Unspecified': '#B8A99A'
};

const streamOrder = ['Referral', 'Affiliate', 'Website', 'Facebook', 'Instagram', 'Meta Ads', 'Unspecified'];
let active = new Set(streamOrder);
let weeklyActive = new Set(streamOrder);

const plotFont = { family: 'Nunito, sans-serif', color: '#2D2A26', size: 13 };
const softLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: plotFont,
  margin: { t: 36, r: 12, b: 48, l: 42 },
  hovermode: 'x unified'
};

const MIN_DATE = DATA.minDate || (DATA.pie && DATA.pie.minDate) || '2025-09-18';
const MAX_DATE = DATA.maxDate || (DATA.pie && DATA.pie.maxDate) || '2026-08-12';

function monthKey(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return y + '-' + m;
}

function setPillActive(scope, id) {
  document.querySelectorAll('.date-row[data-scope="' + scope + '"] .date-btn').forEach(b => b.classList.remove('active'));
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }
}

function wireDatePicker(prefix, scope, onChange, defaultMode) {
  const startEl = document.getElementById(prefix + 'Start');
  const endEl = document.getElementById(prefix + 'End');
  if (!startEl || !endEl) return;
  startEl.min = MIN_DATE; startEl.max = MAX_DATE;
  endEl.min = MIN_DATE; endEl.max = MAX_DATE;

  function applyPreset(mode) {
    if (mode === 'all') {
      startEl.value = MIN_DATE; endEl.value = MAX_DATE;
      setPillActive(scope, prefix + 'All');
    } else if (mode === '90') {
      const end = new Date(MAX_DATE);
      const start = new Date(end);
      start.setDate(start.getDate() - 90);
      startEl.value = start.toISOString().slice(0, 10);
      endEl.value = MAX_DATE;
      setPillActive(scope, prefix + '90');
    } else if (mode === 'ytd') {
      startEl.value = '2026-01-01';
      endEl.value = MAX_DATE;
      setPillActive(scope, prefix + 'YTD');
    }
    onChange();
  }

  document.getElementById(prefix + 'Apply').addEventListener('click', () => {
    setPillActive(scope, prefix + 'Apply');
    onChange();
  });
  document.getElementById(prefix + 'All').addEventListener('click', () => applyPreset('all'));
  document.getElementById(prefix + '90').addEventListener('click', () => applyPreset('90'));
  document.getElementById(prefix + 'YTD').addEventListener('click', () => applyPreset('ytd'));
  startEl.addEventListener('change', () => setPillActive(scope, null));
  endEl.addEventListener('change', () => setPillActive(scope, null));

  applyPreset(defaultMode || 'all');
}

function initAllDatePickers() {
  wireDatePicker('weekly', 'weekly', function () { drawWeekly(); drawRate(); }, '90');
  wireDatePicker('stream', 'stream', function () {
    drawStreamChart(); drawVol(); renderTable(); renderStreamKPIs();
  }, 'all');
  wireDatePicker('pie', 'pie', function () { drawPie(); }, 'all');
}
window.initAllDatePickers = initAllDatePickers;

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + btn.dataset.section).classList.add('active');
    if (btn.dataset.section === 'weekly') {
      drawWeekly(); drawRate();
    } else if (btn.dataset.section === 'streams') {
      drawStreamChart(); drawVol(); renderTable(); renderStreamKPIs();
    } else if (btn.dataset.section === 'customers') {
      drawPie();
    }
  });
});

function getWeeklyDateBounds() {
  const startEl = document.getElementById('weeklyStart');
  const endEl = document.getElementById('weeklyEnd');
  return {
    start: startEl && startEl.value ? startEl.value : MIN_DATE,
    end: endEl && endEl.value ? endEl.value : MAX_DATE
  };
}

function getStreamMonthBounds() {
  const startEl = document.getElementById('streamStart');
  const endEl = document.getElementById('streamEnd');
  return {
    startM: monthKey(startEl && startEl.value ? startEl.value : MIN_DATE),
    endM: monthKey(endEl && endEl.value ? endEl.value : MAX_DATE)
  };
}

function getWeeklyFiltered() {
  const w = DATA.weekly;
  const bounds = getWeeklyDateBounds();
  const indices = [];
  for (let i = 0; i < w.weekStarts.length; i++) {
    const ws = w.weekStarts[i];
    if (ws >= bounds.start && ws <= bounds.end) indices.push(i);
  }
  const labels = indices.map(i => w.labels[i]);
  const n = indices.length;
  const newC = new Array(n).fill(0);
  const withD = new Array(n).fill(0);
  weeklyActive.forEach(s => {
    const st = w.by_stream[s];
    if (!st) return;
    indices.forEach((srcIdx, j) => {
      newC[j] += st.new_contacts[srcIdx] || 0;
      withD[j] += st.with_deal[srcIdx] || 0;
    });
  });
  const rates = newC.map((c, i) => c >= 5 ? Math.round(withD[i] / c * 1000) / 10 : null);
  const totalNew = newC.reduce((a, b) => a + b, 0);
  const totalDeal = withD.reduce((a, b) => a + b, 0);
  return {
    labels,
    new_contacts: newC,
    with_deal: withD,
    deal_rate: rates,
    total_new: totalNew,
    total_with_deal: totalDeal,
    overall_rate: totalNew > 0 ? Math.round(totalDeal / totalNew * 1000) / 10 : 0,
    rangeLabel: bounds.start.slice(0, 7) + ' → ' + bounds.end.slice(0, 7)
  };
}

function updateWeeklyKPIs(f) {
  document.getElementById('kpi-total-new').textContent = f.total_new.toLocaleString();
  document.getElementById('kpi-with-deal').textContent = f.total_with_deal.toLocaleString();
  document.getElementById('kpi-rate').textContent = f.overall_rate + '%';
  const rangeEl = document.getElementById('kpi-weekly-range');
  if (rangeEl) rangeEl.textContent = f.rangeLabel || 'Selected streams';
}

function drawWeekly() {
  const f = getWeeklyFiltered();
  updateWeeklyKPIs(f);
  if (!f.labels.length) {
    Plotly.newPlot('weeklyChart', [], Object.assign({}, softLayout, { annotations: [{ text: 'No weeks in range', showarrow: false }] }), {responsive: true, displayModeBar: false});
    return;
  }
  const step = f.labels.length > 20 ? 3 : (f.labels.length > 12 ? 2 : 1);
  const ticktext = f.labels.map((lab, i) => (i % step === 0 ? lab : ''));
  const traces = [
    {
      x: f.labels, y: f.new_contacts, name: 'New Contacts',
      type: 'scatter', mode: 'lines+markers',
      line: { color: '#FF7A45', width: 2.8, shape: 'spline' },
      marker: { size: 7, color: '#FF7A45' },
      hovertemplate: '<b>New Contacts</b><br>%{x}<br>%{y}<extra></extra>'
    },
    {
      x: f.labels, y: f.with_deal, name: 'With a Deal',
      type: 'scatter', mode: 'lines+markers',
      line: { color: '#2A9D8F', width: 2.8, shape: 'spline' },
      marker: { size: 7, color: '#2A9D8F' },
      hovertemplate: '<b>With a Deal</b><br>%{x}<br>%{y}<extra></extra>'
    }
  ];
  const layout = Object.assign({}, softLayout, {
    margin: { t: 40, r: 8, b: 40, l: 40 },
    xaxis: {
      tickmode: 'array', tickvals: f.labels, ticktext: ticktext,
      tickfont: { size: 11, color: '#8A8178' },
      showgrid: false, zeroline: false, showline: false, fixedrange: true
    },
    yaxis: {
      title: { text: '', font: { size: 11 } },
      tickfont: { size: 11, color: '#8A8178' },
      gridcolor: 'rgba(138,129,120,0.22)', gridwidth: 1,
      zeroline: false, showline: false, fixedrange: true, nticks: 6, separatethousands: true
    },
    legend: {
      orientation: 'h', y: 1.15, x: 0, xanchor: 'left',
      font: { size: 12, color: '#2D2A26' }, bgcolor: 'rgba(0,0,0,0)'
    }
  });
  Plotly.newPlot('weeklyChart', traces, layout, {responsive: true, displayModeBar: false});
}

function drawRate() {
  const f = getWeeklyFiltered();
  if (!f.labels.length) {
    Plotly.newPlot('rateChart', [], Object.assign({}, softLayout, { annotations: [{ text: 'No weeks in range', showarrow: false }] }), {responsive: true, displayModeBar: false});
    return;
  }
  const step = f.labels.length > 20 ? 3 : (f.labels.length > 12 ? 2 : 1);
  const ticktext = f.labels.map((lab, i) => (i % step === 0 ? lab : ''));
  const yVals = f.deal_rate.map(r => r);
  const valid = yVals.filter(v => v != null);
  const peak = valid.length ? Math.max(...valid) : 0;
  let maxY, dt;
  if (peak <= 25) { maxY = 30; dt = 5; }
  else if (peak <= 50) { maxY = Math.ceil(peak / 10) * 10 + 10; dt = 10; }
  else if (peak <= 80) { maxY = Math.ceil(peak / 20) * 20 + 20; dt = 20; }
  else { maxY = 100; dt = 25; }
  const trace = [{
    x: f.labels, y: yVals, name: 'Deal Rate',
    type: 'scatter', mode: 'lines+markers',
    line: { color: '#E76F51', width: 2.5, shape: 'spline' },
    marker: { size: 7, color: '#E76F51' },
    fill: 'tozeroy', fillcolor: 'rgba(231, 111, 81, 0.09)',
    hovertemplate: '%{x}<br>%{y:.0f}%<extra></extra>',
    connectgaps: false
  }];
  const layout = Object.assign({}, softLayout, {
    margin: { t: 16, r: 8, b: 36, l: 40 },
    xaxis: {
      tickmode: 'array', tickvals: f.labels, ticktext: ticktext,
      tickfont: { size: 11, color: '#8A8178' },
      showgrid: false, zeroline: false, showline: false, fixedrange: true
    },
    yaxis: {
      title: { text: '', font: { size: 11 } },
      tickfont: { size: 11, color: '#8A8178' }, ticksuffix: '%',
      gridcolor: 'rgba(138,129,120,0.22)',
      zeroline: false, showline: false, range: [0, maxY], dtick: dt, fixedrange: true
    },
    showlegend: false
  });
  Plotly.newPlot('rateChart', trace, layout, {responsive: true, displayModeBar: false});
}

function renderWeeklyToggles() {
  const el = document.getElementById('weeklyToggles');
  el.innerHTML = streamOrder.map(s => {
    const on = weeklyActive.has(s);
    return `<label class="toggle ${on ? 'active' : ''}">
      <input type="checkbox" ${on ? 'checked' : ''} data-stream="${s}">
      <span style="width:9px;height:9px;border-radius:50%;background:${COLORS[s]}"></span>
      ${s}
    </label>`;
  }).join('');
  el.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', e => {
      const s = e.target.dataset.stream;
      if (e.target.checked) weeklyActive.add(s); else weeklyActive.delete(s);
      e.target.closest('.toggle').classList.toggle('active', e.target.checked);
      drawWeekly();
      drawRate();
    });
  });
}

function getStreamFilteredIndices() {
  const S = DATA.stream;
  const b = getStreamMonthBounds();
  const indices = [];
  for (let i = 0; i < S.months.length; i++) {
    const m = S.months[i];
    if (m >= b.startM && m <= b.endM) indices.push(i);
  }
  return indices;
}

function renderStreamKPIs() {
  const row = document.getElementById('streamKpis');
  if (!row) return;
  const S = DATA.stream;
  const indices = getStreamFilteredIndices();
  const order = ['Referral', 'Affiliate', 'Website', 'Facebook', 'Instagram', 'Meta Ads', 'Unspecified'];
  row.innerHTML = order.map(s => {
    let total = 0, deals = 0;
    indices.forEach(i => {
      total += S.streams[s].total[i] || 0;
      deals += S.streams[s].with_deal[i] || 0;
    });
    const rate = total > 0 ? Math.round(deals / total * 1000) / 10 : null;
    return `<div class="kpi">
      <div class="label">${s}</div>
      <div class="value" style="color:${COLORS[s]}">${rate != null ? rate + '%' : '—'}</div>
      <div class="sub">${total.toLocaleString()} contacts</div>
    </div>`;
  }).join('');
}

renderWeeklyToggles();
