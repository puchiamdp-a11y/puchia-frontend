// admin-opciones.js — Editor de OPCIONES del producto (tipo "Con opciones").
// Una opción es lo que el cliente elige: tamaño del cuadro, "con 3 lápices", "holográfico", color del vaso.
// Cada opción tiene su precio de venta (vacío = el precio base del producto) y descuenta stock de uno o más insumos.
// Una opción sin "descuenta" no usa stock (ilimitada). Depende de insumosCatalogo / loadInsumosForForm de admin.js.

let productOpcionesTemp = [];   // [{ uid, id, nombre, precio, activa, consumos: [{ uid, insumo_id, insumo_variant_id, cantidad }] }]
let opcionSeq = 0;
let consumoSeq = 0;

const escOp = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opcionPorUid = (uid) => productOpcionesTemp.find(o => o.uid === uid);
const insumoDeVariante = (varianteId) => (typeof insumosCatalogo !== 'undefined' ? insumosCatalogo : []).find(i => (i.insumo_variants || []).some(v => Number(v.id) === Number(varianteId)));

function nuevaOpcion(datos = {}) {
  return { uid: ++opcionSeq, id: datos.id || null, nombre: datos.nombre || '', precio: datos.precio ?? '', activa: datos.activa !== false, consumos: datos.consumos || [] };
}
function nuevoConsumo(datos = {}) {
  return { uid: ++consumoSeq, insumo_id: datos.insumo_id || null, insumo_variant_id: datos.insumo_variant_id || null, cantidad: datos.cantidad || 1 };
}

/** Arma el editor a partir de las opciones guardadas de un producto (editar o duplicar; al duplicar se sueltan los ids). */
function cargarOpcionesDeProducto(producto, { duplicar = false } = {}) {
  productOpcionesTemp = (producto.opciones || []).map(o => nuevaOpcion({
    id: duplicar ? null : o.id,
    nombre: o.nombre,
    precio: o.precio === null || o.precio === undefined ? '' : o.precio,
    activa: o.activa !== false,
    consumos: (o.consumos || []).map(c => nuevoConsumo({
      insumo_id: insumoDeVariante(c.insumo_variant_id)?.id || null,
      insumo_variant_id: c.insumo_variant_id,
      cantidad: c.cantidad
    }))
  }));
  renderizarOpciones();
}

function resetearOpciones() {
  productOpcionesTemp = [];
  renderizarOpciones();
}

function agregarOpcionVacia() {
  productOpcionesTemp.push(nuevaOpcion());
  renderizarOpciones();
}

function quitarOpcion(uid) {
  productOpcionesTemp = productOpcionesTemp.filter(o => o.uid !== uid);
  renderizarOpciones();
}

// Mientras se escribe no se redibuja (así no se pierde el foco)
function editarCampoOpcion(uid, campo, valor) {
  const o = opcionPorUid(uid);
  if (!o) return;
  if (campo === 'activa') { o.activa = Boolean(valor); renderizarOpciones(); return; }
  o[campo] = valor;
}

function agregarConsumoOpcion(uid) {
  const o = opcionPorUid(uid);
  if (!o) return;
  o.consumos.push(nuevoConsumo());
  renderizarOpciones();
}

function quitarConsumoOpcion(uid, cuid) {
  const o = opcionPorUid(uid);
  if (!o) return;
  o.consumos = o.consumos.filter(c => c.uid !== cuid);
  renderizarOpciones();
}

function cambiarInsumoConsumo(uid, cuid, insumoId) {
  const c = opcionPorUid(uid)?.consumos.find(x => x.uid === cuid);
  if (!c) return;
  c.insumo_id = insumoId ? Number(insumoId) : null;
  const insumo = insumosCatalogo.find(i => Number(i.id) === c.insumo_id);
  const variantes = insumo ? (insumo.insumo_variants || []) : [];
  // Si el insumo tiene una sola variante (o no tiene variantes), ya queda elegida
  c.insumo_variant_id = variantes.length === 1 ? variantes[0].id : null;
  renderizarOpciones();
}

function cambiarVarianteConsumo(uid, cuid, varianteId) {
  const c = opcionPorUid(uid)?.consumos.find(x => x.uid === cuid);
  if (!c) return;
  c.insumo_variant_id = varianteId ? Number(varianteId) : null;
  renderizarOpciones();
}

