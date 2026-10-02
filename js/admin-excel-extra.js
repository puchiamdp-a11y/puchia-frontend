/* ADMIN-EXCEL-EXTRA.JS - Excel de Insumos (exportar / plantilla / importar) y plantillas de Productos y Clientes.
   Reutiliza los ayudantes de admin-caja.js (cajaEscape, cajaNormalizar, cajaAbrirModal, mostrarErroresImportacionCaja...). */

function descargarArchivoExcel(wb, nombre) {
  XLSX.writeFile(wb, nombre);
}

// =====================================================================
// PLANTILLA DE PRODUCTOS
// =====================================================================
const PRODUCTOS_COLUMNAS_EXCEL = ['nombre', 'precio', 'stock_cantidad', 'stock_type', 'categorias', 'habilitado', 'descripcion_completa'];

function descargarPlantillaProductos() {
  const ws = XLSX.utils.aoa_to_sheet([PRODUCTOS_COLUMNAS_EXCEL]);
  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 45 }];

  const categorias = (typeof adminCategories !== 'undefined' ? adminCategories : []).map(c => [c.nombre]);
  const ayuda = [
    ['CÓMO COMPLETAR LA HOJA "Productos" (una fila por producto)'],
    [''],
    ['nombre', 'Obligatorio.'],
    ['precio', 'Obligatorio. Número mayor a 0, sin símbolo $ (ej: 4500 o 4500.50).'],
    ['stock_cantidad', 'Obligatorio. Unidades en stock, número entero (0 o más).'],
    ['stock_type', 'Escribí: simple. (Los productos que descuentan de un insumo se crean desde el formulario "Nuevo Producto", no por Excel.)'],
    ['categorias', 'Opcional. Nombre de la categoría tal como figura en la lista de abajo. Si son varias, separalas con coma (ej: Regalos, Combos). Si el nombre no existe, el producto se crea sin esa categoría.'],
    ['habilitado', 'si o no. Con "si" el producto se muestra en la tienda.'],
    ['descripcion_completa', 'Opcional. Texto de la descripción.'],
    [''],
    ['No borres ni cambies los nombres de las columnas. Las filas vacías no se pueden dejar en medio de los datos.'],
    [''],
    ['CATEGORÍAS DISPONIBLES'],
    ...(categorias.length ? categorias : [['(todavía no hay categorías creadas)']])
  ];
  const wsAyuda = XLSX.utils.aoa_to_sheet(ayuda);
  wsAyuda['!cols'] = [{ wch: 24 }, { wch: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.utils.book_append_sheet(wb, wsAyuda, 'Ayuda');
  descargarArchivoExcel(wb, 'plantilla_productos.xlsx');
}

// =====================================================================
// PLANTILLA DE CLIENTES: la genera el servidor con las mismas columnas que el Excel exportado y el importador
// =====================================================================
async function descargarPlantillaClientes() {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/clientes/plantilla`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}` } });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'error');
    const link = document.createElement('a');
    link.href = `${typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : 'https://puchia-backend-production.up.railway.app'}${data.data.url}`;
    link.download = 'plantilla_clientes.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error descargando plantilla de clientes:', error);
    puchiaAlert('No se pudo descargar la plantilla de clientes', 'error');
  }
}

// =====================================================================
// INSUMOS: exportar / plantilla / importar (una fila por variante)
// =====================================================================
const INSUMOS_COLUMNAS_EXCEL = ['Insumo', 'Descripción', 'Tipo de variante', 'Variante', 'Cantidad en stock', 'Cantidad mínima'];
const INSUMOS_IMPORT_MAX_FILAS = 2000;
let insumosImportPendiente = null;

function toggleMenuCompartirInsumos(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('menuCompartirInsumos');
  if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', () => {
  const m = document.getElementById('menuCompartirInsumos');
  if (m) m.style.display = 'none';
});

async function insumosActuales() {
  if (Array.isArray(insumosGlobal) && insumosGlobal.length) return insumosGlobal;
  const res = await fetch(`${API_BASE_URL}/insumos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}` } });
  const data = await res.json();
  return data.data || [];
}

