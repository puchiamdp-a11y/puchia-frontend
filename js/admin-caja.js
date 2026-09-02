// ==================== SISTEMA DE CAJA ====================

// Estado global
let cajaState = {
  transacciones: [],
  categorias: [],
  currentPage: 1,
  itemsPerPage: 20,
  filters: {
    tipo: null,
    categoria_id: null,
    fecha_desde: null,
    fecha_hasta: null
  },
  sortBy: 'fecha_transaccion',
  sortOrder: 'DESC',
  modalTransaccionEditando: null,
  modalCategoriaEditando: null
};

// ==================== INICIALIZACIÓN ====================
let cajaCargada = false;

function initCaja() {
  console.log('🔄 Inicializando módulo de Caja...');

  // Evitar inicialización múltiple
  if (cajaCargada) {
    console.log('✅ Caja ya fue inicializada');
    return;
  }

  cajaCargada = true;

  // Cargar categorías y transacciones
  loadCajaData();

  // Configurar event listeners
  setupCajaEventListeners();
}

function setupCajaEventListeners() {
  // Se configurarán cuando se agreguen elementos al DOM
  console.log('📋 Event listeners de Caja preparados');
}

// ==================== CARGAR DATOS ====================
async function loadCajaData() {
  try {
    // Cargar categorías
    await loadCajaCategorias();

    // Cargar transacciones
    await loadCajaTransacciones();

    // Renderizar interfaz
    renderCajaInterface();
  } catch (error) {
    console.error('❌ Error cargando datos de Caja:', error);
  }
}

async function loadCajaCategorias() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/categorias`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      }
    });

    if (!response.ok) throw new Error('Error al cargar categorías');

    const data = await response.json();
    cajaState.categorias = data.data || [];
    console.log(`✅ ${cajaState.categorias.length} categorías cargadas`);
  } catch (error) {
    console.error('❌ Error cargando categorías:', error);
  }
}

async function loadCajaTransacciones(page = 1) {
  try {
    // Construir query parameters
    const params = new URLSearchParams({
      pagina: page,
      limite: cajaState.itemsPerPage
    });

    if (cajaState.filters.tipo) params.append('tipo', cajaState.filters.tipo);
    if (cajaState.filters.categoria_id) params.append('categoria_id', cajaState.filters.categoria_id);
    if (cajaState.filters.fecha_desde) params.append('fecha_desde', cajaState.filters.fecha_desde);
    if (cajaState.filters.fecha_hasta) params.append('fecha_hasta', cajaState.filters.fecha_hasta);

    const response = await fetch(`${API_BASE_URL}/admin/caja/transacciones?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      }
    });

    if (!response.ok) throw new Error('Error al cargar transacciones');

    const data = await response.json();
    cajaState.transacciones = data.data || [];
    cajaState.currentPage = page;

    console.log(`✅ ${cajaState.transacciones.length} transacciones cargadas (página ${page})`);
  } catch (error) {
    console.error('❌ Error cargando transacciones:', error);
  }
}

