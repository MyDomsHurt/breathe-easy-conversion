const DATA = window.DASHBOARD_DATA;
const COLORS = {
  'Referral': '#4ECDC4', 'Affiliate': '#F4A261', 'Website': '#9B8AA6',
  'Facebook': '#6B9AC4', 'Instagram': '#E07A7A', 'Meta Ads': '#7BA38A', 'Unspecified': '#B8A99A'
};
const streamOrder = ['Referral', 'Affiliate', 'Website', 'Facebook', 'Instagram', 'Meta Ads', 'Unspecified'];
let active = new Set(streamOrder);
let weeklyActive = new Set(streamOrder);
const plotFont = { family: 'Nunito, sans-serif', color: '#2D2A26', size: 13 };
const softLayout = { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: plotFont, margin: { t: 36, r: 12, b: 48, l: 42 }, hovermode: 'x unified' };
const MIN_DATE = DATA.minDate || '2025-09-18';
const MAX_DATE = DATA.maxDate || '2026-08-12';

function monthKey(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 7);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthName(yyyyMm) { return MONTH_NAMES[parseInt(yyyyMm.slice(5, 7), 10) - 1]; }
function fullMonthLabel(yyyyMm) { return monthName(yyyyMm) + ' ' + yyyyMm.slice(0, 4); }
function monthDate(yyyyMm) { return yyyyMm + '-01'; }

function dateTickText(dates) {
  const years = new Set(dates.map(d => d.slice(0, 4)));
  return dates.map((d, i) => {
    const lab = parseInt(d.slice(8, 10), 10) + ' ' + monthName(d.slice(0, 7));
    if (years.size > 1 && (i === 0 || d.slice(0, 4) !== dates[i - 1].slice(0, 4))) return lab + ' ' + d.slice(0, 4);
    return lab;
  });
}

function dateAxis(dates) {
  const n = dates.length;
  const step = n > 12 ? Math.ceil(n / 12) : 1;
  const tickvals = dates.filter((_, i) => i % step === 0 || i === n - 1);
  return {
    type: 'date',
    tickmode: 'array',
    tickvals,
    ticktext: dateTickText(tickvals),
    tickfont: { size: 11, color: '#8A8178' },
    showgrid: false, zeroline: false, showline: false, fixedrange: true, automargin: true,
    hoverformat: '%d %b %Y'
  };
}

function updateSubtitle() {
  const el = document.getElementById('dash-subtitle');
  if (!el || !DATA || !DATA.generated) return;
  const p = DATA.generated.split('-');
  if (p.length !== 3) return;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  el.textContent = 'A calm view of your contacts & conversions · ' + parseInt(p[2],10) + ' ' + months[parseInt(p[1],10)-1] + ' ' + p[0];
}
window.updateSubtitle = updateSubtitle;

function setPillActive(scope, id) {
  document.querySelectorAll('.date-row[data-scope="'+scope+'"] .date-btn').forEach(b => b.classList.remove('active'));
  if (id) { const el = document.getElementById(id); if (el) el.classList.add('active'); }
}

function wireDatePicker(prefix, scope, onChange, defaultMode) {
  const startEl = document.getElementById(prefix + 'Start');
  const endEl = document.getElementById(prefix + 'End');
  if (!startEl || !endEl) return;
  startEl.min = MIN_DATE; startEl.max = MAX_DATE; endEl.min = MIN_DATE; endEl.max = MAX_DATE;
  function applyPreset(mode) {
    if (mode === 'all') { startEl.value = MIN_DATE; endEl.value = MAX_DATE; setPillActive(scope, prefix+'All'); }
    else if (mode === '90') {
      const end = new Date(MAX_DATE); const start = new Date(end); start.setDate(start.getDate()-90);
      startEl.value = start.toISOString().slice(0,10); endEl.value = MAX_DATE; setPillActive(scope, prefix+'90');
    } else if (mode === 'ytd') { startEl.value = '2026-01-01'; endEl.value = MAX_DATE; setPillActive(scope, prefix+'YTD'); }
    onChange();
  }
  document.getElementById(prefix+'Apply').addEventListener('click', () => { setPillActive(scope, prefix+'Apply'); onChange(); });
  document.getElementById(prefix+'All').addEventListener('click', () => applyPreset('all'));
  document.getElementById(prefix+'90').addEventListener('click', () => applyPreset('90'));
  document.getElementById(prefix+'YTD').addEventListener('click', () => applyPreset('ytd'));
  startEl.addEventListener('change', () => setPillActive(scope, null));
  endEl.addEventListener('change', () => setPillActive(scope, null));
  applyPreset(defaultMode || 'all');
}

