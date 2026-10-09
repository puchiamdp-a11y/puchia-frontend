/* ADMIN-CLIENTE-BUSCADOR.JS - Buscador de clientes para "Crear Pedido Manual"
   Reemplaza al desplegable gigante: se escribe nombre, código, WhatsApp, email o DNI y el servidor devuelve las coincidencias.
   El <select id="selectCliente"> sigue existiendo (oculto) y es el que lee el formulario. */

const CB = { select: null, input: null, lista: null, chip: null, timer: null, resultados: [], activo: -1, seq: 0, detalle: new Map() };

function cbEsc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const cbSinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function clienteBuscadorInit() {
  CB.select = document.getElementById('selectCliente');
  if (!CB.select || document.getElementById('cbInput')) return;
  CB.select.removeAttribute('required');
  CB.select.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'cb-wrap';
  wrap.innerHTML = `
    <input type="text" id="cbInput" class="cb-input" autocomplete="off" placeholder="🔍 Buscar cliente por nombre, código, WhatsApp, email o DNI..." aria-label="Buscar cliente" role="combobox" aria-expanded="false" aria-controls="cbLista">
    <div id="cbChip" class="cb-chip" style="display:none;"></div>
    <div id="cbLista" class="cb-lista" role="listbox" style="display:none;"></div>`;
  CB.select.parentNode.insertBefore(wrap, CB.select);
  CB.input = wrap.querySelector('#cbInput');
  CB.lista = wrap.querySelector('#cbLista');
  CB.chip = wrap.querySelector('#cbChip');

  CB.input.addEventListener('input', () => { clearTimeout(CB.timer); CB.timer = setTimeout(cbBuscar, 180); });
  CB.input.addEventListener('focus', () => { cbBuscar(); });
  CB.input.addEventListener('keydown', cbTeclado);
  CB.lista.addEventListener('mousedown', (e) => e.preventDefault());        // no perder el foco al hacer clic en la lista
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) cbCerrar(); });

  // El resto del código modifica el <select> (reset, deshabilitar, cambiar valor): se refleja en el buscador
  CB.select.addEventListener('change', clienteBuscadorSync);
  CB.select.form?.addEventListener('reset', () => setTimeout(clienteBuscadorSync, 0));
  new MutationObserver(clienteBuscadorSync).observe(CB.select, { attributes: true, attributeFilter: ['disabled'], childList: true });
  clienteBuscadorSync();
}

async function cbBuscar() {
  if (!CB.input || CB.input.disabled) return;
  const q = CB.input.value.trim();
  const mio = ++CB.seq;
  let url = `${API_BASE_URL}/admin/clientes?limite=12&activo=true`;
  if (q) url += `&busqueda=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}` } });
    const data = await res.json();
    if (mio !== CB.seq) return;                                              // llegó una búsqueda más nueva
    CB.resultados = cbOrdenar(data.data || [], q);
  } catch (e) {
    if (mio !== CB.seq) return;
    CB.resultados = [];
  }
  CB.activo = CB.resultados.length ? 0 : -1;
  cbRender(q);
}

// Primero el código exacto, después los que EMPIEZAN con lo escrito, después el resto (mantiene el orden por fecha)
function cbOrdenar(lista, q) {
  const n = cbSinTildes(q);
  if (!n) return lista;
  const puntaje = (c) => {
    if (cbSinTildes(c.codigo_cliente) === n) return 0;
    if (cbSinTildes(c.nombre).startsWith(n) || cbSinTildes(c.codigo_cliente).startsWith(n)) return 1;
    if (cbSinTildes(c.nombre).split(' ').some(p => p.startsWith(n))) return 2;
    return 3;
  };
  return lista.map((c, i) => ({ c, i, p: puntaje(c) })).sort((a, b) => a.p - b.p || a.i - b.i).map(x => x.c);
}

function cbRender(q) {
  const items = CB.resultados.map((c, i) => `
    <div class="cb-item${i === CB.activo ? ' activo' : ''}" role="option" data-i="${i}" onclick="clienteBuscadorElegir(${i})">
      <span class="cb-codigo">${cbEsc(c.codigo_cliente)}</span>
      <span class="cb-nombre">${cbEsc(c.nombre)}</span>
      <span class="cb-extra">${[c.whatsapp, c.ciudad].filter(Boolean).map(cbEsc).join(' · ')}</span>
    </div>`).join('');
  const titulo = q ? '' : '<div class="cb-titulo">Clientes más recientes — escribí para buscar entre todos</div>';
  const vacio = !CB.resultados.length ? `<div class="cb-vacio">No encontramos clientes${q ? ` para “${cbEsc(q)}”` : ''}.</div>` : '';
  CB.lista.innerHTML = `${titulo}${items}${vacio}<div class="cb-nuevo" onclick="clienteBuscadorNuevo()">➕ Crear cliente nuevo${q && !/^\d+$/.test(q) ? ` “${cbEsc(q)}”` : ''}</div>`;
  CB.lista.style.display = 'block';
  CB.input.setAttribute('aria-expanded', 'true');
}