// ==================== RENDERIZAR INTERFAZ ====================
function renderCajaInterface() {
  const cajaPage = document.getElementById('caja-page');
  if (!cajaPage) return;

  cajaPage.innerHTML = `
    <h1 class="page-title">💰 Caja</h1>

    <!-- RESUMEN DEL DÍA -->
    <div class="stats-grid" style="margin-bottom: 32px;">
      <div class="stat-card">
        <div class="stat-label">Ingresos</div>
        <div class="stat-value" style="color: #4caf50;" id="cajaIngresos">$0.00</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Egresos</div>
        <div class="stat-value" style="color: #f44336;" id="cajaEgresos">$0.00</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Saldo Neto</div>
        <div class="stat-value" id="cajaSaldoNeto">$0.00</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">💵 Efectivo</div>
        <div class="stat-value" id="cajaEfectivo">$0.00</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">💳 Mercado Pago</div>
        <div class="stat-value" id="cajaMercadoPago">$0.00</div>
      </div>
    </div>

    <!-- TABS -->
    <div style="display: flex; gap: 16px; margin-bottom: 24px; border-bottom: 2px solid #eee;">
      <button class="tab-btn tab-active" onclick="switchCajaTab('transacciones')">📋 Transacciones</button>
      <button class="tab-btn" onclick="switchCajaTab('categorias')">📁 Categorías</button>
      <button class="tab-btn" onclick="switchCajaTab('reportes')">📊 Reportes</button>
    </div>

    <!-- TAB: TRANSACCIONES -->
    <div id="tab-transacciones" class="tab-content">
      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="abrirModalNuevaTransaccion()">➕ Nueva Transacción</button>
        <button class="btn btn-secondary" onclick="reconciliarOrdenesManual()">🔄 Sincronizar Órdenes</button>
      </div>

      <!-- FILTROS -->
      <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 12px;">
          <input type="text" id="filtroBusqueda" placeholder="Buscar por descripción o ID orden..." onkeyup="aplicarFiltrosCaja()" />
          <select id="filtroTipo" onchange="aplicarFiltrosCaja()">
            <option value="">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
          <select id="filtroCategoria" onchange="aplicarFiltrosCaja()">
            <option value="">Todas las categorías</option>
            ${cajaState.categorias.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('')}
          </select>
          <input type="date" id="filtroFechaDesde" onchange="aplicarFiltrosCaja()" />
          <input type="date" id="filtroFechaHasta" onchange="aplicarFiltrosCaja()" />
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button class="btn btn-small btn-secondary" onclick="limpiarFiltrosCaja()">🔄 Limpiar filtros</button>
        </div>
      </div>

      <!-- RESUMEN DE FILTRADO -->
      <div id="resumenFiltrado" style="background: #f0f0f0; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; display: none;">
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <div>
            <span style="font-weight: 600; color: #4caf50;">Ingresos: </span>
            <span id="resumenIngresos">$0.00</span>
          </div>
          <div>
            <span style="font-weight: 600; color: #f44336;">Egresos: </span>
            <span id="resumenEgresos">$0.00</span>
          </div>
          <div>
            <span style="font-weight: 600; color: #7f1f6e;">Neto: </span>
            <span id="resumenNeto">$0.00</span>
          </div>
          <div>
            <span style="font-weight: 600; color: #999;">Transacciones: </span>
            <span id="resumenCantidad">0</span>
          </div>
        </div>
      </div>

      <!-- TABLA -->
      <div class="table-container">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Monto (Método)</th>
              <th>Descripción</th>
              <th style="width: 150px;">Acciones</th>
            </tr>
          </thead>
          <tbody id="cajaTransaccionesTable">
            <tr>
              <td colspan="6" style="text-align: center; color: #999; padding: 20px;">Cargando transacciones...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB: CATEGORÍAS -->
    <div id="tab-categorias" class="tab-content" style="display: none;">
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <button class="btn btn-primary" onclick="abrirModalNuevaCategoria()">➕ Nueva Categoría</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;" id="cajaCategoriasGrid">
        <!-- Se llenarán dinámicamente -->
      </div>
    </div>

    <!-- TAB: REPORTES -->
    <div id="tab-reportes" class="tab-content" style="display: none;">
      <div style="display: flex; gap: 12px; margin-bottom: 24px; align-items: center;">
        <input type="month" id="reporteMes" />
        <button class="btn btn-primary" onclick="generarReporteCaja()">📊 Generar Reporte</button>
      </div>

      <!-- Botones de exportación (se mostrarán cuando se genere un reporte) -->
      <div id="botonesExportacion" style="display: none; margin-bottom: 24px; display: flex; gap: 12px;">
        <button class="btn btn-secondary" onclick="exportarReporteExcel()">📥 Descargar Excel</button>
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Imprimir</button>
      </div>

      <div id="reporteContenido" style="display: none;">
        <!-- Resumen del período -->
        <div class="stats-grid" style="margin-bottom: 32px;">
          <div class="stat-card">
            <div class="stat-label">Total Ingresos</div>
            <div class="stat-value" style="color: #4caf50;" id="reporteIngresos">$0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Egresos</div>
            <div class="stat-value" style="color: #f44336;" id="reporteEgresos">$0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Saldo del Período</div>
            <div class="stat-value" id="reporteSaldo">$0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Transacciones</div>
            <div class="stat-value" id="reporteTransacciones">0</div>
          </div>
        </div>

        <!-- Gráficos -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <div class="table-container">
            <canvas id="chartIngresosEgresos"></canvas>
          </div>
          <div class="table-container">
            <canvas id="chartDistribucion"></canvas>
          </div>
        </div>

        <!-- Tabla de desglose -->
        <div class="table-container">
          <h3 style="padding: 16px; border-bottom: 1px solid #eee; margin: 0; font-size: 14px; font-weight: 600;">Desglose por Categoría</h3>
          <div id="reporteDesglose"></div>
        </div>
      </div>

      <div id="reporteVacio" style="text-align: center; color: #999; padding: 40px;">
        Selecciona un mes y haz clic en "Generar Reporte" para ver el análisis
      </div>
    </div>
  `;

  renderCajaTransacciones();
  renderCajaCategorias();
  updateCajaResumen();

  // Establecer mes actual por defecto
  const ahora = new Date();
  const mesActual = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0');
  const mesInput = document.getElementById('reporteMes');
  if (mesInput) {
    mesInput.value = mesActual;
  }
}

