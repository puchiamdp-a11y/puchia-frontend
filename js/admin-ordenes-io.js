/* ADMIN-ORDENES-IO.JS - Exportar plantilla e importar pedidos desde Excel
   Los pedidos se importan como REGISTRO: no descuentan stock, no crean productos ni movimientos de caja.
   Los productos quedan como texto en las notas del pedido. Sin estado indicado se cargan ENTREGADOS.
   Reutiliza los ayudantes de Excel y de modales de admin-caja.js (se carga después de ese archivo). */

const PEDIDOS_CANT_COLUMNAS_PRODUCTO = 6;
const PEDIDOS_COLUMNAS_PRODUCTO = Array.from({ length: PEDIDOS_CANT_COLUMNAS_PRODUCTO }, (_, i) => `Producto ${i + 1}`);
const PEDIDOS_COLUMNAS_EXCEL = ['Fecha del pedido', 'Cliente', 'Código de cliente', 'WhatsApp', 'Email', 'DNI', ...PEDIDOS_COLUMNAS_PRODUCTO, 'Total', 'Seña', 'Estado', 'Fecha de entrega'];
const PEDIDOS_ESTADOS_TEXTO = 'Pendiente, Señado, Preparándose, Listo para retirar, Entregado o Anulado';
const PEDIDOS_COLUMNAS_OBLIGATORIAS = ['Fecha del pedido', 'Cliente', 'Total'];
const PEDIDOS_IMPORT_MAX_FILAS = 500;
let pedidosImportPendiente = null;

