function renderToggles() {
  renderStreamToggles('toggles', active, () => { drawStreamChart(); drawVol(); });
}

function drawStreamChart() {
  const f = getStreamWeeklyFiltered(), w = DATA.weekly, x = f.weekStarts, traces = [];
  if (!x.length) { Plotly.newPlot('streamChart', [], Object.assign({}, softLayout, {annotations:[{text:'No weeks in range',showarrow:false}]}), {responsive:true,displayModeBar:false}); return; }
  streamOrder.forEach(s => {
    if (!active.has(s)) return;
    const st = w.by_stream[s]; if (!st) return;
    traces.push({
      x, y:f.indices.map(i => st.with_deal[i]||0), name:s,
      type:'scatter', mode:'lines+markers',
      line:{color:COLORS[s],width:2.8,shape:'spline'}, marker:{size:7,color:COLORS[s]},
      hovertemplate:'<b>%{fullData.name}</b><br>%{x|%d %b %Y}: %{y:,} deals<extra></extra>'
    });
  });
  Plotly.newPlot('streamChart', traces, Object.assign({}, softLayout, {
    margin:{t:40,r:8,b:40,l:40},
    xaxis: dateAxis(x),
    yaxis:{title:{text:'',font:{size:11}},tickfont:{size:11,color:'#8A8178'},gridcolor:'rgba(138,129,120,0.22)',nticks:6,zeroline:false,showline:false,fixedrange:true,separatethousands:true},
    legend:{orientation:'h',y:1.15,font:{size:12},bgcolor:'rgba(0,0,0,0)'}
  }), {responsive:true,displayModeBar:false});
}

function drawVol() {
  const f = getStreamWeeklyFiltered(), w = DATA.weekly, x = f.weekStarts, traces = [];
  if (!x.length) { Plotly.newPlot('volChart', [], Object.assign({}, softLayout, {annotations:[{text:'No weeks in range',showarrow:false}]}), {responsive:true,displayModeBar:false}); return; }
  streamOrder.forEach(s => {
    if (!active.has(s)) return;
    const st = w.by_stream[s]; if (!st) return;
    traces.push({
      x, y:f.indices.map(i => (st.revenue && st.revenue[i])||0), name:s,
      type:'scatter', mode:'lines+markers',
      line:{color:COLORS[s],width:2.8,shape:'spline'}, marker:{size:7,color:COLORS[s]},
      hovertemplate:'<b>%{fullData.name}</b><br>%{x|%d %b %Y}: HK$%{y:,}<extra></extra>'
    });
  });
  Plotly.newPlot('volChart', traces, Object.assign({}, softLayout, {
    margin:{t:36,r:8,b:40,l:40},
    xaxis: dateAxis(x),
    yaxis:{title:{text:'',font:{size:11}},tickfont:{size:11,color:'#8A8178'},gridcolor:'rgba(138,129,120,0.22)',nticks:6,zeroline:false,showline:false,fixedrange:true,separatethousands:true},
    legend:{orientation:'h',y:1.15,font:{size:12},bgcolor:'rgba(0,0,0,0)'}
  }), {responsive:true,displayModeBar:false});
}

function renderTable() {
  const S = DATA.stream, indices = getStreamFilteredIndices();
  const thead = document.querySelector('#dataTable thead'), tbody = document.querySelector('#dataTable tbody');
  if (!thead || !tbody) return;
  const labels = indices.map(i => fullMonthLabel(S.months[i]));
  thead.innerHTML = '<tr><th>Stream</th>' + labels.map(m => `<th>${m}</th>`).join('') + '<th>Total deals</th></tr>';
  let rows = '';
  streamOrder.forEach(s => {
    let dealsSum = 0;
    const cells = indices.map(i => {
      const d = S.streams[s].with_deal[i]||0, vol = S.streams[s].total[i]||0;
      dealsSum += d;
      return `<td>${d.toLocaleString()}<br><span style="font-size:0.72rem;color:#8A8178">${vol} contacts</span></td>`;
    }).join('');
    rows += `<tr><td><strong>${s}</strong></td>${cells}<td><strong>${dealsSum.toLocaleString()}</strong></td></tr>`;
  });
  tbody.innerHTML = rows;
}

