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
      <td><strong>${c.nombre}</strong></td>
      <td>${c.whatsapp || '-'}</td>
      <td>${c.ciudad || '-'}</td>
      <td><button class="badge badge-${c.activo ? 'activo' : 'inactivo'}" onclick="toggleClienteEstado(${c.id}, ${c.activo}, '${c.nombre.replace(/'/g, "\\'")}');" style="border: none; cursor: pointer; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${c.activo ? 'Activo' : 'Inactivo'}</button></td>
      <td style="font-size:12px;">${new Date(c.created_at).toLocaleDateString('es-AR')}</td>
      <td><div class="acciones-cell">
        <button class="btn btn-sm btn-secondary" onclick="verCliente(${c.id})">Ver</button>
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
  html += `<span style="font-size:13px;color:#666;margin-left:8px;">Pág ${paginaActual} / ${totalPaginas}</span>`;
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
    const [resCliente, resOrdenes] = await Promise.all([
      fetch(`${API_BASE_URL}/admin/clientes/${id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
      fetch(`${API_BASE_URL}/admin/clientes/${id}/ordenes`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
    ]);

    const dataCliente = await resCliente.json();
    if (!dataCliente.success) { alert(dataCliente.error); return; }
    const c = dataCliente.data;

    const dataOrdenes = await resOrdenes.json();
    const totalOrdenes = (dataOrdenes.success && dataOrdenes.data?.total) ? dataOrdenes.data.total : 0;

    const pedidosHistoricos = c.pedidos_historicos || 0;
    const pedidosNuevos = totalOrdenes;
    const totalPedidos = pedidosHistoricos + pedidosNuevos;

    document.getElementById('detalleContenido').innerHTML = `
      <h2 style="color:#7f1f6e;">Detalle de Cliente</h2>
      <div style="margin-top:16px;">
        <div class="detail-row"><span class="detail-label">Código:</span> <span class="${getCodigoBadgeClass(c.codigo_cliente)}">${c.codigo_cliente}</span></div>
        <div class="detail-row"><span class="detail-label">Nombre:</span> ${c.nombre}</div>
        <div class="detail-row"><span class="detail-label">Email:</span> ${c.email}</div>
        <div class="detail-row"><span class="detail-label">DNI:</span> ${c.dni || '-'}</div>
        <div class="detail-row"><span class="detail-label">WhatsApp:</span> ${c.whatsapp || '-'}</div>
        <div class="detail-row"><span class="detail-label">Teléfono:</span> ${c.telefono || '-'}</div>
        <div class="detail-row"><span class="detail-label">Dirección:</span> ${c.direccion || '-'}</div>
        <div class="detail-row"><span class="detail-label">Ciudad:</span> ${c.ciudad || '-'}</div>
        <div class="detail-row"><span class="detail-label">Cód. Postal:</span> ${c.codigo_postal || '-'}</div>
        <div class="detail-row"><span class="detail-label">Estado:</span> <span class="badge badge-${c.activo ? 'activo' : 'inactivo'}">${c.activo ? 'Activo' : 'Inactivo'}</span></div>
        <div style="margin-top:12px;padding:12px;background:#f5f5f5;border-radius:6px;">
          <div class="detail-row"><span class="detail-label">Pedidos históricos:</span> <strong>${pedidosHistoricos}</strong></div>
          <div class="detail-row"><span class="detail-label">Pedidos nuevos (web):</span> <strong>${pedidosNuevos}</strong></div>
          <div class="detail-row" style="background:#fff;padding:8px;border-radius:4px;margin-top:8px;"><span class="detail-label">Todos los pedidos:</span> <strong style="font-size:16px;color:#7f1f6e;">${totalPedidos}</strong></div>
        </div>
        <div class="detail-row"><span class="detail-label">Notas:</span> ${c.notas || '-'}</div>
        <div class="detail-row"><span class="detail-label">Creado:</span> ${new Date(c.created_at).toLocaleDateString('es-AR')}</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button class="btn btn-warning" onclick="cerrarDetalle();editarCliente(${c.id})">Editar</button>
        <button class="btn btn-secondary" onclick="cerrarDetalle()">Cerrar</button>
      </div>
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

function abrirNuevoCliente() {
  document.getElementById('modalTitulo').textContent = 'Nuevo Cliente';
  document.getElementById('codigoDisplay').style.display = 'none';
  document.getElementById('activoGroup').style.display = 'none';
  document.getElementById('clienteId').value = '';
  limpiarForm();
  document.getElementById('modalCliente').classList.add('show');
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
    const badgeEl = document.getElementById('codigoClienteDisplay');
    badgeEl.textContent = c.codigo_cliente;
    badgeEl.className = getCodigoBadgeClass(c.codigo_cliente);
    document.getElementById('codigoDisplay').style.display = 'block';
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
      alert('Error: ' + (data.error || 'No se pudo guardar'));
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
