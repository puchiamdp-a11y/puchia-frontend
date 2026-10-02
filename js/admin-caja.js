// ==================== SISTEMA DE CAJA ====================

// Estado global
let cajaState = {
  transacciones: [],
  categorias: [],
  currentPage: 1,
  itemsPerPage: 15,
  filters: {
    tipo: null,
    categoria_id: null,
    fecha_desde: null,
    fecha_hasta: null
  },
  tabTipo: 'todo',
  sortBy: 'fecha_transaccion',
  sortOrder: 'DESC',
  modalTransaccionEditando: null,
  modalCategoriaEditando: null,
  totalTransacciones: 0,
  totalPages: 1
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
  // Configurar emoji picker
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('emoji-btn')) {
      e.preventDefault();
      const emoji = e.target.dataset.emoji;
      document.getElementById('inputIconoCategoria').value = emoji;
      highlightSelectedEmoji(emoji);
    }
  });

  console.log('📋 Event listeners de Caja preparados');
}

function highlightSelectedEmoji(emoji) {
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    if (btn.dataset.emoji === emoji) {
      btn.style.background = '#f0e6f6';
      btn.style.border = '2px solid #7f1f6e';
    } else {
      btn.style.background = 'white';
      btn.style.border = '1px solid #ddd';
    }
  });
}

// Las categorías desactivadas (o "eliminadas" con movimientos) no se ofrecen para elegir
function cajaCategoriasActivas(incluirId = null) {
  return cajaState.categorias.filter(c => c.activa !== false || c.id === incluirId);
}

// ==================== CARGAR DATOS ====================
async function loadCajaData() {
  try {
    // Cargar categorías
    await loadCajaCategorias();

    // Cargar transacciones
    await loadCajaTransacciones();

    // Renderizar interfaz
    await renderCajaInterface();
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
    renderCajaCategorias();
  } catch (error) {
    console.error('❌ Error cargando categorías:', error);
  }
}

// Tope de movimientos traídos por consulta. La tabla pagina/ordena/busca en pantalla sobre
// todo lo traído; si el filtro supera el tope se avisa para que el usuario acote las fechas.
const CAJA_MAX_CARGA = 5000;