function initAllDatePickers() {
  wireDatePicker('weekly', 'weekly', () => { drawWeekly(); drawRate(); }, '90');
  wireDatePicker('stream', 'stream', () => { drawStreamChart(); drawVol(); renderTable(); renderStreamKPIs(); }, 'all');
  wireDatePicker('pie', 'pie', () => { drawPie(); }, 'all');
}
window.initAllDatePickers = initAllDatePickers;

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + btn.dataset.section).classList.add('active');
    if (btn.dataset.section === 'weekly') { drawWeekly(); drawRate(); }
    else if (btn.dataset.section === 'streams') { drawStreamChart(); drawVol(); renderTable(); renderStreamKPIs(); }
    else if (btn.dataset.section === 'customers') { drawPie(); }
  });
});

function getWeeklyDateBounds() {
  const s = document.getElementById('weeklyStart'), e = document.getElementById('weeklyEnd');
  return { start: s && s.value ? s.value : MIN_DATE, end: e && e.value ? e.value : MAX_DATE };
}
function getStreamMonthBounds() {
  const s = document.getElementById('streamStart'), e = document.getElementById('streamEnd');
  return { startM: monthKey(s && s.value ? s.value : MIN_DATE), endM: monthKey(e && e.value ? e.value : MAX_DATE) };
}

function getStreamDateBounds() {
  const s = document.getElementById('streamStart'), e = document.getElementById('streamEnd');
  return { start: s && s.value ? s.value : MIN_DATE, end: e && e.value ? e.value : MAX_DATE };
}

function getStreamWeeklyFiltered() {
  const w = DATA.weekly, bounds = getStreamDateBounds(), indices = [];
  for (let i = 0; i < w.weekStarts.length; i++) {
    if (w.weekStarts[i] >= bounds.start && w.weekStarts[i] <= bounds.end) indices.push(i);
  }
  return { weekStarts: indices.map(i => w.weekStarts[i]), indices };
}

function getWeeklyFiltered() {
  const w = DATA.weekly, bounds = getWeeklyDateBounds(), indices = [];
  for (let i = 0; i < w.weekStarts.length; i++) {
    if (w.weekStarts[i] >= bounds.start && w.weekStarts[i] <= bounds.end) indices.push(i);
  }
  const labels = indices.map(i => w.labels[i]), n = indices.length;
  const weekStarts = indices.map(i => w.weekStarts[i]);
  const newC = new Array(n).fill(0), withD = new Array(n).fill(0);
  weeklyActive.forEach(s => {
    const st = w.by_stream[s]; if (!st) return;
    indices.forEach((srcIdx, j) => { newC[j] += st.new_contacts[srcIdx]||0; withD[j] += st.with_deal[srcIdx]||0; });
  });
  const rates = newC.map((c,i) => c >= 5 ? Math.round(withD[i]/c*1000)/10 : null);
  const totalNew = newC.reduce((a,b)=>a+b,0), totalDeal = withD.reduce((a,b)=>a+b,0);
  return { labels, weekStarts, new_contacts: newC, with_deal: withD, deal_rate: rates, total_new: totalNew, total_with_deal: totalDeal,
    overall_rate: totalNew > 0 ? Math.round(totalDeal/totalNew*1000)/10 : 0,
    rangeLabel: bounds.start.slice(0,7) + ' → ' + bounds.end.slice(0,7) };
}

function updateWeeklyKPIs(f) {
  document.getElementById('kpi-total-new').textContent = f.total_new.toLocaleString();
  document.getElementById('kpi-with-deal').textContent = f.total_with_deal.toLocaleString();
  document.getElementById('kpi-rate').textContent = f.overall_rate + '%';
  const r = document.getElementById('kpi-weekly-range'); if (r) r.textContent = f.rangeLabel || 'Selected streams';
}

