// admin-clientes.js — Gestión de clientes Puchia Admin

let paginaActual = 1;
const LIMITE = 20;
let totalPaginas = 1;
let clientesActuales = [];
const SORT_KEY = 'puchia_admin_clientes_sort';
let sortState = (() => {
  try {
    const raw = sessionStorage.getItem(SORT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { field: null, dir: 'asc' };
})();

// ==================== INIT ====================

// Auto-init solo si se carga admin-clientes.html directamente
if (document.querySelector('#modalCliente')) {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('#tablaClientes') && !window.adminClientesInitialized) {
      checkAuth();
      listarClientes();
      setupClientesEventListeners();
      window.adminClientesInitialized = true;
    }
  });
}

function checkAuth() {
  const token = localStorage.getItem('puchia_admin_token');
  if (!token) { window.location.href = './login.html'; return; }
  const user = JSON.parse(localStorage.getItem('puchia_admin_user') || '{}');
  const el = document.getElementById('adminUserName');
  if (el) el.textContent = user.nombre || 'Admin';
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('puchia_admin_token');
  localStorage.removeItem('puchia_admin_user');
  window.location.href = './login.html';
});

function getToken() {
  return localStorage.getItem('puchia_admin_token');
}

// ==================== EVENT LISTENERS ====================

function setupClientesEventListeners() {
  document.getElementById('btnNuevoCliente')?.addEventListener('click', abrirNuevoCliente);
  document.getElementById('btnBuscar')?.addEventListener('click', () => { paginaActual = 1; listarClientes(); });
  document.getElementById('btnImportarExcel')?.addEventListener('click', toggleImportSection);
  document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);
  document.getElementById('btnConfirmarImport')?.addEventListener('click', importarExcel);
  document.getElementById('btnCancelarImport')?.addEventListener('click', () => {
    document.getElementById('importSection').style.display = 'none';
  });
  document.getElementById('formCliente')?.addEventListener('submit', guardarCliente);
  // Búsqueda en vivo: se actualiza mientras se escribe y también al borrar (amplía la búsqueda)
  const inputBusqueda = document.getElementById('inputBusqueda');
  let timerBusqueda = null;
  inputBusqueda?.addEventListener('input', () => {
    clearTimeout(timerBusqueda);
    timerBusqueda = setTimeout(() => { paginaActual = 1; listarClientes(); }, 250);
  });
  inputBusqueda?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(timerBusqueda); paginaActual = 1; listarClientes(); }
    if (e.key === 'Escape' && inputBusqueda.value) { inputBusqueda.value = ''; clearTimeout(timerBusqueda); paginaActual = 1; listarClientes(); }
  });
  document.getElementById('filtroActivo')?.addEventListener('change', () => { paginaActual = 1; listarClientes(); });
  document.getElementById('filtroTipoCliente')?.addEventListener('change', () => { paginaActual = 1; listarClientes(); });

  document.querySelectorAll('#theadClientes th.sortable').forEach(th => {
    th.addEventListener('click', () => sortBy(th.dataset.sort));
  });
}

function sortBy(field) {
  if (sortState.field === field) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState = { field, dir: 'asc' };
  }
  try { sessionStorage.setItem(SORT_KEY, JSON.stringify(sortState)); } catch (_) {}
  renderClientes();
}

function aplicarSort(data) {
  if (!sortState.field) return data;
  const { field, dir } = sortState;
  const mul = dir === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => {
    let va = a[field], vb = b[field];
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (field === 'created_at') return (new Date(va) - new Date(vb)) * mul;
    if (typeof va === 'boolean' || typeof vb === 'boolean') return ((va === vb) ? 0 : (va ? 1 : -1)) * mul;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
    return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base', numeric: true }) * mul;
  });
}

function actualizarIndicadoresSort() {
  document.querySelectorAll('#theadClientes th.sortable').forEach(th => {
    const ind = th.querySelector('.sort-ind');
    if (!ind) return;
    if (th.dataset.sort === sortState.field) {
      th.classList.add('sort-active');
      ind.textContent = sortState.dir === 'asc' ? '↑' : '↓';
    } else {
      th.classList.remove('sort-active');
      ind.textContent = '↕';
    }
  });
}

// ==================== LISTAR CLIENTES ====================

let listarClientesSeq = 0;
async function listarClientes() {
  const tbody = document.getElementById('tablaClientes');
  const miSeq = ++listarClientesSeq;                       // si llega una búsqueda más nueva, esta respuesta se descarta
  if (clientesActuales.length) tbody.style.opacity = '0.55';   // al buscar en vivo se mantienen las filas (atenuadas) para que no parpadee
  else tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><span class="spinner"></span></td></tr>';

  const busqueda = document.getElementById('inputBusqueda')?.value.trim();
  const activo = document.getElementById('filtroActivo')?.value;
  const tipoCliente = document.getElementById('filtroTipoCliente')?.value;

  let url = `${API_BASE_URL}/admin/clientes?pagina=${paginaActual}&limite=${LIMITE}`;
  if (busqueda) url += `&busqueda=${encodeURIComponent(busqueda)}`;
  if (activo !== '') url += `&activo=${activo}`;
  if (tipoCliente) url += `&tipo_cliente=${tipoCliente}`;

  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    const data = await res.json();
    if (miSeq !== listarClientesSeq) return;               // llegó tarde: ya hay una búsqueda más nueva

    tbody.style.opacity = '';
    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">${data.error || 'Error al cargar'}</td></tr>`;
      return;
    }

    totalPaginas = data.pagination?.paginas || 1;
    renderPaginacion();

    clientesActuales = data.data || [];
    renderClientes();
  } catch (err) {
    if (miSeq !== listarClientesSeq) return;
    tbody.style.opacity = '';
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">Error de conexión: ${err.message}</td></tr>`;
  }
}

