// ==================== CALENDARIO DE ENTREGAS ====================

let calendarioState = {
  pedidos: [],
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

async function cargarPedidosCalendario() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/ordenes?limite=5000&pagina=1`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      }
    });

    if (!response.ok) throw new Error('Error al cargar pedidos');

    const data = await response.json();
    // Filtrar solo pedidos con fecha de entrega
    calendarioState.pedidos = (data.data || []).filter(p => p.fecha_entrega);

    console.log(`✅ ${calendarioState.pedidos.length} pedidos con fecha de entrega cargados`);
    if (calendarioState.pedidos.length > 0) {
      const p = calendarioState.pedidos[0];
      console.log('📋 PRIMER PEDIDO - TODOS LOS CAMPOS:');
      console.log('  id:', p.id);
      console.log('  id_unico:', p.id_unico);
      console.log('  cliente_nombre:', p.cliente_nombre);
      console.log('  cliente_email:', p.cliente_email);
      console.log('  cliente_id:', p.cliente_id);
      console.log('  codigo_cliente:', p.codigo_cliente);
      console.log('  cliente_codigo:', p.cliente_codigo);
      console.log('  cliente:', p.cliente);
      console.log('  notas:', p.notas);
      console.log('  anotacion:', p.anotacion);
      console.log('  observaciones:', p.observaciones);
      console.log('  estado:', p.estado);
      console.log('  fecha_entrega:', p.fecha_entrega);
    }
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

  // Debug: mostrar estructura del pedido
  if (pedido.id_unico === undefined) {
    console.log('📍 Pedido ID:', pedido.id);
    console.log('   - Clientes disponibles:', {
      cliente_nombre: pedido.cliente_nombre,
      cliente_codigo: pedido.cliente?.codigo_cliente,
      codigo_cliente: pedido.codigo_cliente,
      cliente_obj: pedido.cliente
    });
    console.log('   - Notas disponibles:', {
      anotacion: pedido.anotacion,
      notas: pedido.notas,
      observaciones: pedido.observaciones
    });
  }

  // Obtener código del cliente
  const codigoCliente = pedido.cliente?.codigo_cliente || pedido.codigo_cliente || '';

  // Obtener nombre del cliente (primer nombre si es completo)
  const nombreCompleto = pedido.cliente_nombre || (pedido.cliente?.nombre) || 'Cliente';
  const nombrePrimero = nombreCompleto.split(' ')[0]; // Tomar solo el primer nombre

  // Extraer palabras en mayúscula de las notas (intentar varios campos)
  const notasField = pedido.anotacion || pedido.notas || pedido.observaciones || '';
  const palabrasMayuscula = extraerPalabrasEnMayuscula(notasField);

  // Construir texto del evento
  let textoEvento = '';
  if (codigoCliente) textoEvento += codigoCliente + ' ';
  textoEvento += nombrePrimero;
  if (palabrasMayuscula) textoEvento += ' - ' + palabrasMayuscula;

  const tooltip = `${codigoCliente} ${nombreCompleto}${notasField ? ' - ' + notasField.substring(0, 50) : ''}`;

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
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

async function abrirDetallesPedido(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/ordenes/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      }
    });

    if (!response.ok) throw new Error('Error al cargar pedido');

    const data = await response.json();
    const pedido = data.data;
    calendarioState.pedidoSeleccionado = pedido;

    mostrarModalDetallesPedido(pedido);
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error al cargar detalles del pedido');
  }
}

function mostrarModalDetallesPedido(pedido) {
  const modal = document.createElement('div');
  modal.id = 'modalDetallesPedido';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; padding: 32px; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; position: relative;">
      <button onclick="cerrarModalDetallesPedido()"
              style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">
        ✕
      </button>

      <h2 style="margin-bottom: 20px; color: #7f1f6e; display: flex; align-items: center; gap: 12px;">
        Pedido #${pedido.id_unico}
        <span style="display: inline-block; padding: 4px 12px; background: ${calendarioState.coloresFondo[pedido.estado] || '#f9f9f9'}; color: ${calendarioState.coloresEstado[pedido.estado] || '#333'}; border: 1px solid ${calendarioState.coloresEstado[pedido.estado] || '#333'}; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
          ${pedido.estado.replace('_', ' ')}
        </span>
      </h2>

      <!-- INFORMACIÓN GENERAL -->
      <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #7f1f6e;">Información General</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
          <div>
            <span style="color: #999;">Cliente:</span>
            <div style="font-weight: 600; color: #333;">${pedido.id_cliente}</div>
          </div>
          <div>
            <span style="color: #999;">Total:</span>
            <div style="font-weight: 600; color: #333;">$${parseFloat(pedido.total).toFixed(2)}</div>
          </div>
          <div>
            <span style="color: #999;">Fecha Entrega:</span>
            <div style="font-weight: 600; color: #333;">${new Date(pedido.fecha_entrega).toLocaleDateString('es-AR')}</div>
          </div>
          <div>
            <span style="color: #999;">Creado:</span>
            <div style="font-weight: 600; color: #333;">${new Date(pedido.createdAt).toLocaleDateString('es-AR')}</div>
          </div>
        </div>
      </div>

      <!-- ANOTACIONES -->
      ${pedido.anotacion ? `
        <div style="background: #f0f8ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #1976d2;">📝 Anotaciones</h3>
          <p style="margin: 0; font-size: 13px; color: #333; line-height: 1.6;">${pedido.anotacion}</p>
        </div>
      ` : ''}

      <!-- PRODUCTOS -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #7f1f6e;">Productos (${pedido.productos?.length || 0})</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${(pedido.productos || []).map(p => `
            <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; border-left: 4px solid #7f1f6e;">
              <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
                ${p.nombre} <span style="color: #999; font-weight: normal; font-size: 12px;">x${p.cantidad}</span>
              </div>
              ${p.variantes && p.variantes.length > 0 ? `
                <div style="font-size: 12px; color: #666;">
                  ${p.variantes.map(v => `<span style="display: inline-block; background: #e8e8e8; padding: 2px 8px; border-radius: 4px; margin-right: 4px;">${v.nombre}: ${v.valor}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- BOTONES -->
      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
        <button onclick="cerrarModalDetallesPedido()" class="btn btn-secondary">Cerrar</button>
        <a href="../admin/dashboard.html?page=ordenes&id=${pedido.id}" class="btn btn-primary" style="text-decoration: none; display: inline-block;">
          Ver Detalles Completos
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function cerrarModalDetallesPedido() {
  const modal = document.getElementById('modalDetallesPedido');
  if (modal) modal.remove();
}