function drawWeekly() {
  const f = getWeeklyFiltered(); updateWeeklyKPIs(f);
  if (!f.labels.length) { Plotly.newPlot('weeklyChart', [], Object.assign({}, softLayout, {annotations:[{text:'No weeks in range',showarrow:false}]}), {responsive:true,displayModeBar:false}); return; }
  const x = f.weekStarts || f.labels;
  const traces = [
    { x, y:f.new_contacts, name:'New Contacts', type:'scatter', mode:'lines+markers', line:{color:'#FF7A45',width:2.8,shape:'spline'}, marker:{size:7,color:'#FF7A45'}, hovertemplate:'<b>New Contacts</b><br>%{x|%d %b %Y}<br>%{y}<extra></extra>' },
    { x, y:f.with_deal, name:'With a Deal', type:'scatter', mode:'lines+markers', line:{color:'#2A9D8F',width:2.8,shape:'spline'}, marker:{size:7,color:'#2A9D8F'}, hovertemplate:'<b>With a Deal</b><br>%{x|%d %b %Y}<br>%{y}<extra></extra>' }
  ];
  const layout = Object.assign({}, softLayout, {
    margin:{t:40,r:8,b:40,l:40},
    xaxis: dateAxis(x),
    yaxis:{title:{text:'',font:{size:11}},tickfont:{size:11,color:'#8A8178'},gridcolor:'rgba(138,129,120,0.22)',zeroline:false,showline:false,fixedrange:true,nticks:6,separatethousands:true},
    legend:{orientation:'h',y:1.15,x:0,xanchor:'left',font:{size:12},bgcolor:'rgba(0,0,0,0)'}
  });
  Plotly.newPlot('weeklyChart', traces, layout, {responsive:true,displayModeBar:false});
}

function drawRate() {
  const f = getWeeklyFiltered();
  if (!f.labels.length) { Plotly.newPlot('rateChart', [], Object.assign({}, softLayout, {annotations:[{text:'No weeks in range',showarrow:false}]}), {responsive:true,displayModeBar:false}); return; }
  const x = f.weekStarts || f.labels;
  const yVals = f.deal_rate, valid = yVals.filter(v => v != null), peak = valid.length ? Math.max(...valid) : 0;
  let maxY, dt;
  if (peak <= 25) { maxY=30; dt=5; } else if (peak <= 50) { maxY=Math.ceil(peak/10)*10+10; dt=10; }
  else if (peak <= 80) { maxY=Math.ceil(peak/20)*20+20; dt=20; } else { maxY=100; dt=25; }
  const layout = Object.assign({}, softLayout, {
    margin:{t:16,r:8,b:36,l:40},
    xaxis: dateAxis(x),
    yaxis:{title:{text:'',font:{size:11}},tickfont:{size:11,color:'#8A8178'},ticksuffix:'%',gridcolor:'rgba(138,129,120,0.22)',zeroline:false,showline:false,range:[0,maxY],dtick:dt,fixedrange:true},
    showlegend:false
  });
  Plotly.newPlot('rateChart', [{ x, y:yVals, name:'Deal Rate', type:'scatter', mode:'lines+markers', line:{color:'#E76F51',width:2.5,shape:'spline'}, marker:{size:7,color:'#E76F51'}, fill:'tozeroy', fillcolor:'rgba(231,111,81,0.09)', hovertemplate:'%{x|%d %b %Y}<br>%{y:.0f}%<extra></extra>', connectgaps:false }], layout, {responsive:true,displayModeBar:false});
}

function renderStreamToggles(containerId, activeSet, onChange) {
  const el = document.getElementById(containerId); if (!el) return;
  el.innerHTML = streamOrder.map(s => {
    const on = activeSet.has(s);
    return `<label class="toggle ${on?'active':''}"><input type="checkbox" ${on?'checked':''} data-stream="${s}"><span style="width:9px;height:9px;border-radius:50%;background:${COLORS[s]}"></span>${s}</label>`;
  }).join('');
  el.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', e => {
      const s = e.target.dataset.stream;
      if (e.target.checked) activeSet.add(s); else activeSet.delete(s);
      e.target.closest('.toggle').classList.toggle('active', e.target.checked);
      onChange();
    });
  });
}
function renderWeeklyToggles() { renderStreamToggles('weeklyToggles', weeklyActive, () => { drawWeekly(); drawRate(); }); }

function getStreamFilteredIndices() {
  const S = DATA.stream, b = getStreamMonthBounds(), indices = [];
  for (let i = 0; i < S.months.length; i++) if (S.months[i] >= b.startM && S.months[i] <= b.endM) indices.push(i);
  return indices;
}

function renderStreamKPIs() {
  const row = document.getElementById('streamKpis'); if (!row) return;
  const S = DATA.stream, indices = getStreamFilteredIndices();
  row.innerHTML = streamOrder.map(s => {
    let total=0, deals=0;
    indices.forEach(i => { total += S.streams[s].total[i]||0; deals += S.streams[s].with_deal[i]||0; });
    return `<div class="kpi"><div class="label">${s}</div><div class="value" style="color:${COLORS[s]}">${deals.toLocaleString()}</div><div class="sub">${total.toLocaleString()} contacts</div></div>`;
  }).join('');
}

renderWeeklyToggles();
