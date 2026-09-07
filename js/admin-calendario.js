// ==================== CALENDARIO DE ENTREGAS ====================

let calendarioState = {
  pedidos: [],
  clientesIndex: {}, // Ver construirIndiceClientes()
  vista: 'monthly', // 'monthly' o 'weekly'
  mesActual: new Date(),
  pedidoSeleccionado: null,
  coloresEstado: {
    'pendiente': '#333333',
    'señado': '#f57f17',
    'preparandose': '#2e7d32',
    'listo_retirar': '#1565c0',
    'entregado': '#7f1f6e',
    'anulado': '#c62828',
    'rechazado': '#c62828',
    'en_proceso': '#ff9800',
    'listo_para_entregar': '#2196f3',
    'cancelado': '#9e9e9e'
  },
  coloresFondo: {
    'pendiente': '#ffffff',
    'señado': '#fffde7',
    'preparandose': '#e8f5e9',
    'listo_retirar': '#e3f2fd',
    'entregado': '#f3e5f5',
    'anulado': '#ffebee',
    'rechazado': '#ffebee'
  }
};

function initCalendario() {
  console.log('🔄 Inicializando módulo de Calendario...');
  cargarPedidosCalendario();
}

// ==================== CÓDIGO DE CLIENTE ====================
// La orden no guarda vínculo con la tabla de clientes: copia nombre, email,
// DNI y WhatsApp, pero nunca el código. Para mostrarlo en el calendario
// armamos un índice de clientes y cruzamos cada pedido por esos datos.

function normalizarTelefono(valor) {
  if (!valor) return '';
  const digitos = String(valor).replace(/\D/g, '');
  // Los teléfonos se cargan con y sin prefijo de país (+54 9 ...), así que
  // comparamos por los últimos 8 dígitos, que es la parte que no varía.
  return digitos.length >= 8 ? digitos.slice(-8) : '';
}

function normalizarTexto(valor) {
  if (!valor) return '';
  return String(valor).trim().toLowerCase();
}

function construirIndiceClientes(clientes) {
  const indice = {};

  const agregar = (prefijo, valor, codigo) => {
    if (!valor || !codigo) return;
    const clave = `${prefijo}:${valor}`;
    // Una clave que apunta a dos clientes distintos no sirve para identificar:
    // la anulamos en vez de quedarnos con cualquiera de los dos.
    if (clave in indice && indice[clave] !== codigo) {
      indice[clave] = null;
      return;
    }
    indice[clave] = codigo;
  };

  clientes.forEach(c => {
    agregar('tel', normalizarTelefono(c.whatsapp), c.codigo_cliente);
    agregar('tel', normalizarTelefono(c.telefono), c.codigo_cliente);
    agregar('dni', normalizarTexto(c.dni), c.codigo_cliente);
    agregar('email', normalizarTexto(c.email), c.codigo_cliente);
    agregar('nombre', normalizarTexto(c.nombre), c.codigo_cliente);
  });

  return indice;
}

// Del dato más confiable al menos confiable
function buscarCodigoCliente(pedido) {
  const candidatos = [
    ['tel', normalizarTelefono(pedido.cliente_whatsapp)],
    ['dni', normalizarTexto(pedido.cliente_dni)],
    ['email', normalizarTexto(pedido.cliente_email)],
    ['nombre', normalizarTexto(pedido.cliente_nombre)]
  ];

  for (const [prefijo, valor] of candidatos) {
    if (!valor) continue;
    const codigo = calendarioState.clientesIndex[`${prefijo}:${valor}`];
    if (codigo) return codigo;
  }

  return '';
}

async function cargarPedidosCalendario() {
  try {
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
    };

    const [resOrdenes, resClientes] = await Promise.all([
      fetch(`${API_BASE_URL}/admin/ordenes?limite=5000&pagina=1`, { headers }),
      fetch(`${API_BASE_URL}/admin/clientes?limite=5000`, { headers })
    ]);

    if (!resOrdenes.ok) throw new Error('Error al cargar pedidos');

    const data = await resOrdenes.json();
    // Filtrar solo pedidos con fecha de entrega
    calendarioState.pedidos = (data.data || []).filter(p => p.fecha_entrega);

    // Si falla, el calendario igual se muestra pero sin el código de cliente
    if (resClientes.ok) {
      const dataClientes = await resClientes.json();
      calendarioState.clientesIndex = construirIndiceClientes(dataClientes.data || []);
    } else {
      console.warn('⚠️ No se pudieron cargar los clientes: los pedidos se muestran sin código');
      calendarioState.clientesIndex = {};
    }

    console.log(`✅ ${calendarioState.pedidos.length} pedidos con fecha de entrega cargados`);
    renderCalendario();
  } catch (error) {
    console.error('❌ Error cargando pedidos:', error);
  }
}