function editarCantidadConsumo(uid, cuid, valor) {
  const c = opcionPorUid(uid)?.consumos.find(x => x.uid === cuid);
  if (c) c.cantidad = valor === '' ? '' : Number(valor);
}

/** Crea una opción por cada variante del insumo elegido (las que ya existen con ese nombre se saltean). */
function generarOpcionesDesdeInsumo() {
  const sel = document.getElementById('generarOpcionesInsumo');
  const insumo = insumosCatalogo.find(i => Number(i.id) === Number(sel?.value));
  if (!insumo) { puchiaAlert('Elegí primero el insumo del que querés crear las opciones', 'warning'); return; }
  const existentes = new Set(productOpcionesTemp.map(o => o.nombre.trim().toLowerCase()));
  let creadas = 0;
  (insumo.insumo_variants || []).forEach(v => {
    if (existentes.has(String(v.nombre).trim().toLowerCase())) return;
    productOpcionesTemp.push(nuevaOpcion({
      nombre: v.nombre,
      consumos: [nuevoConsumo({ insumo_id: insumo.id, insumo_variant_id: v.id, cantidad: 1 })]
    }));
    creadas++;
  });
  renderizarOpciones();
  puchiaAlert(creadas ? `Se crearon ${creadas} opciones. Si el precio es distinto en alguna, escribilo en su campo de precio.` : 'Todas las variantes de ese insumo ya están como opciones', creadas ? 'success' : 'info');
}

