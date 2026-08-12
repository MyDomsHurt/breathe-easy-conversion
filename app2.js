function renderToggles() {
  const el = document.getElementById('toggles');
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

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    drawStreamChart();
  });
});

function drawStreamChart() {
  const S = DATA.stream;
  const traces = [];
  streamOrder.forEach(s => {
    if (!active.has(s)) return;
    const rates = mode === 'cust' ? S.streams[s].cust_rate : S.streams[s].deal_rate;
    traces.push({
      x: S.monthLabels, y: rates, name: s,
      type: 'scatter', mode: 'lines+markers',
      line: { color: COLORS[s], width: 2.6, shape: 'spline' },
      marker: { size: 6 },
      hovertemplate: '<b>%{fullData.name}</b><br>%{x}: %{y:.0f}%<extra></extra>'
    });
  });
  const layout = Object.assign({}, softLayout, {
    margin: { t: 40, r: 8, b: 40, l: 40 },
    xaxis: {
      tickfont: { size: 12, color: '#8A8178' },
      showgrid: false, zeroline: false, showline: false, fixedrange: true
    },
    yaxis: {
      title: { text: '', font: { size: 11 } },
      tickfont: { size: 11, color: '#8A8178' }, ticksuffix: '%',
      gridcolor: 'rgba(138,129,120,0.22)',
      range: [0, 100], dtick: 10, zeroline: false, showline: false, fixedrange: true
    },
    legend: { orientation: 'h', y: 1.15, font: { size: 12 }, bgcolor: 'rgba(0,0,0,0)' }
  });
  Plotly.newPlot('streamChart', traces, layout, {responsive: true, displayModeBar: false});
}

function drawVol() {
  const S = DATA.stream;
  const traces = [];
  streamOrder.forEach(s => {
    if (!active.has(s)) return;
    traces.push({
      x: S.monthLabels, y: S.streams[s].total, name: s,
      type: 'bar', marker: { color: COLORS[s], opacity: 0.9 }
    });
  });
  const layout = Object.assign({}, softLayout, {
    barmode: 'group',
    margin: { t: 36, r: 8, b: 40, l: 40 },
    xaxis: {
      tickfont: { size: 12, color: '#8A8178' },
      showgrid: false, zeroline: false, showline: false, fixedrange: true
    },
    yaxis: {
      title: { text: '', font: { size: 11 } },
      tickfont: { size: 11, color: '#8A8178' },
      gridcolor: 'rgba(138,129,120,0.22)', nticks: 6,
      zeroline: false, showline: false, fixedrange: true, separatethousands: true
    },
    legend: { orientation: 'h', y: 1.15, font: { size: 12 }, bgcolor: 'rgba(0,0,0,0)' }
  });
  Plotly.newPlot('volChart', traces, layout, {responsive: true, displayModeBar: false});
}

function renderTable() {
  const S = DATA.stream;
  const thead = document.querySelector('#dataTable thead');
  const tbody = document.querySelector('#dataTable tbody');
  thead.innerHTML = '<tr><th>Stream</th>' + S.monthLabels.map(m => `<th>${m}</th>`).join('') + '<th>Mar–Jul Avg</th></tr>';
  let rows = '';
  streamOrder.forEach(s => {
    const rates = S.streams[s].cust_rate;
    const totals = S.streams[s].total;
    let cells = rates.map((r, i) => {
      const vol = totals[i];
      let cls = r == null ? '' : (r >= 50 ? 'high' : r >= 20 ? 'mid' : 'low');
      return `<td class="${cls}">${r != null ? r + '%' : '—'}<br><span style="font-size:0.72rem;color:#8A8178">${vol}</span></td>`;
    }).join('');
    const avg = S.kpi[s];
    const acls = avg == null ? '' : (avg >= 50 ? 'high' : avg >= 20 ? 'mid' : 'low');
    rows += `<tr><td><strong>${s}</strong></td>${cells}<td class="${acls}">${avg != null ? avg + '%' : '—'}</td></tr>`;
  });
  tbody.innerHTML = rows;
}

function drawPie() {
  const p = DATA.pie;
  document.getElementById('kpi-pie-total').textContent = p.total.toLocaleString();

  const colors = p.labels.map(l => COLORS[l] || '#B8A99A');
  const trace = [{
    type: 'pie',
    labels: p.labels,
    values: p.values,
    marker: { colors: colors, line: { width: 2, color: '#FDF8F4' } },
    textinfo: 'label+percent',
    textposition: 'outside',
    textfont: { size: 12, color: '#2D2A26', family: 'Nunito, sans-serif' },
    hovertemplate: '<b>%{label}</b><br>%{value:,} customers<br>%{percent}<extra></extra>',
    hole: 0.45,
    sort: false,
    direction: 'clockwise'
  }];
  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: plotFont,
    margin: { t: 20, r: 20, b: 20, l: 20 },
    showlegend: false,
    annotations: [{
      text: '<b>' + p.total.toLocaleString() + '</b><br>customers',
      showarrow: false,
      font: { size: 16, color: '#2D2A26', family: 'Nunito, sans-serif' }
    }]
  };
  Plotly.newPlot('pieChart', trace, layout, {responsive: true, displayModeBar: false});

  const tbody = document.getElementById('pieTableBody');
  const total = p.total || 1;
  const rows = p.labels.map((lab, i) => ({ lab, val: p.values[i], pct: (p.values[i] / total * 100) }))
    .sort((a, b) => b.val - a.val);
  tbody.innerHTML = rows.map(r =>
    `<tr>
      <td><strong style="color:${COLORS[r.lab] || '#8A8178'}">${r.lab}</strong></td>
      <td>${r.val.toLocaleString()}</td>
      <td>${r.pct.toFixed(1)}%</td>
    </tr>`
  ).join('');
}

// Init
renderWeeklyToggles();
drawWeekly();
drawRate();
renderStreamKPIs();
renderToggles();
renderTable();
drawStreamChart();
drawVol();