function cbCerrar() {
  if (!CB.lista) return;
  CB.lista.style.display = 'none';
  CB.input?.setAttribute('aria-expanded', 'false');
}

function cbTeclado(e) {
  const abierta = CB.lista.style.display !== 'none';
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!abierta) { cbBuscar(); return; }
    if (!CB.resultados.length) return;
    CB.activo = (CB.activo + (e.key === 'ArrowDown' ? 1 : -1) + CB.resultados.length) % CB.resultados.length;
    CB.lista.querySelectorAll('.cb-item').forEach((el, i) => el.classList.toggle('activo', i === CB.activo));
    CB.lista.querySelector('.cb-item.activo')?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    if (abierta && CB.activo >= 0) { e.preventDefault(); clienteBuscadorElegir(CB.activo); }
    else if (abierta) e.preventDefault();                                    // que Enter no envíe el formulario del pedido
  } else if (e.key === 'Escape') {
    cbCerrar();
  }
}

function clienteBuscadorElegir(i) {
  const c = CB.resultados[i];
  if (c) clienteBuscadorEstablecer(c);
}

// Deja elegido a un cliente (desde la lista, o desde otro código: cliente recién creado, "Nuevo pedido" de la ficha...)
function clienteBuscadorEstablecer(c) {
  if (!CB.select) clienteBuscadorInit();
  if (!CB.select || !c) return;
  CB.detalle.set(String(c.id), c);
  let op = [...CB.select.options].find(o => o.value === String(c.id));
  if (!op) { op = document.createElement('option'); op.value = c.id; CB.select.appendChild(op); }
  op.textContent = `${c.codigo_cliente} - ${c.nombre}`;
  CB.select.value = String(c.id);
  CB.select.dispatchEvent(new Event('change', { bubbles: true }));
  cbCerrar();
}

function clienteBuscadorLimpiar() {
  CB.select.value = '';
  CB.input.value = '';
  CB.select.dispatchEvent(new Event('change', { bubbles: true }));
  CB.input.focus();
}

// Refleja el estado del <select> en pantalla
function clienteBuscadorSync() {
  if (!CB.select || !CB.input) return;
  const deshabilitado = CB.select.disabled;                                  // se deshabilita al abrir "Crear cliente nuevo"
  const id = CB.select.value;
  CB.input.disabled = deshabilitado;
  if (deshabilitado) { CB.input.value = ''; CB.input.placeholder = 'Estás cargando un cliente nuevo (abajo)'; cbCerrar(); }
  else CB.input.placeholder = '🔍 Buscar cliente por nombre, código, WhatsApp, email o DNI...';

  if (CB.editando && CB.editando !== id) clienteBuscadorCerrarEditor();
  if (id && !deshabilitado) {
    const op = [...CB.select.options].find(o => o.value === id);
    const d = CB.detalle.get(id);
    CB.chip.innerHTML = `<span class="cb-ok">✓</span> <strong>${cbEsc(op ? op.textContent : id)}</strong>${d && (d.whatsapp || d.ciudad) ? ` <span class="cb-extra">${[d.whatsapp, d.ciudad].filter(Boolean).map(cbEsc).join(' · ')}</span>` : ''} <button type="button" class="cb-cambiar" onclick="clienteBuscadorEditar()" title="Completar o corregir los datos de este cliente sin salir del pedido">✏️ Editar datos</button> <button type="button" class="cb-cambiar" onclick="clienteBuscadorLimpiar()">Cambiar</button>`;
    CB.chip.style.display = 'flex';
    CB.input.style.display = 'none';
  } else {
    CB.chip.style.display = 'none';
    CB.input.style.display = '';
    if (!id) CB.input.value = deshabilitado ? '' : CB.input.value;
  }
}