function renderClientes() {
  const tbody = document.getElementById('tablaClientes');
  if (!tbody) return;
  actualizarIndicadoresSort();

  if (!clientesActuales.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">Sin clientes encontrados</td></tr>';
    return;
  }

  const data = aplicarSort(clientesActuales);
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><span class="${getCodigoBadgeClass(c.codigo_cliente)}">${c.codigo_cliente}</span></td>
      <td><a href="#" class="cliente-link" onclick="verCliente(${c.id}); return false;" title="Ver perfil"><strong>${cEsc(c.nombre)}</strong></a></td>
      <td>${chipTipoCliente(c.tipo_cliente)}</td>
      <td>${cEsc(c.whatsapp) || '-'}</td>
      <td>${c.ciudad || '-'}</td>
      <td><button class="badge badge-${c.activo ? 'activo' : 'inactivo'} badge-button-responsive" onclick="toggleClienteEstado(${c.id}, ${c.activo}, '${c.nombre.replace(/'/g, "\\'")}');">${c.activo ? 'Activo' : 'Inactivo'}</button></td>
      <td class="table-cell-fecha-responsive">${c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '-'}</td>
      <td><div class="acciones-cell">
        <button class="btn btn-sm btn-warning" onclick="editarCliente(${c.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="iniciarEliminacion(${c.id}, '${c.nombre.replace(/'/g, "\\'")}')">Eliminar</button>
      </div></td>
    </tr>
  `).join('');
}

// ==================== PAGINACIÓN ====================

function renderPaginacion() {
  const pag = document.getElementById('paginacion');
  let html = `<button onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual <= 1 ? 'disabled' : ''}>← Ant</button>`;

  const rango = 2;
  for (let i = Math.max(1, paginaActual - rango); i <= Math.min(totalPaginas, paginaActual + rango); i++) {
    html += `<button class="${i === paginaActual ? 'active' : ''}" onclick="cambiarPagina(${i})">${i}</button>`;
  }

  html += `<button onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual >= totalPaginas ? 'disabled' : ''}>Sig →</button>`;
  html += `<span class="pagination-info-responsive">Pág ${paginaActual} / ${totalPaginas}</span>`;
  pag.innerHTML = html;
}

function cambiarPagina(p) {
  if (p < 1 || p > totalPaginas) return;
  paginaActual = p;
  listarClientes();
}

// ==================== VER DETALLE ====================

async function verCliente(id) {
  try {
    const headers = { 'Authorization': `Bearer ${getToken()}` };
    const [resCliente, resOrdenes, resFechas] = await Promise.all([
      fetch(`${API_BASE_URL}/admin/clientes/${id}`, { headers }),
      fetch(`${API_BASE_URL}/admin/clientes/${id}/ordenes`, { headers }),
      fetch(`${API_BASE_URL}/admin/clientes/${id}/fechas`, { headers })
    ]);

    const dataCliente = await resCliente.json();
    if (!dataCliente.success) { alert(dataCliente.error); return; }
    const c = dataCliente.data;

    const dataOrdenes = await resOrdenes.json();
    const ordenes = (dataOrdenes.success && dataOrdenes.data?.ordenes) ? dataOrdenes.data.ordenes : [];
    let fechas = [];
    try { const df = await resFechas.json(); fechas = df.success ? df.data : []; } catch (_) { /* sin fechas */ }

    const pedidosHistoricos = c.pedidos_historicos || 0;
    const totalPedidos = pedidosHistoricos + ordenes.length;

    // ----- Resumen de compras (no cuenta anulados) -----
    const validas = ordenes.filter(o => o.estado !== 'anulado' && o.estado !== 'rechazado');
    const gastado = validas.reduce((a, o) => a + parseFloat(o.total || 0), 0);
    const ticket = validas.length ? gastado / validas.length : 0;
    const porFecha = [...validas].sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
    const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—';
    const pesos = (n) => (typeof formatearMonto === 'function' ? formatearMonto(n) : `$${Number(n).toFixed(2)}`);

    const conteoProductos = {};
    validas.forEach(o => (o.items || []).forEach(i => {
      const nombre = i.producto?.nombre || 'Producto';
      conteoProductos[nombre] = (conteoProductos[nombre] || 0) + (parseInt(i.cantidad, 10) || 1);
    }));
    const topProductos = Object.entries(conteoProductos).sort((x, y) => y[1] - x[1]).slice(0, 5);

    const resumenHTML = `
      <section class="perfil-card perfil-card-compras"><h3 class="perfil-card-titulo"><span class="perfil-card-ico">📊</span>Resumen de compras</h3>
      <div class="perfil-kpis">
        <div class="perfil-kpi"><span>Pedidos</span><strong>${totalPedidos}</strong><em>${pedidosHistoricos} históricos · ${ordenes.length} registrados</em></div>
        <div class="perfil-kpi"><span>Total gastado</span><strong>${pesos(gastado)}</strong><em>${validas.length} pedidos con monto</em></div>
        <div class="perfil-kpi"><span>Ticket promedio</span><strong>${validas.length ? pesos(ticket) : '—'}</strong><em>por pedido</em></div>
        <div class="perfil-kpi"><span>Último pedido</span><strong>${porFecha.length ? fmtFecha(porFecha[porFecha.length - 1].created_at) : '—'}</strong><em>${porFecha.length ? `primero: ${fmtFecha(porFecha[0].created_at)}` : 'sin pedidos'}</em></div>
      </div>
      ${topProductos.length ? `<div class="perfil-top"><span class="perfil-sub">Lo que más pidió</span>${topProductos.map(([n, q]) => `<span class="perfil-chip">${cEsc(n)} <b>×${q}</b></span>`).join('')}</div>` : ''}
      </section>`;

    // ----- Historial -----
    const productosDe = (o) => {
      if (o.items && o.items.length) return o.items.map(i => `${i.cantidad}x ${cEsc(i.producto?.nombre || 'Producto')}`).join(', ');
      const nota = (o.notas || '').trim();
      return nota ? `<span title="${cEsc(nota)}">${cEsc(nota.length > 140 ? nota.slice(0, 140) + '…' : nota)}</span>` : '-';
    };
    const estadoChip = (e) => {
      const col = (typeof getEstadoColor === 'function') ? getEstadoColor(e) : { bg: '#eee', text: '#333', border: '#ccc' };
      return `<span style="background:${col.bg};color:${col.text};border:1px solid ${col.border};border-radius:10px;padding:1px 8px;font-size:11px;font-weight:600;white-space:nowrap;">${cEsc(e)}</span>`;
    };
    const filasPedidos = ordenes.map(o => `<tr>
        <td style="padding:8px;font-weight:600;color:#7f1f6e;white-space:nowrap;">${cEsc(o.id_unico || o.id)}</td>
        <td style="padding:8px;white-space:nowrap;">${fmtFecha(o.created_at)}</td>
        <td style="padding:8px;">${estadoChip(o.estado)}</td>
        <td style="padding:8px;">${productosDe(o)}</td>
        <td style="padding:8px;text-align:right;font-weight:600;white-space:nowrap;">${pesos(parseFloat(o.total || 0))}</td></tr>`).join('');
    const tituloPedidos = `<h3 class="perfil-card-titulo"><span class="perfil-card-ico">📋</span>Pedidos anteriores<span class="perfil-card-count">${ordenes.length}</span></h3>`;
    const historialHTML = ordenes.length ? `
      <section class="perfil-card">${tituloPedidos}
        <div style="overflow-x:auto;"><table class="perfil-tabla"><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Productos</th><th style="text-align:right;">Total</th></tr></thead><tbody>${filasPedidos}</tbody></table></div>
      </section>` : `<section class="perfil-card">${tituloPedidos}<div class="perfil-vacio">Sin pedidos registrados en el sistema.</div></section>`;

    // ----- Fechas importantes + notas -----
    const meses = MESES_ES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    const dias = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    const fechasHTML = `
      <section class="perfil-card"><h3 class="perfil-card-titulo"><span class="perfil-card-ico">🎂</span>Fechas importantes</h3>
        <div id="perfilFechasLista">${renderListaFechas(fechas, c.id)}</div>
        <div class="perfil-form-wrap"><div class="perfil-form-titulo">➕ Agregar una fecha</div><div class="perfil-form-fecha">
          <select id="ffTipo" onchange="cambioTipoFecha()">
            <optgroup label="Fecha propia"><option value="cumpleaños">🎂 Cumpleaños</option><option value="aniversario">💍 Aniversario</option><option value="otro">📌 Otra fecha</option></optgroup>
            <optgroup label="Fecha comercial (todos los años)"><option value="dia_madre">💐 Día de la Madre</option><option value="dia_padre">👔 Día del Padre</option><option value="dia_enamorado">❤️ Día del Enamorado</option></optgroup>
          </select>
          <input type="text" id="ffPersona" placeholder="¿De quién? (ej: Mateo, su hijo)" maxlength="120">
          <select id="ffDia" aria-label="Día">${dias}</select>
          <select id="ffMes" aria-label="Mes">${meses}</select>
          <input type="text" id="ffNota" placeholder="Nota (opcional)" maxlength="300">
          <label class="perfil-aviso">Avisarme <input type="number" id="ffAviso" value="60" min="0" max="365"> días antes</label>
          <button type="button" class="btn btn-primary btn-sm" onclick="guardarFechaCliente(${c.id})">Agregar fecha</button>
        </div></div>
        <div class="perfil-ayuda">Se repite todos los años (no lleva año). Las fechas cercanas aparecen en "Próximas fechas" en Clientes.</div>
      </section>
      <section class="perfil-card"><h3 class="perfil-card-titulo"><span class="perfil-card-ico">📝</span>Notas internas</h3>
        <textarea id="perfilNotas" rows="4" placeholder="Gustos, cosas a recordar, cómo prefiere que le escriban...">${cEsc(c.notas || '')}</textarea>
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px;"><button type="button" class="btn btn-secondary btn-sm" onclick="guardarNotasPerfil(${c.id})">Guardar notas</button><span id="perfilNotasMsg" class="perfil-ayuda"></span></div>
      </section>`;

    const iniciales = (c.nombre || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const waCliente = linkWhatsApp(c.whatsapp, `Hola ${(c.nombre || '').split(' ')[0]}! `);
    const dato = (ico, label, valor) => `<div class="perfil-dato"><span class="perfil-dato-ico">${ico}</span><div><span class="perfil-dato-label">${label}</span><div class="perfil-dato-valor">${valor || '<span class="perfil-nd">—</span>'}</div></div></div>`;
    const frecuente = totalPedidos >= 3 ? '<span class="perfil-etiqueta perfil-etiqueta-vip">⭐ Cliente frecuente</span>' : '';

    document.getElementById('detalleContenido').innerHTML = `
      <div class="perfil-head">
        <div class="perfil-avatar">${cEsc(iniciales)}</div>
        <div class="perfil-head-info">
          <h2>${cEsc(c.nombre)}</h2>
          <div class="perfil-head-meta">
            <span class="${getCodigoBadgeClass(c.codigo_cliente)}">${cEsc(c.codigo_cliente)}</span>
            <span class="badge badge-${c.activo ? 'activo' : 'inactivo'}">${c.activo ? 'Activo' : 'Inactivo'}</span>
            ${chipTipoCliente(c.tipo_cliente)}
            ${frecuente}
            <span class="perfil-desde">Cliente desde ${c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '—'}</span>
          </div>
        </div>
        <div class="perfil-acciones">
          ${waCliente ? `<a class="btn btn-sm btn-secondary" href="${waCliente}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
          <button class="btn btn-primary btn-sm" onclick="nuevoPedidoDesdeFicha(${c.id})" title="Crear un pedido ya asignado a este cliente">➕ Nuevo pedido</button>
          <button class="btn btn-warning btn-sm" onclick="cerrarDetalle();editarCliente(${c.id})">✏️ Editar</button>
          <button class="btn btn-secondary btn-sm" onclick="cerrarDetalle()">Cerrar</button>
        </div>
      </div>

      <section class="perfil-card"><h3 class="perfil-card-titulo"><span class="perfil-card-ico">👤</span>Datos del cliente</h3>
        <div class="perfil-datos">
          ${dato('✉️', 'Email', c.email ? `<a href="mailto:${cEsc(c.email)}">${cEsc(c.email)}</a>` : '')}
          ${dato('📱', 'WhatsApp', cEsc(c.whatsapp))}
          ${dato('☎️', 'Teléfono', cEsc(c.telefono))}
          ${dato('🪪', 'DNI', cEsc(c.dni))}
          ${dato('📍', 'Dirección', cEsc(c.direccion))}
          ${dato('🏙️', 'Ciudad', cEsc(c.ciudad) + (c.codigo_postal ? ` (CP ${cEsc(c.codigo_postal)})` : ''))}
        </div>
        <div class="perfil-prefs">
          <label>Tipo de cliente
            <select id="perfilTipoCliente" onchange="guardarPreferenciaCliente(${c.id}, 'tipo_cliente', this.value || null)">
              <option value="" ${!c.tipo_cliente ? 'selected' : ''}>Sin clasificar</option>
              <option value="eventos" ${c.tipo_cliente === 'eventos' ? 'selected' : ''}>🎉 Cumpleaños / eventos</option>
              <option value="negocio" ${c.tipo_cliente === 'negocio' ? 'selected' : ''}>🏪 Negocio / emprendimiento</option>
            </select></label>
          <label>¿Acepta promociones?
            <select id="perfilAcepta" onchange="guardarPreferenciaCliente(${c.id}, 'acepta_promociones', this.value === '' ? null : this.value === 'true')">
              <option value="" ${c.acepta_promociones == null ? 'selected' : ''}>Sin registrar</option>
              <option value="true" ${c.acepta_promociones === true ? 'selected' : ''}>✅ Sí, acepta</option>
              <option value="false" ${c.acepta_promociones === false ? 'selected' : ''}>🚫 No quiere recibir</option>
            </select></label>
          <span id="perfilPrefMsg" class="perfil-ayuda"></span>
        </div>
      </section>

      ${resumenHTML}
      ${historialHTML}
      ${fechasHTML}
    `;
    document.getElementById('modalDetalle').classList.add('show');
  } catch (err) {
    alert('Error al cargar detalle: ' + err.message);
  }
}