function filterPieSource(source) {
  if (!source) return { labels:[], values:[], total:0, startM:null, endM:null };
  const startEl = document.getElementById('pieStart'), endEl = document.getElementById('pieEnd');
  const startM = startEl && startEl.value ? monthKey(startEl.value) : null;
  const endM = endEl && endEl.value ? monthKey(endEl.value) : null;
  const counts = {}; source.streams.forEach(s => counts[s]=0);
  (source.monthly||[]).forEach(row => {
    if (startM && row.month < startM) return;
    if (endM && row.month > endM) return;
    source.streams.forEach(s => { counts[s] += (row.counts && row.counts[s]) || 0; });
  });
  const labels = source.streams, values = labels.map(s => counts[s]);
  return { labels, values, total: values.reduce((a,b)=>a+b,0), startM, endM };
}

function renderDonut(chartId, f, unitLabel) {
  if (!document.getElementById(chartId)) return;
  const colors = f.labels.map(l => COLORS[l]||'#B8A99A'), isNarrow = window.innerWidth < 700;
  Plotly.newPlot(chartId, [{
    type:'pie', labels:f.labels, values:f.values, marker:{colors, line:{width:2,color:'#FDF8F4'}},
    textinfo: isNarrow ? 'percent' : 'label+percent', textposition:'outside',
    textfont:{size:isNarrow?11:12, color:'#2D2A26', family:'Nunito, sans-serif'},
    hovertemplate:'<b>%{label}</b><br>%{value:,} '+unitLabel+'<br>%{percent}<extra></extra>',
    hole:0.48, sort:false, direction:'clockwise', automargin:true
  }], {
    paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)', font:plotFont,
    margin: isNarrow ? {t:36,r:36,b:36,l:36} : {t:48,r:72,b:48,l:72},
    showlegend: isNarrow,
    legend: isNarrow ? {orientation:'h',y:-0.12,x:0.5,xanchor:'center',font:{size:11,family:'Nunito, sans-serif'},bgcolor:'rgba(0,0,0,0)'} : undefined,
    annotations:[{ text:'<b>'+f.total.toLocaleString()+'</b><br>'+unitLabel, showarrow:false, font:{size:isNarrow?14:16,color:'#2D2A26',family:'Nunito, sans-serif'} }]
  }, {responsive:true,displayModeBar:false});
}

function renderPieTable(tbodyId, f) {
  const tbody = document.getElementById(tbodyId); if (!tbody) return;
  const total = f.total || 1;
  const rows = f.labels.map((lab,i) => ({lab, val:f.values[i], pct:f.values[i]/total*100})).sort((a,b)=>b.val-a.val);
  tbody.innerHTML = rows.map(r => `<tr><td><strong style="color:${COLORS[r.lab]||'#8A8178'}">${r.lab}</strong></td><td>${r.val.toLocaleString()}</td><td>${r.pct.toFixed(1)}%</td></tr>`).join('');
}

function drawPie() {
  const withDeal = filterPieSource(DATA.pie), cont = filterPieSource(DATA.contactsPie || DATA.pie);
  const rangeLabel = (withDeal.startM || (DATA.pie.minDate||'').slice(0,7)) + ' → ' + (withDeal.endM || (DATA.pie.maxDate||'').slice(0,7));
  const rangeEl = document.getElementById('kpi-pie-range'); if (rangeEl) rangeEl.textContent = rangeLabel;
  const kpiDeal = document.getElementById('kpi-pie-total'); if (kpiDeal) kpiDeal.textContent = withDeal.total.toLocaleString();
  const kpiCont = document.getElementById('kpi-contacts-total'); if (kpiCont) kpiCont.textContent = cont.total.toLocaleString();
  renderDonut('contactsPieChart', cont, 'contacts');
  renderPieTable('contactsPieTableBody', cont);
  renderDonut('pieChart', withDeal, 'with a deal');
  renderPieTable('pieTableBody', withDeal);
}

renderToggles();
