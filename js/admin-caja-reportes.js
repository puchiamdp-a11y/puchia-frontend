// ==================== CAJA · REPORTES (estadísticas del mes) ====================
// Datos: GET /admin/caja/reportes/estadisticas?mes=AAAA-MM  (KPIs, comparativa, categorías, métodos, diario, tendencia)

const REP_COLOR = {
  ingreso: '#2e9e5b',
  egreso: '#e34948',
  acumulado: '#4a3aa7',
  efectivo: '#4a3aa7',
  mercado_pago: '#2a78d6',
  neutro: '#7f1f6e',
  grilla: '#ececf0',
  texto: '#52514e'
};

let repCharts = [];
let repUltimo = null;

const repNum = (n, dec = 1) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: dec });
const repPct = (n) => (n === null || n === undefined ? '—' : `${repNum(n)}%`);
const repMoneda = (n) => (typeof formatearMonto === 'function' ? formatearMonto(n) : `$${repNum(n, 2)}`);
const repCompacto = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${repNum(n / 1e6)}M`;
  if (a >= 1e3) return `$${repNum(n / 1e3, 0)}k`;
  return `$${repNum(n, 0)}`;
};
const repEsc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const repNombreMes = (aaaamm, largo = true) => {
  const [y, m] = aaaamm.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-AR', { month: largo ? 'long' : 'short', year: largo ? 'numeric' : '2-digit', timeZone: 'UTC' });
};
const repFechaCorta = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y.slice(2)}`; };

// Variación contra el mes anterior. "subeEsBueno": ingresos/saldo = true, egresos = false
function repVariacion(actual, previo, subeEsBueno = true) {
  if (!previo) return `<span class="rep-var rep-var-nd">sin datos del mes anterior</span>`;
  const pct = ((actual - previo) / Math.abs(previo)) * 100;
  if (Math.abs(pct) < 0.05) return `<span class="rep-var rep-var-nd">= igual que el mes anterior</span>`;
  const sube = pct > 0;
  const bueno = sube === subeEsBueno;
  return `<span class="rep-var ${bueno ? 'rep-var-ok' : 'rep-var-mal'}">${sube ? '▲' : '▼'} ${repNum(Math.abs(pct))}% vs mes anterior</span>`;
}

function cambiarMesReporte(delta) {
  const input = document.getElementById('reporteMes');
  if (!input || !input.value) return;
  const [y, m] = input.value.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  input.value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  generarReporteCaja();
}