// ==================== RENDERIZAR TRANSACCIONES ====================
function renderCajaTransacciones() {
  const tbody = document.getElementById('cajaTransaccionesTable');
  if (!tbody) return;

  // Calcular resumen de transacciones mostradas
  let totalIngresos = 0;
  let totalEgresos = 0;

  cajaState.transacciones.forEach(t => {
    if (t.tipo === 'ingreso') {
      totalIngresos += parseFloat(t.monto);
    } else {
      totalEgresos += parseFloat(t.monto);
    }
  });

  // Actualizar resumen dinámico
  const resumenEl = document.getElementById('resumenFiltrado');
  if (resumenEl) {
    const hayFiltros = Object.values(cajaState.filters).some(v => v);
    resumenEl.style.display = hayFiltros || cajaState.transacciones.length > 0 ? 'block' : 'none';

    if (resumenEl.style.display === 'block') {
      const neto = totalIngresos - totalEgresos;
      document.getElementById('resumenIngresos').textContent = `$${totalIngresos.toFixed(2)}`;
      document.getElementById('resumenEgresos').textContent = `$${totalEgresos.toFixed(2)}`;
      document.getElementById('resumenNeto').textContent = `$${neto.toFixed(2)}`;
      document.getElementById('resumenNeto').style.color = neto >= 0 ? '#4caf50' : '#f44336';
      document.getElementById('resumenCantidad').textContent = cajaState.transacciones.length;
    }
  }

  if (cajaState.transacciones.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999; padding: 20px;">No hay transacciones registradas</td></tr>';
    return;
  }

  tbody.innerHTML = cajaState.transacciones.map(t => `
    <tr>
      <td>${new Date(t.fecha_transaccion).toLocaleDateString('es-AR')}</td>
      <td>
        <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;
          background: ${t.tipo === 'ingreso' ? '#e6f4ea' : '#fce8e6'};
          color: ${t.tipo === 'ingreso' ? '#1a7c3a' : '#c5221f'};">
          ${t.tipo.toUpperCase()}
        </span>
      </td>
      <td>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">${t.categoria?.icono || '💰'}</span>
          <span>${t.categoria?.nombre || 'Sin categoría'}</span>
        </span>
      </td>
      <td style="text-align: right; font-weight: 600;">
        <div style="display: inline-flex; align-items: center; gap: 8px;">
          <span>${t.metodo_pago === 'mercado_pago' ? '💳' : '💵'}</span>
          <span>$${parseFloat(t.monto).toFixed(2)}</span>
        </div>
      </td>
      <td>${t.descripcion || '-'}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-small btn-secondary" onclick="editarTransaccion(${t.id})">✏️</button>
          <button class="btn btn-small btn-danger" onclick="eliminarTransaccion(${t.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ==================== RENDERIZAR CATEGORÍAS ====================
function renderCajaCategorias() {
  const grid = document.getElementById('cajaCategoriasGrid');
  if (!grid) return;

  grid.innerHTML = cajaState.categorias.map(cat => `
    <div style="background: white; border: 1px solid #eee; border-radius: 8px; padding: 16px;">
      <div style="font-size: 24px; margin-bottom: 8px;">${cat.icono}</div>
      <div style="font-weight: 600; margin-bottom: 4px;">${cat.nombre}</div>
      <div style="font-size: 12px; color: #999; margin-bottom: 12px;">
        <span style="padding: 2px 8px; background: #f0f0f0; border-radius: 4px;">
          ${cat.tipo.toUpperCase()}
        </span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-small btn-secondary" onclick="editarCategoria(${cat.id})">✏️</button>
        <button class="btn btn-small btn-danger" onclick="eliminarCategoria(${cat.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ==================== ACTUALIZAR RESUMEN ====================
function updateCajaResumen() {
  // Calcular totales del día (si es necesario filtrar por hoy)
  const hoy = new Date().toISOString().split('T')[0];

  let totalIngresos = 0;
  let totalEgresos = 0;
  let totalEfectivo = 0;
  let totalMercadoPago = 0;

  cajaState.transacciones.forEach(t => {
    const fecha = new Date(t.fecha_transaccion).toISOString().split('T')[0];
    if (fecha === hoy) {
      if (t.tipo === 'ingreso') {
        totalIngresos += parseFloat(t.monto);
      } else {
        totalEgresos += parseFloat(t.monto);
      }

      // Sumar por método de pago
      if (t.metodo_pago === 'mercado_pago') {
        totalMercadoPago += parseFloat(t.monto);
      } else {
        totalEfectivo += parseFloat(t.monto);
      }
    }
  });

  const saldoNeto = totalIngresos - totalEgresos;

  const ingresosEl = document.getElementById('cajaIngresos');
  const egresosEl = document.getElementById('cajaEgresos');
  const saldoEl = document.getElementById('cajaSaldoNeto');

  if (ingresosEl) ingresosEl.textContent = `$${totalIngresos.toFixed(2)}`;
  if (egresosEl) egresosEl.textContent = `$${totalEgresos.toFixed(2)}`;
  if (saldoEl) {
    saldoEl.textContent = `$${saldoNeto.toFixed(2)}`;
    saldoEl.style.color = saldoNeto >= 0 ? '#4caf50' : '#f44336';
  }

  // Actualizar detalles de métodos de pago
  const efectivoEl = document.getElementById('cajaEfectivo');
  const mercadoPagoEl = document.getElementById('cajaMercadoPago');

  if (efectivoEl) efectivoEl.textContent = `$${totalEfectivo.toFixed(2)}`;
  if (mercadoPagoEl) mercadoPagoEl.textContent = `$${totalMercadoPago.toFixed(2)}`;
}

// ==================== FUNCIONES DE TABS ====================
function switchCajaTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-btn');

  tabs.forEach(tab => tab.style.display = 'none');
  buttons.forEach(btn => btn.classList.remove('tab-active'));

  const selectedTab = document.getElementById(`tab-${tabName}`);
  const selectedBtn = event?.target;

  if (selectedTab) selectedTab.style.display = 'block';
  if (selectedBtn) selectedBtn.classList.add('tab-active');
}

// ==================== FUNCIONES DE FILTRADO ====================
function aplicarFiltrosCaja() {
  const tipo = document.getElementById('filtroTipo')?.value || null;
  const categoria = document.getElementById('filtroCategoria')?.value || null;
  const fechaDesde = document.getElementById('filtroFechaDesde')?.value || null;
  const fechaHasta = document.getElementById('filtroFechaHasta')?.value || null;
  const busqueda = document.getElementById('filtroBusqueda')?.value || null;

  cajaState.filters = {
    tipo: tipo || null,
    categoria_id: categoria ? parseInt(categoria) : null,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    busqueda: busqueda
  };

  // Si hay búsqueda, filtrar en cliente
  if (busqueda) {
    filtrarTransaccionesLocal(busqueda);
  } else {
    loadCajaTransacciones(1);
  }
}

function limpiarFiltrosCaja() {
  document.getElementById('filtroBusqueda').value = '';
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroCategoria').value = '';
  document.getElementById('filtroFechaDesde').value = '';
  document.getElementById('filtroFechaHasta').value = '';

  cajaState.filters = {
    tipo: null,
    categoria_id: null,
    fecha_desde: null,
    fecha_hasta: null,
    busqueda: null
  };

  loadCajaTransacciones(1);
}

function filtrarTransaccionesLocal(busqueda) {
  const termino = busqueda.toLowerCase();

  // Primero cargar todas las transacciones, luego filtrar
  const transaccionesOriginales = cajaState.transacciones;

  // Si ya tenemos las transacciones cargadas, filtrar en cliente
  const transaccionesFiltradas = transaccionesOriginales.filter(t => {
    const descripcion = (t.descripcion || '').toLowerCase();
    const ordenId = (t.orden?.id_unico || '').toLowerCase();

    return descripcion.includes(termino) || ordenId.includes(termino);
  });

  // Tempor almacenar para renderizar
  const transaccionesBackup = cajaState.transacciones;
  cajaState.transacciones = transaccionesFiltradas;
  renderCajaTransacciones();
  cajaState.transacciones = transaccionesBackup;
}

// ==================== MODALES - TRANSACCIONES ====================

function abrirModalNuevaTransaccion() {
  cajaState.modalTransaccionEditando = null;

  const modal = document.getElementById('modalTransaccionCaja');
  const titulo = document.getElementById('modalTransaccionTitulo');
  const form = document.getElementById('formTransaccionCaja');
  const btnSubmit = document.getElementById('btnSubmitTransaccion');

  titulo.textContent = '➕ Nueva Transacción';
  btnSubmit.textContent = 'Registrar';
  form.reset();

  // Llenar selector de categorías
  const selectCategoria = document.getElementById('inputCategoriaTransaccion');
  selectCategoria.innerHTML = '<option value="">Seleccionar categoría...</option>' +
    cajaState.categorias.map(cat => `<option value="${cat.id}" data-tipo="${cat.tipo}">${cat.icono} ${cat.nombre}</option>`).join('');

  // Setear método de pago por defecto
  document.getElementById('inputMetodoPagoTransaccion').value = 'efectivo';

  // Setear fecha actual por defecto
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('inputFechaTransaccion').value = hoy;

  // Limpiar indicador de tipo
  document.getElementById('tipoDetectadoIndicador').textContent = '';
  document.getElementById('tipoDetectadoIndicador').style.display = 'none';

  // Agregar listeners para actualizar tipo detectado
  document.getElementById('inputMontoTransaccion').addEventListener('input', actualizarTipoDetectado);
  document.getElementById('inputCategoriaTransaccion').addEventListener('change', actualizarTipoDetectado);

  modal.classList.add('show');
}

function cerrarModalTransaccionCaja() {
  const modal = document.getElementById('modalTransaccionCaja');
  modal.classList.remove('show');
  document.getElementById('formTransaccionCaja').reset();
  document.getElementById('tipoDetectadoIndicador').textContent = '';
  document.getElementById('tipoDetectadoIndicador').style.display = 'none';
  cajaState.modalTransaccionEditando = null;
}

function actualizarTipoDetectado() {
  const monto = parseFloat(document.getElementById('inputMontoTransaccion').value) || 0;
  const selectCategoria = document.getElementById('inputCategoriaTransaccion');
  const categoriaId = selectCategoria.value;
  const indicador = document.getElementById('tipoDetectadoIndicador');

  if (!categoriaId || monto === 0) {
    indicador.textContent = '';
    indicador.style.display = 'none';
    return;
  }

  const categoria = cajaState.categorias.find(c => c.id === parseInt(categoriaId));
  if (!categoria) {
    indicador.textContent = '';
    indicador.style.display = 'none';
    return;
  }

  // Detectar tipo según el monto
  const tipoDetectado = monto > 0 ? 'ingreso' : monto < 0 ? 'egreso' : '';

  // Validar que el tipo detectado coincida con la categoría
  let validacion = '';
  let color = '';

  if (!tipoDetectado) {
    validacion = '';
    color = '';
    indicador.style.display = 'none';
  } else if (tipoDetectado === categoria.tipo) {
    validacion = `✅ ${tipoDetectado.toUpperCase()}`;
    color = tipoDetectado === 'ingreso' ? '#4caf50' : '#f44336';
    indicador.style.display = 'block';
  } else {
    validacion = `❌ Monto ${tipoDetectado} con categoría ${categoria.tipo}`;
    color = '#ff9800';
    indicador.style.display = 'block';
  }

  indicador.textContent = validacion;
  indicador.style.color = color;
}

async function editarTransaccion(id) {
  const transaccion = cajaState.transacciones.find(t => t.id === id);
  if (!transaccion) return;

  cajaState.modalTransaccionEditando = id;

  const modal = document.getElementById('modalTransaccionCaja');
  const titulo = document.getElementById('modalTransaccionTitulo');
  const form = document.getElementById('formTransaccionCaja');
  const btnSubmit = document.getElementById('btnSubmitTransaccion');

  titulo.textContent = '✏️ Editar Transacción';
  btnSubmit.textContent = 'Actualizar';

  // Rellenar formulario
  const montoEditado = transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto;
  document.getElementById('inputMontoTransaccion').value = montoEditado;
  document.getElementById('inputDescripcionTransaccion').value = transaccion.descripcion || '';
  document.getElementById('inputFechaTransaccion').value = new Date(transaccion.fecha_transaccion).toISOString().split('T')[0];
  document.getElementById('inputMetodoPagoTransaccion').value = transaccion.metodo_pago || 'efectivo';

  // Llenar selector de categorías
  const selectCategoria = document.getElementById('inputCategoriaTransaccion');
  selectCategoria.innerHTML = '<option value="">Seleccionar categoría...</option>' +
    cajaState.categorias.map(cat => `<option value="${cat.id}" data-tipo="${cat.tipo}">${cat.icono} ${cat.nombre}</option>`).join('');

  // Esperar a que se carguen las categorías
  setTimeout(() => {
    document.getElementById('inputCategoriaTransaccion').value = transaccion.categoria_id;
    actualizarTipoDetectado();
  }, 100);

  // Agregar listeners para actualizar tipo detectado
  document.getElementById('inputMontoTransaccion').removeEventListener('input', actualizarTipoDetectado);
  document.getElementById('inputCategoriaTransaccion').removeEventListener('change', actualizarTipoDetectado);
  document.getElementById('inputMontoTransaccion').addEventListener('input', actualizarTipoDetectado);
  document.getElementById('inputCategoriaTransaccion').addEventListener('change', actualizarTipoDetectado);

  modal.classList.add('show');
}

async function eliminarTransaccion(id) {
  if (!confirm('¿Eliminar esta transacción? Esta acción no se puede deshacer.')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/transacciones/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error || 'No se pudo eliminar la transacción'}`);
      return;
    }

    console.log('✅ Transacción eliminada');
    await loadCajaTransacciones();
    renderCajaTransacciones();
    updateCajaResumen();
  } catch (error) {
    console.error('❌ Error eliminando transacción:', error);
    alert('Error al eliminar la transacción');
  }
}

async function submitTransaccionCaja(event) {
  event.preventDefault();

  const categoria_id = parseInt(document.getElementById('inputCategoriaTransaccion').value);
  const monto = parseFloat(document.getElementById('inputMontoTransaccion').value);
  const metodo_pago = document.getElementById('inputMetodoPagoTransaccion').value;
  const descripcion = document.getElementById('inputDescripcionTransaccion').value || null;
  const fecha_transaccion = document.getElementById('inputFechaTransaccion').value;

  // Validar
  if (!categoria_id || monto === 0 || !metodo_pago) {
    alert('Por favor completa los campos requeridos');
    return;
  }

  if (monto === 0) {
    alert('El monto no puede ser 0');
    return;
  }

  // Validar que el tipo detectado coincida con la categoría
  const categoria = cajaState.categorias.find(c => c.id === categoria_id);
  if (categoria) {
    const tipoDetectado = monto > 0 ? 'ingreso' : 'egreso';
    if (tipoDetectado !== categoria.tipo) {
      alert(`El monto debe ser ${categoria.tipo === 'ingreso' ? 'positivo' : 'negativo'} para esta categoría`);
      return;
    }
  }

  try {
    const method = cajaState.modalTransaccionEditando ? 'PUT' : 'POST';
    const url = cajaState.modalTransaccionEditando
      ? `${API_BASE_URL}/admin/caja/transacciones/${cajaState.modalTransaccionEditando}`
      : `${API_BASE_URL}/admin/caja/transacciones`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categoria_id,
        monto,
        metodo_pago,
        descripcion,
        fecha_transaccion
      })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error || 'No se pudo guardar la transacción'}`);
      return;
    }

    console.log('✅ Transacción guardada');
    cerrarModalTransaccionCaja();

    await loadCajaTransacciones();
    renderCajaTransacciones();
    updateCajaResumen();
  } catch (error) {
    console.error('❌ Error guardando transacción:', error);
    alert('Error al guardar la transacción');
  }
}

