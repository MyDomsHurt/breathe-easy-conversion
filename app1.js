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
let mode = 'cust';

const plotFont = { family: 'Nunito, sans-serif', color: '#2D2A26', size: 13 };
const softLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: plotFont,
  margin: { t: 36, r: 12, b: 48, l: 42 },
  hovermode: 'x unified'
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + btn.dataset.section).classList.add('active');
    if (btn.dataset.section === 'weekly') {
      drawWeekly(); drawRate();
    } else {
      drawStreamChart(); drawVol();
    }
  });
});

function getWeeklyFiltered() {
  const w = DATA.weekly;
  const n = w.labels.length;
  const newC = new Array(n).fill(0);
  const withD = new Array(n).fill(0);
  weeklyActive.forEach(s => {
    const st = w.by_stream[s];
    if (!st) return;
    for (let i = 0; i < n; i++) {
      newC[i] += st.new_contacts[i] || 0;
      withD[i] += st.with_deal[i] || 0;
    }
  });
  const rates = newC.map((c, i) => c > 0 ? Math.round(withD[i] / c * 1000) / 10 : null);
  const totalNew = newC.reduce((a,b) => a+b, 0);
  const totalDeal = withD.reduce((a,b) => a+b, 0);
  return {
    labels: w.labels,
    new_contacts: newC,
    with_deal: withD,
    deal_rate: rates,
    total_new: totalNew,
    total_with_deal: totalDeal,
    overall_rate: totalNew > 0 ? Math.round(totalDeal / totalNew * 1000) / 10 : 0
  };
}

function updateWeeklyKPIs(f) {
  document.getElementById('kpi-total-new').textContent = f.total_new.toLocaleString();
  document.getElementById('kpi-with-deal').textContent = f.total_with_deal.toLocaleString();
  document.getElementById('kpi-rate').textContent = f.overall_rate + '%';
}

function drawWeekly() {
  const f = getWeeklyFiltered();
  updateWeeklyKPIs(f);
  const ticktext = f.labels.map((lab, i) => (i % 2 === 0 ? lab : ''));
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
      zeroline: false, showline: false, fixedrange: true, nticks: 8, separatethousands: true
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
  // Same treatment for every stream: full x-axis, null when no contacts, no gap-filling
  const ticktext = f.labels.map((lab, i) => (i % 2 === 0 ? lab : ''));
  const yVals = f.deal_rate.map(r => r);
  const valid = yVals.filter(v => v != null);
  const maxY = valid.length ? Math.max(35, Math.ceil(Math.max(...valid) / 5) * 5) : 35;
  const trace = [{
    x: f.labels,
    y: yVals,
    name: 'Deal Rate',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#E76F51', width: 2.5, shape: 'linear' },
    marker: { size: 7, color: '#E76F51' },
    fill: 'tozeroy',
    fillcolor: 'rgba(231, 111, 81, 0.09)',
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
      zeroline: false, showline: false, range: [0, maxY], dtick: 5, fixedrange: true
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

function renderStreamKPIs() {
  const row = document.getElementById('streamKpis');
  const order = ['Referral', 'Affiliate', 'Website', 'Instagram', 'Meta Ads', 'Unspecified'];
  row.innerHTML = order.map(s => `
    <div class="kpi">
      <div class="label">${s}</div>
      <div class="value" style="color:${COLORS[s]}">${DATA.stream.kpi[s] != null ? DATA.stream.kpi[s] + '%' : '—'}</div>
      <div class="sub">Mar–Jul avg</div>
    </div>`).join('');
}