async function loadCajaTransacciones(page = 1) {
  try {
    // Construir query parameters
    const params = new URLSearchParams({
      pagina: 1,
      limite: CAJA_MAX_CARGA
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
    cajaState.totalEnServidor = data.pagination?.total ?? cajaState.transacciones.length;
    cajaState.currentPage = page;

    console.log(`✅ ${cajaState.transacciones.length} transacciones cargadas (página ${page})`);
    renderCajaTransacciones();
  } catch (error) {
    console.error('❌ Error cargando transacciones:', error);
  }
}

// ==================== RENDERIZAR INTERFAZ ====================
async function renderCajaInterface() {
  const cajaPage = document.getElementById('caja-page');
  if (!cajaPage) return;

  cajaPage.innerHTML = `
    <h1 class="page-title">💰 Caja</h1>

    <!-- TARJETAS: ingresos/egresos/saldo del mes actual; efectivo y Mercado Pago históricos. No dependen de los filtros -->
    <div class="caja-resumen-wrap">
      <div>
        <div class="caja-resumen-sub" id="cajaSubtituloMes">Mes actual</div>
        <div class="caja-resumen-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
          <div class="stat-card">
            <div class="stat-label">Ingresos</div>
            <div class="stat-value" style="color: #4caf50;" id="cajaIngresos">$0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Egresos</div>
            <div class="stat-value" style="color: #f44336;" id="cajaEgresos">$0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Saldo neto</div>
            <div class="stat-value" id="cajaSaldoNeto">$0.00</div>
          </div>
        </div>
      </div>
      <div>
        <div class="caja-resumen-sub">Histórico</div>
        <div class="caja-resumen-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
          <div class="stat-card">
            <div class="stat-label">💵 Efectivo</div>
            <div class="stat-value" id="cajaEfectivo">$0.00</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">💳 Mercado Pago</div>
            <div class="stat-value" id="cajaMercadoPago">$0.00</div>
          </div>
        </div>
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
      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: flex-start; justify-content: space-between;">
        <button class="btn btn-primary" onclick="abrirModalNuevaTransaccion()">➕ Nueva Transacción</button>
        <div style="position: relative;">
          <button class="btn btn-secondary" onclick="toggleMenuCompartirCaja(event)" aria-haspopup="true">🔗 Compartir ▾</button>
          <div id="menuCompartirCaja" style="display: none; position: absolute; top: 100%; right: 0; z-index: 50; min-width: 230px; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,.15); padding: 6px;">
            <button class="menu-compartir-item" onclick="exportarPlantillaCaja()" title="Descarga un Excel con el encabezado para completar">📥 Exportar plantilla</button>
            <button class="menu-compartir-item" onclick="importarTransaccionesCaja()" title="Carga transacciones desde el Excel completado">📤 Importar</button>
            <hr style="border: none; border-top: 1px solid #eee; margin: 4px 0;">
            <button class="menu-compartir-item" onclick="reconciliarOrdenesManual()">🔄 Sincronizar Órdenes</button>
          </div>
        </div>
      </div>

      <!-- FILTROS -->
      <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 12px;">
          <input type="text" id="filtroBusqueda" placeholder="Buscar por descripción o ID orden..." onkeyup="aplicarFiltrosCaja()" />
          <select id="filtroCategoriaCaja" onchange="aplicarFiltrosCaja()">
            <option value="">Todas las categorías</option>
            ${cajaCategoriasActivas().map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('')}
          </select>
          <input type="date" id="filtroFechaDesde" onchange="aplicarFiltrosCaja()" />
          <input type="date" id="filtroFechaHasta" onchange="aplicarFiltrosCaja()" />
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button class="btn btn-small btn-secondary" onclick="limpiarFiltrosCaja()">🔄 Limpiar filtros</button>
        </div>
      </div>

      <div id="cajaAvisoLimite" style="display: none; background: #fff3cd; border: 1px solid #ffe69c; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px;"></div>

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

      <!-- FICHERO: solapas Todo / Ingresos / Egresos -->
      <div id="cajaTipoTabs" class="orders-tabs" role="tablist"></div>
      <div id="cajaFichero" class="orders-fichero">
      <div class="table-container">
        <table style="width: 100%;">
          <thead id="cajaTransaccionesHead">
            <tr>
              <th style="cursor: pointer; user-select: none;" onclick="ordenarCaja('fecha_transaccion')">Fecha <span id="sortFecha">↕️</span></th>
              <th style="cursor: pointer; user-select: none;" onclick="ordenarCaja('tipo')">Tipo <span id="sortTipo">↕️</span></th>
              <th style="cursor: pointer; user-select: none;" onclick="ordenarCaja('categoria')">Categoría <span id="sortCategoria">↕️</span></th>
              <th style="cursor: pointer; user-select: none; text-align: center;" onclick="ordenarCaja('metodo_pago')">Método <span id="sortMetodo">↕️</span></th>
              <th style="cursor: pointer; user-select: none; text-align: right;" onclick="ordenarCaja('monto')">Monto <span id="sortMonto">↕️</span></th>
              <th style="cursor: pointer; user-select: none;" onclick="ordenarCaja('descripcion')">Descripción <span id="sortDescripcion">↕️</span></th>
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

      <!-- PAGINACIÓN -->
      <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
        <button class="btn btn-small btn-secondary" onclick="irPaginaCaja(cajaState.currentPage - 1)" id="btnPagAnterior">← Anterior</button>
        <div id="paginacionNumeros" style="display: flex; gap: 6px; align-items: center;">
          <!-- Se generan dinámicamente -->
        </div>
        <button class="btn btn-small btn-secondary" onclick="irPaginaCaja(cajaState.currentPage + 1)" id="btnPagSiguiente">Siguiente →</button>
        <span id="textoPaginacion" style="color: #999; font-size: 12px; margin-left: 12px;">Página 1 de 1</span>
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
      <div id="botonesExportacion" style="display: none; margin-bottom: 24px; flex-wrap: wrap;">
        <button class="btn btn-secondary" onclick="exportarReporteExcel()" style="margin-right: 12px;">📥 Descargar Excel</button>
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

  renderCajaTipoTabs();
  renderCajaTransacciones();
  renderCajaCategorias();
  await updateCajaResumen();

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

  // Ordenar transacciones
  let transaccionesOrdenadas = [...cajaState.transacciones];
  const campos = {
    'fecha_transaccion': (t) => new Date(t.fecha_transaccion),
    'tipo': (t) => t.tipo,
    'categoria': (t) => t.categoria?.nombre || '',
    'metodo_pago': (t) => t.metodo_pago || '',
    'monto': (t) => Math.abs(parseFloat(t.monto)),
    'descripcion': (t) => t.descripcion || ''
  };

  if (campos[cajaState.sortBy]) {
    transaccionesOrdenadas.sort((a, b) => {
      const valA = campos[cajaState.sortBy](a);
      const valB = campos[cajaState.sortBy](b);
      const comparacion = valA < valB ? -1 : valA > valB ? 1 : 0;
      return cajaState.sortOrder === 'ASC' ? comparacion : -comparacion;
    });
  }

  // Calcular totales y paginación
  cajaState.totalTransacciones = transaccionesOrdenadas.length;
  cajaState.totalPages = Math.ceil(cajaState.totalTransacciones / cajaState.itemsPerPage);

  if (cajaState.currentPage > cajaState.totalPages) {
    cajaState.currentPage = Math.max(1, cajaState.totalPages);
  }

  const inicio = (cajaState.currentPage - 1) * cajaState.itemsPerPage;
  const fin = inicio + cajaState.itemsPerPage;
  const transaccionesPagina = transaccionesOrdenadas.slice(inicio, fin);

  // Resumen de TODOS los movimientos del filtro (no solo los de la página visible)
  let totalIngresos = 0;
  let totalEgresos = 0;

  transaccionesOrdenadas.forEach(t => {
    if (t.tipo === 'ingreso') {
      totalIngresos += parseFloat(t.monto);
    } else {
      totalEgresos += Math.abs(parseFloat(t.monto));
    }
  });

  // Actualizar resumen dinámico
  const resumenEl = document.getElementById('resumenFiltrado');
  if (resumenEl) {
    const hayFiltros = Object.values(cajaState.filters).some(v => v);
    resumenEl.style.display = hayFiltros || cajaState.totalTransacciones > 0 ? 'block' : 'none';

    if (resumenEl.style.display === 'block') {
      const neto = totalIngresos - totalEgresos;
      document.getElementById('resumenIngresos').textContent = formatearMonto(totalIngresos);
      document.getElementById('resumenEgresos').textContent = formatearMonto(totalEgresos);
      document.getElementById('resumenNeto').textContent = formatearMonto(neto);
      document.getElementById('resumenNeto').style.color = neto >= 0 ? '#4caf50' : '#f44336';
      document.getElementById('resumenCantidad').textContent = cajaState.totalTransacciones;
    }
  }

  const avisoEl = document.getElementById('cajaAvisoLimite');
  if (avisoEl) {
    const excedido = (cajaState.totalEnServidor || 0) > cajaState.transacciones.length;
    avisoEl.style.display = excedido ? 'block' : 'none';
    if (excedido) {
      avisoEl.textContent = `⚠️ Hay ${cajaState.totalEnServidor} movimientos y se muestran los ${cajaState.transacciones.length} más recientes. Acotá las fechas para ver el resto.`;
    }
  }

  if (cajaState.totalTransacciones === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999; padding: 20px;">No hay transacciones registradas</td></tr>';
    actualizarPaginacion();
    return;
  }

  tbody.innerHTML = transaccionesPagina.map(t => `
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
      <td style="text-align: center; font-size: 20px;">
        ${t.metodo_pago === 'mercado_pago' ? '💳' : '💵'}
      </td>
      <td style="text-align: right; font-weight: 600; color: ${t.tipo === 'egreso' ? '#f44336' : '#4caf50'};">
        ${t.tipo === 'egreso' ? '-' : ''}${formatearMonto(Math.abs(parseFloat(t.monto)))}
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

  actualizarPaginacion();
}

// ==================== ORDENAMIENTO Y PAGINACIÓN ====================
function ordenarCaja(campo) {
  if (cajaState.sortBy === campo) {
    cajaState.sortOrder = cajaState.sortOrder === 'ASC' ? 'DESC' : 'ASC';
  } else {
    cajaState.sortBy = campo;
    cajaState.sortOrder = 'DESC';
  }
  cajaState.currentPage = 1;
  renderCajaTransacciones();
}

function irPaginaCaja(pagina) {
  if (pagina >= 1 && pagina <= cajaState.totalPages) {
    cajaState.currentPage = pagina;
    renderCajaTransacciones();
    document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function actualizarPaginacion() {
  const contenedorNumeros = document.getElementById('paginacionNumeros');
  const btnAnterior = document.getElementById('btnPagAnterior');
  const btnSiguiente = document.getElementById('btnPagSiguiente');
  const textoPaginacion = document.getElementById('textoPaginacion');

  if (!contenedorNumeros) return;

  // Actualizar estado de botones
  if (btnAnterior) btnAnterior.disabled = cajaState.currentPage <= 1;
  if (btnSiguiente) btnSiguiente.disabled = cajaState.currentPage >= cajaState.totalPages;

  // Generar números de página (máximo 5 visibles)
  let paginasVisibles = [];
  const totalPages = cajaState.totalPages;
  const currentPage = cajaState.currentPage;

  if (totalPages <= 5) {
    paginasVisibles = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (currentPage <= 3) {
      paginasVisibles = [1, 2, 3, 4, 5];
    } else if (currentPage >= totalPages - 2) {
      paginasVisibles = [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      paginasVisibles = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
    }
  }

  contenedorNumeros.innerHTML = paginasVisibles.map(p => `
    <button
      class="btn btn-small ${p === currentPage ? 'btn-primary' : 'btn-secondary'}"
      onclick="irPaginaCaja(${p})"
      style="${p === currentPage ? 'font-weight: bold;' : ''}"
    >${p}</button>
  `).join('');

  if (textoPaginacion) {
    textoPaginacion.textContent = `Página ${currentPage} de ${totalPages}`;
  }

  // Actualizar indicadores de ordenamiento
  const campos = ['fecha_transaccion', 'tipo', 'categoria', 'metodo_pago', 'monto', 'descripcion'];
  campos.forEach(campo => {
    const idMap = {
      'fecha_transaccion': 'sortFecha',
      'tipo': 'sortTipo',
      'categoria': 'sortCategoria',
      'metodo_pago': 'sortMetodo',
      'monto': 'sortMonto',
      'descripcion': 'sortDescripcion'
    };
    const span = document.getElementById(idMap[campo]);
    if (span) {
      if (cajaState.sortBy === campo) {
        span.textContent = cajaState.sortOrder === 'ASC' ? '⬆️' : '⬇️';
      } else {
        span.textContent = '↕️';
      }
    }
  });
}

// ==================== RENDERIZAR CATEGORÍAS ====================
function actualizarSelectorFiltroCategoriaCaja() {
  const select = document.getElementById('filtroCategoriaCaja');
  if (!select) return;
  const seleccionada = select.value;
  select.innerHTML = '<option value="">Todas las categorías</option>' +
    cajaCategoriasActivas(parseInt(seleccionada) || null).map(cat => `<option value="${cat.id}">${cajaEscape(cat.nombre)}</option>`).join('');
  select.value = seleccionada;
}

function renderCajaCategorias() {
  actualizarSelectorFiltroCategoriaCaja();
  const grid = document.getElementById('cajaCategoriasGrid');
  if (!grid) return;

  grid.innerHTML = cajaState.categorias.map(cat => `
    <div style="background: ${cat.activa === false ? '#f7f7f7' : 'white'}; ${cat.activa === false ? 'opacity: 0.7;' : ''} border: 1px solid #eee; border-left: 4px solid ${cat.color || '#7f1f6e'}; border-radius: 8px; padding: 16px; transition: all 0.2s;">
      <div style="font-size: 24px; margin-bottom: 8px;">${cat.icono}</div>
      <div style="font-weight: 600; margin-bottom: 4px;">${cat.nombre}</div>
      <div style="font-size: 12px; color: #999; margin-bottom: 12px;">
        <span style="padding: 2px 8px; background: ${cat.color || '#7f1f6e'}20; border-radius: 4px; color: ${cat.color || '#7f1f6e'};">
          ${cat.tipo.toUpperCase()}
        </span>
        ${cat.activa === false ? '<span style="margin-left: 6px; padding: 2px 8px; background: #e0e0e0; border-radius: 4px; color: #555;">INACTIVA</span>' : ''}
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-small btn-secondary" onclick="editarCategoriaCaja(${cat.id})">✏️</button>
        ${cat.activa === false
          ? `<button class="btn btn-small btn-secondary" onclick="reactivarCategoriaCaja(${cat.id})" title="Volver a usar esta categoría">♻️ Reactivar</button>`
          : `<button class="btn btn-small btn-danger" onclick="eliminarCategoriaCaja(${cat.id})">🗑️</button>`}
      </div>
    </div>
  `).join('');
}

// ==================== FORMATO DE MONTOS ====================
function formatearMonto(monto) {
  const num = parseFloat(monto);
  const partes = num.toFixed(2).split('.');
  const enteros = partes[0];
  const decimales = partes[1];

  // Agregar separador de miles
  const enterosFormato = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `$${enterosFormato},${decimales}`;
}

// ==================== ACTUALIZAR RESUMEN ====================
// Tarjetas: ingresos, egresos y saldo son del MES ACTUAL; efectivo y Mercado Pago son HISTÓRICOS.
// Ninguna depende de los filtros de la tabla (el resumen gris de la tabla es el que sigue a los filtros).
async function updateCajaResumen() {
  const ahora = new Date();

  try {
    const { mes: delMes, historico } = await cargarResumenCaja();
    const saldoNeto = delMes.ingresos - delMes.egresos;

    const ingresosEl = document.getElementById('cajaIngresos');
    const egresosEl = document.getElementById('cajaEgresos');
    const saldoEl = document.getElementById('cajaSaldoNeto');

    if (ingresosEl) ingresosEl.textContent = formatearMonto(delMes.ingresos);
    if (egresosEl) egresosEl.textContent = formatearMonto(delMes.egresos);
    if (saldoEl) {
      saldoEl.textContent = formatearMonto(saldoNeto);
      saldoEl.style.color = saldoNeto >= 0 ? '#4caf50' : '#f44336';
    }

    const efectivoEl = document.getElementById('cajaEfectivo');
    const mercadoPagoEl = document.getElementById('cajaMercadoPago');
    if (efectivoEl) efectivoEl.textContent = formatearMonto(historico.efectivo);
    if (mercadoPagoEl) mercadoPagoEl.textContent = formatearMonto(historico.mercado_pago);

    const subMesEl = document.getElementById('cajaSubtituloMes');
    if (subMesEl) {
      const mes = ahora.toLocaleDateString('es-AR', { month: 'long' });
      subMesEl.textContent = mes.charAt(0).toUpperCase() + mes.slice(1);
    }
  } catch (error) {
    console.error('❌ Error cargando resumen de caja:', error);
  }
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
  const tipo = cajaState.tabTipo === 'ingreso' || cajaState.tabTipo === 'egreso' ? cajaState.tabTipo : null;
  const categoria = document.getElementById('filtroCategoriaCaja')?.value || null;
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
  document.getElementById('filtroCategoriaCaja').value = '';
  document.getElementById('filtroFechaDesde').value = '';
  document.getElementById('filtroFechaHasta').value = '';

  cajaState.filters = {
    tipo: cajaState.tabTipo === 'ingreso' || cajaState.tabTipo === 'egreso' ? cajaState.tabTipo : null,
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
    cajaCategoriasActivas().map(cat => `<option value="${cat.id}" data-tipo="${cat.tipo}" data-color="${cat.color}">${cat.icono} ■ ${cat.nombre}</option>`).join('');

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

  // El tipo viene de la categoría, no del monto
  const tipo = categoria.tipo;
  let validacion = '';
  let color = '';

  if (monto <= 0) {
    validacion = `❌ El monto debe ser positivo`;
    color = '#f44336';
    indicador.style.display = 'block';
  } else {
    // Mostrar el tipo que se registrará según la categoría
    const original = cajaState.modalTransaccionEditando
      ? cajaState.transacciones.find(t => t.id === cajaState.modalTransaccionEditando)
      : null;
    validacion = original && original.tipo !== tipo
      ? `🔄 Este movimiento pasará de ${original.tipo.toUpperCase()} a ${tipo.toUpperCase()}`
      : `✅ Se registrará como ${tipo.toUpperCase()}`;
    color = tipo === 'ingreso' ? '#4caf50' : '#f44336';
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
    cajaCategoriasActivas(transaccion.categoria_id).map(cat => `<option value="${cat.id}" data-tipo="${cat.tipo}" data-color="${cat.color}">${cat.icono} ■ ${cat.nombre}</option>`).join('');

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
      let mensaje = error.error || 'No se pudo eliminar la transacción';

      if (response.status === 403) {
        mensaje = 'No se pueden eliminar transacciones vinculadas a órdenes.\nEsta transacción está registrada como pago de una orden.';
      }

      alert(`Error: ${mensaje}`);
      return;
    }

    console.log('✅ Transacción eliminada');
    await loadCajaTransacciones();
    renderCajaTransacciones();
    await updateCajaResumen();
  } catch (error) {
    console.error('❌ Error eliminando transacción:', error);
    alert('Error al eliminar la transacción');
  }
}

// Evita que un doble clic envíe dos veces el mismo formulario (duplicaría el registro)
const cajaEnviando = new Set();
async function cajaEvitarDobleEnvio(clave, event, accion) {
  if (cajaEnviando.has(clave)) return;
  cajaEnviando.add(clave);
  const boton = event?.submitter;
  if (boton) boton.disabled = true;
  try {
    await accion();
  } finally {
    cajaEnviando.delete(clave);
    if (boton) boton.disabled = false;
  }
}

async function submitTransaccionCaja(event) {
  event.preventDefault();
  return cajaEvitarDobleEnvio('transaccion', event, guardarTransaccionCaja);
}

async function guardarTransaccionCaja() {

  const categoria_id = parseInt(document.getElementById('inputCategoriaTransaccion').value);
  let monto = parseFloat(document.getElementById('inputMontoTransaccion').value);
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

  // Validar que la categoría existe
  const categoria = cajaState.categorias.find(c => c.id === categoria_id);
  if (!categoria) {
    alert('Por favor selecciona una categoría válida');
    return;
  }

  // El backend se encargará de convertir el monto según el tipo de categoría
  if (monto <= 0) {
    alert('El monto debe ser un número positivo');
    return;
  }

  // Convertir números negativos a positivos
  // El backend detectará automáticamente el tipo basado en la categoría
  const montoAbsoluto = Math.abs(monto);

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
        monto: montoAbsoluto,
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
    inicializarSelectorEmojis();
    document.getElementById('inputIconoCategoria').value = '💰';
    document.getElementById('inputColorCategoria').value = '#7f1f6e';
    actualizarPreviewColor();
    highlightSelectedEmoji('💰');
  }, 10);

  modal.classList.add('show');
}

function cerrarModalCategoriaCaja() {
  const modal = document.getElementById('modalCategoriaCaja');
  modal.classList.remove('show');

  // Reset seguro: evitar valores vacíos en inputs que lo requieren
  setTimeout(() => {
    document.getElementById('formCategoriaCaja').reset();
    // Asegurar que el color siempre tenga un valor válido después del reset
    const inputColor = document.getElementById('inputColorCategoria');
    if (!inputColor.value || inputColor.value === '') {
      inputColor.value = '#7f1f6e';
    }
  }, 50);

  cajaState.modalCategoriaEditando = null;
}

async function editarCategoriaCaja(id) {
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

  setTimeout(() => {
    inicializarSelectorEmojis();
    actualizarPreviewColor();
    highlightSelectedEmoji(categoria.icono);
  }, 10);

  modal.classList.add('show');
}

async function eliminarCategoriaCaja(id) {
  const categoria = cajaState.categorias.find(c => c.id === id);
  if (!confirm(`¿Eliminar la categoría "${categoria?.nombre ?? ''}"?\n\nSi ya tiene movimientos se desactiva (no se pierde el historial); si nunca se usó, se borra.`)) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/categorias/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}` }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(`Error: ${data.error || 'No se pudo eliminar la categoría'}`);
      return;
    }

    await loadCajaCategorias();
    renderCajaCategorias();
    if (data.data?.desactivada) alert(data.message);
  } catch (error) {
    console.error('❌ Error eliminando categoría:', error);
    alert('Error al eliminar la categoría');
  }
}

async function reactivarCategoriaCaja(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/categorias/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activa: true })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      alert(`Error: ${error.error || 'No se pudo reactivar la categoría'}`);
      return;
    }

    await loadCajaCategorias();
    renderCajaCategorias();
  } catch (error) {
    console.error('❌ Error reactivando categoría:', error);
    alert('Error al reactivar la categoría');
  }
}

async function submitCategoriaCaja(event) {
  event.preventDefault();
  return cajaEvitarDobleEnvio('categoria', event, guardarCategoriaCaja);
}

async function guardarCategoriaCaja() {

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
    document.getElementById('reporteIngresos').textContent = formatearMonto(reporte.ingresos.total);
    document.getElementById('reporteEgresos').textContent = formatearMonto(reporte.egresos.total);

    const saldoEl = document.getElementById('reporteSaldo');
    saldoEl.textContent = formatearMonto(reporte.saldo_neto);
    saldoEl.style.color = reporte.saldo_neto >= 0 ? '#4caf50' : '#f44336';

    document.getElementById('reporteTransacciones').textContent = reporte.cantidad_transacciones;

    // Generar gráficos
    generarGraficos(reporte);

    // Generar tabla de desglose
    generarDesgloseReporte(reporte);

    // Mostrar contenido
    document.getElementById('reporteContenido').style.display = 'block';
    document.getElementById('reporteVacio').style.display = 'none';

    // Mostrar botones de exportación con estilos garantizados
    const botonesEl = document.getElementById('botonesExportacion');
    if (botonesEl) {
      botonesEl.style.cssText = 'display: flex !important; gap: 12px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; width: 100%;';
      console.log('✅ Botones de exportación mostrados:', {
        display: botonesEl.style.display,
        gap: botonesEl.style.gap,
        alignItems: botonesEl.style.alignItems,
        elemento: botonesEl
      });
    } else {
      console.error('❌ No se encontró elemento botonesExportacion');
    }

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
    if (window.chartIngresosEgresos && typeof window.chartIngresosEgresos.destroy === 'function') {
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
    if (window.chartDistribucion && typeof window.chartDistribucion.destroy === 'function') {
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
      <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 500; color: #4caf50;">${formatearMonto(montoIngreso)}</td>
      <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 500; color: #f44336;">${formatearMonto(montoEgreso)}</td>
      <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 600; color: ${neto >= 0 ? '#4caf50' : '#f44336'};">${formatearMonto(neto)}</td>
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
      `Monto total: ${formatearMonto(resultado.total_monto)}`;

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
    const [año, mes] = mesInput.split('-');
    const fecha_desde = `${año}-${mes}-01`;
    const fecha_hasta = new Date(parseInt(año), parseInt(mes), 0).toISOString().split('T')[0];

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

// ==================== EXPORTAR / IMPORTAR (EXCEL) ====================

const CAJA_COLUMNAS_EXCEL = ['Fecha', 'Categoría', 'Monto', 'Método de pago', 'Descripción'];
const CAJA_IMPORT_MAX_FILAS = 500;
let cajaImportPendiente = null;

function cajaEscape(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Minúsculas, sin tildes ni espacios sobrantes: "  Método de Pago " -> "metodo de pago"
function cajaNormalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function exportarPlantillaCaja() {
  const categorias = cajaState.categorias.filter(c => c.activa !== false);

  const wsMovimientos = XLSX.utils.aoa_to_sheet([CAJA_COLUMNAS_EXCEL]);
  wsMovimientos['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 45 }];

  const ayuda = [
    ['CÓMO COMPLETAR LA HOJA "Movimientos"'],
    [''],
    ['Fecha', 'Día del movimiento. Formato dd/mm/aaaa (ej: 30/09/2026).'],
    ['Categoría', 'Escribila igual que en la lista de abajo. El tipo (ingreso/egreso) lo define la categoría.'],
    ['Monto', 'Siempre positivo, sin signo (ej: 1500 o 1500,50). Si es egreso, el sistema lo registra como egreso.'],
    ['Método de pago', 'Efectivo o Mercado Pago.'],
    ['Descripción', 'Opcional.'],
    [''],
    [`Máximo ${CAJA_IMPORT_MAX_FILAS} filas por importación. No borres ni cambies el encabezado.`],
    [''],
    ['CATEGORÍAS DISPONIBLES', 'Tipo']
  ];
  categorias.forEach(c => ayuda.push([c.nombre, c.tipo === 'egreso' ? 'Egreso' : 'Ingreso']));
  const wsAyuda = XLSX.utils.aoa_to_sheet(ayuda);
  wsAyuda['!cols'] = [{ wch: 30 }, { wch: 90 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');
  XLSX.utils.book_append_sheet(wb, wsAyuda, 'Ayuda');
  XLSX.writeFile(wb, 'plantilla_caja.xlsx');
}

function importarTransaccionesCaja() {
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
        const hoja = workbook.Sheets['Movimientos'] || workbook.Sheets[workbook.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', blankrows: true, raw: true });
        procesarImportacionCaja(filas);
      } catch (error) {
        console.error('❌ Error leyendo Excel de caja:', error);
        mostrarErroresImportacionCaja(['No se pudo leer el archivo. Verificá que sea un Excel (.xlsx) válido.']);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

// Devuelve 'YYYY-MM-DD' o null. Acepta número de serie de Excel, dd/mm/aaaa y aaaa-mm-dd.
function cajaParsearFecha(valor) {
  let y, m, d;

  if (typeof valor === 'number') {
    const f = XLSX.SSF.parse_date_code(valor);
    if (!f) return null;
    ({ y, m, d } = f);
  } else {
    const txt = String(valor ?? '').trim();
    let match = txt.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (match) {
      d = +match[1]; m = +match[2]; y = +match[3];
    } else if ((match = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
      y = +match[1]; m = +match[2]; d = +match[3];
    } else {
      return null;
    }
  }

  const fecha = new Date(Date.UTC(y, m - 1, d));
  if (fecha.getUTCFullYear() !== y || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Acepta 1500, "1500", "1.500,50", "$ 1500,5"
function cajaParsearMonto(valor) {
  if (typeof valor === 'number') return valor;
  let txt = String(valor ?? '').replace(/[$\s]/g, '');
  if (!txt) return NaN;
  if (txt.includes(',')) txt = txt.replace(/\./g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(txt) ? parseFloat(txt) : NaN;
}

function cajaParsearMetodo(valor) {
  const txt = cajaNormalizar(valor).replace(/_/g, ' ');
  if (txt === 'efectivo') return 'efectivo';
  if (['mercado pago', 'mercadopago', 'mp'].includes(txt)) return 'mercado_pago';
  return null;
}

function procesarImportacionCaja(filas) {
  if (filas.length === 0) {
    mostrarErroresImportacionCaja(['El archivo está vacío.']);
    return;
  }

  // Ubicar columnas por nombre de encabezado (sin importar mayúsculas ni tildes)
  const encabezado = filas[0].map(cajaNormalizar);
  const indice = {};
  const faltantes = [];
  CAJA_COLUMNAS_EXCEL.forEach(col => {
    const pos = encabezado.indexOf(cajaNormalizar(col));
    if (pos === -1 && col !== 'Descripción') faltantes.push(col);
    indice[col] = pos;
  });

  if (faltantes.length > 0) {
    mostrarErroresImportacionCaja([
      `Faltan columnas en el encabezado: ${faltantes.join(', ')}.`,
      'Usá el botón "Exportar plantilla" para obtener el formato correcto.'
    ]);
    return;
  }

  // Se conserva la posición original para informar la fila correcta del Excel; se ignoran las filas vacías
  const datos = filas.slice(1).map((celdas, i) => ({ celdas, numFila: i + 2 }))
    .filter(({ celdas }) => celdas.some(c => String(c ?? '').trim() !== ''));
  if (datos.length === 0) {
    mostrarErroresImportacionCaja(['El archivo no tiene filas para importar. Completá la plantilla debajo del encabezado.']);
    return;
  }
  if (datos.length > CAJA_IMPORT_MAX_FILAS) {
    mostrarErroresImportacionCaja([`El archivo tiene ${datos.length} filas. El máximo es ${CAJA_IMPORT_MAX_FILAS} por importación.`]);
    return;
  }

  const categoriasPorNombre = new Map(
    cajaState.categorias.filter(c => c.activa !== false).map(c => [cajaNormalizar(c.nombre), c])
  );

  const errores = [];
  const validas = [];

  datos.forEach(({ celdas, numFila }) => {
    const erroresFila = [];

    const fecha = cajaParsearFecha(celdas[indice['Fecha']]);
    if (!fecha) erroresFila.push('fecha inválida (usá dd/mm/aaaa)');

    const categoria = categoriasPorNombre.get(cajaNormalizar(celdas[indice['Categoría']]));
    if (!categoria) erroresFila.push(`categoría "${cajaEscape(celdas[indice['Categoría']])}" no existe`);

    const monto = cajaParsearMonto(celdas[indice['Monto']]);
    if (!Number.isFinite(monto)) erroresFila.push('monto inválido');
    else if (monto <= 0) erroresFila.push('el monto debe ser positivo (el tipo lo define la categoría)');

    const metodo_pago = cajaParsearMetodo(celdas[indice['Método de pago']]);
    if (!metodo_pago) erroresFila.push('método de pago debe ser Efectivo o Mercado Pago');

    if (erroresFila.length > 0) {
      errores.push(`Fila ${numFila}: ${erroresFila.join(', ')}`);
      return;
    }

    const descripcion = indice['Descripción'] >= 0 ? String(celdas[indice['Descripción']] ?? '').trim() : '';
    validas.push({ fecha, categoria_id: categoria.id, tipo: categoria.tipo, monto, metodo_pago, descripcion: descripcion || null });
  });

  if (errores.length > 0) {
    mostrarErroresImportacionCaja(errores);
    return;
  }

  cajaImportPendiente = validas;
  mostrarConfirmacionImportacionCaja(validas);
}

function cajaAbrirModal(contenidoHTML) {
  cerrarModalImportacionCaja();
  const modal = document.createElement('div');
  modal.id = 'modalImportacionCaja';
  modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px;';
  modal.innerHTML = `<div style="background: white; border-radius: 12px; padding: 24px; width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto;">${contenidoHTML}</div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModalImportacionCaja(); });
  document.body.appendChild(modal);
}

