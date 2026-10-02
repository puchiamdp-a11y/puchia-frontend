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
  document.getElementById('inputBusqueda')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { paginaActual = 1; listarClientes(); }
  });
  document.getElementById('filtroActivo')?.addEventListener('change', () => { paginaActual = 1; listarClientes(); });

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

async function listarClientes() {
  const tbody = document.getElementById('tablaClientes');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><span class="spinner"></span></td></tr>';

  const busqueda = document.getElementById('inputBusqueda')?.value.trim();
  const activo = document.getElementById('filtroActivo')?.value;

  let url = `${API_BASE_URL}/admin/clientes?pagina=${paginaActual}&limite=${LIMITE}`;
  if (busqueda) url += `&busqueda=${encodeURIComponent(busqueda)}`;
  if (activo !== '') url += `&activo=${activo}`;

  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    const data = await res.json();

    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">${data.error || 'Error al cargar'}</td></tr>`;
      return;
    }

    totalPaginas = data.pagination?.paginas || 1;
    renderPaginacion();

    clientesActuales = data.data || [];
    renderClientes();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">Error de conexión: ${err.message}</td></tr>`;
  }
}

function renderClientes() {
  const tbody = document.getElementById('tablaClientes');
  if (!tbody) return;
  actualizarIndicadoresSort();

  if (!clientesActuales.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">Sin clientes encontrados</td></tr>';
    return;
  }

  const data = aplicarSort(clientesActuales);
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><span class="${getCodigoBadgeClass(c.codigo_cliente)}">${c.codigo_cliente}</span></td>
      <td><a href="#" class="cliente-link" onclick="verCliente(${c.id}); return false;" title="Ver perfil"><strong>${cEsc(c.nombre)}</strong></a></td>
      <td>${c.whatsapp || '-'}</td>
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
      <div class="perfil-kpis">
        <div class="perfil-kpi"><span>Pedidos</span><strong>${totalPedidos}</strong><em>${pedidosHistoricos} históricos · ${ordenes.length} registrados</em></div>
        <div class="perfil-kpi"><span>Total gastado</span><strong>${pesos(gastado)}</strong><em>${validas.length} pedidos con monto</em></div>
        <div class="perfil-kpi"><span>Ticket promedio</span><strong>${validas.length ? pesos(ticket) : '—'}</strong><em>por pedido</em></div>
        <div class="perfil-kpi"><span>Último pedido</span><strong>${porFecha.length ? fmtFecha(porFecha[porFecha.length - 1].created_at) : '—'}</strong><em>${porFecha.length ? `primero: ${fmtFecha(porFecha[0].created_at)}` : 'sin pedidos'}</em></div>
      </div>
      ${topProductos.length ? `<div class="perfil-top"><span class="perfil-sub">Lo que más pidió</span>${topProductos.map(([n, q]) => `<span class="perfil-chip">${cEsc(n)} <b>×${q}</b></span>`).join('')}</div>` : ''}`;

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
    const historialHTML = ordenes.length ? `
      <div class="perfil-seccion"><h3>📋 Historial de pedidos</h3>
        <div style="overflow-x:auto;"><table class="perfil-tabla"><thead><tr><th>Pedido</th><th>Fecha</th><th>Estado</th><th>Productos</th><th style="text-align:right;">Total</th></tr></thead><tbody>${filasPedidos}</tbody></table></div>
      </div>` : '<div class="perfil-seccion"><h3>📋 Historial de pedidos</h3><div class="perfil-vacio">Sin pedidos registrados en el sistema.</div></div>';

    // ----- Fechas importantes + notas -----
    const meses = MESES_ES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    const dias = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    const fechasHTML = `
      <div class="perfil-seccion"><h3>🎂 Fechas importantes</h3>
        <div id="perfilFechasLista">${renderListaFechas(fechas, c.id)}</div>
        <div class="perfil-form-fecha">
          <select id="ffTipo"><option value="cumpleaños">🎂 Cumpleaños</option><option value="aniversario">💍 Aniversario</option><option value="otro">📌 Otra fecha</option></select>
          <input type="text" id="ffPersona" placeholder="¿De quién? (ej: Mateo, su hijo)" maxlength="120">
          <select id="ffDia" aria-label="Día">${dias}</select>
          <select id="ffMes" aria-label="Mes">${meses}</select>
          <input type="text" id="ffNota" placeholder="Nota (opcional)" maxlength="300">
          <label class="perfil-aviso">Avisarme <input type="number" id="ffAviso" value="60" min="0" max="365"> días antes</label>
          <button type="button" class="btn btn-primary btn-sm" onclick="guardarFechaCliente(${c.id})">Agregar fecha</button>
        </div>
        <div class="perfil-ayuda">Se repite todos los años (no lleva año). Las fechas cercanas aparecen en "Próximas fechas importantes" en Clientes.</div>
      </div>
      <div class="perfil-seccion"><h3>📝 Notas internas</h3>
        <textarea id="perfilNotas" rows="4" placeholder="Gustos, cosas a recordar, cómo prefiere que le escriban...">${cEsc(c.notas || '')}</textarea>
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px;"><button type="button" class="btn btn-secondary btn-sm" onclick="guardarNotasPerfil(${c.id})">Guardar notas</button><span id="perfilNotasMsg" class="perfil-ayuda"></span></div>
      </div>`;

    document.getElementById('detalleContenido').innerHTML = `
      <div class="perfil-head">
        <div><h2 style="color:#7f1f6e;margin:0 0 4px;">${cEsc(c.nombre)}</h2>
          <span class="${getCodigoBadgeClass(c.codigo_cliente)}">${cEsc(c.codigo_cliente)}</span>
          <span class="badge badge-${c.activo ? 'activo' : 'inactivo'}" style="margin-left:6px;">${c.activo ? 'Activo' : 'Inactivo'}</span></div>
        <div class="perfil-acciones"><button class="btn btn-warning btn-sm" onclick="cerrarDetalle();editarCliente(${c.id})">Editar</button><button class="btn btn-secondary btn-sm" onclick="cerrarDetalle()">Cerrar</button></div>
      </div>

      <div class="perfil-datos">
        <div><span>Email</span>${cEsc(c.email) || '-'}</div>
        <div><span>WhatsApp</span>${cEsc(c.whatsapp) || '-'}</div>
        <div><span>Teléfono</span>${cEsc(c.telefono) || '-'}</div>
        <div><span>DNI</span>${cEsc(c.dni) || '-'}</div>
        <div><span>Dirección</span>${cEsc(c.direccion) || '-'}</div>
        <div><span>Ciudad</span>${cEsc(c.ciudad) || '-'}${c.codigo_postal ? ` (CP ${cEsc(c.codigo_postal)})` : ''}</div>
        <div><span>Cliente desde</span>${c.created_at ? new Date(c.created_at).toLocaleDateString('es-AR') : '-'}</div>
      </div>

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
    notas: document.getElementById('fNotas').value.trim() || null
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
      link.href = `http://127.0.0.1:3000${data.data.url}`;
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
  ['fNombre','fEmail','fDni','fWhatsapp','fTelefono','fDireccion','fCiudad','fCodigoPostal','fNotas'].forEach(id => {
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
const ICONO_FECHA = { 'cumpleaños': '🎂', 'aniversario': '💍', 'otro': '📌' };

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
  return fechas.map(f => `
    <div class="perfil-fecha ${f.dias_restantes <= f.aviso_dias ? 'perfil-fecha-aviso' : ''}">
      <div class="perfil-fecha-icono">${ICONO_FECHA[f.tipo] || '📌'}</div>
      <div class="perfil-fecha-info">
        <strong>${f.dia} de ${MESES_ES[f.mes - 1]}</strong>${f.persona ? ` · ${cEsc(f.persona)}` : ''}
        <div class="perfil-fecha-sub">${cEsc(f.tipo)} · ${textoFaltan(f.dias_restantes)} · aviso ${f.aviso_dias} días antes${f.nota ? ` · ${cEsc(f.nota)}` : ''}</div>
      </div>
      <button type="button" class="btn btn-sm btn-danger" onclick="eliminarFechaDeCliente(${f.id}, ${clienteId})" title="Quitar esta fecha">🗑️</button>
    </div>`).join('');
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
    const enAviso = lista.filter(f => f.en_aviso).length;
    const badge = document.getElementById('fechasProximasCount');
    if (badge) { badge.textContent = enAviso ? `${enAviso} para contactar` : (lista.length ? `${lista.length}` : ''); badge.className = 'fechas-count' + (enAviso ? ' fechas-count-aviso' : ''); }
    if (!lista.length) {
      card.innerHTML = '<div class="perfil-vacio">No hay fechas en los próximos 90 días. Cargalas desde el perfil de cada cliente (clic en su nombre).</div>';
      return;
    }
    card.innerHTML = lista.map(f => {
      const wa = linkWhatsApp(f.cliente.whatsapp, mensajeFecha(f));
      return `<div class="perfil-fecha ${f.en_aviso ? 'perfil-fecha-aviso' : ''}">
        <div class="perfil-fecha-icono">${ICONO_FECHA[f.tipo] || '📌'}</div>
        <div class="perfil-fecha-info">
          <strong>${f.dia} de ${MESES_ES[f.mes - 1]}</strong>${f.persona ? ` · ${cEsc(f.persona)}` : ''} <span class="fechas-faltan">${textoFaltan(f.dias_restantes)}</span>
          <div class="perfil-fecha-sub"><a href="#" class="cliente-link" onclick="cerrarFechasProximas(); verCliente(${f.cliente.id}); return false;">${cEsc(f.cliente.nombre)}</a> (${cEsc(f.cliente.codigo_cliente)})${f.en_aviso ? ' · <b>momento de contactar</b>' : ` · contactar en ${f.dias_restantes - f.aviso_dias} días`}${f.nota ? ` · ${cEsc(f.nota)}` : ''}</div>
        </div>
        ${wa ? `<a class="btn btn-sm btn-secondary" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>` : '<span class="perfil-ayuda">sin WhatsApp</span>'}
      </div>`;
    }).join('');
  } catch (err) {
    card.innerHTML = '<div class="perfil-vacio">No se pudieron cargar las fechas.</div>';
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
