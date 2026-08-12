function renderToggles() {
  const el = document.getElementById('toggles');
  if (!el) return;
  el.innerHTML = streamOrder.map(s => {
    const on = active.has(s);
    return `<label class="toggle ${on ? 'active' : ''}">
      <input type="checkbox" ${on ? 'checked' : ''} data-stream="${s}">
      <span style="width:9px;height:9px;border-radius:50%;background:${COLORS[s]}"></span>
      ${s}
    </label>`;
  }).join('');
  el.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', e => {
      const s = e.target.dataset.stream;
      if (e.target.checked) active.add(s); else active.delete(s);
      e.target.closest('.toggle').classList.toggle('active', e.target.checked);
      drawStreamChart(); drawVol();
    });
  });
}

function drawStreamChart() {
  const S = DATA.stream;
  const indices = getStreamFilteredIndices();
  const labels = indices.map(i => S.monthLabels[i]);
  const traces = [];
  streamOrder.forEach(s => {
    if (!active.has(s)) return;
    const rates = indices.map(i => S.streams[s].deal_rate[i]);
    traces.push({
      x: labels, y: rates, name: s,
      type: 'scatter', mode: 'lines+markers',
      line: { color: COLORS[s], width: 2.6, shape: 'spline' },
      marker: { size: 6 },
      hovertemplate: '<b>%{fullData.name}</b><br>%{x}: %{y:.0f}%<extra></extra>'
    });
  });
  const layout = Object.assign({}, softLayout, {
    margin: { t: 40, r: 8, b: 40, l: 40 },
    xaxis: { tickfont: { size: 12, color: '#8A8178' }, showgrid: false, zeroline: false, showline: false, fixedrange: true },
    yaxis: { title: { text: '', font: { size: 11 } }, tickfont: { size: 11, color: '#8A8178' }, ticksuffix: '%', gridcolor: 'rgba(138,129,120,0.22)', range: [0, 100], dtick: 10, zeroline: false, showline: false, fixedrange: true },
    legend: { orientation: 'h', y: 1.15, font: { size: 12 }, bgcolor: 'rgba(0,0,0,0)' }
  });
  Plotly.newPlot('streamChart', traces, layout, {responsive: true, displayModeBar: false});
}

function drawVol() {
  const S = DATA.stream;
  const indices = getStreamFilteredIndices();
  const labels = indices.map(i => S.monthLabels[i]);
  const traces = [];
  streamOrder.forEach(s => {
    if (!active.has(s)) return;
    const totals = indices.map(i => S.streams[s].total[i]);
    traces.push({ x: labels, y: totals, name: s, type: 'bar', marker: { color: COLORS[s], opacity: 0.9 } });
  });
  const layout = Object.assign({}, softLayout, {
    barmode: 'group', margin: { t: 36, r: 8, b: 40, l: 40 },
    xaxis: { tickfont: { size: 12, color: '#8A8178' }, showgrid: false, zeroline: false, showline: false, fixedrange: true },
    yaxis: { title: { text: '', font: { size: 11 } }, tickfont: { size: 11, color: '#8A8178' }, gridcolor: 'rgba(138,129,120,0.22)', nticks: 6, zeroline: false, showline: false, fixedrange: true, separatethousands: true },
    legend: { orientation: 'h', y: 1.15, font: { size: 12 }, bgcolor: 'rgba(0,0,0,0)' }
  });
  Plotly.newPlot('volChart', traces, layout, {responsive: true, displayModeBar: false});
}

function renderTable() {
  const S = DATA.stream;
  const indices = getStreamFilteredIndices();
  const thead = document.querySelector('#dataTable thead');
  const tbody = document.querySelector('#dataTable tbody');
  if (!thead || !tbody) return;
  const labels = indices.map(i => S.monthLabels[i]);
  thead.innerHTML = '<tr><th>Stream</th>' + labels.map(m => `<th>${m}</th>`).join('') + '<th>Range Avg</th></tr>';
  let rows = '';
  streamOrder.forEach(s => {
    let total = 0, deals = 0;
    let cells = indices.map(i => {
      const r = S.streams[s].deal_rate[i];
      const vol = S.streams[s].total[i] || 0;
      total += vol;
      deals += S.streams[s].with_deal[i] || 0;
      let cls = r == null ? '' : (r >= 50 ? 'high' : r >= 20 ? 'mid' : 'low');
      return `<td class="${cls}">${r != null ? r + '%' : '—'}<br><span style="font-size:0.72rem;color:#8A8178">${vol}</span></td>`;
    }).join('');
    const avg = total > 0 ? Math.round(deals / total * 1000) / 10 : null;
    const acls = avg == null ? '' : (avg >= 50 ? 'high' : avg >= 20 ? 'mid' : 'low');
    rows += `<tr><td><strong>${s}</strong></td>${cells}<td class="${acls}">${avg != null ? avg + '%' : '—'}</td></tr>`;
  });
  tbody.innerHTML = rows;
}