async function exportarInsumosExcel() {
  try {
    const insumos = await insumosActuales();
    if (!insumos.length) { puchiaAlert('No hay insumos para exportar', 'warning'); return; }
    const filas = [INSUMOS_COLUMNAS_EXCEL];
    insumos.forEach(i => {
      const vars = i.insumo_variants || [];
      if (!vars.length) filas.push([i.nombre, i.descripcion || '', i.tipo_variante || '', '', '', '']);
      vars.forEach(v => filas.push([i.nombre, i.descripcion || '', i.tipo_variante || '', v.nombre || '', v.cantidad_en_stock ?? 0, v.cantidad_minima ?? 0]));
    });
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = [{ wch: 28 }, { wch: 36 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
    const hoy = new Date().toISOString().slice(0, 10);
    descargarArchivoExcel(wb, `insumos_${hoy}.xlsx`);
  } catch (error) {
    console.error('Error exportando insumos:', error);
    puchiaAlert('No se pudo exportar los insumos', 'error');
  }
}

function descargarPlantillaInsumos() {
  const ws = XLSX.utils.aoa_to_sheet([INSUMOS_COLUMNAS_EXCEL]);
  ws['!cols'] = [{ wch: 28 }, { wch: 36 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 16 }];
  const ayuda = [
    ['CÓMO COMPLETAR LA HOJA "Insumos" (una fila por VARIANTE)'],
    [''],
    ['Insumo', 'Obligatorio. Nombre del insumo (ej: Papel fotográfico). Repetilo en cada fila de sus variantes.'],
    ['Descripción', 'Opcional. Si el insumo ya existe y la completás, se actualiza.'],
    ['Tipo de variante', 'Opcional (ej: Color, Tamaño, Capacidad). Si el insumo es nuevo y lo dejás vacío, se usa "Color".'],
    ['Variante', 'Nombre de la variante (ej: A4, Rojo, 500 ml). Si el insumo no tiene variantes, dejala vacía.'],
    ['Cantidad en stock', 'Número entero, 0 o más. Es la cantidad ACTUAL: reemplaza a la que hay cargada. Vacía = no se toca.'],
    ['Cantidad mínima', 'Número entero, 0 o más. Cantidad a partir de la cual querés alerta. Vacía = no se toca.'],
    [''],
    ['CÓMO FUNCIONA'],
    ['Insumos que ya existen', 'Se reconocen por el nombre (sin importar mayúsculas ni tildes). Se actualizan; no se duplican.'],
    ['Variantes que ya existen', 'Se actualizan sus cantidades. Los productos que las usan siguen vinculados.'],
    ['Variantes nuevas', 'Se crean (aunque tengan stock 0).'],
    ['Nada se borra', 'Lo que no esté en el archivo queda como está.'],
    ['Límite', `Máximo ${INSUMOS_IMPORT_MAX_FILAS} filas. No cambies los nombres de las columnas de la hoja "Insumos".`]
  ];
  const wsAyuda = XLSX.utils.aoa_to_sheet(ayuda);
  wsAyuda['!cols'] = [{ wch: 26 }, { wch: 110 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
  XLSX.utils.book_append_sheet(wb, wsAyuda, 'Ayuda');
  descargarArchivoExcel(wb, 'plantilla_insumos.xlsx');
}

function importarInsumosExcel() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.onchange = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: true });
        procesarImportacionInsumos(filas);
      } catch (error) {
        mostrarErroresImportacionCaja(['No se pudo leer el archivo: ' + error.message]);
      }
    };
    reader.readAsArrayBuffer(archivo);
  };
  input.click();
}

// "1.500" / "1500" / 1500 → 1500. Devuelve null si vacío, NaN si no es un entero válido.
function insumosParsearEntero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isInteger(valor) && valor >= 0 ? valor : NaN;
  const txt = String(valor).trim().replace(/\./g, '');
  return /^\d+$/.test(txt) ? parseInt(txt, 10) : NaN;
}

function procesarImportacionInsumos(filas) {
  filas = filas.filter(f => f.some(c => String(c).trim() !== ''));
  if (filas.length < 2) { mostrarErroresImportacionCaja(['El archivo está vacío (solo tiene encabezado o nada).']); return; }

  const encabezado = filas[0].map(cajaNormalizar);
  const buscar = (...opciones) => encabezado.findIndex(h => opciones.includes(h));
  const col = {
    insumo: buscar('insumo'),
    descripcion: buscar('descripcion'),
    tipo: buscar('tipo de variante', 'tipo variante'),
    variante: buscar('variante'),
    stock: buscar('cantidad en stock', 'stock', 'cantidad'),
    minima: buscar('cantidad minima', 'minimo', 'stock minimo')
  };
  if (col.insumo < 0) { mostrarErroresImportacionCaja(['Falta la columna "Insumo". No cambies el encabezado de la plantilla.']); return; }

  const datos = filas.slice(1);
  if (datos.length > INSUMOS_IMPORT_MAX_FILAS) { mostrarErroresImportacionCaja([`El archivo tiene ${datos.length} filas; el máximo es ${INSUMOS_IMPORT_MAX_FILAS}.`]); return; }

  const errores = [];
  const vistas = new Map();
  const validas = datos.map((f, i) => {
    const n = i + 2;
    const val = (idx) => (idx >= 0 ? f[idx] : '');
    const insumo = String(val(col.insumo)).trim().replace(/\s+/g, ' ');
    const variante = String(val(col.variante)).trim().replace(/\s+/g, ' ');
    const stock = insumosParsearEntero(val(col.stock));
    const minima = insumosParsearEntero(val(col.minima));
    if (!insumo) errores.push(`Fila ${n}: falta el nombre del insumo`);
    if (Number.isNaN(stock)) errores.push(`Fila ${n}: la cantidad en stock debe ser un número entero, 0 o más`);
    if (Number.isNaN(minima)) errores.push(`Fila ${n}: la cantidad mínima debe ser un número entero, 0 o más`);
    if (!variante && ((stock !== null && !Number.isNaN(stock)) || (minima !== null && !Number.isNaN(minima)))) errores.push(`Fila ${n}: si indicás cantidades, escribí también el nombre de la variante`);
    if (insumo) {
      const clave = `${cajaNormalizar(insumo)}|${cajaNormalizar(variante)}`;
      if (vistas.has(clave)) errores.push(`Fila ${n}: repite "${insumo}${variante ? ' / ' + variante : ''}" (ya estaba en la fila ${vistas.get(clave)})`);
      else vistas.set(clave, n);
    }
    return {
      insumo, variante,
      descripcion: String(val(col.descripcion)).trim(),
      tipo_variante: String(val(col.tipo)).trim(),
      cantidad_en_stock: stock === null || Number.isNaN(stock) ? undefined : stock,
      cantidad_minima: minima === null || Number.isNaN(minima) ? undefined : minima
    };
  });
  if (errores.length) { mostrarErroresImportacionCaja(errores); return; }

  insumosImportPendiente = validas;
  mostrarConfirmacionImportacionInsumos(validas);
}