async function generarReporteCaja() {
  const input = document.getElementById('reporteMes');
  const contenido = document.getElementById('reporteContenido');
  const vacio = document.getElementById('reporteVacio');
  const botones = document.getElementById('botonesExportacion');
  if (!input || !contenido) return;

  if (!input.value) {
    const h = new Date();
    input.value = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
  }
  const mes = input.value;
  vacio.style.display = 'block';
  vacio.textContent = 'Cargando análisis...';
  contenido.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/reportes/estadisticas?mes=${mes}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}` }
    });
    if (!response.ok) throw new Error('Error al cargar el reporte');
    const { data } = await response.json();
    if (input.value !== mes) return;   // el usuario cambió de mes mientras cargaba
    repUltimo = data;
    renderReporteCaja(data);
    vacio.style.display = 'none';
    contenido.style.display = 'block';
    if (botones) botones.style.display = 'flex';
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    vacio.style.display = 'block';
    vacio.textContent = 'No se pudo cargar el reporte. Probá de nuevo en unos segundos.';
  }
}

// ---------- piezas ----------
function repKpi(titulo, valor, pie, color) {
  return `<div class="stat-card rep-kpi"><div class="stat-label">${titulo}</div>
    <div class="stat-value" ${color ? `style="color:${color}"` : ''}>${valor}</div>
    <div class="rep-kpi-pie">${pie || ''}</div></div>`;
}

const repAltoCat = (lista) => Math.max(110, Math.min(lista.length, 9) * 38 + 50);

function repTablaCategorias(lista, color) {
  if (!lista.length) return '<div class="rep-sin-datos">Sin movimientos este mes.</div>';
  const filas = lista.map(c => `<tr>
      <td><span class="rep-punto" style="background:${color}"></span>${repEsc(c.categoria)}</td>
      <td class="rep-der"><strong>${repMoneda(c.monto)}</strong></td>
      <td class="rep-der">${repPct(c.porcentaje)}</td>
      <td class="rep-der">${c.cantidad}</td>
      <td class="rep-der">${repMoneda(c.promedio)}</td>
      <td class="rep-der">${c.variacion_pct === null ? '<span class="rep-var-nd">nuevo</span>' : `${c.variacion_pct > 0 ? '▲' : c.variacion_pct < 0 ? '▼' : '='} ${repNum(Math.abs(c.variacion_pct))}%`}</td>
    </tr>`).join('');
  return `<div class="rep-tabla-wrap"><table class="rep-tabla"><thead><tr>
      <th>Categoría</th><th class="rep-der">Total</th><th class="rep-der">% del total</th><th class="rep-der">Mov.</th><th class="rep-der">Promedio</th><th class="rep-der">vs mes ant.</th>
    </tr></thead><tbody>${filas}</tbody></table></div>`;
}

function repTablaTop(lista, color) {
  if (!lista.length) return '<div class="rep-sin-datos">Sin movimientos este mes.</div>';
  return `<div class="rep-tabla-wrap"><table class="rep-tabla"><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th class="rep-der">Monto</th></tr></thead><tbody>${
    lista.map(m => `<tr><td>${repFechaCorta(m.fecha)}</td><td>${repEsc(m.categoria)}</td><td class="rep-desc" title="${repEsc(m.descripcion)}">${repEsc(m.descripcion) || '—'}</td><td class="rep-der"><strong style="color:${color}">${repMoneda(m.monto)}</strong></td></tr>`).join('')
  }</tbody></table></div>`;
}

function repInsights(d) {
  const a = d.actual, items = [];
  const mejorDia = [...d.diario].sort((x, y) => y.ingresos - x.ingresos)[0];
  if (mejorDia && mejorDia.ingresos > 0) items.push(`📈 Mejor día de ventas: <strong>${repFechaCorta(mejorDia.fecha)}</strong> con ${repMoneda(mejorDia.ingresos)}.`);
  const topIng = d.ingresos_por_categoria[0];
  if (topIng) items.push(`💰 La categoría que más ingresa es <strong>${repEsc(topIng.categoria)}</strong>: ${repPct(topIng.porcentaje)} del total (${repMoneda(topIng.monto)}).`);
  const topEgr = d.egresos_por_categoria[0];
  if (topEgr) items.push(`🧾 El mayor gasto es <strong>${repEsc(topEgr.categoria)}</strong>: ${repPct(topEgr.porcentaje)} de los egresos (${repMoneda(topEgr.monto)}).`);
  if (a.margen_pct !== null) items.push(`🎯 De cada $100 que entran, <strong>${a.margen_pct >= 0 ? `quedan $${repNum(a.margen_pct)}` : `se pierden $${repNum(Math.abs(a.margen_pct))}`}</strong> (margen ${repPct(a.margen_pct)}).`);
  const efec = d.por_metodo.find(m => m.metodo === 'efectivo');
  if (a.ingresos > 0 && efec) items.push(`💵 El <strong>${repPct(efec.pct_ingresos)}</strong> de los ingresos entra en efectivo y el ${repPct(100 - efec.pct_ingresos)} por Mercado Pago.`);
  const diasConVentas = d.diario.filter(x => x.ingresos > 0).length;
  if (diasConVentas) items.push(`🗓️ Hubo ingresos en <strong>${diasConVentas} de ${d.dias_del_mes} días</strong>.`);
  return items.length ? `<ul class="rep-insights">${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '';
}

// ---------- gráficos ----------
function repChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === 'undefined') return;
  const chart = new Chart(canvas.getContext('2d'), config);
  repCharts.push(chart);
}

