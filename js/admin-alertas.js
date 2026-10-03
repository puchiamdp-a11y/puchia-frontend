// admin-alertas.js — Sección Alertas: qué hay que hacer hoy (entregas, avisos a clientes, cobros, stock, fechas).
// Las alertas se calculan en el servidor; acá solo se muestran y se marcan como "Hecho" o "Posponer".

const ALERTAS_GRUPOS = {
  entregas: { nombre: '📦 Entregas', tipos: ['entrega_atrasada', 'entrega_proxima', 'listo_avisar'] },
  cobros: { nombre: '💸 Cobros', tipos: ['sin_sena'] },
  stock: { nombre: '📉 Stock', tipos: ['stock'] },
  clientes: { nombre: '🎂 Clientes', tipos: ['fecha_cliente', 'postventa'] }
};
let alertasDatos = { alertas: [], ocultas: [] };
let alertasFiltro = 'todas';
let alertasVerOcultas = false;

function alertasToken() { return localStorage.getItem('puchia_admin_token'); }
function escAlerta(t) { return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function alertasFetch(path, opciones = {}) {
  const res = await fetch(`${API_BASE_URL}/admin/alertas${path}`, {
    ...opciones,
    headers: { 'Authorization': `Bearer ${alertasToken()}`, 'Content-Type': 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Error');
  return data.data;
}

function linkWhatsAppAlerta(whatsapp, texto) {
  let n = String(whatsapp || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!n) return null;
  if (!n.startsWith('54')) n = '54' + (n.startsWith('9') ? '' : '9') + n.replace(/^15/, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

function mensajeAlerta(a) {
  const link = a.seguimiento_id ? `${window.location.origin}/seguimiento.html?id=${a.seguimiento_id}` : '';
  return String(a.mensaje || '').replace('{LINK}', link).trim();
}

async function cargarAlertas() {
  const cont = document.getElementById('alertasLista');
  if (cont && !alertasDatos.alertas.length && !alertasDatos.ocultas.length) cont.innerHTML = '<div class="alertas-vacio">Cargando…</div>';
  try {
    alertasDatos = await alertasFetch('');
    renderAlertas();
    actualizarBadgeAlertas(alertasDatos.alertas.length);
  } catch (err) {
    if (cont) cont.innerHTML = `<div class="alertas-vacio">No se pudieron cargar las alertas. <button class="btn btn-sm btn-secondary" onclick="cargarAlertas()">Reintentar</button></div>`;
  }
}

function actualizarBadgeAlertas(n) {
  const link = document.querySelector('.sidebar-nav a[data-page="alertas"]');
  if (!link) return;
  let b = link.querySelector('.alertas-badge');
  if (!n) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'alertas-badge'; link.appendChild(b); }
  b.textContent = n > 99 ? '99+' : n;
}

async function refrescarBadgeAlertas() {
  if (!alertasToken()) return;
  try { const d = await alertasFetch(''); actualizarBadgeAlertas(d.alertas.length); } catch (_) { /* silencioso */ }
}

function alertasFiltradas(lista) {
  if (alertasFiltro === 'todas') return lista;
  if (alertasFiltro === 'urgentes') return lista.filter(a => a.prioridad === 1);
  const g = ALERTAS_GRUPOS[alertasFiltro];
  return g ? lista.filter(a => g.tipos.includes(a.tipo)) : lista;
}

function renderAlertas() {
  const chips = document.getElementById('alertasFiltros');
  const cont = document.getElementById('alertasLista');
  const visibles = alertasDatos.alertas || [];
  if (chips) {
    const cuenta = (fn) => visibles.filter(fn).length;
    const items = [
      ['todas', 'Todas', visibles.length],
      ['urgentes', '🔴 Urgentes', cuenta(a => a.prioridad === 1)],
      ...Object.entries(ALERTAS_GRUPOS).map(([k, g]) => [k, g.nombre, cuenta(a => g.tipos.includes(a.tipo))])
    ];
    chips.innerHTML = items.map(([k, n, c]) =>
      `<button class="alertas-chip ${alertasFiltro === k ? 'activo' : ''}" onclick="filtrarAlertas('${k}')">${n} <span>${c}</span></button>`).join('');
  }
  if (!cont) return;

  const lista = alertasFiltradas(visibles);
  let html = '';
  if (!lista.length) {
    html = `<div class="alertas-vacio">${visibles.length ? 'No hay alertas en este grupo.' : '🎉 Todo al día. No hay nada pendiente por avisar o resolver.'}</div>`;
  } else {
    html = lista.map(a => tarjetaAlerta(a, false)).join('');
  }

  const ocultas = alertasDatos.ocultas || [];
  if (ocultas.length) {
    html += `<div class="alertas-ocultas-head"><button class="btn btn-sm btn-secondary" onclick="toggleAlertasOcultas()">${alertasVerOcultas ? 'Ocultar' : 'Ver'} resueltas y pospuestas (${ocultas.length})</button></div>`;
    if (alertasVerOcultas) html += ocultas.map(a => tarjetaAlerta(a, true)).join('');
  }
  cont.innerHTML = html;
}

function tarjetaAlerta(a, oculta) {
  const clave = escAlerta(a.clave);
  const c = a.cliente;
  const quien = c ? `<div class="alerta-cliente">${escAlerta(c.nombre)}${c.codigo ? ` <span>· ${escAlerta(c.codigo)}</span>` : ''}${a.pedido ? ` <span>· ${escAlerta(a.pedido)}</span>` : ''}</div>` : '';
  const wa = c && c.whatsapp && a.mensaje ? linkWhatsAppAlerta(c.whatsapp, mensajeAlerta(a)) : null;
  const botones = [];
  if (!oculta) {
    if (wa) botones.push(`<a class="btn btn-sm alerta-btn-wa" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>`);
    else if (c && a.mensaje) botones.push(`<span class="alerta-sin-wa" title="Cargá el WhatsApp del cliente para poder escribirle">Sin WhatsApp</span>`);
    if (a.orden_id) botones.push(`<button class="btn btn-sm btn-secondary" onclick="verOrdenDesdeAlerta(${a.orden_id})">Ver pedido</button>`);
    else if (a.producto_id) botones.push(`<button class="btn btn-sm btn-secondary" onclick="abrirProductoDesdeAlerta(${a.producto_id})">Ver producto</button>`);
    else if (a.insumo_id) botones.push(`<button class="btn btn-sm btn-secondary" onclick="abrirInsumoDesdeAlerta(${a.insumo_id})">Ver insumo</button>`);
    else if (c && c.id) botones.push(`<button class="btn btn-sm btn-secondary" onclick="verCliente(${c.id})">Ver cliente</button>`);
    botones.push(`<button class="btn btn-sm alerta-btn-hecho" onclick="resolverAlertaPanel('${clave}','hecha')">✓ Hecho</button>`);
    botones.push(`<span class="alerta-posponer"><button class="btn btn-sm btn-secondary" onclick="toggleMenuPosponer(this)">⏰ Posponer ▾</button>
      <span class="alerta-posponer-menu">
        <button onclick="resolverAlertaPanel('${clave}','posponer',1)">Mañana</button>
        <button onclick="resolverAlertaPanel('${clave}','posponer',3)">En 3 días</button>
        <button onclick="resolverAlertaPanel('${clave}','posponer',7)">En 1 semana</button>
      </span></span>`);
  } else {
    const o = a.oculta || {};
    const estado = o.estado === 'pospuesta' && o.hasta ? `Pospuesta hasta el ${new Date(o.hasta).toLocaleDateString('es-AR')}` : 'Resuelta';
    botones.push(`<span class="alerta-sin-wa">${estado}</span>`);
    botones.push(`<button class="btn btn-sm btn-secondary" onclick="reactivarAlertaPanel('${clave}')">↩ Reactivar</button>`);
  }
  return `<div class="alerta-card prioridad-${a.prioridad} ${oculta ? 'oculta' : ''}">
    <div class="alerta-icono">${a.icono || '🔔'}</div>
    <div class="alerta-cuerpo">
      <div class="alerta-titulo">${escAlerta(a.titulo)}</div>
      ${quien}
      <div class="alerta-detalle">${escAlerta(a.detalle)}</div>
      <div class="alerta-acciones">${botones.join('')}</div>
    </div>
  </div>`;
}

function filtrarAlertas(k) { alertasFiltro = k; renderAlertas(); }
function toggleAlertasOcultas() { alertasVerOcultas = !alertasVerOcultas; renderAlertas(); }

function toggleMenuPosponer(btn) {
  const menu = btn.nextElementSibling;
  const abierto = menu.classList.contains('abierto');
  document.querySelectorAll('.alerta-posponer-menu.abierto').forEach(m => m.classList.remove('abierto'));
  if (!abierto) menu.classList.add('abierto');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.alerta-posponer')) document.querySelectorAll('.alerta-posponer-menu.abierto').forEach(m => m.classList.remove('abierto'));
});

async function resolverAlertaPanel(clave, accion, dias) {
  // se quita de inmediato; si falla el servidor se vuelve a cargar la lista real
  const idx = alertasDatos.alertas.findIndex(a => a.clave === clave);
  if (idx >= 0) {
    const [a] = alertasDatos.alertas.splice(idx, 1);
    alertasDatos.ocultas.unshift({ ...a, oculta: { estado: accion === 'hecha' ? 'hecha' : 'pospuesta', hasta: accion === 'posponer' ? new Date(Date.now() + (dias || 1) * 86400000).toISOString() : null } });
    renderAlertas();
    actualizarBadgeAlertas(alertasDatos.alertas.length);
  }
  try {
    await alertasFetch('/resolver', { method: 'POST', body: JSON.stringify({ clave, accion, dias }) });
  } catch (err) {
    if (typeof puchiaAlert === 'function') puchiaAlert('No se pudo guardar. Se vuelve a cargar la lista.', 'error');
    cargarAlertas();
  }
}

async function reactivarAlertaPanel(clave) {
  try {
    await alertasFetch('/reactivar', { method: 'POST', body: JSON.stringify({ clave }) });
    await cargarAlertas();
  } catch (err) {
    if (typeof puchiaAlert === 'function') puchiaAlert('No se pudo reactivar', 'error');
  }
}

function verOrdenDesdeAlerta(id) { if (typeof viewOrder === 'function') viewOrder(id); }

async function irAPagina(page) {
  const link = document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
  if (link) link.click();
}
async function abrirProductoDesdeAlerta(id) {
  irAPagina('productos');
  try { if (typeof loadProducts === 'function') await loadProducts(); } catch (_) { /* sigue */ }
  if (typeof editProduct === 'function') editProduct(id);
}
function abrirInsumoDesdeAlerta(id) {
  irAPagina('insumos');
  if (typeof editInsumo === 'function') editInsumo(id);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(refrescarBadgeAlertas, 1500);
  setInterval(refrescarBadgeAlertas, 5 * 60 * 1000);
});