// ==================== MODALES - CATEGORÍAS ====================

function abrirModalNuevaCategoria() {
  cajaState.modalCategoriaEditando = null;

  const modal = document.getElementById('modalCategoriaCaja');
  const titulo = document.getElementById('modalCategoriaTitulo');
  const form = document.getElementById('formCategoriaCaja');
  const btnSubmit = document.getElementById('btnSubmitCategoria');

  titulo.textContent = '➕ Nueva Categoría';
  btnSubmit.textContent = 'Crear';

  // Reset form
  form.reset();

  // Valores por defecto DESPUÉS del reset
  setTimeout(() => {
    document.getElementById('inputIconoCategoria').value = '💰';
    document.getElementById('inputColorCategoria').value = '#7f1f6e';
  }, 10);

  modal.classList.add('show');
}

function cerrarModalCategoriaCaja() {
  const modal = document.getElementById('modalCategoriaCaja');
  modal.classList.remove('show');
  document.getElementById('formCategoriaCaja').reset();
  cajaState.modalCategoriaEditando = null;
}

async function editarCategoria(id) {
  const categoria = cajaState.categorias.find(c => c.id === id);
  if (!categoria) return;

  cajaState.modalCategoriaEditando = id;

  const modal = document.getElementById('modalCategoriaCaja');
  const titulo = document.getElementById('modalCategoriaTitulo');
  const form = document.getElementById('formCategoriaCaja');
  const btnSubmit = document.getElementById('btnSubmitCategoria');

  titulo.textContent = '✏️ Editar Categoría';
  btnSubmit.textContent = 'Actualizar';

  // Rellenar formulario
  document.getElementById('inputNombreCategoria').value = categoria.nombre;
  document.getElementById('inputTipoCategoria').value = categoria.tipo;
  document.getElementById('inputDescripcionCategoria').value = categoria.descripcion || '';
  document.getElementById('inputIconoCategoria').value = categoria.icono;
  document.getElementById('inputColorCategoria').value = categoria.color;

  modal.classList.add('show');
}

