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
  sortOrder: 'DESC'
};

// ==================== INICIALIZACIÓN ====================
function initCaja() {
  console.log('🔄 Inicializando módulo de Caja...');

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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    </div>

    <!-- TABS -->
    <div style="display: flex; gap: 16px; margin-bottom: 24px; border-bottom: 2px solid #eee;">
      <button class="tab-btn tab-active" onclick="switchCajaTab('transacciones')">📋 Transacciones</button>
      <button class="tab-btn" onclick="switchCajaTab('categorias')">📁 Categorías</button>
      <button class="tab-btn" onclick="switchCajaTab('reportes')">📊 Reportes</button>
    </div>

    <!-- TAB: TRANSACCIONES -->
    <div id="tab-transacciones" class="tab-content">
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <button class="btn btn-primary" onclick="abrirModalNuevaTransaccion()">➕ Nueva Transacción</button>
      </div>

      <!-- FILTROS -->
      <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px;">
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
      </div>

      <!-- TABLA -->
      <div class="table-container">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Monto</th>
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
      <div style="margin-bottom: 20px;">
        <label>Mes:</label>
        <input type="month" id="reporteMes" />
        <button class="btn btn-primary" onclick="generarReporteCaja()">Generar Reporte</button>
      </div>

      <div id="reporteContenido"></div>
    </div>
  `;

  renderCajaTransacciones();
  renderCajaCategorias();
  updateCajaResumen();
}

// ==================== RENDERIZAR TRANSACCIONES ====================
function renderCajaTransacciones() {
  const tbody = document.getElementById('cajaTransaccionesTable');
  if (!tbody) return;

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
      <td style="text-align: right; font-weight: 600;">$${parseFloat(t.monto).toFixed(2)}</td>
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

  cajaState.transacciones.forEach(t => {
    const fecha = new Date(t.fecha_transaccion).toISOString().split('T')[0];
    if (fecha === hoy) {
      if (t.tipo === 'ingreso') {
        totalIngresos += parseFloat(t.monto);
      } else {
        totalEgresos += parseFloat(t.monto);
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

  cajaState.filters = {
    tipo: tipo || null,
    categoria_id: categoria ? parseInt(categoria) : null,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta
  };

  loadCajaTransacciones(1);
}

// ==================== MODALES ====================
function abrirModalNuevaTransaccion() {
  console.log('Abrir modal nueva transacción');
  // Se implementará en Phase 2
}

function abrirModalNuevaCategoria() {
  console.log('Abrir modal nueva categoría');
  // Se implementará en Phase 2
}

async function editarTransaccion(id) {
  console.log('Editar transacción:', id);
  // Se implementará en Phase 2
}

async function eliminarTransaccion(id) {
  if (!confirm('¿Eliminar esta transacción?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/caja/transacciones/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      console.log('✅ Transacción eliminada');
      loadCajaTransacciones();
    }
  } catch (error) {
    console.error('❌ Error eliminando transacción:', error);
  }
}

async function editarCategoria(id) {
  console.log('Editar categoría:', id);
  // Se implementará en Phase 2
}

async function eliminarCategoria(id) {
  console.log('Eliminar categoría:', id);
  // Se implementará en Phase 2
}

function generarReporteCaja() {
  console.log('Generar reporte');
  // Se implementará en Phase 3
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

monitorCajaPageChange();