const repEjes = (extra = {}) => ({
  x: { grid: { display: false }, ticks: { color: REP_COLOR.texto, maxRotation: 0, autoSkip: true }, ...(extra.x || {}) },
  y: { beginAtZero: true, grid: { color: REP_COLOR.grilla }, border: { display: false }, ticks: { color: REP_COLOR.texto, callback: v => repCompacto(v) }, ...(extra.y || {}) }
});
const repTooltipMoneda = { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${repMoneda(ctx.parsed.y ?? ctx.parsed.x)}` } };

function repGraficos(d) {
  // 1) Ingresos y egresos por día
  repChart('repChartDiario', {
    type: 'bar',
    data: {
      labels: d.diario.map(x => x.dia),
      datasets: [
        { label: 'Ingresos', data: d.diario.map(x => x.ingresos), backgroundColor: REP_COLOR.ingreso, borderRadius: 3 },
        { label: 'Egresos', data: d.diario.map(x => x.egresos), backgroundColor: REP_COLOR.egreso, borderRadius: 3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { ...repTooltipMoneda, callbacks: { ...repTooltipMoneda.callbacks, title: items => `Día ${items[0].label}` } } },
      scales: repEjes({ x: { title: { display: true, text: 'Día del mes', color: REP_COLOR.texto } } }) }
  });

  // 1b) Saldo acumulado del mes
  repChart('repChartAcumulado', {
    type: 'line',
    data: { labels: d.diario.map(x => x.dia), datasets: [{ label: 'Saldo acumulado', data: d.diario.map(x => x.acumulado), borderColor: REP_COLOR.acumulado, backgroundColor: 'rgba(74, 58, 167, .12)', fill: true, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { ...repTooltipMoneda, callbacks: { ...repTooltipMoneda.callbacks, title: items => `Día ${items[0].label}` } } },
      scales: repEjes({ x: { title: { display: true, text: 'Día del mes', color: REP_COLOR.texto } }, y: { beginAtZero: false } }) }
  });

  // 2) Tendencia 6 meses
  repChart('repChartTendencia', {
    type: 'bar',
    data: {
      labels: d.tendencia.map(t => repNombreMes(t.mes, false)),
      datasets: [
        { type: 'line', label: 'Saldo', data: d.tendencia.map(t => t.saldo), borderColor: REP_COLOR.acumulado, backgroundColor: REP_COLOR.acumulado, borderWidth: 2, pointRadius: 4, tension: 0.2, order: 0 },
        { type: 'bar', label: 'Ingresos', data: d.tendencia.map(t => t.ingresos), backgroundColor: REP_COLOR.ingreso, borderRadius: 4, order: 1 },
        { type: 'bar', label: 'Egresos', data: d.tendencia.map(t => t.egresos), backgroundColor: REP_COLOR.egreso, borderRadius: 4, order: 1 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: repTooltipMoneda },
      scales: repEjes() }
  });

  // 3) y 4) Categorías (barras horizontales ordenadas)
  [['repChartCatIng', d.ingresos_por_categoria, REP_COLOR.ingreso], ['repChartCatEgr', d.egresos_por_categoria, REP_COLOR.egreso]].forEach(([id, lista, color]) => {
    if (!lista.length) return;
    const top = lista.slice(0, 8);
    const resto = lista.slice(8);
    const filas = resto.length ? [...top, { categoria: 'Otras', monto: resto.reduce((a, c) => a + c.monto, 0), porcentaje: resto.reduce((a, c) => a + c.porcentaje, 0), cantidad: resto.reduce((a, c) => a + c.cantidad, 0) }] : top;
    repChart(id, {
      type: 'bar',
      data: { labels: filas.map(c => c.categoria), datasets: [{ label: 'Total', data: filas.map(c => c.monto), backgroundColor: color, borderRadius: 4, barThickness: 20 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => { const c = filas[ctx.dataIndex]; return ` ${repMoneda(c.monto)} · ${repPct(c.porcentaje)} · ${c.cantidad} mov.`; } } } },
        scales: { x: { beginAtZero: true, grid: { color: REP_COLOR.grilla }, border: { display: false }, ticks: { color: REP_COLOR.texto, callback: v => repCompacto(v) } }, y: { grid: { display: false }, ticks: { color: REP_COLOR.texto } } } }
    });
  });

  // 5) Método de pago (100% apilado)
  const ef = d.por_metodo.find(m => m.metodo === 'efectivo'), mp = d.por_metodo.find(m => m.metodo === 'mercado_pago');
  repChart('repChartMetodo', {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Egresos'],
      datasets: [
        { label: 'Efectivo', data: [ef.pct_ingresos, ef.pct_egresos], backgroundColor: REP_COLOR.efectivo, borderColor: '#fff', borderWidth: 2, borderRadius: 4, montos: [ef.ingresos, ef.egresos] },
        { label: 'Mercado Pago', data: [mp.pct_ingresos, mp.pct_egresos], backgroundColor: REP_COLOR.mercado_pago, borderColor: '#fff', borderWidth: 2, borderRadius: 4, montos: [mp.ingresos, mp.egresos] }
      ]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${repPct(ctx.parsed.x)} (${repMoneda(ctx.dataset.montos[ctx.dataIndex])})` } } },
      scales: { x: { stacked: true, max: 100, grid: { color: REP_COLOR.grilla }, border: { display: false }, ticks: { color: REP_COLOR.texto, callback: v => `${v}%` } }, y: { stacked: true, grid: { display: false }, ticks: { color: REP_COLOR.texto } } } }
  });

  // 6) Día de la semana
  repChart('repChartSemana', {
    type: 'bar',
    data: { labels: d.por_dia_semana.map(x => x.dia.slice(0, 3)), datasets: [{ label: 'Ingreso promedio por día', data: d.por_dia_semana.map(x => x.ingreso_promedio), backgroundColor: REP_COLOR.neutro, borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: i => d.por_dia_semana[i[0].dataIndex].dia, label: ctx => { const x = d.por_dia_semana[ctx.dataIndex]; return [` Promedio: ${repMoneda(x.ingreso_promedio)}`, ` Total del mes: ${repMoneda(x.ingresos)} · ${x.cantidad} mov.`]; } } } },
      scales: repEjes() }
  });
}

