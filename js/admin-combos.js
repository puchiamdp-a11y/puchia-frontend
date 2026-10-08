// admin-combos.js — Editor de COMBOS (tipo de producto "Combo").
// Un combo es un producto con precio propio que lleva otros productos. Por cada parte se define cuántas unidades
// (mínimo y máximo POR COMBO; iguales = cantidad fija) y, si el producto tiene opciones, si el cliente las reparte
// (ej. 15 vasos de los colores que quiera) o si el combo trae siempre una opción fija.
// Depende de productosGlobal / productoActualEnEdicion de admin.js.

let comboPartesTemp = [];   // [{ uid, id, producto_id, opcion_id, cantidad_min, cantidad_max }]
let comboSeq = 0;

const escCb = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const partePorUid = (uid) => comboPartesTemp.find(p => p.uid === uid);

function nuevaParteCombo(datos = {}) {
  return {
    uid: ++comboSeq, id: datos.id || null, producto_id: datos.producto_id || '', opcion_id: datos.opcion_id || '',
    cantidad_min: datos.cantidad_min ?? 1, cantidad_max: datos.cantidad_max ?? datos.cantidad_min ?? 1
  };
}

// Productos que puede llevar un combo: cualquiera que no sea combo (ni el que se está editando)
function productosParaCombo() {
  const propio = typeof productoActualEnEdicion !== 'undefined' && productoActualEnEdicion ? productoActualEnEdicion.id : null;
  return (typeof productosGlobal !== 'undefined' ? productosGlobal : []).filter(p => !p.es_combo && p.id !== propio);
}

function cargarComponentesDeCombo(producto, { duplicar = false } = {}) {
  comboPartesTemp = ((producto.combo && producto.combo.componentes) || []).map(c => nuevaParteCombo({
    id: duplicar ? null : c.componente_id, producto_id: c.producto_id, opcion_id: c.opcion_fija_id || '',
    cantidad_min: c.cantidad_min, cantidad_max: c.cantidad_max
  }));
  renderizarCombo();
}

function resetearCombo() {
  comboPartesTemp = [];
  renderizarCombo();
}

function agregarParteCombo() {
  comboPartesTemp.push(nuevaParteCombo());
  renderizarCombo();
}

function quitarParteCombo(uid) {
  comboPartesTemp = comboPartesTemp.filter(p => p.uid !== uid);
  renderizarCombo();
}

function editarParteCombo(uid, campo, valor) {
  const p = partePorUid(uid);
  if (!p) return;
  p[campo] = valor;
  if (campo === 'producto_id') p.opcion_id = '';
  // Mientras se escribe el mínimo, el máximo acompaña si estaba igual (cantidad fija) o quedó por debajo
  if (campo === 'cantidad_min' && Number(p.cantidad_max) < Number(valor)) { p.cantidad_max = valor; }
  if (campo === 'producto_id' || campo === 'cantidad_min') renderizarCombo();
}