async function eliminarCategoria(id) {
  if (!confirm('¿Eliminar esta categoría? Las transacciones asociadas no se eliminarán.')) return;

  try {
    // Por ahora usar actualizar para desactivar (soft delete)
    const response = await fetch(`${API_BASE_URL}/admin/caja/categorias/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activa: false })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error || 'No se pudo eliminar la categoría'}`);
      return;
    }

    console.log('✅ Categoría eliminada');
    await loadCajaCategorias();
    renderCajaCategorias();
  } catch (error) {
    console.error('❌ Error eliminando categoría:', error);
    alert('Error al eliminar la categoría');
  }
}

async function submitCategoriaCaja(event) {
  event.preventDefault();

  const nombre = document.getElementById('inputNombreCategoria').value;
  const tipo = document.getElementById('inputTipoCategoria').value;
  const descripcion = document.getElementById('inputDescripcionCategoria').value || null;
  const icono = document.getElementById('inputIconoCategoria').value || '💰';
  const color = document.getElementById('inputColorCategoria').value || '#7f1f6e';

  // Validar
  if (!nombre || !tipo) {
    alert('Por favor completa los campos requeridos');
    return;
  }

  try {
    const method = cajaState.modalCategoriaEditando ? 'PUT' : 'POST';
    const url = cajaState.modalCategoriaEditando
      ? `${API_BASE_URL}/admin/caja/categorias/${cajaState.modalCategoriaEditando}`
      : `${API_BASE_URL}/admin/caja/categorias`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre,
        tipo,
        descripcion,
        icono,
        color
      })
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error || 'No se pudo guardar la categoría'}`);
      return;
    }

    console.log('✅ Categoría guardada');
    cerrarModalCategoriaCaja();

    await loadCajaCategorias();
    renderCajaCategorias();
  } catch (error) {
    console.error('❌ Error guardando categoría:', error);
    alert('Error al guardar la categoría');
  }
}

async function generarReporteCaja() {
  const mesInput = document.getElementById('reporteMes').value;

  if (!mesInput) {
    alert('Por favor selecciona un mes');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/reportes/mensual?mes=${mesInput}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al cargar el reporte');
    }

    const data = await response.json();
    const reporte = data.data;

    // Actualizar totales
    document.getElementById('reporteIngresos').textContent = `$${reporte.ingresos.total.toFixed(2)}`;
    document.getElementById('reporteEgresos').textContent = `$${reporte.egresos.total.toFixed(2)}`;

    const saldoEl = document.getElementById('reporteSaldo');
    saldoEl.textContent = `$${reporte.saldo_neto.toFixed(2)}`;
    saldoEl.style.color = reporte.saldo_neto >= 0 ? '#4caf50' : '#f44336';

    document.getElementById('reporteTransacciones').textContent = reporte.cantidad_transacciones;

    // Generar gráficos
    generarGraficos(reporte);

    // Generar tabla de desglose
    generarDesgloseReporte(reporte);

    // Mostrar contenido
    document.getElementById('reporteContenido').style.display = 'block';
    document.getElementById('reporteVacio').style.display = 'none';
    document.getElementById('botonesExportacion').style.display = 'flex';

    console.log('✅ Reporte generado');
  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    alert('Error al generar el reporte');
  }
}

function generarGraficos(reporte) {
  // Gráfico 1: Ingresos vs Egresos (Dona)
  const ctx1 = document.getElementById('chartIngresosEgresos')?.getContext('2d');
  if (ctx1) {
    if (window.chartIngresosEgresos) {
      window.chartIngresosEgresos.destroy();
    }

    window.chartIngresosEgresos = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: ['Ingresos', 'Egresos'],
        datasets: [{
          data: [reporte.ingresos.total, reporte.egresos.total],
          backgroundColor: ['#4caf50', '#f44336'],
          borderColor: ['#2e7d32', '#c62828'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `$${context.parsed.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }

  // Gráfico 2: Distribución (Barras horizontales)
  const allCategorias = [
    ...reporte.ingresos.por_categoria,
    ...reporte.egresos.por_categoria
  ];

  const ctx2 = document.getElementById('chartDistribucion')?.getContext('2d');
  if (ctx2) {
    if (window.chartDistribucion) {
      window.chartDistribucion.destroy();
    }

    // Obtener categorías desde el estado global
    const categoriasMap = {};
    cajaState.categorias.forEach(cat => {
      categoriasMap[cat.nombre] = cat;
    });

    const labels = allCategorias.map(c => c.categoria);
    const montos = allCategorias.map(c => c.monto);
    const colores = allCategorias.map(c => {
      const cat = categoriasMap[c.categoria];
      return cat?.color || '#7f1f6e';
    });

    window.chartDistribucion = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Monto ($)',
          data: montos,
          backgroundColor: colores,
          borderColor: colores,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `$${context.parsed.x.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toFixed(0);
              }
            }
          }
        }
      }
    });
  }
}

function generarDesgloseReporte(reporte) {
  const desgloseDiv = document.getElementById('reporteDesglose');

  // Obtener categorías desde el estado global
  const categoriasMap = {};
  cajaState.categorias.forEach(cat => {
    categoriasMap[cat.nombre] = cat;
  });

  let html = '<table style="width: 100;">';
  html += '<thead><tr style="background: #f5f6fa;"><th style="padding: 12px 16px; text-align: left; font-weight: 600; font-size: 12px; color: #2c3e50; text-transform: uppercase;">Categoría</th>';
  html += '<th style="padding: 12px 16px; text-align: right; font-weight: 600; font-size: 12px; color: #2c3e50; text-transform: uppercase;">Ingresos</th>';
  html += '<th style="padding: 12px 16px; text-align: right; font-weight: 600; font-size: 12px; color: #2c3e50; text-transform: uppercase;">Egresos</th>';
  html += '<th style="padding: 12px 16px; text-align: right; font-weight: 600; font-size: 12px; color: #2c3e50; text-transform: uppercase;">Neto</th></tr></thead>';
  html += '<tbody>';

  // Obtener todas las categorías únicas
  const allCategoryNames = new Set([
    ...reporte.ingresos.por_categoria.map(c => c.categoria),
    ...reporte.egresos.por_categoria.map(c => c.categoria)
  ]);

  allCategoryNames.forEach(nombre => {
    const ingreso = reporte.ingresos.por_categoria.find(c => c.categoria === nombre);
    const egreso = reporte.egresos.por_categoria.find(c => c.categoria === nombre);

    const montoIngreso = ingreso?.monto || 0;
    const montoEgreso = egreso?.monto || 0;
    const neto = montoIngreso - montoEgreso;

    const cat = categoriasMap[nombre];
    const icono = cat?.icono || '💰';

    html += `<tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px 16px; font-size: 14px;">
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">${icono}</span>
          <span>${nombre}</span>
        </span>
      </td>
      <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 500; color: #4caf50;">$${montoIngreso.toFixed(2)}</td>
      <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 500; color: #f44336;">$${montoEgreso.toFixed(2)}</td>
      <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 600; color: ${neto >= 0 ? '#4caf50' : '#f44336'};">$${neto.toFixed(2)}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  desgloseDiv.innerHTML = html;
}