function renderizarOpciones() {
  const cont = document.getElementById('productOpcionesLista');
  if (!cont) return;
  const catalogo = typeof insumosCatalogo !== 'undefined' ? insumosCatalogo : [];

  // Selector del generador (solo insumos con variantes)
  const gen = document.getElementById('generarOpcionesInsumo');
  if (gen) {
    const actual = gen.value;
    gen.innerHTML = '<option value="">— Elegí un insumo —</option>' + catalogo.filter(i => !i.sin_variantes && (i.insumo_variants || []).length)
      .map(i => `<option value="${i.id}" ${String(i.id) === actual ? 'selected' : ''}>${escOp(i.nombre)} (${(i.insumo_variants || []).length} variantes)</option>`).join('');
  }

  if (!productOpcionesTemp.length) {
    cont.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:16px;border:1px dashed #ddd;border-radius:8px;">Todavía no hay opciones. Agregá una o creá una por cada variante de un insumo.</div>';
    return;
  }

  cont.innerHTML = productOpcionesTemp.map((o, idx) => {
    const consumos = o.consumos.map(c => {
      const insumo = catalogo.find(i => Number(i.id) === Number(c.insumo_id));
      const variantes = insumo ? (insumo.insumo_variants || []) : [];
      const variante = variantes.find(v => Number(v.id) === Number(c.insumo_variant_id));
      const opcionesInsumo = '<option value="">— Insumo —</option>' + catalogo.map(i => `<option value="${i.id}" ${Number(i.id) === Number(c.insumo_id) ? 'selected' : ''}>${escOp(i.nombre)}</option>`).join('');
      const selectorVariante = insumo && !insumo.sin_variantes && variantes.length !== 1
        ? `<select onchange="cambiarVarianteConsumo(${o.uid}, ${c.uid}, this.value)" style="flex:1;min-width:120px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
             <option value="">— ${escOp(insumo.tipo_variante || 'Variante')} —</option>
             ${variantes.map(v => `<option value="${v.id}" ${Number(v.id) === Number(c.insumo_variant_id) ? 'selected' : ''}>${escOp(v.nombre)} (${Number(v.cantidad_en_stock) || 0})</option>`).join('')}
           </select>`
        : '';
      const stock = variante ? `<span style="font-size:12px;color:#777;white-space:nowrap;">stock ${Number(variante.cantidad_en_stock) || 0}</span>` : '';
      return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;">
        <select onchange="cambiarInsumoConsumo(${o.uid}, ${c.uid}, this.value)" style="flex:1;min-width:140px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;">${opcionesInsumo}</select>
        ${selectorVariante}
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#555;">descuenta
          <input type="number" min="1" step="1" value="${c.cantidad}" oninput="editarCantidadConsumo(${o.uid}, ${c.uid}, this.value)" style="width:64px;padding:7px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
        </label>
        ${stock}
        <button type="button" onclick="quitarConsumoOpcion(${o.uid}, ${c.uid})" title="Quitar este descuento" style="background:none;border:none;color:#c5221f;cursor:pointer;font-size:18px;">×</button>
      </div>`;
    }).join('');

    return `<div data-opcion-uid="${o.uid}" style="border:1px solid #e0d4e8;border-radius:10px;background:#fff;padding:12px;margin-bottom:10px;${o.activa ? '' : 'opacity:.65;'}">
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span style="font-weight:700;color:#7b2d8e;min-width:20px;">${idx + 1}.</span>
        <input type="text" class="opcion-nombre" placeholder="Nombre de la opción (ej: 20x30, Rojo, Con 3 lápices)" value="${escOp(o.nombre)}" oninput="editarCampoOpcion(${o.uid}, 'nombre', this.value)" style="flex:2;min-width:180px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
        <label style="display:flex;align-items:center;gap:4px;font-size:13px;color:#555;">$
          <input type="number" class="opcion-precio" min="0" step="0.01" placeholder="precio base" value="${o.precio}" oninput="editarCampoOpcion(${o.uid}, 'precio', this.value)" style="width:110px;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;" title="Precio de venta de esta opción. Vacío = el precio base del producto">
        </label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#555;cursor:pointer;" title="Si la desmarcás, esta opción deja de ofrecerse en la tienda">
          <input type="checkbox" ${o.activa ? 'checked' : ''} onchange="editarCampoOpcion(${o.uid}, 'activa', this.checked)"> Se vende
        </label>
        <button type="button" class="btn btn-sm btn-danger" onclick="quitarOpcion(${o.uid})" style="padding:6px 10px;">Quitar</button>
      </div>
      ${consumos || '<div style="font-size:12px;color:#999;margin-top:6px;">No descuenta stock: esta opción no tiene límite.</div>'}
      <button type="button" class="btn btn-sm btn-secondary" onclick="agregarConsumoOpcion(${o.uid})" style="margin-top:8px;font-size:12px;">+ Descuenta stock de un insumo</button>
    </div>`;
  }).join('');
}

/** Valida el editor y arma el arreglo que espera el backend. */
function construirOpcionesParaGuardar() {
  if (!productOpcionesTemp.length) return { error: 'Agregá al menos una opción al producto.' };
  const nombres = new Set();
  const opciones = [];
  for (const [i, o] of productOpcionesTemp.entries()) {
    const nombre = String(o.nombre || '').trim().replace(/\s+/g, ' ');
    if (!nombre) return { error: `La opción ${i + 1} no tiene nombre.` };
    if (nombres.has(nombre.toLowerCase())) return { error: `La opción "${nombre}" está repetida.` };
    nombres.add(nombre.toLowerCase());
    const precio = o.precio === '' || o.precio === null || o.precio === undefined ? null : Number(o.precio);
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) return { error: `El precio de "${nombre}" no es válido.` };

    const vistas = new Set();
    const consumos = [];
    for (const c of o.consumos) {
      const insumo = insumosCatalogo.find(x => Number(x.id) === Number(c.insumo_id));
      if (!insumo) return { error: `En "${nombre}" hay un descuento sin insumo elegido. Elegilo o quitalo.` };
      const variantes = insumo.insumo_variants || [];
      let varianteId = c.insumo_variant_id;
      if (!varianteId && variantes.length === 1) varianteId = variantes[0].id;
      if (!varianteId) return { error: `En "${nombre}" elegí qué ${String(insumo.tipo_variante || 'variante').toLowerCase()} de "${insumo.nombre}" descuenta.` };
      const cantidad = Number(c.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 1) return { error: `En "${nombre}" la cantidad que descuenta debe ser un número entero mayor a 0.` };
      if (vistas.has(Number(varianteId))) return { error: `En "${nombre}" el mismo ítem está dos veces. Sumá las cantidades en un solo descuento.` };
      vistas.add(Number(varianteId));
      consumos.push({ insumo_variant_id: Number(varianteId), cantidad });
    }
    opciones.push({ id: o.id || undefined, nombre, precio, activa: o.activa, orden: i, consumos });
  }
  return { opciones };
}