function cerrarModalImportacionCaja() {
  document.getElementById('modalImportacionCaja')?.remove();
}

function mostrarErroresImportacionCaja(errores) {
  const MAX_VISIBLES = 50;
  const visibles = errores.slice(0, MAX_VISIBLES);
  const resto = errores.length - visibles.length;

  cajaAbrirModal(`
    <h2 style="margin: 0 0 16px; color: #c5221f;">No se pudo importar</h2>
    <div style="background: #fce8e6; border: 1px solid #f1d5d3; border-radius: 8px; padding: 14px; margin-bottom: 16px; max-height: 300px; overflow-y: auto; font-size: 13px;">
      ${visibles.map(e => `<div style="margin-bottom: 6px;">❌ ${e.startsWith('Fila') ? e : cajaEscape(e)}</div>`).join('')}
      ${resto > 0 ? `<div style="color: #666;">… y ${resto} errores más.</div>` : ''}
    </div>
    <p style="font-size: 13px; color: #666; margin: 0 0 16px;">No se guardó ninguna fila. Corregí el Excel y volvé a intentar.</p>
    <button class="btn btn-primary" style="width: 100%;" onclick="cerrarModalImportacionCaja()">Cerrar</button>
  `);
}

function mostrarConfirmacionImportacionCaja(filas) {
  const total = (tipo) => filas.filter(f => f.tipo === tipo).reduce((suma, f) => suma + f.monto, 0);
  const ingresos = filas.filter(f => f.tipo === 'ingreso');
  const egresos = filas.filter(f => f.tipo === 'egreso');

  cajaAbrirModal(`
    <h2 style="margin: 0 0 16px; color: #7f1f6e;">Confirmar importación</h2>
    <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
      <div style="font-size: 32px; font-weight: 700; color: #7f1f6e;">${filas.length}</div>
      <div style="color: #666;">transacciones para importar</div>
    </div>
    <div style="display: flex; gap: 12px; margin-bottom: 20px; font-size: 13px;">
      <div style="flex: 1; background: #e8f5e9; border-radius: 8px; padding: 12px;">
        <div style="color: #2e7d32; font-weight: 600;">Ingresos (${ingresos.length})</div>
        <div style="font-size: 16px; font-weight: 700;">${formatearMonto(total('ingreso'))}</div>
      </div>
      <div style="flex: 1; background: #ffebee; border-radius: 8px; padding: 12px;">
        <div style="color: #c62828; font-weight: 600;">Egresos (${egresos.length})</div>
        <div style="font-size: 16px; font-weight: 700;">${formatearMonto(total('egreso'))}</div>
      </div>
    </div>
    <div style="display: flex; gap: 12px;">
      <button class="btn btn-secondary" style="flex: 1;" onclick="cerrarModalImportacionCaja()">Cancelar</button>
      <button id="btnConfirmarImportacionCaja" class="btn btn-primary" style="flex: 1;" onclick="ejecutarImportacionCaja()">Confirmar importación</button>
    </div>
  `);
}