function cerrarDetalle() {
  document.getElementById('modalDetalle').classList.remove('show');
}

// ==================== NUEVO CLIENTE ====================

// Pide al backend el próximo código libre sin consumirlo, para sugerirlo
async function obtenerCodigoSugerido() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/proximo-codigo`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    return data.success ? data.data.codigo_cliente : '';
  } catch (err) {
    console.error('Error obteniendo próximo código:', err);
    return '';
  }
}

async function abrirNuevoCliente() {
  document.getElementById('modalTitulo').textContent = 'Nuevo Cliente';
  document.getElementById('codigoEditGroup').style.display = 'block';
  document.getElementById('activoGroup').style.display = 'none';
  document.getElementById('clienteId').value = '';
  document.getElementById('codigoAlerta').style.display = 'none';
  limpiarForm();

  const campoCodigo = document.getElementById('fCodigoCliente');
  campoCodigo.value = '';
  campoCodigo.placeholder = 'Calculando...';
  document.getElementById('modalCliente').classList.add('show');

  campoCodigo.value = await obtenerCodigoSugerido();
  campoCodigo.placeholder = 'J0001';
}

// ==================== EDITAR CLIENTE ====================

async function editarCliente(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${id}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!data.success) { alert(data.error); return; }
    const c = data.data;

    document.getElementById('modalTitulo').textContent = 'Editar Cliente';
    document.getElementById('clienteId').value = c.id;
    document.getElementById('codigoEditGroup').style.display = 'block';
    document.getElementById('fCodigoCliente').value = c.codigo_cliente || '';
    document.getElementById('codigoAlerta').style.display = 'none';
    document.getElementById('activoGroup').style.display = 'block';

    document.getElementById('fNombre').value = c.nombre || '';
    document.getElementById('fEmail').value = c.email || '';
    document.getElementById('fDni').value = c.dni || '';
    document.getElementById('fWhatsapp').value = c.whatsapp || '';
    document.getElementById('fTelefono').value = c.telefono || '';
    document.getElementById('fDireccion').value = c.direccion || '';
    document.getElementById('fCiudad').value = c.ciudad || '';
    document.getElementById('fCodigoPostal').value = c.codigo_postal || '';
    document.getElementById('fNotas').value = c.notas || '';
    document.getElementById('fTipoCliente').value = c.tipo_cliente || '';
    document.getElementById('fAcepta').value = c.acepta_promociones == null ? '' : String(c.acepta_promociones);
    document.getElementById('fActivo').value = String(c.activo);

    document.getElementById('modalCliente').classList.add('show');
  } catch (err) {
    alert('Error al cargar cliente: ' + err.message);
  }
}

// ==================== GUARDAR (CREATE/UPDATE) ====================

async function guardarCliente(e) {
  e.preventDefault();
  const id = document.getElementById('clienteId').value;
  const isEdit = !!id;

  const payload = {
    nombre: document.getElementById('fNombre').value.trim(),
    email: document.getElementById('fEmail').value.trim(),
    dni: document.getElementById('fDni').value.trim() || null,
    whatsapp: document.getElementById('fWhatsapp').value.trim() || null,
    telefono: document.getElementById('fTelefono').value.trim() || null,
    direccion: document.getElementById('fDireccion').value.trim() || null,
    ciudad: document.getElementById('fCiudad').value.trim() || null,
    codigo_postal: document.getElementById('fCodigoPostal').value.trim() || null,
    notas: document.getElementById('fNotas').value.trim() || null,
    tipo_cliente: document.getElementById('fTipoCliente').value || null,
    acepta_promociones: document.getElementById('fAcepta').value === '' ? null : document.getElementById('fAcepta').value === 'true'
  };

  const codigoCliente = document.getElementById('fCodigoCliente').value.trim();
  if (codigoCliente) {
    payload.codigo_cliente = codigoCliente;
  }

  if (isEdit) {
    payload.activo = document.getElementById('fActivo').value === 'true';
  }

  const btnGuardar = document.getElementById('btnGuardar');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    const url = isEdit
      ? `${API_BASE_URL}/admin/clientes/${id}`
      : `${API_BASE_URL}/admin/clientes`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      cerrarModal();
      listarClientes();
    } else {
      // Los errores del código se muestran junto al campo, no en un alert
      if (res.status === 409 || /^El código/i.test(data.error || '')) {
        document.getElementById('codigoAlerta').textContent = data.error;
        document.getElementById('codigoAlerta').style.display = 'block';
      } else {
        alert('Error: ' + (data.error || 'No se pudo guardar'));
      }
    }
  } catch (err) {
    alert('Error de conexión: ' + err.message);
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar';
  }
}

// ==================== HABILITAR/INHABILITAR CLIENTE ====================

async function toggleClienteEstado(id, activo, nombre) {
  try {
    const nuevoEstado = !activo;
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activo: nuevoEstado })
    });
    const data = await res.json();
    if (data.success) {
      listarClientes();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==================== IMPORTAR EXCEL ====================

function toggleImportSection() {
  const section = document.getElementById('importSection');
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
  document.getElementById('importResult').style.display = 'none';
}

async function importarExcel() {
  const fileInput = document.getElementById('archivoExcel');
  if (!fileInput.files.length) { alert('Selecciona un archivo Excel'); return; }

  const formData = new FormData();
  formData.append('archivo', fileInput.files[0]);

  const resultDiv = document.getElementById('importResult');
  resultDiv.style.display = 'block';
  resultDiv.className = 'import-result';
  resultDiv.innerHTML = '<span class="spinner"></span> Importando...';

  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/importar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    const data = await res.json();

    if (data.success) {
      const d = data.data;
      resultDiv.className = 'import-result success';
      resultDiv.innerHTML = `
        <strong>✅ Importación completada</strong><br>
        Total filas: ${d.total_filas} | Exitosos: ${d.exitosos} | Errores: ${d.errores}<br>
        ${d.detalle_errores.length ? `<details style="margin-top:8px;"><summary>Ver errores (${d.errores})</summary>
          <ul style="margin:8px 0 0 16px;font-size:12px;">
            ${d.detalle_errores.map(e => `<li>Fila ${e.fila}: ${e.error}</li>`).join('')}
          </ul></details>` : ''}
      `;
      if (d.exitosos > 0) listarClientes();
    } else {
      resultDiv.className = 'import-result error';
      resultDiv.innerHTML = `<strong>❌ Error:</strong> ${data.error}`;
    }
  } catch (err) {
    resultDiv.className = 'import-result error';
    resultDiv.innerHTML = `<strong>❌ Error de conexión:</strong> ${err.message}`;
  }
}

// ==================== EXPORTAR EXCEL ====================

async function exportarExcel() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/exportar`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (data.success) {
      const link = document.createElement('a');
      link.href = `${typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : 'https://puchia-backend-production.up.railway.app'}${data.data.url}`;
      link.download = data.data.filename;
      link.click();
    } else {
      alert('Error al exportar: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ==================== HELPERS ====================

function getCodigoBadgeClass(codigo) {
  const prefix = (codigo || '').charAt(0).toUpperCase();
  if (prefix === 'P') return 'codigo-badge codigo-badge-p';
  if (prefix === 'J' || prefix === 'K') return 'codigo-badge codigo-badge-jk';
  return 'codigo-badge';
}

function cerrarModal() {
  document.getElementById('modalCliente').classList.remove('show');
  limpiarForm();
}

function limpiarForm() {
  ['fNombre','fEmail','fDni','fWhatsapp','fTelefono','fDireccion','fCiudad','fCodigoPostal','fNotas','fTipoCliente','fAcepta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ==================== ELIMINAR CLIENTE ====================

let clienteEnEliminacion = null;

async function iniciarEliminacion(id, nombre) {
  try {
    // Verificar si tiene órdenes
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${id}/ordenes`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (data.success && data.data && data.data.total > 0) {
      // Tiene órdenes - mostrar alerta
      document.getElementById('alertaMensaje').textContent = `Este cliente tiene ${data.data.total} orden${data.data.total > 1 ? 'es' : ''}. No se puede eliminar clientes con historial de órdenes.`;
      document.getElementById('modalAlertaError').classList.add('show');
    } else {
      // No tiene órdenes - mostrar confirmación
      clienteEnEliminacion = { id, nombre };
      document.getElementById('confirmTitulo').textContent = '¿Eliminar cliente?';
      document.getElementById('confirmMensaje').textContent = `¿Estás seguro de que deseas eliminar permanentemente a "${nombre}"?\n\nEsta acción no se puede deshacer.`;
      document.getElementById('modalConfirmacionEliminar').classList.add('show');
    }
  } catch (err) {
    console.error('Error verificando órdenes:', err);
    document.getElementById('alertaMensaje').textContent = 'Error al verificar si el cliente tiene órdenes. Intenta nuevamente.';
    document.getElementById('modalAlertaError').classList.add('show');
  }
}

async function confirmarEliminar() {
  if (!clienteEnEliminacion) return;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${clienteEnEliminacion.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    const data = await res.json();

    if (data.success) {
      cerrarConfirmacion();
      listarClientes();
    } else {
      cerrarConfirmacion();
      document.getElementById('alertaMensaje').textContent = data.error || 'Error al eliminar el cliente.';
      document.getElementById('modalAlertaError').classList.add('show');
    }
  } catch (err) {
    console.error('Error eliminando cliente:', err);
    cerrarConfirmacion();
    document.getElementById('alertaMensaje').textContent = 'Error de conexión. Intenta nuevamente.';
    document.getElementById('modalAlertaError').classList.add('show');
  }
}

function cerrarConfirmacion() {
  document.getElementById('modalConfirmacionEliminar').classList.remove('show');
  clienteEnEliminacion = null;
}

function cerrarAlerta() {
  document.getElementById('modalAlertaError').classList.remove('show');
}


// ==================== MENÚ COMPARTIR (CLIENTES) ====================
function toggleMenuCompartirClientes(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('menuCompartirClientes');
  if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', () => {
  const m = document.getElementById('menuCompartirClientes');
  if (m) m.style.display = 'none';
});


// ==================== PERFIL: FECHAS IMPORTANTES, NOTAS ====================
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ICONO_FECHA = { 'cumpleaños': '🎂', 'aniversario': '💍', 'otro': '📌', 'dia_madre': '💐', 'dia_padre': '👔', 'dia_enamorado': '❤️' };
const ES_COMERCIAL = (tipo) => String(tipo || '').startsWith('dia_');

function cEsc(t) {
  return String(t ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function textoFaltan(dias) {
  if (dias === 0) return 'es hoy';
  if (dias === 1) return 'es mañana';
  if (dias < 60) return `faltan ${dias} días`;
  const meses = Math.round(dias / 30);
  return `faltan ~${meses} meses`;
}

function renderListaFechas(fechas, clienteId) {
  if (!fechas.length) return '<div class="perfil-vacio">Todavía no hay fechas cargadas para este cliente.</div>';
  return fechas.map(f => {
    const dia = f.proxima_dia ?? f.dia, mes = f.proxima_mes ?? f.mes;
    const titulo = ES_COMERCIAL(f.tipo) ? `${cEsc(f.nombre_fecha || f.tipo)}` : `${dia} de ${MESES_ES[mes - 1]}`;
    const cuando = ES_COMERCIAL(f.tipo) ? `próximo: ${dia} de ${MESES_ES[mes - 1]}` : cEsc(f.tipo);
    return `
    <div class="perfil-fecha ${f.dias_restantes <= f.aviso_dias ? 'perfil-fecha-aviso' : ''}">
      <div class="perfil-fecha-icono">${ICONO_FECHA[f.tipo] || '📌'}</div>
      <div class="perfil-fecha-info">
        <strong>${titulo}</strong>${f.persona ? ` · ${cEsc(f.persona)}` : ''}
        <div class="perfil-fecha-sub">${cuando} · ${textoFaltan(f.dias_restantes)} · aviso ${f.aviso_dias} días antes${f.nota ? ` · ${cEsc(f.nota)}` : ''}</div>
      </div>
      <button type="button" class="btn btn-sm btn-danger" onclick="eliminarFechaDeCliente(${f.id}, ${clienteId})" title="Quitar esta fecha">🗑️</button>
    </div>`;
  }).join('');
}

function cambioTipoFecha() {
  const tipo = document.getElementById('ffTipo')?.value;
  const comercial = ES_COMERCIAL(tipo);
  const form = document.querySelector('.perfil-form-fecha');
  if (form) form.classList.toggle('es-comercial', comercial);
  const aviso = document.getElementById('ffAviso');
  if (aviso) aviso.value = comercial ? (tipo === 'dia_enamorado' ? 30 : 45) : 60;
}

async function guardarPreferenciaCliente(id, campo, valor) {
  const msg = document.getElementById('perfilPrefMsg');
  if (msg) msg.textContent = 'Guardando...';
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'error');
    if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => { msg.textContent = ''; }, 1800); }
    listarClientes();
    cargarFechasProximas();
  } catch (err) {
    if (msg) msg.textContent = 'No se pudo guardar';
  }
}

async function recargarFechasPerfil(clienteId) {
  const res = await fetch(`${API_BASE_URL}/admin/clientes/${clienteId}/fechas`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
  const data = await res.json();
  const cont = document.getElementById('perfilFechasLista');
  if (cont && data.success) cont.innerHTML = renderListaFechas(data.data, clienteId);
  cargarFechasProximas();
}

async function guardarFechaCliente(clienteId) {
  const val = (id) => document.getElementById(id)?.value;
  const body = {
    tipo: val('ffTipo'), persona: val('ffPersona'), dia: val('ffDia'), mes: val('ffMes'),
    nota: val('ffNota'), aviso_dias: val('ffAviso')
  };
  if (ES_COMERCIAL(body.tipo)) { delete body.dia; delete body.mes; delete body.persona; }
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${clienteId}/fechas`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || !data.success) { alert(data.error || data.message || 'No se pudo guardar la fecha'); return; }
    ['ffPersona', 'ffNota'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    await recargarFechasPerfil(clienteId);
  } catch (err) {
    alert('Error de conexión al guardar la fecha');
  }
}

async function eliminarFechaDeCliente(fechaId, clienteId) {
  if (!confirm('¿Quitar esta fecha?')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/fechas/${fechaId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
    const data = await res.json();
    if (!res.ok || !data.success) { alert(data.error || 'No se pudo quitar la fecha'); return; }
    await recargarFechasPerfil(clienteId);
  } catch (err) {
    alert('Error de conexión');
  }
}

async function guardarNotasPerfil(clienteId) {
  const msg = document.getElementById('perfilNotasMsg');
  const notas = document.getElementById('perfilNotas')?.value ?? '';
  if (msg) msg.textContent = 'Guardando...';
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${clienteId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || data.message || 'error');
    if (msg) { msg.textContent = '✓ Guardado'; setTimeout(() => { msg.textContent = ''; }, 2000); }
  } catch (err) {
    if (msg) msg.textContent = 'No se pudo guardar';
  }
}

// ==================== PRÓXIMAS FECHAS IMPORTANTES (panel en Clientes) ====================
function linkWhatsApp(whatsapp, texto) {
  let n = String(whatsapp || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!n) return null;
  if (!n.startsWith('54')) n = '54' + (n.startsWith('9') ? '' : '9') + n.replace(/^15/, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

function mensajeFecha(f) {
  const nombre = (f.cliente.nombre || '').split(' ')[0];
  if (ES_COMERCIAL(f.tipo)) {
    return `¡Hola ${nombre}! 😊 Se acerca el ${f.nombre_fecha} y en Puchia armamos algo especial. Como ya nos elegiste para esta fecha, te dejamos un cupón para que hagas tu pedido con tiempo 🎁`;
  }
  const quien = f.persona ? ` de ${f.persona}` : '';
  return `¡Hola ${nombre}! 😊 Se acerca el ${f.tipo === 'cumpleaños' ? 'cumpleaños' : 'día especial'}${quien}. Queremos tener un detalle con vos: te dejamos un cupón especial para que armes algo lindo en Puchia 🎁`;
}

async function cargarFechasProximas() {
  const card = document.getElementById('fechasProximasLista');
  if (!card) return;
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/fechas/proximas?dias=90`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error('error');
    const lista = data.data;
    const comerciales = fechasComercialesProximas(90);
    const enAviso = lista.filter(f => f.en_aviso && f.cliente.acepta_promociones !== false).length + comerciales.filter(f => f.en_aviso).length;
    const badge = document.getElementById('fechasProximasCount');
    if (badge) { badge.textContent = enAviso ? `${enAviso} para contactar` : (lista.length + comerciales.length ? `${lista.length + comerciales.length}` : ''); badge.className = 'fechas-count' + (enAviso ? ' fechas-count-aviso' : ''); }
    const bloqueClientes = !lista.length
      ? '<div class="fechas-bloque-titulo">De tus clientes</div><div class="perfil-vacio">No hay fechas en los próximos 90 días. Cargalas desde el perfil de cada cliente (clic en su nombre).</div>'
      : '<div class="fechas-bloque-titulo">De tus clientes</div>' + lista.map(f => {
      const noAcepta = f.cliente.acepta_promociones === false;
      const sinConfirmar = f.cliente.acepta_promociones == null;
      const wa = noAcepta ? null : linkWhatsApp(f.cliente.whatsapp, mensajeFecha(f));
      const titulo = ES_COMERCIAL(f.tipo) ? `${cEsc(f.nombre_fecha)} <span class="fechas-faltan">· ${f.dia} de ${MESES_ES[f.mes - 1]}</span>` : `${f.dia} de ${MESES_ES[f.mes - 1]}`;
      const accion = noAcepta
        ? '<span class="perfil-etiqueta perfil-etiqueta-no" title="Pidió no recibir promociones">🚫 No quiere promociones</span>'
        : (wa ? `<a class="btn btn-sm btn-secondary" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>` : '<span class="perfil-ayuda">sin WhatsApp</span>');
      return `<div class="perfil-fecha ${f.en_aviso && !noAcepta ? 'perfil-fecha-aviso' : ''}">
        <div class="perfil-fecha-icono">${ICONO_FECHA[f.tipo] || '📌'}</div>
        <div class="perfil-fecha-info">
          <strong>${titulo}</strong>${f.persona ? ` · ${cEsc(f.persona)}` : ''} <span class="fechas-faltan">${textoFaltan(f.dias_restantes)}</span>
          <div class="perfil-fecha-sub"><a href="#" class="cliente-link" onclick="cerrarFechasProximas(); verCliente(${f.cliente.id}); return false;">${cEsc(f.cliente.nombre)}</a> (${cEsc(f.cliente.codigo_cliente)}) ${chipTipoCliente(f.cliente.tipo_cliente)}${f.en_aviso ? ' · <b>momento de contactar</b>' : ` · contactar en ${f.dias_restantes - f.aviso_dias} días`}${sinConfirmar && !noAcepta ? ' · <span title="Todavía no registraste si acepta promociones">⚠ sin confirmar si acepta promociones</span>' : ''}${f.nota ? ` · ${cEsc(f.nota)}` : ''}</div>
        </div>
        ${accion}
      </div>`;
    }).join('');
    card.innerHTML = renderFechasComerciales(lista) + bloqueClientes;
  } catch (err) {
    card.innerHTML = renderFechasComerciales([]) + '<div class="perfil-vacio">No se pudieron cargar las fechas de tus clientes.</div>';
  }
}


function toggleFechasProximas(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('fechasProximasPanel');
  const abrir = m && m.style.display !== 'block';
  cerrarFechasProximas();
  const compartir = document.getElementById('menuCompartirClientes');
  if (compartir) compartir.style.display = 'none';
  if (abrir) m.style.display = 'block';
}
function cerrarFechasProximas() {
  const m = document.getElementById('fechasProximasPanel');
  if (m) m.style.display = 'none';
}
document.addEventListener('click', cerrarFechasProximas);


// ==================== FECHAS COMERCIALES (valen para todos los clientes) ====================
// Argentina: Día de la Madre = 3.er domingo de octubre · Día del Padre = 3.er domingo de junio · Día del Enamorado = 14 de febrero
const FECHAS_COMERCIALES = [
  { clave: 'madre', nombre: 'Día de la Madre', icono: '💐', mes: 10, tercerDomingo: true, aviso: 45 },
  { clave: 'padre', nombre: 'Día del Padre', icono: '👔', mes: 6, tercerDomingo: true, aviso: 45 },
  { clave: 'enamorado', nombre: 'Día del Enamorado', icono: '❤️', mes: 2, dia: 14, aviso: 30 }
];

function hoyArgentinaUTC() {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function tercerDomingo(anio, mes) {
  const primero = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();   // 0 = domingo
  return Date.UTC(anio, mes - 1, 1 + ((7 - primero) % 7) + 14);
}

function proximaOcurrencia(def, hoy) {
  const anio = new Date(hoy).getUTCFullYear();
  const en = (a) => (def.tercerDomingo ? tercerDomingo(a, def.mes) : Date.UTC(a, def.mes - 1, def.dia));
  const t = en(anio) >= hoy ? en(anio) : en(anio + 1);
  return { timestamp: t, dias: Math.round((t - hoy) / 86400000) };
}

function fechasComercialesProximas(ventana = 90) {
  const hoy = hoyArgentinaUTC();
  return FECHAS_COMERCIALES.map(def => {
    const o = proximaOcurrencia(def, hoy);
    const f = new Date(o.timestamp);
    return { ...def, dias_restantes: o.dias, dia_num: f.getUTCDate(), mes_num: f.getUTCMonth() + 1, en_aviso: o.dias <= def.aviso };
  }).filter(f => f.dias_restantes <= Math.max(ventana, f.aviso)).sort((a, b) => a.dias_restantes - b.dias_restantes);
}

function mensajeComercial(f) {
  return `¡Hola! 😊 Se acerca el ${f.nombre} y en Puchia armamos algo especial para esa fecha. Tenemos un cupón para vos si hacés tu pedido con tiempo 🎁`;
}

function copiarMensajeComercial(clave, btn) {
  const f = fechasComercialesProximas(365).find(x => x.clave === clave);
  if (!f) return;
  const ok = () => { if (btn) { const t = btn.textContent; btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = t; }, 1500); } };
  const texto = mensajeComercial(f);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texto).then(ok, () => window.prompt('Copiá el mensaje:', texto));
  else window.prompt('Copiá el mensaje:', texto);
}

function renderFechasComerciales(listaClientes = []) {
  const lista = fechasComercialesProximas(90);
  if (!lista.length) return '';
  return `<div class="fechas-bloque-titulo">Fechas comerciales <span>· para todos tus clientes</span></div>` + lista.map(f => `
    <div class="perfil-fecha ${f.en_aviso ? 'perfil-fecha-aviso' : ''}">
      <div class="perfil-fecha-icono">${f.icono}</div>
      <div class="perfil-fecha-info">
        <strong>${f.nombre}</strong> <span class="fechas-faltan">${f.dia_num} de ${MESES_ES[f.mes_num - 1]} · ${textoFaltan(f.dias_restantes)}</span>
        ${(() => { const n = listaClientes.filter(x => x.tipo === 'dia_' + f.clave && x.cliente.acepta_promociones !== false).length; return n ? `<span class="perfil-etiqueta perfil-etiqueta-vip">${n} cliente${n > 1 ? 's' : ''} anotado${n > 1 ? 's' : ''}</span>` : ''; })()}
        <div class="perfil-fecha-sub">${f.en_aviso ? '<b>momento de comunicar la campaña</b>' : `comunicar en ${f.dias_restantes - f.aviso} días`} (desde ${f.aviso} días antes)</div>
      </div>
      <button type="button" class="btn btn-sm btn-secondary" onclick="copiarMensajeComercial('${f.clave}', this)">📋 Copiar mensaje</button>
    </div>`).join('');
}


// ==================== TIPO DE CLIENTE ====================
function chipTipoCliente(tipo) {
  if (tipo === 'eventos') return '<span class="chip-tipo chip-tipo-eventos">🎉 Eventos</span>';
  if (tipo === 'negocio') return '<span class="chip-tipo chip-tipo-negocio">🏪 Negocio</span>';
  return '<span class="chip-tipo chip-tipo-sin">—</span>';
}

// ==================== NUEVO PEDIDO DESDE LA FICHA ====================
async function nuevoPedidoDesdeFicha(clienteId) {
  cerrarDetalle();
  document.querySelector('.sidebar-nav [data-page="ordenes"], [data-page="ordenes"]')?.click();
  if (typeof abrirModalCrearOrden !== 'function') { alert('No se pudo abrir el formulario de pedido'); return; }
  await abrirModalCrearOrden();
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${clienteId}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    const data = await res.json();
    if (data.success && typeof clienteBuscadorEstablecer === 'function') clienteBuscadorEstablecer(data.data);   // queda elegido en el buscador
  } catch (_) { /* queda sin elegir: se busca a mano */ }
}

// ==================== DUPLICADOS ====================
const DUP_IGNORADOS_KEY = 'puchia_clientes_dup_ignorados';
let duplicadosGrupos = [];

function dupClaveGrupo(grupo) {
  return grupo.clientes.map(c => c.id).sort((a, b) => a - b).join('-');
}
function dupIgnorados() {
  try { return new Set(JSON.parse(localStorage.getItem(DUP_IGNORADOS_KEY) || '[]')); } catch (_) { return new Set(); }
}

async function abrirDuplicados() {
  const modal = document.getElementById('modalDuplicados');
  const cont = document.getElementById('duplicadosContenido');
  if (!modal || !cont) return;
  cont.innerHTML = '<div class="perfil-vacio">Buscando duplicados...</div>';
  modal.classList.add('show');
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/duplicados`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'error');
    duplicadosGrupos = data.data;
    renderDuplicados();
  } catch (err) {
    cont.innerHTML = '<div class="perfil-vacio">No se pudo buscar duplicados. Probá de nuevo.</div>';
  }
}
function cerrarDuplicados() { document.getElementById('modalDuplicados')?.classList.remove('show'); }

function renderDuplicados() {
  const cont = document.getElementById('duplicadosContenido');
  const ignorados = dupIgnorados();
  const visibles = duplicadosGrupos.map((g, i) => ({ g, i })).filter(({ g }) => !ignorados.has(dupClaveGrupo(g)));
  if (!visibles.length) {
    cont.innerHTML = `<div class="perfil-vacio">✅ No se encontraron clientes duplicados${ignorados.size ? ` (ocultaste ${ignorados.size} grupo${ignorados.size > 1 ? 's' : ''} marcado${ignorados.size > 1 ? 's' : ''} como "no es duplicado")` : ''}.</div>${ignorados.size ? '<div style="margin-top:8px;"><button class="btn btn-sm btn-secondary" onclick="restablecerDuplicadosIgnorados()">Volver a mostrar los ocultos</button></div>' : ''}`;
    return;
  }
  cont.innerHTML = visibles.map(({ g, i }) => `
    <section class="perfil-card dup-grupo" data-grupo="${i}">
      <h3 class="perfil-card-titulo"><span class="perfil-card-ico">🧩</span>Grupo ${i + 1}<span class="dup-motivos">${g.motivos.map(m => `<span class="chip-tipo chip-tipo-sin">${cEsc(m)}</span>`).join('')}</span></h3>
      <div style="overflow-x:auto;"><table class="perfil-tabla"><thead><tr><th>Conservar</th><th>Fusionar</th><th>Cliente</th><th>Contacto</th><th style="text-align:right;">Pedidos</th><th>Alta</th></tr></thead><tbody>
        ${g.clientes.map((c, k) => `<tr>
          <td><input type="radio" name="dup-principal-${i}" value="${c.id}" ${k === 0 ? 'checked' : ''} onchange="dupActualizarFila(${i})"></td>
          <td><input type="checkbox" class="dup-check" value="${c.id}" ${k === 0 ? 'disabled' : 'checked'}></td>
          <td><strong>${cEsc(c.nombre)}</strong><br><span class="perfil-ayuda">${cEsc(c.codigo_cliente)}${c.activo ? '' : ' · inactivo'}</span></td>
          <td style="font-size:12px;">${cEsc(c.email) || '—'}<br>${cEsc(c.whatsapp) || '—'}${c.dni ? `<br>DNI ${cEsc(c.dni)}` : ''}</td>
          <td style="text-align:right;">${c.pedidos}${c.pedidos_historicos ? `<br><span class="perfil-ayuda">+${c.pedidos_historicos} hist.</span>` : ''}</td>
          <td style="font-size:12px;white-space:nowrap;">${c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '—'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="dup-acciones">
        <button class="btn btn-sm btn-secondary" onclick="ignorarGrupoDuplicado(${i})">No es duplicado</button>
        <button class="btn btn-sm btn-primary" onclick="fusionarGrupo(${i})">Fusionar los marcados en el que se conserva</button>
      </div>
    </section>`).join('');
}

function dupActualizarFila(i) {
  const grupo = document.querySelector(`.dup-grupo[data-grupo="${i}"]`);
  if (!grupo) return;
  const principal = grupo.querySelector(`input[name="dup-principal-${i}"]:checked`)?.value;
  grupo.querySelectorAll('.dup-check').forEach(ch => {
    if (ch.value === principal) { ch.checked = false; ch.disabled = true; }
    else { if (ch.disabled) ch.checked = true; ch.disabled = false; }
  });
}

function ignorarGrupoDuplicado(i) {
  const set = dupIgnorados();
  set.add(dupClaveGrupo(duplicadosGrupos[i]));
  try { localStorage.setItem(DUP_IGNORADOS_KEY, JSON.stringify([...set])); } catch (_) { /* sin storage */ }
  renderDuplicados();
}
function restablecerDuplicadosIgnorados() {
  try { localStorage.removeItem(DUP_IGNORADOS_KEY); } catch (_) { /* sin storage */ }
  renderDuplicados();
}

async function fusionarGrupo(i) {
  const grupo = document.querySelector(`.dup-grupo[data-grupo="${i}"]`);
  const g = duplicadosGrupos[i];
  if (!grupo || !g) return;
  const principalId = parseInt(grupo.querySelector(`input[name="dup-principal-${i}"]:checked`)?.value, 10);
  const ids = [...grupo.querySelectorAll('.dup-check:checked')].map(ch => parseInt(ch.value, 10));
  if (!principalId || !ids.length) { alert('Marcá al menos un cliente para fusionar.'); return; }
  const principal = g.clientes.find(c => c.id === principalId);
  const elim = g.clientes.filter(c => ids.includes(c.id));
  const pedidos = elim.reduce((a, c) => a + c.pedidos, 0);
  const ok = confirm(
    `Se conserva: ${principal.nombre} (${principal.codigo_cliente})\n` +
    `Se eliminan: ${elim.map(c => `${c.nombre} (${c.codigo_cliente})`).join(', ')}\n\n` +
    `• Sus ${pedidos} pedido(s) pasan a la ficha que se conserva.\n• Se juntan las notas y las fechas importantes.\n• Los datos que falten se completan.\n\n` +
    'Esto NO se puede deshacer. ¿Continuar?');
  if (!ok) return;
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/fusionar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal_id: principalId, duplicados_ids: ids })
    });
    const data = await res.json();
    if (!res.ok || !data.success) { alert(data.error || data.message || 'No se pudo fusionar'); return; }
    alert(`Listo: ${data.data.eliminados} ficha(s) fusionada(s), ${data.data.pedidos_reasignados} pedido(s) reasignado(s).`);
    listarClientes();
    cargarFechasProximas();
    abrirDuplicados();
  } catch (err) {
    alert('Error de conexión al fusionar');
  }
}