function exportarPlantillaPedidos() {
  const wsPedidos = XLSX.utils.aoa_to_sheet([PEDIDOS_COLUMNAS_EXCEL]);
  wsPedidos['!cols'] = PEDIDOS_COLUMNAS_EXCEL.map(col =>
    ({ wch: col === 'Cliente' || col === 'Email' ? 26 : col.startsWith('Producto') ? 22 : col === 'Código de cliente' ? 18 : 16 }));

  // Nota en el encabezado "Estado" con las opciones (al pasar el mouse por la celda)
  const celdaEstado = XLSX.utils.encode_cell({ r: 0, c: PEDIDOS_COLUMNAS_EXCEL.indexOf('Estado') });
  wsPedidos[celdaEstado].c = [{ a: 'Puchia', t: `Escribí: ${PEDIDOS_ESTADOS_TEXTO}.\nSi lo dejás vacío, se carga como Entregado.` }];

  const ayuda = [
    ['CÓMO COMPLETAR LA HOJA "Pedidos" (una fila por pedido)'],
    [''],
    ['Fecha del pedido', 'Obligatoria. Día en que se hizo el pedido, dd/mm/aaaa (ej: 15/09/2026).'],
    ['Cliente', 'Obligatorio. Nombre del cliente.'],
    ['Código de cliente', 'Opcional (ej: J0345). Si ya existe, el pedido se asocia a ese cliente; si no existe, se crea el cliente con ese código. Si el código es de otra persona que la del nombre, te avisa. Vacío: se busca por WhatsApp, email o DNI y, si no está, se crea con el próximo código.'],
    ['WhatsApp / Email / DNI', 'Opcionales, pero sirven para reconocer al cliente: si ya existe con ese WhatsApp, email o DNI se usa el mismo; si no, se crea uno nuevo.'],
    [`Producto 1 … Producto ${PEDIDOS_CANT_COLUMNAS_PRODUCTO}`, `Opcionales. Un producto por columna, escrito como texto (ej: "2 tazas"). Si necesitás más, agregá columnas "Producto ${PEDIDOS_CANT_COLUMNAS_PRODUCTO + 1}", "Producto ${PEDIDOS_CANT_COLUMNAS_PRODUCTO + 2}"… a la derecha.`],
    ['Total', 'Obligatorio. Importe total del pedido, positivo (ej: 15000 o 15000,50).'],
    ['Estado', `Escribilo a mano: ${PEDIDOS_ESTADOS_TEXTO}. Si lo dejás VACÍO, se carga como Entregado.`],
    ['Seña', 'Importe señado. Obligatoria si el estado es Señado, Preparándose o Listo para retirar. Si el pedido es Entregado y la dejás vacía, se toma como pagado completo. En Pendiente va vacía.'],
    ['Fecha de entrega', 'Opcional. dd/mm/aaaa.'],
    [''],
    ['ESTADOS VÁLIDOS'],
    ['Pendiente', 'Todavía no señó.'],
    ['Señado', 'Señó; el pedido está confirmado.'],
    ['Preparándose', 'En elaboración.'],
    ['Listo para retirar', 'Terminado, esperando el retiro.'],
    ['Entregado', 'Entregado al cliente (es el que se usa si no escribís nada).'],
    ['Anulado', 'Cancelado.'],
    [''],
    ['IMPORTANTE'],
    ['Se cargan como REGISTRO', 'No descuentan stock, no crean productos y no generan movimientos de caja. No hace falta que los productos existan: quedan escritos en las notas del pedido.'],
    ['Si después cambiás el estado', 'Al pasar un pedido importado a Señado, el sistema NO vuelve a registrar la seña en Caja (se asume que ya la cargaste).'],
    ['Límite', `Máximo ${PEDIDOS_IMPORT_MAX_FILAS} filas por importación. No cambies los nombres de las columnas de la hoja "Pedidos".`]
  ];
  const wsAyuda = XLSX.utils.aoa_to_sheet(ayuda);
  wsAyuda['!cols'] = [{ wch: 32 }, { wch: 120 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos');
  XLSX.utils.book_append_sheet(wb, wsAyuda, 'Ayuda');
  XLSX.writeFile(wb, 'plantilla_pedidos.xlsx');
}

function importarPedidos() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'array' });
        const hoja = workbook.Sheets['Pedidos'] || workbook.Sheets[workbook.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', blankrows: true, raw: true });
        procesarImportacionPedidos(filas);
      } catch (error) {
        console.error('❌ Error leyendo Excel de pedidos:', error);
        mostrarErroresImportacionCaja(['No se pudo leer el archivo. Verificá que sea un Excel (.xlsx) válido.']);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

function pedidosParsearEstado(valor) {
  const txt = cajaNormalizar(valor).replace(/_/g, ' ');
  const mapa = {
    'pendiente': 'pendiente',
    'senado': 'señado',
    'preparandose': 'preparandose',
    'listo para retirar': 'listo_retirar',
    'listo retirar': 'listo_retirar',
    'entregado': 'entregado',
    'anulado': 'anulado'
  };
  return mapa[txt] || null;
}

function procesarImportacionPedidos(filas) {
  if (filas.length === 0) {
    mostrarErroresImportacionCaja(['El archivo está vacío.']);
    return;
  }

  // Ubicar columnas por nombre de encabezado (sin importar mayúsculas ni tildes)
  const encabezado = filas[0].map(cajaNormalizar);
  const indice = {};
  PEDIDOS_COLUMNAS_EXCEL.forEach(col => { indice[col] = encabezado.indexOf(cajaNormalizar(col)); });

  const faltantes = PEDIDOS_COLUMNAS_OBLIGATORIAS.filter(col => indice[col] === -1);
  if (faltantes.length > 0) {
    mostrarErroresImportacionCaja([
      `Faltan columnas en el encabezado: ${faltantes.join(', ')}.`,
      'Usá el botón "Exportar plantilla" para obtener el formato correcto.'
    ]);
    return;
  }

  // Todas las columnas "Producto N" del archivo, aunque el usuario haya agregado más
  const columnasProducto = encabezado
    .map((h, pos) => (/^producto \d+$/.test(h) ? pos : -1))
    .filter(pos => pos >= 0);

  // Se conserva la posición original para informar la fila correcta del Excel; se ignoran las filas vacías
  const datos = filas.slice(1).map((celdas, i) => ({ celdas, numFila: i + 2 }))
    .filter(({ celdas }) => celdas.some(c => String(c ?? '').trim() !== ''));
  if (datos.length === 0) {
    mostrarErroresImportacionCaja(['El archivo no tiene filas para importar. Completá la plantilla debajo del encabezado.']);
    return;
  }
  if (datos.length > PEDIDOS_IMPORT_MAX_FILAS) {
    mostrarErroresImportacionCaja([`El archivo tiene ${datos.length} filas. El máximo es ${PEDIDOS_IMPORT_MAX_FILAS} por importación.`]);
    return;
  }

  const celda = (celdas, col) => indice[col] >= 0 ? celdas[indice[col]] : '';
  const texto = (celdas, col) => String(celda(celdas, col) ?? '').trim();

  const errores = [];
  const ordenes = [];

  datos.forEach(({ celdas, numFila }) => {
    const fallas = [];

    const fecha = cajaParsearFecha(celda(celdas, 'Fecha del pedido'));
    if (!fecha) fallas.push('fecha del pedido inválida (usá dd/mm/aaaa)');

    const total = cajaParsearMonto(celda(celdas, 'Total'));
    if (!Number.isFinite(total) || total <= 0) fallas.push('el total debe ser un número positivo');

    // Estado vacío = Entregado
    let estado = 'entregado';
    const estadoTxt = texto(celdas, 'Estado');
    if (estadoTxt !== '') {
      estado = pedidosParsearEstado(estadoTxt);
      if (!estado) {
        fallas.push(cajaNormalizar(estadoTxt) === 'en edicion'
          ? 'el estado "En edición" ya no existe (usá Pendiente o Señado)'
          : `estado "${cajaEscape(estadoTxt)}" no válido (${PEDIDOS_ESTADOS_TEXTO})`);
      }
    }

    let sena = '';
    if (texto(celdas, 'Seña') !== '') {
      sena = cajaParsearMonto(celda(celdas, 'Seña'));
      if (!Number.isFinite(sena)) { fallas.push('seña inválida'); sena = ''; }
    }

    let fechaEntrega = '';
    if (texto(celdas, 'Fecha de entrega') !== '') {
      fechaEntrega = cajaParsearFecha(celda(celdas, 'Fecha de entrega'));
      if (!fechaEntrega) { fallas.push('fecha de entrega inválida (usá dd/mm/aaaa)'); fechaEntrega = ''; }
    }

    if (fallas.length > 0) {
      errores.push(`Fila ${numFila}: ${fallas.join(', ')}`);
      return;
    }

    ordenes.push({
      fila: numFila,
      fecha,
      cliente_nombre: texto(celdas, 'Cliente'),
      cliente_codigo: texto(celdas, 'Código de cliente'),
      cliente_whatsapp: texto(celdas, 'WhatsApp'),
      cliente_email: texto(celdas, 'Email'),
      cliente_dni: texto(celdas, 'DNI'),
      productos: columnasProducto.map(pos => String(celdas[pos] ?? '').trim()).filter(Boolean),
      total,
      sena,
      estado,
      fecha_entrega: fechaEntrega
    });
  });

  if (errores.length > 0) {
    mostrarErroresImportacionCaja(errores);
    return;
  }

  pedidosImportPendiente = ordenes;
  simularImportacionPedidos();
}

async function enviarImportacionPedidos(opciones) {
  const response = await fetch(`${API_BASE_URL}/admin/ordenes/importar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ordenes: pedidosImportPendiente, ...opciones })
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// Primero se simula: el servidor valida todo y cuenta cuántos clientes nuevos se crearían, sin guardar nada
async function simularImportacionPedidos() {
  try {
    const { response, data } = await enviarImportacionPedidos({ simular: true });

    if (!response.ok) {
      mostrarErroresImportacionCaja(Array.isArray(data.detalles) ? data.detalles : [data.error || 'No se pudo validar el archivo']);
      return;
    }
    mostrarConfirmacionImportacionPedidos(data.data);
  } catch (error) {
    console.error('❌ Error validando pedidos:', error);
    alert('Error al conectar con el servidor. No se importó nada.');
  }
}

const PEDIDOS_NOMBRE_ESTADO = { pendiente: 'Pendiente', 'señado': 'Señado', preparandose: 'Preparándose', listo_retirar: 'Listo para retirar', entregado: 'Entregado', anulado: 'Anulado' };

function mostrarConfirmacionImportacionPedidos(resumen) {
  const desgloseEstados = Object.entries(resumen.por_estado || {})
    .map(([estado, cantidad]) => `<strong>${cantidad}</strong> ${PEDIDOS_NOMBRE_ESTADO[estado] || estado}`)
    .join(' · ');
  const aviso = resumen.duplicadas > 0
    ? `<div style="background: #fff3cd; border: 1px solid #ffe69c; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px;">
         ⚠️ <strong>${resumen.duplicadas}</strong> de estos pedidos parecen ya estar cargados (mismo cliente, fecha y total). Si confirmás, se van a <strong>duplicar</strong>.
       </div>`
    : '';

  cajaAbrirModal(`
    <h2 style="margin: 0 0 16px; color: #7f1f6e;">Confirmar importación de pedidos</h2>
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <div style="flex: 1; background: #f5f5f5; border-radius: 8px; padding: 14px; text-align: center;">
        <div style="font-size: 30px; font-weight: 700; color: #7f1f6e;">${resumen.pedidos}</div>
        <div style="color: #666; font-size: 13px;">pedidos</div>
      </div>
      <div style="flex: 1; background: #f5f5f5; border-radius: 8px; padding: 14px; text-align: center;">
        <div style="font-size: 20px; font-weight: 700; color: #7f1f6e; padding-top: 6px;">${formatearMonto(resumen.total)}</div>
        <div style="color: #666; font-size: 13px; padding-top: 4px;">suma de totales</div>
      </div>
    </div>
    <div style="background: #f9f9f9; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
      👥 <strong>${resumen.clientes_nuevos}</strong> cliente(s) nuevo(s) se van a crear<br>
      👤 <strong>${resumen.clientes_existentes}</strong> cliente(s) ya existen y se reutilizan
    </div>
    <div style="background: #f9f9f9; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
      📋 ${desgloseEstados}
    </div>
    ${aviso}
    <p style="font-size: 12px; color: #666; margin: 0 0 16px;">
      Se cargan como <strong>registro</strong>: no descuentan stock, no crean productos ni movimientos de caja.
    </p>
    <div style="display: flex; gap: 12px;">
      <button class="btn btn-secondary" style="flex: 1;" onclick="cerrarModalImportacionCaja()">Cancelar</button>
      <button id="btnConfirmarImportacionPedidos" class="btn btn-primary" style="flex: 1;"
        onclick="ejecutarImportacionPedidos(${resumen.duplicadas > 0})">${resumen.duplicadas > 0 ? 'Importar igual' : 'Confirmar importación'}</button>
    </div>
  `);
}

async function ejecutarImportacionPedidos(confirmarDuplicados) {
  if (!pedidosImportPendiente) return;

  const boton = document.getElementById('btnConfirmarImportacionPedidos');
  if (boton) { boton.disabled = true; boton.textContent = 'Importando...'; }

  try {
    const { response, data } = await enviarImportacionPedidos({ confirmar_duplicados: confirmarDuplicados });

    if (!response.ok) {
      mostrarErroresImportacionCaja(Array.isArray(data.detalles) ? data.detalles : [data.error || 'Error al importar']);
      return;
    }

    pedidosImportPendiente = null;
    cerrarModalImportacionCaja();
    alert(`✅ ${data.data.insertadas} pedidos importados.\n${data.data.clientes_creados} cliente(s) nuevo(s) creado(s), ${data.data.clientes_existentes} ya existían.`);

    // Refrescar lo que depende de los pedidos
    if (typeof loadAllOrders === 'function') loadAllOrders();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
    if (typeof listarClientes === 'function') listarClientes();
  } catch (error) {
    console.error('❌ Error importando pedidos:', error);
    if (boton) { boton.disabled = false; boton.textContent = confirmarDuplicados ? 'Importar igual' : 'Confirmar importación'; }
    alert('Error al conectar con el servidor. No se importó nada.');
  }
}

// ==================== DESHACER IMPORTACIONES / RECALCULAR CÓDIGOS ====================

async function llamarApiPedidosIO(ruta, cuerpo) {
  const response = await fetch(`${API_BASE_URL}${ruta}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cuerpo || {})
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// Primero muestra QUÉ se borraría; recién después de escribir BORRAR se ejecuta
async function deshacerImportacionesPedidos() {
  try {
    const { response, data } = await llamarApiPedidosIO('/admin/ordenes/importadas/deshacer', { simular: true });
    if (!response.ok) { alert(data.error || 'No se pudo consultar las importaciones'); return; }

    const r = data.data;
    if (r.pedidos === 0) {
      alert('No hay pedidos importados (con código IMP-) para deshacer.');
      return;
    }

    const clientes = r.lista_clientes.map(c => `<li>${cajaEscape(c.codigo)} — ${cajaEscape(c.nombre)}</li>`).join('');
    cajaAbrirModal(`
      <h2 style="margin: 0 0 12px; color: #c5221f;">Deshacer importaciones</h2>
      <p style="font-size: 13px; color: #555; margin: 0 0 14px;">Se van a borrar <strong>definitivamente</strong>:</p>
      <div style="background: #fce8e6; border: 1px solid #f1d5d3; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; font-size: 13px; line-height: 1.7;">
        🧾 <strong>${r.pedidos}</strong> pedido(s) importado(s) (código IMP-)<br>
        👥 <strong>${r.clientes}</strong> cliente(s) que esas importaciones crearon
        ${clientes ? `<ul style="margin: 8px 0 0; padding-left: 20px; max-height: 140px; overflow-y: auto;">${clientes}</ul>` : ''}
        ${r.clientes > r.lista_clientes.length ? `<div style="color: #666;">… y ${r.clientes - r.lista_clientes.length} más.</div>` : ''}
      </div>
      <div style="background: #f9f9f9; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #555; line-height: 1.6;">
        ✅ No se toca la Caja, los productos ni los clientes que ya existían antes.<br>
        ${r.clientes_conservados > 0 ? `✅ ${r.clientes_conservados} cliente(s) se conservan porque tienen otros pedidos.<br>` : ''}
        ${r.pedidos_con_caja_omitidos > 0 ? `✅ ${r.pedidos_con_caja_omitidos} pedido(s) se conservan porque tienen movimientos de caja.<br>` : ''}
        ➡️ Después se recalcula el contador de códigos de cliente.
      </div>
      <div style="background: #fff3cd; border: 1px solid #ffe69c; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px;">
        ⚠️ Esto borra <strong>todos</strong> los pedidos IMP-, también los que hayas importado bien. Usalo solo para empezar de cero.
      </div>
      <label style="font-size: 12px; color: #555;">Para confirmar, escribí <strong>BORRAR</strong>:</label>
      <input id="inputConfirmarDeshacer" type="text" autocomplete="off" style="width: 100%; margin: 6px 0 16px;">
      <div style="display: flex; gap: 12px;">
        <button class="btn btn-secondary" style="flex: 1;" onclick="cerrarModalImportacionCaja()">Cancelar</button>
        <button id="btnConfirmarDeshacer" class="btn btn-danger" style="flex: 1;" disabled onclick="ejecutarDeshacerImportaciones()">Borrar definitivamente</button>
      </div>
    `);
    document.getElementById('inputConfirmarDeshacer').addEventListener('input', (e) => {
      document.getElementById('btnConfirmarDeshacer').disabled = e.target.value.trim().toUpperCase() !== 'BORRAR';
    });
  } catch (error) {
    console.error('❌ Error consultando importaciones:', error);
    alert('Error al conectar con el servidor.');
  }
}

async function ejecutarDeshacerImportaciones() {
  const boton = document.getElementById('btnConfirmarDeshacer');
  if (boton) { boton.disabled = true; boton.textContent = 'Borrando...'; }

  try {
    const { response, data } = await llamarApiPedidosIO('/admin/ordenes/importadas/deshacer', { confirmar: true });
    if (!response.ok) {
      cerrarModalImportacionCaja();
      alert(data.error || 'No se pudo deshacer la importación');
      return;
    }
    cerrarModalImportacionCaja();
    alert(`✅ ${data.message}`);
    if (typeof loadAllOrders === 'function') loadAllOrders();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
    if (typeof listarClientes === 'function') listarClientes();
  } catch (error) {
    console.error('❌ Error deshaciendo importaciones:', error);
    alert('Error al conectar con el servidor. Revisá la lista de pedidos antes de reintentar.');
  }
}

// Deja el contador en el mayor código J cargado: el próximo cliente nuevo será el siguiente
async function recalcularProximoCodigoCliente() {
  try {
    const { response, data } = await llamarApiPedidosIO('/admin/clientes/recalcular-secuencial', {});
    if (!response.ok) { alert(data.error || data.message || 'No se pudo recalcular el contador'); return; }
    alert(`🔢 ${data.message}`);
  } catch (error) {
    console.error('❌ Error recalculando contador:', error);
    alert('Error al conectar con el servidor.');
  }
}