async function ejecutarImportacionCaja(confirmarDuplicados = false) {
  if (!cajaImportPendiente) return;

  const boton = document.getElementById('btnConfirmarImportacionCaja');
  if (boton) { boton.disabled = true; boton.textContent = 'Importando...'; }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/transacciones/importar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transacciones: cajaImportPendiente.map(({ fecha, categoria_id, monto, metodo_pago, descripcion }) =>
          ({ fecha, categoria_id, monto, metodo_pago, descripcion })),
        confirmar_duplicados: confirmarDuplicados
      })
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 409 && data.duplicadas) {
      if (boton) { boton.disabled = false; boton.textContent = 'Confirmar importación'; }
      if (confirm(`${data.error}.\n\nSi importás de nuevo se van a DUPLICAR en la caja.\n\n¿Importar igual?`)) {
        return ejecutarImportacionCaja(true);
      }
      return;
    }

    if (!response.ok) {
      const detalles = Array.isArray(data.detalles) ? data.detalles : [data.error || 'Error al importar'];
      mostrarErroresImportacionCaja(detalles);
      return;
    }

    cajaImportPendiente = null;
    cerrarModalImportacionCaja();
    alert(`✅ ${data.data.insertadas} transacciones importadas correctamente`);

    await loadCajaTransacciones();
    renderCajaTransacciones();
    updateCajaResumen();
  } catch (error) {
    console.error('❌ Error importando transacciones:', error);
    if (boton) { boton.disabled = false; boton.textContent = 'Confirmar importación'; }
    alert('Error al conectar con el servidor. No se importó nada.');
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

// ==================== SELECTOR DE EMOJIS Y COLOR ====================
const EMOJIS_CATEGORIAS = ['💰', '🛍️', '💸', '📊', '🏪', '⚙️', '📦', '🚚', '💳', '📱', '🎁', '📈', '🔧', '🏷️', '💡', '📌'];

function inicializarSelectorEmojis() {
  const grid = document.getElementById('selectIconosGrid');
  if (!grid) return;

  grid.innerHTML = EMOJIS_CATEGORIAS.map(emoji => `
    <button type="button" style="padding: 8px; border: 2px solid #ddd; border-radius: 8px; font-size: 20px; cursor: pointer; background: white; transition: all 0.2s;"
      onclick="seleccionarEmoji('${emoji}', event)">
      ${emoji}
    </button>
  `).join('');
}

function seleccionarEmoji(emoji, event) {
  event.preventDefault();
  document.getElementById('inputIconoCategoria').value = emoji;

  // Marcar como seleccionado
  document.querySelectorAll('#selectIconosGrid button').forEach(btn => {
    btn.style.borderColor = '#ddd';
    btn.style.backgroundColor = 'white';
  });
  event.target.style.borderColor = '#7f1f6e';
  event.target.style.backgroundColor = '#f0e6f0';
}

function actualizarPreviewColor() {
  const color = document.getElementById('inputColorCategoria').value;
  const preview = document.getElementById('previewColorCategoria');
  const textColor = document.getElementById('textColorCategoria');

  if (preview) preview.style.backgroundColor = color;
  if (textColor) textColor.textContent = color.toUpperCase();
}

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
    tabTipo: 'todo',
    sortBy: 'fecha_transaccion',
    sortOrder: 'DESC',
    modalTransaccionEditando: null,
    modalCategoriaEditando: null
  };
  console.log('🔄 Caja reset para nueva sesión');
}