// "Crear cliente nuevo" desde la lista: abre el formulario y adelanta el nombre escrito
function clienteBuscadorNuevo() {
  const q = CB.input.value.trim();
  cbCerrar();
  const form = document.getElementById('nuevoClienteForm');
  if (form && form.style.display === 'none') toggleNuevoCliente();
  if (q && !/^\d+$/.test(q)) { const n = document.getElementById('nuevoClienteNombre'); if (n && !n.value) n.value = q; }
  else if (q) { const w = document.getElementById('nuevoClienteWhatsapp'); if (w && !w.value) w.value = q; }
  document.getElementById('nuevoClienteNombre')?.focus();
}

// ===== Editar los datos del cliente elegido, sin salir del pedido (los productos cargados no se tocan) =====
const CB_CAMPOS = [
  ['nombre', 'Nombre *', 'text'], ['whatsapp', 'WhatsApp', 'text'], ['email', 'Email', 'email'], ['dni', 'DNI', 'text'],
  ['direccion', 'Dirección', 'text'], ['codigo_postal', 'Código postal', 'text'], ['ciudad', 'Localidad', 'text'], ['provincia', 'Provincia', 'text']
];

async function clienteBuscadorEditar() {
  const id = CB.select && CB.select.value;
  if (!id) return;
  if (document.getElementById('cbEditar')) { clienteBuscadorCerrarEditor(); return; }   // segundo clic = cerrar
  let c = CB.detalle.get(id) || {};
  try {                                                                       // datos frescos de la base
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}` } });
    const j = await res.json();
    if (j && j.success && j.data) c = j.data;
  } catch (e) { /* se usan los datos que ya había */ }
  const panel = document.createElement('div');
  panel.id = 'cbEditar';
  panel.className = 'cb-editar';
  panel.innerHTML = `
    <div class="cb-editar-titulo">Datos de ${cbEsc(c.nombre || 'este cliente')} <span>(se guardan en tu base de clientes; el pedido y sus productos no cambian)</span></div>
    <div class="cb-editar-grid">${CB_CAMPOS.map(([k, et, tipo]) => `
      <label>${et}<input type="${tipo}" id="cbEd_${k}" value="${cbEsc(c[k] ?? '')}" autocomplete="off"></label>`).join('')}
    </div>
    <div id="cbEditarMsg" class="cb-editar-msg"></div>
    <div class="cb-editar-botones">
      <button type="button" class="btn btn-secondary" onclick="clienteBuscadorCerrarEditor()">Cerrar</button>
      <button type="button" class="btn btn-primary" id="cbEditarGuardar" onclick="clienteBuscadorGuardarEdicion()">✓ Guardar datos</button>
    </div>`;
  CB.chip.parentNode.insertAdjacentElement('afterend', panel);
  CB.editando = id;
  document.getElementById('cbEd_nombre')?.focus();
}

function clienteBuscadorCerrarEditor() {
  document.getElementById('cbEditar')?.remove();
  CB.editando = null;
}

async function clienteBuscadorGuardarEdicion() {
  const id = CB.editando;
  const msg = document.getElementById('cbEditarMsg');
  const btn = document.getElementById('cbEditarGuardar');
  if (!id || !msg) return;
  const val = (k) => (document.getElementById('cbEd_' + k)?.value ?? '').trim();
  if (!val('nombre')) { msg.style.color = '#c5221f'; msg.textContent = 'El nombre no puede quedar vacío.'; return; }
  const cuerpo = {};
  CB_CAMPOS.forEach(([k]) => { cuerpo[k] = val(k); });
  btn.disabled = true; msg.style.color = '#666'; msg.textContent = 'Guardando…';
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.success) {
      msg.style.color = '#c5221f';
      msg.textContent = (j.error || j.message || 'No se pudieron guardar los datos') + '. Corregilo y volvé a guardar.';
      return;
    }
    const nuevo = j.data || { id: Number(id), ...cuerpo };
    CB.detalle.set(String(id), { ...(CB.detalle.get(String(id)) || {}), ...nuevo });
    const op = [...CB.select.options].find(o => o.value === String(id));
    if (op) op.textContent = `${nuevo.codigo_cliente || (CB.detalle.get(String(id)) || {}).codigo_cliente || ''} - ${nuevo.nombre}`;
    clienteBuscadorCerrarEditor();
    clienteBuscadorSync();
    if (typeof showToast === 'function') showToast('Datos del cliente guardados', 'success');
  } catch (e) {
    msg.style.color = '#c5221f'; msg.textContent = 'No hubo conexión con el servidor. Volvé a intentar.';
  } finally {
    if (btn) btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', clienteBuscadorInit);
if (document.readyState !== 'loading') clienteBuscadorInit();