// ==================== RECONCILIACIÓN DE ÓRDENES ====================

async function reconciliarOrdenesManual() {
  if (!confirm('¿Sincronizar órdenes entregadas sin registrar en caja?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/reconciliar-ordenes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      alert(`Error: ${error.error || 'No se pudo reconciliar'}`);
      return;
    }

    const data = await response.json();
    const resultado = data.data;

    // Mostrar resultado
    const mensaje = `✅ Reconciliación completada\n\n` +
      `Órdenes procesadas: ${resultado.ordenes_procesadas}\n` +
      `Órdenes registradas: ${resultado.ordenes_registradas}\n` +
      `Monto total: $${resultado.total_monto.toFixed(2)}`;

    alert(mensaje);

    // Recargar transacciones
    await loadCajaTransacciones();
    renderCajaTransacciones();
    updateCajaResumen();

    console.log('✅ Reconciliación completada:', resultado);
  } catch (error) {
    console.error('❌ Error reconciliando órdenes:', error);
    alert('Error al sincronizar órdenes');
  }
}

// ==================== EXPORTAR A EXCEL ====================

async function exportarReporteExcel() {
  const mesInput = document.getElementById('reporteMes').value;

  if (!mesInput) {
    alert('Por favor selecciona un mes');
    return;
  }

  try {
    // Obtener datos de exportación
    const [mes, año] = mesInput.split('-');
    const fecha_desde = `${año}-${mes}-01`;
    const fecha_hasta = new Date(año, mes, 0).toISOString().split('T')[0];

    const response = await fetch(`${API_BASE_URL}/admin/caja/reportes/datos?fecha_desde=${fecha_desde}&fecha_hasta=${fecha_hasta}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener datos de exportación');
    }

    const data = await response.json();
    const transacciones = data.data || [];

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja 1: Transacciones
    const wsTransacciones = XLSX.utils.json_to_sheet(transacciones);
    XLSX.utils.book_append_sheet(wb, wsTransacciones, 'Transacciones');

    // Hoja 2: Resumen (si es necesario, se puede agregar)
    const resumen = [
      { Label: 'Período', Valor: mesInput },
      { Label: 'Total Transacciones', Valor: transacciones.length },
      { Label: 'Ingresos', Valor: transacciones.filter(t => t.Tipo === 'Ingreso').reduce((sum, t) => sum + parseFloat(t.Monto || 0), 0).toFixed(2) },
      { Label: 'Egresos', Valor: transacciones.filter(t => t.Tipo === 'Egreso').reduce((sum, t) => sum + parseFloat(t.Monto || 0), 0).toFixed(2) }
    ];
    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Descargar archivo
    XLSX.writeFile(wb, `Reporte_Caja_${mesInput}.xlsx`);

    console.log('✅ Archivo exportado');
  } catch (error) {
    console.error('❌ Error exportando reporte:', error);
    alert('Error al exportar el reporte');
  }
}

// ==================== INICIALIZAR CUANDO EL DOCUMENTO ESTÉ LISTO ====================
document.addEventListener('DOMContentLoaded', () => {
  const cajaPage = document.getElementById('caja-page');
  if (cajaPage) {
    // Esperar a que admin.js haya cargado
    if (typeof monitorPageChange === 'function') {
      console.log('✅ Módulo de Caja disponible');
    }
  }
});

// Monitorear cambios de página
function monitorCajaPageChange() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (sidebar) {
    const cajaLink = Array.from(sidebar.querySelectorAll('a')).find(a => a.dataset.page === 'caja');
    if (cajaLink) {
      cajaLink.addEventListener('click', () => {
        setTimeout(() => {
          const cajaPage = document.getElementById('caja-page');
          if (cajaPage && cajaPage.style.display !== 'none') {
            initCaja();
          }
        }, 100);
      });
    }
  }
}

// Reset caja cuando el usuario cierra sesión
function resetCaja() {
  cajaCargada = false;
  cajaState = {
    transacciones: [],
    categorias: [],
    currentPage: 1,
    itemsPerPage: 20,
    filters: {
      tipo: null,
      categoria_id: null,
      fecha_desde: null,
      fecha_hasta: null
    },
    sortBy: 'fecha_transaccion',
    sortOrder: 'DESC',
    modalTransaccionEditando: null,
    modalCategoriaEditando: null
  };
  console.log('🔄 Caja reset para nueva sesión');
}

monitorCajaPageChange();