function filterPieSource(source) {
  if (!source) return { labels: [], values: [], total: 0, startM: null, endM: null };
  const startEl = document.getElementById('pieStart');
  const endEl = document.getElementById('pieEnd');
  let startM = startEl && startEl.value ? monthKey(startEl.value) : null;
  let endM = endEl && endEl.value ? monthKey(endEl.value) : null;
  const counts = {};
  source.streams.forEach(s => counts[s] = 0);
  (source.monthly || []).forEach(row => {
    if (startM && row.month < startM) return;
    if (endM && row.month > endM) return;
    source.streams.forEach(s => { counts[s] += (row.counts && row.counts[s]) || 0; });
  });
  const labels = source.streams;
  const values = labels.map(s => counts[s]);
  const total = values.reduce((a, b) => a + b, 0);
  return { labels, values, total, startM, endM };
}

function renderDonut(chartId, f, unitLabel) {
  if (!document.getElementById(chartId)) return;
  const colors = f.labels.map(l => COLORS[l] || '#B8A99A');
  const isNarrow = window.innerWidth < 700;
  const trace = [{
    type: 'pie',
    labels: f.labels,
    values: f.values,
    marker: { colors: colors, line: { width: 2, color: '#FDF8F4' } },
    textinfo: isNarrow ? 'percent' : 'label+percent',
    textposition: 'outside',
    textfont: { size: isNarrow ? 11 : 12, color: '#2D2A26', family: 'Nunito, sans-serif' },
    hovertemplate: '<b>%{label}</b><br>%{value:,} ' + unitLabel + '<br>%{percent}<extra></extra>',
    hole: 0.48,
    sort: false,
    direction: 'clockwise',
    automargin: true
  }];
  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: plotFont,
    margin: isNarrow
      ? { t: 36, r: 36, b: 36, l: 36 }
      : { t: 48, r: 72, b: 48, l: 72 },
    showlegend: isNarrow,
    legend: isNarrow ? {
      orientation: 'h',
      y: -0.12,
      x: 0.5,
      xanchor: 'center',
      font: { size: 11, family: 'Nunito, sans-serif' },
      bgcolor: 'rgba(0,0,0,0)'
    } : undefined,
    annotations: [{
      text: '<b>' + f.total.toLocaleString() + '</b><br>' + unitLabel,
      showarrow: false,
      font: { size: isNarrow ? 14 : 16, color: '#2D2A26', family: 'Nunito, sans-serif' }
    }]
  };
  Plotly.newPlot(chartId, trace, layout, {responsive: true, displayModeBar: false});
}

function renderPieTable(tbodyId, f) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const total = f.total || 1;
  const rows = f.labels.map((lab, i) => ({ lab, val: f.values[i], pct: (f.values[i] / total * 100) }))
    .sort((a, b) => b.val - a.val);
  tbody.innerHTML = rows.map(r =>
    `<tr><td><strong style="color:${COLORS[r.lab] || '#8A8178'}">${r.lab}</strong></td>` +
    `<td>${r.val.toLocaleString()}</td><td>${r.pct.toFixed(1)}%</td></tr>`
  ).join('');
}

function drawPie() {
  const withDeal = filterPieSource(DATA.pie);
  const cont = filterPieSource(DATA.contactsPie || DATA.pie);

  const rangeLabel = (withDeal.startM || (DATA.pie.minDate || '').slice(0,7)) + ' → ' + (withDeal.endM || (DATA.pie.maxDate || '').slice(0,7));
  const rangeEl = document.getElementById('kpi-pie-range');
  if (rangeEl) rangeEl.textContent = rangeLabel;

  const kpiDeal = document.getElementById('kpi-pie-total');
  if (kpiDeal) kpiDeal.textContent = withDeal.total.toLocaleString();
  const kpiCont = document.getElementById('kpi-contacts-total');
  if (kpiCont) kpiCont.textContent = cont.total.toLocaleString();

  renderDonut('contactsPieChart', cont, 'contacts');
  renderPieTable('contactsPieTableBody', cont);
  renderDonut('pieChart', withDeal, 'with a deal');
  renderPieTable('pieTableBody', withDeal);
}

renderToggles();