function renderizarCombo() {
  const cont = document.getElementById('comboPartesLista');
  if (!cont) return;
  const productos = productosParaCombo();
  if (comboPartesTemp.length === 0) {
    cont.innerHTML = '<div style="padding:12px;color:#888;font-size:13px;">Todavía no agregaste productos al combo.</div>';
    return;
  }
  cont.innerHTML = comboPartesTemp.map((parte, i) => {
    const prod = productos.find(p => p.id === Number(parte.producto_id));
    const opciones = (prod && prod.opciones) || [];
    const nombreProductoAusente = parte.producto_id && !prod ? `<option value="${parte.producto_id}" selected>(producto ${parte.producto_id})</option>` : '';
    return `<div class="combo-parte" data-parte-uid="${parte.uid}" style="border:1px solid #e0d0ea;border-radius:10px;padding:12px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <strong style="color:#9b2d7d;">${i + 1}.</strong>
        <select class="combo-producto" onchange="editarParteCombo(${parte.uid}, 'producto_id', this.value)" style="flex:1;min-width:180px;padding:8px;border:1px solid #ddd;border-radius:6px;">
          <option value="">— Elegí un producto —</option>
          ${nombreProductoAusente}
          ${productos.map(p => `<option value="${p.id}" ${p.id === Number(parte.producto_id) ? 'selected' : ''}>${escCb(p.nombre)}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-sm btn-danger" onclick="quitarParteCombo(${parte.uid})">Quitar</button>
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px;">
        <label style="font-size:13px;">Mínimo <input type="number" class="combo-min" min="1" step="1" value="${escCb(parte.cantidad_min)}" oninput="editarParteCombo(${parte.uid}, 'cantidad_min', this.value)" style="width:80px;padding:6px;border:1px solid #ddd;border-radius:6px;"></label>
        <label style="font-size:13px;">Máximo <input type="number" class="combo-max" min="1" step="1" value="${escCb(parte.cantidad_max)}" oninput="editarParteCombo(${parte.uid}, 'cantidad_max', this.value)" style="width:80px;padding:6px;border:1px solid #ddd;border-radius:6px;"></label>
        ${opciones.length ? `<label style="font-size:13px;">Opciones
          <select class="combo-opcion" onchange="editarParteCombo(${parte.uid}, 'opcion_id', this.value)" style="padding:6px;border:1px solid #ddd;border-radius:6px;">
            <option value="">El cliente reparte entre todas</option>
            ${opciones.map(o => `<option value="${o.id}" ${o.id === Number(parte.opcion_id) ? 'selected' : ''}>Siempre: ${escCb(o.nombre)}</option>`).join('')}
          </select></label>` : ''}
      </div>
      <div style="font-size:12px;color:#777;margin-top:4px;">${Number(parte.cantidad_min) === Number(parte.cantidad_max) ? `Cada combo lleva exactamente ${escCb(parte.cantidad_min)}.` : `Cada combo lleva entre ${escCb(parte.cantidad_min)} y ${escCb(parte.cantidad_max)}.`}</div>
    </div>`;
  }).join('');
}

/** Valida y arma los componentes para enviar al servidor. */
function construirComponentesParaGuardar() {
  if (comboPartesTemp.length === 0) return { error: 'Agregá al menos un producto al combo' };
  const partes = [];
  for (const [i, p] of comboPartesTemp.entries()) {
    const n = i + 1;
    if (!p.producto_id) return { error: `Parte ${n} del combo: elegí un producto` };
    const min = Number(p.cantidad_min), max = Number(p.cantidad_max);
    if (!Number.isInteger(min) || min < 1 || !Number.isInteger(max) || max < 1) return { error: `Parte ${n} del combo: las cantidades deben ser enteros mayores a 0` };
    if (min > max) return { error: `Parte ${n} del combo: el mínimo no puede ser mayor que el máximo` };
    partes.push({ id: p.id || undefined, producto_id: Number(p.producto_id), opcion_id: p.opcion_id ? Number(p.opcion_id) : null, cantidad_min: min, cantidad_max: max });
  }
  return { componentes: partes };
}

// ===== Armar un combo dentro de un pedido (pedido manual y edición de pedido) =====
// producto = combo tal como lo devuelve /admin/productos (producto.combo.componentes con sus opciones y disponibles).

/** HTML del panel: por cada parte, cuántas unidades de cada opción (o una cantidad si el producto no tiene opciones). */
function htmlPanelCombo(producto, panelId, onInput) {
  const partes = (producto.combo && producto.combo.componentes) || [];
  const rango = (c) => (c.cantidad_min === c.cantidad_max ? `exactamente ${c.cantidad_min}` : `entre ${c.cantidad_min} y ${c.cantidad_max}`);
  return `<div id="${panelId}" data-combo-id="${producto.id}">` + partes.map(c => {
    const alerta = onInput ? ` oninput="${onInput}"` : '';
    const cuerpo = c.opciones && c.opciones.length
      ? c.opciones.map(o => `<label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:3px;">
          <input type="number" min="0" step="1" value="0" data-componente-id="${c.componente_id}" data-opcion-id="${o.id}" data-opcion-nombre="${escCb(o.nombre)}"${o.disponibles < 10000 ? ` max="${o.disponibles}"` : ''}${alerta} style="width:70px;padding:5px;border:1px solid #ddd;border-radius:6px;font-size:13px;text-align:right;">
          <span><strong>${escCb(o.nombre)}</strong>${o.disponibles < 10000 ? ` · ${o.disponibles} disponibles` : ''}</span></label>`).join('')
      : `<label style="display:flex;align-items:center;gap:8px;font-size:12px;">
          <input type="number" min="0" step="1" value="0" data-componente-id="${c.componente_id}" data-simple="1"${alerta} style="width:70px;padding:5px;border:1px solid #ddd;border-radius:6px;font-size:13px;text-align:right;">
          <span>${c.disponibles < 10000 ? `${c.disponibles} disponibles` : ''}</span></label>`;
    return `<div class="combo-comp" data-componente-id="${c.componente_id}" data-producto="${escCb(c.producto)}" data-min="${c.cantidad_min}" data-max="${c.cantidad_max}" style="margin-bottom:8px;">
      <div style="font-size:12px;font-weight:600;margin-bottom:3px;">${escCb(c.producto)} — ${rango(c)}</div>${cuerpo}</div>`;
  }).join('') + '</div>';
}

/** Lee el panel: { error } o { componentes (formato del servidor), detalle (para mostrar), texto }. */
function leerPanelCombo(panel) {
  if (!panel) return { error: 'Armá el combo' };
  const componentes = [];
  const detalle = [];
  for (const bloque of panel.querySelectorAll('.combo-comp')) {
    const id = Number(bloque.dataset.componenteId);
    const min = Number(bloque.dataset.min), max = Number(bloque.dataset.max);
    const nombre = bloque.dataset.producto;
    const inputs = [...bloque.querySelectorAll('input')];
    const simple = inputs.find(i => i.dataset.simple);
    let total = 0;
    if (simple) {
      total = parseInt(simple.value) || 0;
      if (total > 0) { componentes.push({ componente_id: id, cantidad: total }); detalle.push({ componente_id: id, producto: nombre, cantidad: total }); }
    } else {
      const selecciones = inputs.map(i => ({ opcion_id: Number(i.dataset.opcionId), opcion: i.dataset.opcionNombre, cantidad: parseInt(i.value) || 0 })).filter(s => s.cantidad > 0);
      total = selecciones.reduce((a, s) => a + s.cantidad, 0);
      if (total > 0) {
        componentes.push({ componente_id: id, selecciones: selecciones.map(s => ({ opcion_id: s.opcion_id, cantidad: s.cantidad })) });
        detalle.push({ componente_id: id, producto: nombre, cantidad: total, selecciones });
      }
    }
    if (total < min || total > max) {
      const regla = min === max ? `exactamente ${min}` : `entre ${min} y ${max}`;
      return { error: `${nombre}: tenés que elegir ${regla} (elegiste ${total})` };
    }
  }
  const texto = detalle.map(d => `${d.cantidad} ${d.producto}${d.selecciones ? ` (${d.selecciones.map(s => `${s.cantidad} ${s.opcion}`).join(', ')})` : ''}`).join(' + ');
  return { componentes, detalle, texto };
}