monitorCajaPageChange();

// ==================== SOLAPAS Todo / Ingresos / Egresos ====================
const CAJA_TIPO_TABS = [
  { key: 'todo',    label: 'Todo',     color: '#607d8b', tint: '#eceff1', text: '#263238' },
  { key: 'ingreso', label: 'Ingresos', color: '#388e3c', tint: '#e8f5e9', text: '#1b5e20' },
  { key: 'egreso',  label: 'Egresos',  color: '#e53935', tint: '#fdeaea', text: '#7f0000' }
];

function renderCajaTipoTabs() {
  const cont = document.getElementById('cajaTipoTabs');
  if (!cont) return;
  cont.innerHTML = CAJA_TIPO_TABS.map(t => {
    const activa = t.key === cajaState.tabTipo;
    return `<button type="button" role="tab" aria-selected="${activa}" data-key="${t.key}" class="orders-tab${activa ? ' active' : ''}"
      style="--tab-color:${t.color};--tab-tint:${t.tint};--tab-text:${t.text}" onclick="seleccionarCajaTipoTab('${t.key}')">${t.label}</button>`;
  }).join('');
  const t = CAJA_TIPO_TABS.find(x => x.key === cajaState.tabTipo) || CAJA_TIPO_TABS[0];
  const fich = document.getElementById('cajaFichero');
  if (fich) { fich.style.setProperty('--tab-color', t.color); fich.style.setProperty('--tab-tint', t.tint); }
}

function seleccionarCajaTipoTab(key) {
  cajaState.tabTipo = key;
  renderCajaTipoTabs();
  aplicarFiltrosCaja();
}

// ==================== MENÚ COMPARTIR (CAJA) ====================
function toggleMenuCompartirCaja(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('menuCompartirCaja');
  if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', () => {
  const m = document.getElementById('menuCompartirCaja');
  if (m) m.style.display = 'none';
});