// Compara contra lo que ya hay cargado para mostrar qué va a pasar antes de guardar
function mostrarConfirmacionImportacionInsumos(filas) {
  const actuales = new Map((insumosGlobal || []).map(i => [cajaNormalizar(i.nombre), i]));
  const nuevosInsumos = new Set(), actualizados = [], variantesNuevas = [], sinCambios = [];
  filas.forEach(f => {
    const ins = actuales.get(cajaNormalizar(f.insumo));
    if (!ins) { nuevosInsumos.add(cajaNormalizar(f.insumo)); if (f.variante) variantesNuevas.push(f); return; }
    if (!f.variante) return;
    const v = (ins.insumo_variants || []).find(x => cajaNormalizar(x.nombre) === cajaNormalizar(f.variante));
    if (!v) { variantesNuevas.push(f); return; }
    const cambios = [];
    if (f.cantidad_en_stock !== undefined && f.cantidad_en_stock !== v.cantidad_en_stock) cambios.push(`stock ${v.cantidad_en_stock} → ${f.cantidad_en_stock}`);
    if (f.cantidad_minima !== undefined && f.cantidad_minima !== v.cantidad_minima) cambios.push(`mínimo ${v.cantidad_minima} → ${f.cantidad_minima}`);
    if (cambios.length) actualizados.push({ f, cambios }); else sinCambios.push(f);
  });

  const lista = (items, fmt, max = 6) => items.slice(0, max).map(fmt).join('') + (items.length > max ? `<div style="color:#999;">… y ${items.length - max} más</div>` : '');
  cajaAbrirModal(`
    <h2 style="margin: 0 0 16px; color: #7f1f6e;">Confirmar importación de insumos</h2>
    <div style="display: grid; gap: 8px; font-size: 14px; margin-bottom: 14px;">
      <div>🆕 Insumos nuevos: <strong>${nuevosInsumos.size}</strong></div>
      <div>🆕 Variantes nuevas: <strong>${variantesNuevas.length}</strong></div>
      <div>✏️ Variantes con cambios: <strong>${actualizados.length}</strong></div>
      <div style="color:#888;">Sin cambios: ${sinCambios.length}</div>
    </div>
    ${actualizados.length ? `<div style="background:#f9f6fa;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:12px;">${lista(actualizados, a => `<div>${cajaEscape(a.f.insumo)} / ${cajaEscape(a.f.variante)}: ${a.cambios.join(', ')}</div>`)}</div>` : ''}
    <p style="font-size: 12px; color: #666; margin: 0 0 16px;">Nada se borra: lo que no esté en el archivo queda como está. Las cantidades del archivo reemplazan a las actuales.</p>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-secondary" style="flex: 1;" onclick="cerrarModalImportacionCaja()">Cancelar</button>
      <button class="btn btn-primary" style="flex: 1;" id="btnConfirmarImportInsumos" onclick="ejecutarImportacionInsumos()">Confirmar importación</button>
    </div>
  `);
}

async function ejecutarImportacionInsumos() {
  if (!insumosImportPendiente) return;
  const btn = document.getElementById('btnConfirmarImportInsumos');
  if (btn) { btn.disabled = true; btn.textContent = 'Importando...'; }
  try {
    const res = await fetch(`${API_BASE_URL}/insumos/importar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filas: insumosImportPendiente })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarErroresImportacionCaja(data.detalles?.length ? data.detalles : [data.error || data.message || 'No se pudo importar']);
      return;
    }
    const r = data.data;
    cerrarModalImportacionCaja();
    insumosImportPendiente = null;
    puchiaAlert(`Insumos importados: ${r.insumos_creados} nuevos, ${r.variantes_creadas} variantes nuevas, ${r.variantes_actualizadas} variantes actualizadas`, 'success');
    if (typeof loadInsumos === 'function') loadInsumos();
  } catch (error) {
    console.error('Error importando insumos:', error);
    mostrarErroresImportacionCaja(['Error de conexión. No se guardó nada.']);
  }
}
