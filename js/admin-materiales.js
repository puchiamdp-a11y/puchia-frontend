// admin-materiales.js — Sección Materiales: resmas, siliconas, cintas, bolsas y todo lo que se usa en el taller.
// Se cuentan a mano (no se descuentan con las ventas, sin variantes ni alertas). Flor edita la cantidad directamente en la tabla.
// Hacer click en el encabezado de una columna ordena de la A a la Z (y de nuevo, de la Z a la A).

let materialesDatos = [];
let materialesOrden = { campo: 'nombre', asc: true };
let materialesBusqueda = '';
let materialesFiltroProveedor = '';
let materialesFiltroTipo = '';

const COLUMNAS_MATERIALES = [
  { campo: 'nombre', titulo: 'Nombre' },
  { campo: 'tipo', titulo: 'Tipo' },
  { campo: 'proveedor', titulo: 'Proveedor' },
  { campo: 'cantidad', titulo: 'Cantidad' }
];

function escMat(t) { return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function materialesFetch(path = '', opciones = {}) {
  const res = await fetch(`${API_BASE_URL}/admin/materiales${path}`, {
    ...opciones,
    headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`, 'Content-Type': 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Error');
  return data.data;
}

async function cargarMateriales() {
  const tbody = document.getElementById('materiales-list');
  if (!tbody) return;
  try {
    materialesDatos = await materialesFetch();
    llenarFiltrosMateriales();
    renderizarMateriales();
  } catch (error) {
    console.error('Error cargando materiales:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c5221f;padding:20px;">Error cargando materiales</td></tr>';
  }
}

function llenarFiltrosMateriales() {
  const unicos = (campo) => [...new Set(materialesDatos.map(m => m[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const llenar = (id, valores, actual, etiqueta) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">${etiqueta}</option>` + valores.map(v => `<option value="${escMat(v)}" ${v === actual ? 'selected' : ''}>${escMat(v)}</option>`).join('');
  };
  llenar('materialesFiltroProveedor', unicos('proveedor'), materialesFiltroProveedor, 'Todos los proveedores');
  llenar('materialesFiltroTipo', unicos('tipo'), materialesFiltroTipo, 'Todos los tipos');
  const listas = document.getElementById('materialesSugerencias');
  if (listas) {
    listas.innerHTML = unicos('proveedor').map(v => `<option value="${escMat(v)}">`).join('') + unicos('tipo').map(v => `<option value="${escMat(v)}">`).join('');
  }
}

function materialesFiltrados() {
  const txt = materialesBusqueda.trim().toLowerCase();
  const lista = materialesDatos.filter(m =>
    (!txt || [m.nombre, m.tipo, m.proveedor].some(v => String(v || '').toLowerCase().includes(txt))) &&
    (!materialesFiltroProveedor || m.proveedor === materialesFiltroProveedor) &&
    (!materialesFiltroTipo || m.tipo === materialesFiltroTipo)
  );
  const { campo, asc } = materialesOrden;
  lista.sort((a, b) => {
    const va = a[campo], vb = b[campo];
    // los vacíos van siempre al final
    if (!va && va !== 0) return (!vb && vb !== 0) ? 0 : 1;
    if (!vb && vb !== 0) return -1;
    const cmp = campo === 'cantidad' ? va - vb : String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
    return asc ? cmp : -cmp;
  });
  return lista;
}

function renderizarMateriales() {
  const thead = document.getElementById('materiales-head');
  if (thead) {
    thead.innerHTML = '<tr>' + COLUMNAS_MATERIALES.map(c => {
      const activa = materialesOrden.campo === c.campo;
      const flecha = activa ? (materialesOrden.asc ? ' ▲' : ' ▼') : '';
      return `<th style="cursor:pointer;user-select:none;" onclick="ordenarMateriales('${c.campo}')" title="Ordenar por ${c.titulo}">${c.titulo}${flecha}</th>`;
    }).join('') + '<th>Acciones</th></tr>';
  }
  const tbody = document.getElementById('materiales-list');
  if (!tbody) return;
  const lista = materialesFiltrados();
  const total = document.getElementById('materialesTotal');
  if (total) total.textContent = `${lista.length} de ${materialesDatos.length} materiales`;
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">${materialesDatos.length ? 'Ningún material coincide con el filtro' : 'Todavía no cargaste materiales'}</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(m => `<tr>
      <td><strong>${escMat(m.nombre)}</strong></td>
      <td>${escMat(m.tipo) || '<span style="color:#bbb;">—</span>'}</td>
      <td>${escMat(m.proveedor) || '<span style="color:#bbb;">—</span>'}</td>
      <td><input type="number" min="0" step="1" value="${Number(m.cantidad) || 0}" data-id="${m.id}" data-original="${Number(m.cantidad) || 0}"
            onchange="guardarCantidadMaterial(${m.id}, this)" style="width:90px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:14px;" title="Cambiá el número y salí del campo para guardar"></td>
      <td class="acciones-cell">
        <button class="btn btn-sm btn-secondary" onclick="abrirModalMaterial(${m.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarMaterialAdmin(${m.id})">Eliminar</button>
      </td>
    </tr>`).join('');
}

function ordenarMateriales(campo) {
  materialesOrden = { campo, asc: materialesOrden.campo === campo ? !materialesOrden.asc : true };
  renderizarMateriales();
}

function filtrarMateriales() {
  materialesBusqueda = document.getElementById('materialesBusqueda')?.value || '';
  materialesFiltroProveedor = document.getElementById('materialesFiltroProveedor')?.value || '';
  materialesFiltroTipo = document.getElementById('materialesFiltroTipo')?.value || '';
  renderizarMateriales();
}

async function guardarCantidadMaterial(id, input) {
  const cantidad = Number(input.value);
  if (input.value === '' || !Number.isInteger(cantidad) || cantidad < 0) {
    puchiaAlert('La cantidad debe ser un número entero, 0 o más', 'error');
    input.value = input.dataset.original;
    return;
  }
  try {
    const actualizado = await materialesFetch(`/${id}`, { method: 'PUT', body: JSON.stringify({ cantidad }) });
    const m = materialesDatos.find(x => x.id === id);
    if (m) m.cantidad = actualizado.cantidad;
    input.dataset.original = String(actualizado.cantidad);
    input.style.borderColor = '#4caf50';
    setTimeout(() => { input.style.borderColor = '#ddd'; }, 1200);
  } catch (error) {
    puchiaAlert(error.message || 'No se pudo guardar la cantidad', 'error');
    input.value = input.dataset.original;
  }
}

function abrirModalMaterial(id = null) {
  const m = id ? materialesDatos.find(x => x.id === id) : null;
  document.getElementById('materialTitulo').textContent = m ? 'Editar material' : 'Nuevo material';
  document.getElementById('materialId').value = m ? m.id : '';
  document.getElementById('materialNombre').value = m ? m.nombre : '';
  document.getElementById('materialTipo').value = m ? (m.tipo || '') : '';
  document.getElementById('materialProveedor').value = m ? (m.proveedor || '') : '';
  document.getElementById('materialCantidad').value = m ? m.cantidad : 0;
  document.getElementById('modalMaterial').style.display = 'flex';
}

function cerrarModalMaterial() {
  document.getElementById('modalMaterial').style.display = 'none';
}

let guardandoMaterial = false;
async function guardarMaterial(e) {
  e.preventDefault();
  if (guardandoMaterial) return;
  guardandoMaterial = true;
  try {
    const id = document.getElementById('materialId').value;
    const cuerpo = {
      nombre: document.getElementById('materialNombre').value.trim(),
      tipo: document.getElementById('materialTipo').value.trim(),
      proveedor: document.getElementById('materialProveedor').value.trim(),
      cantidad: Number(document.getElementById('materialCantidad').value)
    };
    if (!cuerpo.nombre) { puchiaAlert('El nombre es requerido', 'error'); return; }
    if (!Number.isInteger(cuerpo.cantidad) || cuerpo.cantidad < 0) { puchiaAlert('La cantidad debe ser un número entero, 0 o más', 'error'); return; }
    await materialesFetch(id ? `/${id}` : '', { method: id ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
    cerrarModalMaterial();
    puchiaAlert(id ? 'Material actualizado' : 'Material creado', 'success');
    await cargarMateriales();
  } catch (error) {
    puchiaAlert(error.message || 'No se pudo guardar el material', 'error');
  } finally {
    guardandoMaterial = false;
  }
}

async function eliminarMaterialAdmin(id) {
  const m = materialesDatos.find(x => x.id === id);
  if (!confirm(`¿Eliminar "${m ? m.nombre : 'este material'}"? Esta acción no se puede deshacer.`)) return;
  try {
    await materialesFetch(`/${id}`, { method: 'DELETE' });
    await cargarMateriales();
  } catch (error) {
    puchiaAlert(error.message || 'No se pudo eliminar el material', 'error');
  }
}