// ---------- render principal ----------
function renderReporteCaja(d) {
  repCharts.forEach(c => c.destroy());
  repCharts = [];
  const cont = document.getElementById('reporteContenido');
  const a = d.actual, p = d.anterior;
  const mesNombre = repNombreMes(d.periodo);
  const mesPrev = repNombreMes(d.periodo_anterior, false);

  if (a.cantidad === 0) {
    cont.innerHTML = `<div class="rep-vacio">No hay movimientos de caja en ${mesNombre}.</div>`;
    return;
  }

  const filaComp = (nombre, va, vp, esMoneda, subeEsBueno) => {
    const dif = va - vp;
    const pct = vp ? (dif / Math.abs(vp)) * 100 : null;
    const bueno = dif === 0 ? null : (dif > 0) === subeEsBueno;
    const cls = bueno === null ? '' : (bueno ? 'rep-var-ok' : 'rep-var-mal');
    const f = (v) => (esMoneda ? (v < 0 ? `-${repMoneda(-v)}` : repMoneda(v)) : repNum(v));
    return `<tr><td>${nombre}</td><td class="rep-der"><strong>${f(va)}</strong></td><td class="rep-der">${f(vp)}</td>
      <td class="rep-der ${cls}">${dif > 0 ? '+' : ''}${f(dif)}</td><td class="rep-der ${cls}">${pct === null ? '—' : `${dif > 0 ? '▲' : dif < 0 ? '▼' : ''} ${repNum(Math.abs(pct))}%`}</td></tr>`;
  };

  const metodoFilas = d.por_metodo.map(m => `<tr><td><span class="rep-punto" style="background:${REP_COLOR[m.metodo]}"></span>${m.metodo === 'efectivo' ? 'Efectivo' : 'Mercado Pago'}</td>
    <td class="rep-der">${repMoneda(m.ingresos)}</td><td class="rep-der">${repMoneda(m.egresos)}</td><td class="rep-der"><strong style="color:${m.neto >= 0 ? REP_COLOR.ingreso : REP_COLOR.egreso}">${repMoneda(m.neto)}</strong></td><td class="rep-der">${m.cantidad}</td></tr>`).join('');

  cont.innerHTML = `
    <div class="rep-titulo-periodo">${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)} <span>· comparado con ${mesPrev}</span></div>

    <div class="rep-kpis">
      ${repKpi('Ingresos', repMoneda(a.ingresos), repVariacion(a.ingresos, p.ingresos, true), REP_COLOR.ingreso)}
      ${repKpi('Egresos', repMoneda(a.egresos), repVariacion(a.egresos, p.egresos, false), REP_COLOR.egreso)}
      ${repKpi('Saldo neto', repMoneda(a.saldo), repVariacion(a.saldo, p.saldo, true), a.saldo >= 0 ? REP_COLOR.ingreso : REP_COLOR.egreso)}
      ${repKpi('Margen', repPct(a.margen_pct), `<span class="rep-var rep-var-nd">${p.margen_pct === null ? 'sin datos del mes anterior' : `mes anterior: ${repPct(p.margen_pct)}`}</span>`)}
      ${repKpi('Ticket promedio', repMoneda(a.ticket_ingreso), `${a.cant_ingresos} ingresos · mayor ${repMoneda(a.mayor_ingreso)}`)}
      ${repKpi('Gasto promedio', repMoneda(a.gasto_promedio), `${a.cant_egresos} egresos · mayor ${repMoneda(a.mayor_egreso)}`)}
      ${repKpi('Ingreso por día', repMoneda(a.ingreso_diario_promedio), `promedio sobre ${d.dias_del_mes} días`)}
      ${repKpi('Movimientos', repNum(a.cantidad, 0), repVariacion(a.cantidad, p.cantidad, true))}
    </div>

    ${repInsights(d)}

    <div class="rep-card"><h3>Ingresos y egresos por día</h3><div class="rep-chart rep-chart-alto"><canvas id="repChartDiario"></canvas></div></div>

    <div class="rep-grid-2">
      <div class="rep-card"><h3>Saldo acumulado del mes</h3><div class="rep-chart"><canvas id="repChartAcumulado"></canvas></div></div>
      <div class="rep-card"><h3>Últimos 6 meses</h3><div class="rep-chart"><canvas id="repChartTendencia"></canvas></div></div>
    </div>

    <div class="rep-grid-2">
      <div class="rep-card"><h3>Comparativa vs ${mesPrev}</h3>
        <div class="rep-tabla-wrap"><table class="rep-tabla"><thead><tr><th>Concepto</th><th class="rep-der">${repNombreMes(d.periodo, false)}</th><th class="rep-der">${mesPrev}</th><th class="rep-der">Dif.</th><th class="rep-der">%</th></tr></thead><tbody>
          ${filaComp('Ingresos', a.ingresos, p.ingresos, true, true)}
          ${filaComp('Egresos', a.egresos, p.egresos, true, false)}
          ${filaComp('Saldo neto', a.saldo, p.saldo, true, true)}
          ${filaComp('Movimientos', a.cantidad, p.cantidad, false, true)}
          ${filaComp('Ticket promedio', a.ticket_ingreso, p.ticket_ingreso, true, true)}
          ${filaComp('Gasto promedio', a.gasto_promedio, p.gasto_promedio, true, false)}
        </tbody></table></div>
      </div>
      <div class="rep-card"><h3>Ingreso promedio por día de la semana</h3><div class="rep-chart"><canvas id="repChartSemana"></canvas></div></div>
    </div>

    <div class="rep-grid-2">
      <div class="rep-card"><h3>Ingresos por categoría</h3>${d.ingresos_por_categoria.length ? `<div class="rep-chart" style="height:${repAltoCat(d.ingresos_por_categoria)}px"><canvas id="repChartCatIng"></canvas></div>` : ''}${repTablaCategorias(d.ingresos_por_categoria, REP_COLOR.ingreso)}</div>
      <div class="rep-card"><h3>Egresos por categoría</h3>${d.egresos_por_categoria.length ? `<div class="rep-chart" style="height:${repAltoCat(d.egresos_por_categoria)}px"><canvas id="repChartCatEgr"></canvas></div>` : ''}${repTablaCategorias(d.egresos_por_categoria, REP_COLOR.egreso)}</div>
    </div>

    <div class="rep-grid-2">
      <div class="rep-card"><h3>Efectivo vs Mercado Pago</h3><div class="rep-chart rep-chart-bajo"><canvas id="repChartMetodo"></canvas></div>
        <div class="rep-tabla-wrap"><table class="rep-tabla"><thead><tr><th>Método</th><th class="rep-der">Ingresos</th><th class="rep-der">Egresos</th><th class="rep-der">Neto</th><th class="rep-der">Mov.</th></tr></thead><tbody>${metodoFilas}</tbody></table></div>
      </div>
      <div class="rep-card"><h3>Mayores movimientos del mes</h3>
        <div class="rep-sub">Ingresos</div>${repTablaTop(d.top_ingresos, REP_COLOR.ingreso)}
        <div class="rep-sub">Egresos</div>${repTablaTop(d.top_egresos, REP_COLOR.egreso)}
      </div>
    </div>

    `;

  repGraficos(d);
}
