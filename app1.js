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
let mode = 'cust';

const plotFont = { family: 'Nunito, sans-serif', color: '#2D2A26', size: 13 };
const softGrid = '#EDE4DA';
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

function drawWeekly() {
  const w = DATA.weekly;
  const ticktext = w.labels.map((lab, i) => (i % 2 === 0 ? lab : ''));
  const traces = [
    {
      x: w.labels, y: w.new_contacts, name: 'New Contacts',
      type: 'scatter', mode: 'lines+markers',
      line: { color: '#FF7A45', width: 2.8, shape: 'spline' },
      marker: { size: 7, color: '#FF7A45' },
      hovertemplate: '<b>New Contacts</b><br>%{x}<br>%{y}<extra></extra>'
    },
    {
      x: w.labels, y: w.with_deal, name: 'With a Deal',
      type: 'scatter', mode: 'lines+markers',
      line: { color: '#2A9D8F', width: 2.8, shape: 'spline' },
      marker: { size: 7, color: '#2A9D8F' },
      hovertemplate: '<b>With a Deal</b><br>%{x}<br>%{y}<extra></extra>'
    }
  ];
  const layout = Object.assign({}, softLayout, {
    margin: { t: 40, r: 8, b: 40, l: 40 },
    xaxis: {
      tickmode: 'array',
      tickvals: w.labels,
      ticktext: ticktext,
      tickfont: { size: 11, color: '#8A8178' },
      showgrid: false,
      zeroline: false,
      showline: false,
      fixedrange: true
    },
    yaxis: {
      title: { text: '', font: { size: 11 } },
      tickfont: { size: 11, color: '#8A8178' },
      gridcolor: 'rgba(138,129,120,0.22)',
      gridwidth: 1,
      zeroline: false,
      showline: false,
      fixedrange: true,
      nticks: 8,
      separatethousands: true
    },
    legend: {
      orientation: 'h',
      y: 1.15,
      x: 0,
      xanchor: 'left',
      font: { size: 12, color: '#2D2A26' },
      bgcolor: 'rgba(0,0,0,0)'
    }
  });
  Plotly.newPlot('weeklyChart', traces, layout, {responsive: true, displayModeBar: false});
}

function drawRate() {
  const w = DATA.weekly;
  const ticktext = w.labels.map((lab, i) => (i % 2 === 0 ? lab : ''));
  const trace = [{
    x: w.labels, y: w.deal_rate, name: 'Deal Rate',
    type: 'scatter', mode: 'lines+markers',
    line: { color: '#E76F51', width: 2.5, shape: 'spline' },
    marker: { size: 6, color: '#E76F51' },
    fill: 'tozeroy',
    fillcolor: 'rgba(231, 111, 81, 0.09)',
    hovertemplate: '%{x}<br>%{y:.0f}%<extra></extra>'
  }];
  const layout = Object.assign({}, softLayout, {
    margin: { t: 16, r: 8, b: 36, l: 40 },
    xaxis: {
      tickmode: 'array',
      tickvals: w.labels,
      ticktext: ticktext,
      tickfont: { size: 11, color: '#8A8178' },
      showgrid: false,
      zeroline: false,
      showline: false,
      fixedrange: true
    },
    yaxis: {
      title: { text: '', font: { size: 11 } },
      tickfont: { size: 11, color: '#8A8178' },
      ticksuffix: '%',
      gridcolor: 'rgba(138,129,120,0.22)',
      zeroline: false,
      showline: false,
      range: [0, 35],
      dtick: 5,
      fixedrange: true
    },
    showlegend: false
  });
  Plotly.newPlot('rateChart', trace, layout, {responsive: true, displayModeBar: false});
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