function renderCalendario() {
  const calendario = document.getElementById('calendario-page');
  if (!calendario) return;

  calendario.innerHTML = `
    <h1 class="page-title">📅 Calendario de Entregas</h1>

    <!-- CONTROLES -->
    <div style="display: flex; gap: 12px; margin-bottom: 24px; align-items: center; flex-wrap: wrap;">
      <button class="btn btn-secondary" onclick="cambiarMes(-1)">◀ Anterior</button>
      <h2 id="mesActual" style="min-width: 200px; text-align: center; margin: 0; font-size: 18px; color: #7f1f6e;">
        ${formatearMesAnio(calendarioState.mesActual)}
      </h2>
      <button class="btn btn-secondary" onclick="cambiarMes(1)">Siguiente ▶</button>
      <button class="btn btn-secondary" onclick="establecerHoy()">Hoy</button>

      <div style="flex: 1; text-align: right;">
        <button class="btn ${calendarioState.vista === 'monthly' ? 'btn-primary' : 'btn-secondary'}"
                onclick="cambiarVista('monthly')">📆 Mensual</button>
        <button class="btn ${calendarioState.vista === 'weekly' ? 'btn-primary' : 'btn-secondary'}"
                onclick="cambiarVista('weekly')">📋 Semanal</button>
      </div>
    </div>

    <!-- LEYENDA DE ESTADOS -->
    <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; background: #f9f9f9; padding: 12px; border-radius: 8px;">
      ${['pendiente', 'señado', 'preparandose', 'listo_retirar', 'entregado', 'anulado'].map(estado => {
        const color = calendarioState.coloresEstado[estado];
        const fondo = calendarioState.coloresFondo[estado];
        return `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; background: ${fondo}; color: ${color}; border: 1px solid ${color}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600;">●</div>
            <span style="font-size: 13px; text-transform: capitalize;">${estado.replace('_', ' ')}</span>
          </div>
        `;
      }).join('')}
    </div>

    <!-- CALENDARIO -->
    <div id="calendarioContenedor" style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #eee;">
      ${calendarioState.vista === 'monthly' ? renderCalendarioMensual() : renderCalendarioSemanal()}
    </div>
  `;
}

function renderCalendarioMensual() {
  const year = calendarioState.mesActual.getFullYear();
  const month = calendarioState.mesActual.getMonth();

  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const diasMes = ultimoDia.getDate();
  const diaInicio = primerDia.getDay();

  let html = `
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #eee;">
      <!-- ENCABEZADOS -->
      ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'].map(d =>
        `<div style="background: #f9f9f9; padding: 8px; text-align: center; font-weight: 600; font-size: 12px; color: #7f1f6e;">
          ${d}
        </div>`
      ).join('')}
  `;

  // Días vacíos al inicio
  for (let i = 0; i < diaInicio; i++) {
    html += `<div style="background: white; padding: 8px; min-height: 100px;"></div>`;
  }

  // Días del mes
  for (let dia = 1; dia <= diasMes; dia++) {
    const fecha = new Date(year, month, dia);
    const fechaStr = fecha.toISOString().split('T')[0];
    const pedidosDia = calendarioState.pedidos.filter(p => p.fecha_entrega === fechaStr)
      .sort((a, b) => new Date(a.fecha_entrega) - new Date(b.fecha_entrega));

    const esHoy = fecha.toDateString() === new Date().toDateString();

    html += `
      <div style="background: white; padding: 8px; min-height: 100px; border: ${esHoy ? '2px solid #7f1f6e' : '1px solid #eee'}; border-radius: 4px; overflow-y: auto;">
        <div style="font-weight: 600; margin-bottom: 4px; color: ${esHoy ? '#7f1f6e' : '#666'}; font-size: 14px;">
          ${dia}
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${pedidosDia.map(p => renderPedidoEnCalendario(p)).join('')}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

function renderCalendarioSemanal() {
  const year = calendarioState.mesActual.getFullYear();
  const month = calendarioState.mesActual.getMonth();
  const dia = calendarioState.mesActual.getDate();

  const hoy = new Date(year, month, dia);
  const primerDiaSemana = new Date(hoy);
  primerDiaSemana.setDate(hoy.getDate() - hoy.getDay());

  let html = `
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #eee;">
      <!-- ENCABEZADOS -->
  `;

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(primerDiaSemana);
    fecha.setDate(fecha.getDate() + i);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
    const esHoy = fecha.toDateString() === new Date().toDateString();

    html += `
      <div style="background: ${esHoy ? '#7f1f6e' : '#f9f9f9'}; padding: 8px; text-align: center; border-radius: 4px 4px 0 0;">
        <div style="font-weight: 600; font-size: 12px; color: ${esHoy ? 'white' : '#7f1f6e'};">
          ${dias[i]}
        </div>
        <div style="font-size: 14px; color: ${esHoy ? 'white' : '#666'};">
          ${fecha.getDate()}/${String(fecha.getMonth() + 1).padStart(2, '0')}
        </div>
      </div>
    `;
  }

  // Días de la semana
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(primerDiaSemana);
    fecha.setDate(fecha.getDate() + i);
    const fechaStr = fecha.toISOString().split('T')[0];

    const pedidosDia = calendarioState.pedidos.filter(p => p.fecha_entrega === fechaStr)
      .sort((a, b) => new Date(a.fecha_entrega) - new Date(b.fecha_entrega));

    html += `
      <div style="background: white; padding: 8px; min-height: 200px; overflow-y: auto; border-radius: 0 0 4px 4px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${pedidosDia.map(p => renderPedidoEnCalendario(p)).join('')}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

function extraerPalabrasEnMayuscula(texto) {
  if (!texto) return '';

  const palabras = texto.trim().split(/\s+/);
  const palabrasMayuscula = [];

  // Extraer palabras en mayúscula del inicio
  for (let palabra of palabras) {
    // Verificar si la palabra está completamente en mayúsculas (sin contar números y caracteres especiales)
    const soloLetras = palabra.replace(/[^a-zA-Z]/g, '');
    if (soloLetras && soloLetras === soloLetras.toUpperCase()) {
      palabrasMayuscula.push(palabra);
    } else if (palabrasMayuscula.length > 0) {
      // Si ya encontramos palabras en mayúscula y ahora hay una que no lo es, parar
      break;
    }
  }

  return palabrasMayuscula.join(' ');
}

function renderPedidoEnCalendario(pedido) {
  const colorTexto = calendarioState.coloresEstado[pedido.estado] || '#333';
  const colorFondo = calendarioState.coloresFondo[pedido.estado] || '#f9f9f9';

  // El código no viene en la orden: se resuelve cruzando con los clientes
  const codigoCliente = pedido.cliente?.codigo_cliente || pedido.codigo_cliente || buscarCodigoCliente(pedido);

  // Obtener nombre del cliente (primer nombre si es completo)
  const nombreCompleto = pedido.cliente_nombre || (pedido.cliente?.nombre) || 'Cliente';
  const nombrePrimero = nombreCompleto.split(' ')[0]; // Tomar solo el primer nombre

  // Extraer palabras en mayúscula de las notas (intentar varios campos)
  const notasField = pedido.anotacion || pedido.notas || pedido.observaciones || '';
  const palabrasMayuscula = extraerPalabrasEnMayuscula(notasField);

  // Formato: CÓDIGO NOMBRE - PALABRAS EN MAYÚSCULA
  let textoEvento = '';
  if (codigoCliente) textoEvento += codigoCliente + ' ';
  textoEvento += nombrePrimero;
  if (palabrasMayuscula) textoEvento += ' - ' + palabrasMayuscula;

  const tooltip = [codigoCliente, nombreCompleto].filter(Boolean).join(' ')
    + (notasField ? ' - ' + notasField.substring(0, 50) : '');

  return `
    <div onclick="abrirDetallesPedido(${pedido.id})"
         style="padding: 4px 6px; background: ${colorFondo}; color: ${colorTexto}; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border: 1px solid ${colorTexto}20;"
         title="${tooltip}">
      ${textoEvento}
    </div>
  `;
}

function cambiarMes(cantidad) {
  calendarioState.mesActual = new Date(
    calendarioState.mesActual.getFullYear(),
    calendarioState.mesActual.getMonth() + cantidad,
    1
  );
  renderCalendario();
}

function cambiarVista(vista) {
  calendarioState.vista = vista;
  renderCalendario();
}

function establecerHoy() {
  calendarioState.mesActual = new Date();
  renderCalendario();
}

function formatearMesAnio(fecha) {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function abrirDetallesPedido(pedidoId) {
  // Buscar el pedido en calendarioState.pedidos
  const pedido = calendarioState.pedidos.find(p => p.id === pedidoId);
  if (!pedido) {
    console.error('Pedido no encontrado:', pedidoId);
    return;
  }

  // Llamar a la función existente de admin.js que abre detalles de pedido
  if (typeof abrirModalDetallesPedido === 'function') {
    abrirModalDetallesPedido(pedido);
  } else if (typeof loadOrderDetail === 'function') {
    loadOrderDetail(pedidoId);
  } else {
    console.error('No hay función para abrir detalles del pedido');
  }
}
