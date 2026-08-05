// API_BASE_URL ya está definido en el HTML

// ==================== DATE UTILITIES ====================
/**
 * Parsea fecha de forma robusta desde varios formatos posibles
 * Soporta: ISO 8601, YYYY-MM-DD, timestamps, etc.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Si es una cadena, trimear espacios
  if (typeof dateStr === 'string') {
    dateStr = dateStr.trim();
  }

  // Intentar parsear con Date constructor
  const date = new Date(dateStr);

  // Validar que sea una fecha válida
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateStr);
    return null;
  }

  return date;
}

/**
 * Formatea fecha a string español: DD/MM/YY
 * Parsea ISO string directamente sin timezone interpretation
 */
function formatDateShort(dateStr) {
  if (!dateStr) return '—';

  dateStr = String(dateStr).trim();

  // Buscar patrón YYYY-MM-DD al inicio (evita timezone issues)
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, year, month, day] = match;
    return `${day}/${month}/${year.slice(-2)}`;
  }

  // Fallback: si no es ISO format, intentar parseDate + toLocaleDateString
  const date = parseDate(dateStr);
  if (!date) return '—';

  return date.toLocaleDateString('es-AR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formatea fecha a string español: DD/MM/YYYY
 * Parsea ISO string directamente sin timezone interpretation
 */
function formatDateLong(dateStr) {
  if (!dateStr) return '—';

  dateStr = String(dateStr).trim();

  // Buscar patrón YYYY-MM-DD al inicio (evita timezone issues)
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Fallback: si no es ISO format, intentar parseDate + toLocaleDateString
  const date = parseDate(dateStr);
  if (!date) return '—';

  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// ==================== CATEGORÍAS DINÁMICAS ====================
let adminCategories = [];

async function loadAdminCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categorias`);
    const data = await response.json();
    adminCategories = data.data || [];
    console.log('[Admin] Categorías cargadas:', adminCategories);
  } catch (error) {
    console.error('[Admin] Error cargando categorías:', error);
  }
}

function populateProductCategoryDropdown() {
  const select = document.getElementById('productCategoria');
  if (!select) return;

  select.innerHTML = '<option value="">-- Selecciona una categoría --</option>';

  adminCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.nombre;
    select.appendChild(option);
  });
}

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  loadAdminCategories();
  loadOrderStatuses();
  loadDashboardStats();
  loadRecentOrders();
  setupEventListeners();
  setupClientesEventListeners();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const gallery = document.getElementById('galleryViewModal');
    if (gallery && gallery.style.display !== 'none') {
      closeGalleryViewModal();
    }
  }
});

// ==================== AUTENTICACIÓN ====================

function checkAdminAuth() {
  const token = localStorage.getItem('puchia_admin_token');
  const user = localStorage.getItem('puchia_admin_user');

  if (!token) {
    window.location.href = './login.html';
    return;
  }

  if (user) {
    const userData = JSON.parse(user);
    document.getElementById('adminUserName').textContent = userData.nombre || 'Admin';
  }
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('puchia_admin_token');
  localStorage.removeItem('puchia_admin_user');
  window.location.href = './login.html';
});

// ==================== NAVEGACIÓN ====================

function setupEventListeners() {
  // Navegación sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
  console.log('Links encontrados:', sidebarLinks.length);
  
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      console.log('Navegando a:', page);
      
      // Remover activo de todos
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Ocultar todas las páginas
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');

      // Mostrar página seleccionada
      const pageElement = document.getElementById(`${page}-page`);
      if (pageElement) {
        pageElement.style.display = 'block';

        // Cargar datos según página
        if (page === 'productos') {
          loadProducts();
        } else if (page === 'ordenes') {
          loadAllOrders();
        } else if (page === 'clientes') {
          listarClientes();
        } else if (page === 'categorias') {
          loadCategorias();
        } else if (page === 'settings') {
          loadSettings();
        }
      }
    });
  });

  // Botones
  document.getElementById('newProductBtn')?.addEventListener('click', openNewProductModal);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);

  // Modal Producto
  document.getElementById('formProducto')?.addEventListener('submit', saveProduct);

  // Modal Crear Orden Manual
  document.getElementById('formCrearOrden')?.addEventListener('submit', guardarOrden);
  document.getElementById('cancelProductBtn')?.addEventListener('click', () => {
    cleanupQuillAutosave();
    document.getElementById('modalProducto').style.display = 'none';
  });
  document.getElementById('closeProductModal')?.addEventListener('click', () => {
    cleanupQuillAutosave();
    document.getElementById('modalProducto').style.display = 'none';
  });


  // Filtro categoría productos
  document.getElementById('filtroCategoria')?.addEventListener('change', (e) => {
    productosFiltroCategoria = e.target.value;
    aplicarFiltrosProductos();
  });

  // Búsqueda en tiempo real
  document.getElementById('productSearchInput')?.addEventListener('input', (e) => {
    productosFiltroTexto = e.target.value;
    aplicarFiltrosProductos();
  });

  // Ordenar columnas productos
  document.querySelectorAll('#productos-page th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (productosSortColumn === col) {
        productosSortDir = productosSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        productosSortColumn = col;
        productosSortDir = 'asc';
      }
      sessionStorage.setItem('productosSortColumn', productosSortColumn);
      sessionStorage.setItem('productosSortDir', productosSortDir);
      aplicarFiltrosProductos();
    });
  });
}

// ==================== DASHBOARD ====================

async function loadDashboardStats() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/auth/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      // Usar allOrdersData si está disponible, sino usar datos del backend
      if (allOrdersData && allOrdersData.length > 0) {
        updateDashboardStatsFromOrders();
      } else {
        // Fallback al backend si allOrdersData no está cargado
        document.getElementById('stat-pending').textContent = data.data.ordenes_pendientes || 0;
        document.getElementById('stat-completed').textContent = data.data.ordenes_completadas || 0;
      }
      document.getElementById('stat-sales').textContent = `$${(data.data.total_ventas || 0).toLocaleString()}`;
      document.getElementById('stat-products').textContent = data.data.productos_habilitados || 0;
    }
  } catch (error) {
    console.error('Error cargando stats:', error);
  }
}

function updateDashboardStatsFromOrders() {
  // Contar órdenes: pendientes = TODAS excepto "Entregado"
  const pendientes = allOrdersData.filter(o => o.estado !== 'entregado').length;
  const completadas = allOrdersData.filter(o => o.estado === 'entregado').length;

  const statPendingEl = document.getElementById('stat-pending');
  const statCompletedEl = document.getElementById('stat-completed');

  if (statPendingEl) statPendingEl.textContent = pendientes;
  if (statCompletedEl) statCompletedEl.textContent = completadas;

  console.log(`Dashboard stats actualizados: Pendientes=${pendientes}, Completadas=${completadas}`);
}

async function loadRecentOrders() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/ordenes?limite=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    const tbody = document.getElementById('recent-orders');

    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(orden => `
        <tr>
          <td>${orden.id_unico || orden.id}</td>
          <td>${orden.cliente_nombre}</td>
          <td>$${orden.total}</td>
          <td><span style="background: #f0e6f6; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${orden.estado}</span></td>
          <td>${formatDateShort(getOrderCreatedDate(orden))}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewOrder(${orden.id})">Ver</button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Sin órdenes recientes</td></tr>';
    }
  } catch (error) {
    console.error('Error cargando órdenes recientes:', error);
  }
}

// ==================== PRODUCTOS ====================

let productosGlobal = [];
let productoActualEnEdicion = null;
let productosSortColumn = sessionStorage.getItem('productosSortColumn') || null;
let productosSortDir = sessionStorage.getItem('productosSortDir') || 'asc';
let productosFiltroCategoria = '';
let productosFiltroTexto = '';

async function loadProducts() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/productos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    productosGlobal = data.data || [];
    aplicarFiltrosProductos();
  } catch (error) {
    console.error('Error cargando productos:', error);
    document.getElementById('productos-list').innerHTML = '<tr><td colspan="7" style="text-align: center; color: #c5221f; padding: 20px;">Error cargando productos</td></tr>';
  }
}

const ICONOS_CAT = { 'cumpleanos': '🎈', 'regalos': '🎁', 'emprendedores': '💼' };

function renderProductos(lista) {
  const tbody = document.getElementById('productos-list');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:20px;">Sin productos que coincidan</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p => {
    const habilitado = p.habilitado !== false;
    const categoria = p.categorias?.[0]?.nombre || 'Sin categoría';
    const catKey = categoria.toLowerCase().replace(/ñ/g, 'n').replace(/\s+/g,'');
    const emoji = ICONOS_CAT[catKey] || '📦';
    const stockVal = p.stock_type === 'simple' ? p.stock_cantidad : 'Insumo';
    const precio = Number(p.precio).toLocaleString('es-AR', {minimumFractionDigits: 2});

    const portada = p.media?.find(m => m.es_portada) || p.media?.[0] || null;
    const fotoCell = portada
      ? `<td style="padding:6px;"><img src="${BACKEND_URL}${portada.url}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid #ddd;display:block;" onclick="openProductGallery(${p.id})" title="Ver galería" onerror="this.outerHTML='<span style=font-size:22px>${emoji}</span>'"></td>`
      : `<td style="padding:6px;text-align:center;"><span style="font-size:22px;" title="Sin fotos">${emoji}</span></td>`;

    return `<tr>
      <td>${p.id}</td>
      ${fotoCell}
      <td>${p.nombre}</td>
      <td>$${precio}</td>
      <td>${stockVal}</td>
      <td>${categoria}</td>
      <td><button class="toggle-estado-btn ${habilitado ? 'activo' : 'inactivo'}" onclick="toggleHabilitadoProducto(${p.id}, ${habilitado})">${habilitado ? '✅ Activo' : '❌ Inactivo'}</button></td>
      <td class="acciones-cell">
        <button class="btn btn-sm btn-secondary" onclick="editProduct(${p.id})">Editar</button>
        <button class="btn btn-sm" style="background:linear-gradient(135deg,#7b2d8e,#9d4cb8);color:white;border:none;cursor:pointer;" onclick="duplicarProducto(${p.id})" title="Duplicar producto">📋</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

function aplicarFiltrosProductos() {
  let lista = [...productosGlobal];

  if (productosFiltroCategoria) {
    lista = lista.filter(p => (p.categorias?.[0]?.nombre || '').toLowerCase() === productosFiltroCategoria.toLowerCase());
  }

  if (productosFiltroTexto) {
    const txt = productosFiltroTexto.toLowerCase();
    lista = lista.filter(p =>
      (p.nombre || '').toLowerCase().includes(txt) ||
      (p.descripcion || '').toLowerCase().includes(txt) ||
      (p.categorias?.[0]?.nombre || '').toLowerCase().includes(txt) ||
      String(p.precio).includes(txt)
    );
  }

  if (productosSortColumn) {
    lista.sort((a, b) => {
      const dir = productosSortDir === 'asc' ? 1 : -1;
      switch (productosSortColumn) {
        case 'nombre':
          return dir * (a.nombre || '').localeCompare(b.nombre || '');
        case 'precio':
          return dir * (Number(a.precio) - Number(b.precio));
        case 'stock': {
          const av = a.stock_type === 'simple' ? Number(a.stock_cantidad) : -1;
          const bv = b.stock_type === 'simple' ? Number(b.stock_cantidad) : -1;
          return dir * (av - bv);
        }
        case 'categoria':
          return dir * (a.categorias?.[0]?.nombre || '').localeCompare(b.categorias?.[0]?.nombre || '');
        case 'estado': {
          const av = a.habilitado !== false ? 1 : 0;
          const bv = b.habilitado !== false ? 1 : 0;
          return dir * (av - bv);
        }
        default: return 0;
      }
    });
  }

  document.querySelectorAll('#productos-page th.sortable').forEach(th => {
    th.classList.remove('sort-active');
    const ind = th.querySelector('.sort-ind');
    if (ind) ind.textContent = '↕';
  });
  if (productosSortColumn) {
    const activeTh = document.querySelector(`#productos-page th[data-sort="${productosSortColumn}"]`);
    if (activeTh) {
      activeTh.classList.add('sort-active');
      const ind = activeTh.querySelector('.sort-ind');
      if (ind) ind.textContent = productosSortDir === 'asc' ? '↑' : '↓';
    }
  }

  renderProductos(lista);
}

async function toggleHabilitadoProducto(id, currentHabilitado) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const producto = productosGlobal.find(p => p.id === id);
    if (!producto) return;
    const nuevoEstado = !currentHabilitado;
    const response = await fetch(`${API_BASE_URL}/admin/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        precio: Number(producto.precio),
        stock_cantidad: Number(producto.stock_cantidad || 0),
        stock_type: producto.stock_type || 'simple',
        categorias: producto.categorias?.map(c => c.id) || [],
        habilitado: nuevoEstado
      })
    });
    const data = await response.json();
    if (response.ok && data.success) {
      const idx = productosGlobal.findIndex(p => p.id === id);
      if (idx !== -1) productosGlobal[idx].habilitado = nuevoEstado;
      aplicarFiltrosProductos();
    } else {
      puchiaAlert(data.message || 'No se pudo actualizar el estado', 'error');
    }
  } catch (error) {
    puchiaAlert('Error al cambiar el estado del producto', 'error');
  }
}

function duplicarProducto(id) {
  const original = productosGlobal.find(p => p.id === id);
  if (!original) return;
  productoActualEnEdicion = null;
  document.getElementById('modalProductoTitle').textContent = 'Duplicar Producto';
  document.getElementById('productNombre').value = original.nombre + ' (Copia)';
  document.getElementById('productDescripcion').value = original.descripcion || '';
  document.getElementById('productPrecio').value = original.precio;
  document.getElementById('productStock').value = original.stock_cantidad || 0;
  populateProductCategoryDropdown();
  document.getElementById('productCategoria').value = original.categorias?.[0]?.id || '';
  const st = document.querySelector(`input[name="stockType"][value="${original.stock_type || 'simple'}"]`);
  if (st) st.checked = true;
  document.getElementById('productHabilitado').checked = original.habilitado !== false;
  document.getElementById('modalProducto').style.display = 'flex';
  initMediaSection(null);
}

function openNewProductModal() {
  productoActualEnEdicion = null;
  document.getElementById('modalProductoTitle').textContent = 'Nuevo Producto';
  document.getElementById('formProducto').reset();
  document.getElementById('productHabilitado').checked = true;
  populateProductCategoryDropdown();
  document.getElementById('modalProducto').style.display = 'flex';
  initMediaSection(null);
}

function editProduct(id) {
  productoActualEnEdicion = productosGlobal.find(p => p.id === id);
  if (!productoActualEnEdicion) return;

  document.getElementById('modalProductoTitle').textContent = 'Editar Producto';
  document.getElementById('productNombre').value = productoActualEnEdicion.nombre;
  document.getElementById('productPrecio').value = productoActualEnEdicion.precio;
  document.getElementById('productStock').value = productoActualEnEdicion.stock_cantidad || 0;
  populateProductCategoryDropdown();
  document.getElementById('productCategoria').value = productoActualEnEdicion.categorias?.[0]?.id || '';
  document.querySelector(`input[name="stockType"][value="${productoActualEnEdicion.stock_type}"]`).checked = true;
  document.getElementById('productHabilitado').checked = productoActualEnEdicion.habilitado !== false;

  document.getElementById('modalProducto').style.display = 'flex';
  initMediaSection(id);

  // Cargar descripción en el editor Quill
  setTimeout(() => {
    initQuillEditor();
    console.log('Descripción desde BD:', productoActualEnEdicion.descripcion);
    if (quillEditor && productoActualEnEdicion.descripcion) {
      quillEditor.root.innerHTML = productoActualEnEdicion.descripcion;
      console.log('Contenido del editor después de cargar:', quillEditor.root.innerHTML);
    } else if (quillEditor) {
      quillEditor.setContents([]);
    }
  }, 100);
}

async function saveProduct(e) {
  e.preventDefault();

  const nombre = document.getElementById('productNombre').value;
  const precio = document.getElementById('productPrecio').value;
  const stock = document.getElementById('productStock').value;
  const categoriaId = document.getElementById('productCategoria').value;
  const stockType = document.querySelector('input[name="stockType"]:checked').value;
  const habilitado = document.getElementById('productHabilitado').checked;

  // Validaciones
  if (!nombre || !nombre.trim()) {
    puchiaAlert('Nombre es requerido', 'warning');
    return;
  }
  if (!precio || !categoriaId) {
    puchiaAlert('Por favor completa los campos requeridos (Precio y Categoría)', 'warning');
    return;
  }

  // Asegurar que quillEditor está inicializado
  if (!quillEditor) {
    initQuillEditor();
  }

  // Extraer contenido del Quill editor (descripción completa)
  const descripcion_completa = quillEditor ? quillEditor.root.innerHTML : null;
  console.log('DEBUG saveProduct - quillEditor exists:', !!quillEditor);
  console.log('DEBUG saveProduct - descripcion_completa:', descripcion_completa);

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const method = productoActualEnEdicion ? 'PUT' : 'POST';
    const url = productoActualEnEdicion
      ? `${API_BASE_URL}/admin/productos/${productoActualEnEdicion.id}`
      : `${API_BASE_URL}/admin/productos`;

    const requestPayload = {
      nombre,
      descripcion: descripcion_completa && descripcion_completa !== '<p><br></p>' ? descripcion_completa : null,
      precio: Number(precio),
      stock_cantidad: Number(stock),
      stock_type: stockType,
      categorias: [Number(categoriaId)],
      habilitado
    };
    console.log('DEBUG saveProduct - requestPayload:', requestPayload);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const savedProductId = data.data?.id || productoActualEnEdicion?.id;

      if (!productoActualEnEdicion && mediaQueuedFiles.length > 0 && savedProductId) {
        await uploadQueuedMedia(savedProductId);
      }

      cleanupQuillAutosave();
      document.getElementById('modalProducto').style.display = 'none';
      puchiaAlert('Producto guardado exitosamente', 'success');
      loadProducts();
    } else {
      puchiaAlert(data.message || 'No se pudo guardar el producto', 'error');
    }
  } catch (error) {
    console.error('Error guardando producto:', error);
    puchiaAlert('Error guardando producto: ' + error.message, 'error');
  }
}

async function deleteProduct(id) {
  const confirmar = await puchiaConfirm('Esta acción eliminará el producto permanentemente y no se puede deshacer.', '¿Eliminar producto?');
  if (!confirmar) return;

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/productos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      puchiaAlert('Producto eliminado exitosamente', 'success');
      loadProducts();
    } else {
      puchiaAlert(data.message || 'No se pudo eliminar el producto', 'error');
    }
  } catch (error) {
    console.error('Error eliminando producto:', error);
    puchiaAlert('Error eliminando producto', 'error');
  }
}

// ==================== ÓRDENES ====================
let allOrdersData = [];
let filteredOrdersData = [];
let currentPage = 1;
const ORDERS_PER_PAGE = 20;

// Sorting state
let orderSortConfig = {
  field: 'created_at', // Default sort by date
  direction: 'desc'   // Descending (newest first)
};

// Formatear ID de orden corto: ORD-0001, ORD-0002, etc
function formatShortOrderId(orden) {
  // Usar el ID de la BD como número secuencial
  const num = String(orden.id).padStart(4, '0');
  return `ORD-${num}`;
}

async function loadAllOrders() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    // Cargar 5000 órdenes (suficiente para ~7 años con 700 órdenes/año)
    const response = await fetch(`${API_BASE_URL}/admin/ordenes?limite=5000&pagina=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success && data.data) {
      allOrdersData = data.data;
      filteredOrdersData = [...allOrdersData];
      currentPage = 1;
      orderSortConfig = { field: 'created_at', direction: 'desc' }; // Reset sort
      renderOrders();
      updateDashboardStatsFromOrders(); // Actualizar stats del dashboard
      console.log(`Órdenes cargadas: ${allOrdersData.length}`);
    }
  } catch (error) {
    console.error('Error cargando órdenes:', error);
  }
}

// Función para ordenar
function sortOrders(field) {
  // Si es el mismo campo, cambiar dirección
  if (orderSortConfig.field === field) {
    orderSortConfig.direction = orderSortConfig.direction === 'asc' ? 'desc' : 'asc';
  } else {
    orderSortConfig.field = field;
    orderSortConfig.direction = 'desc'; // Default descending para campo nuevo
  }

  // Ordenar datos filtrados
  filteredOrdersData.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    // Manejo especial para fechas
    if (field === 'created_at' || field === 'fecha_entrega') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    }

    // Manejo especial para números
    if (field === 'total' || field === 'sena' || field === 'resto_a_pagar') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    if (aVal === bVal) return 0;

    const comparison = aVal > bVal ? 1 : -1;
    return orderSortConfig.direction === 'asc' ? comparison : -comparison;
  });

  currentPage = 1; // Volver a página 1
  renderOrders();
}

// Función helper para mostrar indicador de sort
function getSortIndicator(field) {
  if (orderSortConfig.field !== field) return '⇅';
  return orderSortConfig.direction === 'asc' ? '↑' : '↓';
}

function updateSortIndicators() {
  // Actualizar indicadores de sort en headers
  const sortIndicators = document.querySelectorAll('.sort-indicator');
  sortIndicators.forEach(indicator => {
    const th = indicator.parentElement;
    const thText = th.textContent.split('⇅')[0].split('↑')[0].split('↓')[0].trim();

    const fieldMap = {
      'Número': 'id',
      'Fecha': 'created_at',
      'Cliente': 'cliente_nombre',
      'Resto': 'resto_a_pagar',
      'Total': 'total',
      'Estado': 'estado',
      'Entrega': 'fecha_entrega'
    };

    const field = fieldMap[thText];
    if (field) {
      indicator.textContent = getSortIndicator(field);
    }
  });
}
// Obtener fecha de creación robusta - busca múltiples campos posibles
function getOrderCreatedDate(orden) {
  return orden.created_at || orden.updated_at || orden.creado_en || orden.fecha_compra;
}


function renderOrders() {
  const tbody = document.getElementById('all-orders');

  if (filteredOrdersData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999; padding: 20px;">Sin órdenes</td></tr>';
    document.getElementById('ordersPagination').style.display = 'none';
    return;
  }

  // Calcular paginación
  const totalPages = Math.ceil(filteredOrdersData.length / ORDERS_PER_PAGE);
  const startIdx = (currentPage - 1) * ORDERS_PER_PAGE;
  const endIdx = startIdx + ORDERS_PER_PAGE;
  const paginatedOrders = filteredOrdersData.slice(startIdx, endIdx);

  tbody.innerHTML = paginatedOrders.map((orden, idx) => {
    // DEBUG: Mostrar campos de fecha de la primera orden
    if (idx === 0) {
      console.log('🔍 DEBUG Orden #1:', {
        id: orden.id,
        id_unico: orden.id_unico,
        created_at: orden.created_at,
        updated_at: orden.updated_at,
        creado_en: orden.creado_en,
        fecha_entrega: orden.fecha_entrega,
        allFields: Object.keys(orden)
      });
    }

    const restoPagar = parseFloat(orden.resto_a_pagar) || (parseFloat(orden.total) - (parseFloat(orden.sena) || parseFloat(orden.total) / 2));
    const fechaCompra = formatDateShort(getOrderCreatedDate(orden));
    const fechaEntrega = formatDateShort(orden.fecha_entrega);
    const shortId = formatShortOrderId(orden);

    return `
      <tr style="border-bottom: 1px solid #eee; height: 44px;">
        <td style="padding: 8px 12px; font-weight: 600; color: #7f1f6e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${orden.id_unico}">${shortId}</td>
        <td style="padding: 8px 12px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fechaCompra}</td>
        <td style="padding: 8px 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${orden.cliente_nombre}">${orden.cliente_nombre}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">$${restoPagar.toFixed(2)}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #7f1f6e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">$${parseFloat(orden.total).toFixed(2)}</td>
        <td style="padding: 8px 12px;">
          <select onchange="updateOrderStatus(${orden.id}, this.value)" style="padding: 3px 6px; border-radius: 4px; border: 1px solid #ddd; font-size: 12px; width: 100%; overflow: hidden; text-overflow: ellipsis;">
            ${orderStatuses.map(s => `<option value="${s.valor}" ${orden.estado === s.valor ? 'selected' : ''}>${s.nombre}</option>`).join('')}
          </select>
        </td>
        <td style="padding: 8px 12px; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fechaEntrega}</td>
        <td style="padding: 8px 12px; display: flex; gap: 3px; justify-content: center; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <button class="btn btn-sm btn-secondary" onclick="viewOrder(${orden.id})" style="padding: 4px 8px; font-size: 11px;" title="Ver">👁️</button>
          <button class="btn btn-sm btn-primary" onclick="abrirEditarOrden(${orden.id})" style="padding: 4px 8px; font-size: 11px;" title="Editar">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="showDeleteConfirm(${orden.id}, '${orden.id_unico}')" style="padding: 4px 8px; font-size: 11px;" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  // Actualizar indicadores de sort
  updateSortIndicators();

  // Mostrar paginación si hay múltiples páginas
  updatePaginationControls(totalPages);
}

function updatePaginationControls(totalPages) {
  const paginationDiv = document.getElementById('ordersPagination');

  if (totalPages <= 1) {
    paginationDiv.style.display = 'none';
    return;
  }

  paginationDiv.style.display = 'flex';
  paginationDiv.innerHTML = `
    <button class="btn btn-sm btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="previousOrderPage()">← Anterior</button>
    <span style="margin: 0 15px; align-self: center; color: #666;">Página ${currentPage} de ${totalPages}</span>
    <button class="btn btn-sm btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="nextOrderPage()">Siguiente →</button>
  `;
}

function previousOrderPage() {
  if (currentPage > 1) {
    currentPage--;
    renderOrders();
    window.scrollTo(0, 0);
  }
}

function nextOrderPage() {
  const totalPages = Math.ceil(filteredOrdersData.length / ORDERS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderOrders();
    window.scrollTo(0, 0);
  }
}

function filterOrdersByStatus(estado) {
  currentPage = 1;
  orderSortConfig = { field: 'created_at', direction: 'desc' }; // Reset sort
  if (estado === 'todos') {
    filteredOrdersData = [...allOrdersData];
  } else {
    filteredOrdersData = allOrdersData.filter(orden => orden.estado === estado);
  }
  renderOrders();
}

function searchOrders(query) {
  currentPage = 1;
  orderSortConfig = { field: 'created_at', direction: 'desc' }; // Reset sort
  const searchLower = query.toLowerCase().trim();

  if (!searchLower) {
    filteredOrdersData = [...allOrdersData];
  } else {
    filteredOrdersData = allOrdersData.filter(orden =>
      orden.id_unico.toLowerCase().includes(searchLower) ||
      orden.cliente_nombre.toLowerCase().includes(searchLower)
    );
  }

  renderOrders();
}

// Exportar órdenes filtradas a Excel
function exportarOrdenesToExcel() {
  if (filteredOrdersData.length === 0) {
    puchiaAlert('No hay órdenes para exportar', 'warning');
    return;
  }

  const btn = event.target.closest('button');
  const textOriginal = btn.textContent;
  btn.textContent = '⏳ Exportando...';
  btn.disabled = true;

  try {
    // Preparar datos para Excel
    const excelData = filteredOrdersData.map(orden => {
      const restoPagar = parseFloat(orden.resto_a_pagar) || (parseFloat(orden.total) - (parseFloat(orden.sena) || parseFloat(orden.total) / 2));
      const fechaCompra = formatDateLong(getOrderCreatedDate(orden));
      const fechaEntrega = formatDateLong(orden.fecha_entrega);
      const shortId = formatShortOrderId(orden);

      return {
        'Número': shortId,
        'Fecha Compra': fechaCompra,
        'Cliente': orden.cliente_nombre,
        'Resto a Pagar': `$${restoPagar.toFixed(2)}`,
        'Total': `$${parseFloat(orden.total).toFixed(2)}`,
        'Estado': orden.estado,
        'Entrega Estimada': fechaEntrega
      };
    });

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // Número
      { wch: 14 }, // Fecha Compra
      { wch: 20 }, // Cliente
      { wch: 13 }, // Resto a Pagar
      { wch: 13 }, // Total
      { wch: 15 }, // Estado
      { wch: 14 }  // Entrega
    ];

    // Generar nombre de archivo con fecha
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-AR').replace(/\//g, '-');
    const nombreArchivo = `puchia_ordenes_${fecha}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);

    btn.textContent = '✅ ¡Exportado!';
    setTimeout(() => {
      btn.textContent = textOriginal;
      btn.disabled = false;
    }, 2000);

    puchiaAlert(`Exportadas ${excelData.length} órdenes`, 'success');
  } catch (error) {
    console.error('Error exportando Excel:', error);
    puchiaAlert('Error al exportar: ' + error.message, 'error');
    btn.textContent = textOriginal;
    btn.disabled = false;
  }
}

// ==================== CREAR ORDEN MANUAL ====================
let ordenManualProductos = [];
let ordenManualClientes = [];
let ordenManualRowCounter = 0;
let ordenCreadaId = null; // Almacenar ID de orden para descargar ticket
let ordenCreadaIdUnico = null; // Almacenar ID_UNICO para link de seguimiento
let ordenCreadaData = null; // Almacenar datos completos para generar ticket HTML
let ordenActualData = null; // Almacenar datos de cualquier orden (nueva o pasada) para descargar ticket

async function abrirModalCrearOrden() {
  document.getElementById('formCrearOrden').reset();
  document.getElementById('nuevoClienteForm').style.display = 'none';
  document.getElementById('selectCliente').disabled = false;
  document.getElementById('ordenItemsTable').innerHTML = '';
  document.getElementById('ordenTotal').textContent = '$0.00';
  ordenManualRowCounter = 0;

  await cargarClientesEnDropdown();
  await cargarProductosParaOrden();

  agregarProductoRow();

  document.getElementById('modalCrearOrden').style.display = 'flex';
}

async function cargarClientesEnDropdown() {
  const select = document.getElementById('selectCliente');
  select.innerHTML = '<option value="">-- Cargando clientes --</option>';

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/clientes?limite=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    ordenManualClientes = data.data || [];

    select.innerHTML = '<option value="">-- Selecciona un cliente --</option>';
    ordenManualClientes.forEach(cliente => {
      const option = document.createElement('option');
      option.value = cliente.id;
      option.textContent = `${cliente.codigo_cliente} - ${cliente.nombre}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando clientes:', error);
    select.innerHTML = '<option value="">Error al cargar clientes</option>';
  }
}

async function cargarProductosParaOrden() {
  try {
    const response = await fetch(`${API_BASE_URL}/productos`);
    const data = await response.json();
    ordenManualProductos = (data.data || []).filter(p => p.habilitado);
  } catch (error) {
    console.error('Error cargando productos:', error);
    ordenManualProductos = [];
  }
}

function toggleNuevoCliente() {
  const form = document.getElementById('nuevoClienteForm');
  const select = document.getElementById('selectCliente');

  if (form.style.display === 'none') {
    form.style.display = 'block';
    select.value = '';
    select.disabled = true;
  } else {
    form.style.display = 'none';
    select.disabled = false;
  }
}

function agregarProductoRow() {
  const rowId = ordenManualRowCounter++;
  const tbody = document.getElementById('ordenItemsTable');

  const opciones = ordenManualProductos.map(p =>
    `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} - $${p.precio}</option>`
  ).join('');

  const tr = document.createElement('tr');
  tr.id = `ordenRow_${rowId}`;
  tr.innerHTML = `
    <td style="padding: 8px; border-bottom: 1px solid #eee;">
      <select id="productoSelect_${rowId}" onchange="actualizarFilaProducto(${rowId})" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;">
        <option value="">-- Selecciona producto --</option>
        ${opciones}
      </select>
    </td>
    <td style="padding: 8px; border-bottom: 1px solid #eee;">
      <input type="number" id="cantidadInput_${rowId}" value="1" min="1" onchange="actualizarFilaProducto(${rowId})" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 6px; text-align: right; font-size: 13px;">
    </td>
    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px;" id="precioCell_${rowId}">$0.00</td>
    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; font-weight: 600;" id="subtotalCell_${rowId}">$0.00</td>
    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
      <button type="button" onclick="eliminarProductoRow(${rowId})" style="background: none; border: none; color: #d32f2f; cursor: pointer; font-size: 18px;">×</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function actualizarFilaProducto(rowId) {
  const select = document.getElementById(`productoSelect_${rowId}`);
  const cantidadInput = document.getElementById(`cantidadInput_${rowId}`);
  const precioCell = document.getElementById(`precioCell_${rowId}`);
  const subtotalCell = document.getElementById(`subtotalCell_${rowId}`);
  if (!select || !cantidadInput) return;

  const selectedOption = select.options[select.selectedIndex];
  const precio = selectedOption ? parseFloat(selectedOption.dataset.precio || 0) : 0;
  const cantidad = parseInt(cantidadInput.value) || 0;
  const subtotal = precio * cantidad;

  precioCell.textContent = `$${precio.toFixed(2)}`;
  subtotalCell.textContent = `$${subtotal.toFixed(2)}`;

  actualizarTotalOrden();
}

function eliminarProductoRow(rowId) {
  const row = document.getElementById(`ordenRow_${rowId}`);
  if (row) row.remove();
  actualizarTotalOrden();
}

function actualizarTotalOrden() {
  const tbody = document.getElementById('ordenItemsTable');
  let total = 0;

  tbody.querySelectorAll('tr').forEach(row => {
    const rowId = row.id.replace('ordenRow_', '');
    const select = document.getElementById(`productoSelect_${rowId}`);
    const cantidadInput = document.getElementById(`cantidadInput_${rowId}`);
    if (!select || !cantidadInput) return;

    const selectedOption = select.options[select.selectedIndex];
    const precio = selectedOption ? parseFloat(selectedOption.dataset.precio || 0) : 0;
    const cantidad = parseInt(cantidadInput.value) || 0;
    total += precio * cantidad;
  });

  document.getElementById('ordenTotal').textContent = `$${total.toFixed(2)}`;

  // Actualizar seña al 50% del total (por defecto)
  const senaPorDefecto = (total / 2).toFixed(2);
  const inputSena = document.getElementById('ordenSena');
  if (inputSena && !inputSena.value) {
    inputSena.value = senaPorDefecto;
  }

  // Actualizar resto a pagar
  actualizarRestoAPagar();
}

function actualizarRestoAPagar() {
  const total = parseFloat(document.getElementById('ordenTotal').textContent.replace('$', '')) || 0;
  const sena = parseFloat(document.getElementById('ordenSena').value) || 0;
  const resto = total - sena;

  document.getElementById('ordenRestoAPagar').textContent = `$${Math.max(0, resto).toFixed(2)}`;
}

async function guardarOrden(e) {
  e.preventDefault();

  const btnGuardar = document.getElementById('btnGuardarOrden');
  const selectCliente = document.getElementById('selectCliente');
  const nuevoClienteForm = document.getElementById('nuevoClienteForm');
  const notas = document.getElementById('ordenNotas').value.trim();
  const fechaEntrega = document.getElementById('ordenFechaEntrega').value;
  const sena = parseFloat(document.getElementById('ordenSena').value) || 0;

  const esNuevoCliente = nuevoClienteForm.style.display !== 'none';
  let clienteId = selectCliente.value;

  if (!esNuevoCliente && !clienteId) {
    puchiaAlert('Selecciona un cliente o crea uno nuevo', 'warning');
    return;
  }

  let nuevoClienteNombre, nuevoClienteWhatsapp, nuevoClienteDni, nuevoClienteDireccion, nuevoClienteCP, nuevoClienteCiudad, nuevoClienteProvincia, nuevoClienteEmail;
  if (esNuevoCliente) {
    // Campos obligatorios
    nuevoClienteNombre = document.getElementById('nuevoClienteNombre').value.trim();
    nuevoClienteWhatsapp = document.getElementById('nuevoClienteWhatsapp').value.trim();

    // Campos opcionales
    nuevoClienteDni = document.getElementById('nuevoClienteDni').value.trim();
    nuevoClienteDireccion = document.getElementById('nuevoClienteDireccion').value.trim();
    nuevoClienteCP = document.getElementById('nuevoClienteCP').value.trim();
    nuevoClienteCiudad = document.getElementById('nuevoClienteCiudad').value.trim();
    nuevoClienteProvincia = document.getElementById('nuevoClienteProvincia').value.trim();
    nuevoClienteEmail = document.getElementById('nuevoClienteEmail').value.trim();

    if (!nuevoClienteNombre || !nuevoClienteWhatsapp) {
      puchiaAlert('Nombre y WhatsApp son requeridos para el nuevo cliente', 'warning');
      return;
    }
  }

  // Recopilar items válidos
  const tbody = document.getElementById('ordenItemsTable');
  const items = [];

  tbody.querySelectorAll('tr').forEach(row => {
    const rowId = row.id.replace('ordenRow_', '');
    const select = document.getElementById(`productoSelect_${rowId}`);
    const cantidadInput = document.getElementById(`cantidadInput_${rowId}`);
    if (!select || !cantidadInput) return;

    const productoId = select.value;
    const cantidad = parseInt(cantidadInput.value);

    if (productoId && cantidad > 0) {
      items.push({ producto_id: parseInt(productoId), cantidad });
    }
  });

  if (items.length === 0) {
    puchiaAlert('Agrega al menos 1 producto con cantidad válida', 'warning');
    return;
  }

  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    const token = localStorage.getItem('puchia_admin_token');

    // Si es cliente nuevo, crearlo primero
    if (esNuevoCliente) {
      const resCliente = await fetch(`${API_BASE_URL}/admin/clientes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: nuevoClienteNombre,
          whatsapp: nuevoClienteWhatsapp,
          dni: nuevoClienteDni || null,
          direccion: nuevoClienteDireccion || null,
          codigo_postal: nuevoClienteCP || null,
          ciudad: nuevoClienteCiudad || null,
          provincia: nuevoClienteProvincia || null,
          email: nuevoClienteEmail || null
        })
      });
      const dataCliente = await resCliente.json();
      if (!dataCliente.success) {
        puchiaAlert('Error al crear cliente: ' + (dataCliente.error || 'desconocido'), 'error');
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Orden';
        return;
      }
      clienteId = dataCliente.data.id;
    }

    // Crear orden
    const response = await fetch(`${API_BASE_URL}/admin/ordenes/manual`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cliente_id: parseInt(clienteId),
        items,
        notas: notas || null,
        fecha_entrega: fechaEntrega || null,
        sena: sena || null
      })
    });

    const data = await response.json();

    if (data.success) {
      // Guardar datos completos de orden para descargar ticket
      ordenCreadaId = data.data.id;
      ordenCreadaIdUnico = data.data.id_unico;
      ordenCreadaData = data.data;

      // Cerrar modal de crear orden y mostrar modal de éxito
      cerrarModalOrden();
      document.getElementById('modalSucesoOrden').style.display = 'flex';

      // Recargar órdenes en background (sin cerrar modal de éxito)
      loadAllOrders();
      loadRecentOrders();
    } else {
      puchiaAlert('Error al crear orden: ' + (data.error || 'desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error guardando orden:', error);
    puchiaAlert('Error de conexión: ' + error.message, 'error');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar Orden';
  }
}

function cerrarModalOrden() {
  document.getElementById('modalCrearOrden').style.display = 'none';
  document.getElementById('formCrearOrden').reset();
  document.getElementById('nuevoClienteForm').style.display = 'none';
  document.getElementById('selectCliente').disabled = false;
}

function cerrarModalSucesoOrden() {
  document.getElementById('modalSucesoOrden').style.display = 'none';
  ordenCreadaId = null;
  ordenCreadaIdUnico = null;
  ordenCreadaData = null;
}

async function descargarTicket() {
  // Usar ordenActualData si está disponible (orden pasada o nueva), sino usar ordenCreadaData
  const orden = ordenActualData || ordenCreadaData;

  if (!orden) {
    puchiaAlert('No hay orden para descargar', 'error');
    return;
  }

  const btn = event.target;
  const textOriginal = btn.textContent;
  btn.textContent = '⏳ Generando...';
  btn.disabled = true;

  try {
    const total = parseFloat(orden.total) || 0;
    const sena = parseFloat(orden.sena) || (total / 2);
    const restoPagar = total - sena;

    // Crear HTML del ticket
    const ticketHTML = `
      <div style="
        width: 400px;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        box-sizing: border-box;
        color: #333;
      ">
        <!-- HEADER PÚRPURA -->
        <div style="
          background: #7f1f6e;
          padding: 20px 15px;
          text-align: center;
          color: white;
        ">
          <img src="/assets/logo.png" style="height: 55px; margin-bottom: 8px;">
          <div style="font-size: 12px; opacity: 0.9;">Tu orden personalizada</div>
        </div>

        <!-- CONTENIDO -->
        <div style="padding: 18px 15px;">
          <!-- CÓDIGO DE ORDEN (AMARILLO SUTIL) -->
          <div style="
            background: #FFF8DC;
            border-left: 4px solid #F3E93F;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 18px;
            text-align: center;
          ">
            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600;">Código de orden</div>
            <div style="font-size: 18px; color: #7f1f6e; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${orden.id_unico}</div>
          </div>

          <!-- ESTADO -->
          <div style="margin-bottom: 15px;">
            <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600;">Estado</div>
            <div style="
              display: inline-block;
              background: #e8f5e9;
              color: #2e7d32;
              padding: 5px 10px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
            ">${orden.estado || 'Pendiente'}</div>
          </div>

          <!-- CLIENTE -->
          <div style="margin-bottom: 15px; background: #f9f9f9; padding: 12px; border-radius: 6px;">
            <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Cliente</div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; font-size: 12px;">
              <span style="color: #666; font-weight: 500;">Nombre</span>
              <span style="color: #333; font-weight: 600;">${orden.cliente_nombre || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; font-size: 12px;">
              <span style="color: #666; font-weight: 500;">Teléfono</span>
              <span style="color: #333; font-weight: 600;">${orden.cliente_whatsapp || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px;">
              <span style="color: #666; font-weight: 500;">Ciudad</span>
              <span style="color: #333; font-weight: 600;">${orden.cliente_ciudad || 'N/A'}</span>
            </div>
          </div>

          <!-- PRODUCTOS (si existen) -->
          ${orden.items && orden.items.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600;">Productos</div>
              ${orden.items.map((item, idx) => {
                const precio = parseFloat(item.precio_unitario) || 0;
                const cantidad = item.cantidad || 0;
                const subtotal = precio * cantidad;
                return `
                  <div style="background: #f9f9f9; padding: 10px; border-radius: 4px; margin-bottom: 8px; font-size: 14px;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${item.producto?.nombre || 'Producto sin nombre'}</div>
                    <div style="display: flex; justify-content: space-between; color: #666; font-size: 12px;">
                      <span>Cant: ${cantidad} × $${precio.toFixed(2)}</span>
                      <span style="color: #333; font-weight: 700;">$${subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <!-- DESGLOSE DE PAGO (MODERNO) -->
          <div style="
            background: #f9f9f9;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid #e0e0e0;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
              <div>
                <div style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Seña (50%)</div>
                <div style="font-size: 16px; font-weight: 700; color: #7f1f6e;">$${sena.toFixed(2)}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Resto a pagar</div>
                <div style="font-size: 16px; font-weight: 700; color: #333;">$${(total - sena).toFixed(2)}</div>
              </div>
            </div>
            <div style="text-align: center; font-size: 11px; color: #999;">Transferencia bancaria</div>
          </div>

          <!-- TOTAL GRANDE -->
          <div style="
            background: linear-gradient(135deg, #7f1f6e 0%, #5a1550 100%);
            color: white;
            border-radius: 6px;
            padding: 14px;
            margin-bottom: 12px;
            text-align: center;
          ">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600; opacity: 0.9;">Total de Orden</div>
            <div style="font-size: 28px; font-weight: 700;">$${total.toFixed(2)}</div>
          </div>

        </div>

        <!-- FOOTER -->
        <div style="
          padding: 15px;
          text-align: center;
          border-top: 1px solid #eee;
          background: #fafafa;
          font-style: italic;
          color: #7f1f6e;
          font-size: 18px;
          font-weight: 700;
        ">
          ¡Muchas gracias por tu compra!
        </div>
      </div>
    `;

    // Crear contenedor temporal
    const tempDiv = document.createElement('div');
    tempDiv.id = 'ticketTemporal';
    tempDiv.style.cssText = 'position: fixed; left: -9999px; top: -9999px; background: white;';
    tempDiv.innerHTML = ticketHTML;
    document.body.appendChild(tempDiv);

    // Usar html2canvas para convertir a imagen
    const canvas = await html2canvas(tempDiv.querySelector('div'), {
      scale: 2,
      backgroundColor: '#ffffff',
      allowTaint: true,
      useCORS: true
    });

    // Crear descarga
    canvas.toBlob((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${orden.id_unico}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Limpiar
      document.body.removeChild(tempDiv);

      btn.textContent = '✅ ¡Descargado!';
      setTimeout(() => {
        btn.textContent = textOriginal;
        btn.disabled = false;
      }, 2000);

      puchiaAlert('Ticket descargado exitosamente', 'success');
    });

  } catch (error) {
    console.error('Error descargando ticket:', error);
    puchiaAlert('Error al generar ticket: ' + error.message, 'error');
    btn.textContent = textOriginal;
    btn.disabled = false;
  }
}

function copiarLinkSeguimiento() {
  if (!ordenCreadaIdUnico) {
    puchiaAlert('No hay orden para obtener link', 'error');
    return;
  }

  // Crear link de seguimiento público
  const enlaceSeguimiento = `${window.location.origin}/seguimiento.html?id=${ordenCreadaIdUnico}`;

  // Copiar al portapapeles
  navigator.clipboard.writeText(enlaceSeguimiento).then(() => {
    puchiaAlert('Link de seguimiento copiado: ' + enlaceSeguimiento, 'success');
  }).catch(() => {
    puchiaAlert('Error al copiar link', 'error');
  });
}

// ==================== EDITAR ORDEN ====================
let ordenEditandoId = null;

async function abrirEditarOrden(id) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/ordenes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!data.success) {
      puchiaAlert('Error al cargar orden', 'error');
      return;
    }

    const orden = data.data;
    ordenEditandoId = orden.id;

    // Llenar modal con datos
    document.getElementById('editSena').value = orden.sena || (orden.total / 2);
    document.getElementById('editFechaEntrega').value = orden.fecha_entrega ? orden.fecha_entrega.split('T')[0] : '';
    document.getElementById('editTotal').textContent = `$${parseFloat(orden.total).toFixed(2)}`;
    document.getElementById('editOrdenCode').textContent = orden.id_unico;

    // Actualizar resto a pagar
    actualizarRestoEditarOrden();

    // Mostrar modal
    document.getElementById('modalEditarOrden').style.display = 'flex';
  } catch (error) {
    console.error('Error:', error);
    puchiaAlert('Error al cargar orden', 'error');
  }
}

function actualizarRestoEditarOrden() {
  const total = parseFloat(document.getElementById('editTotal').textContent.replace('$', '')) || 0;
  const sena = parseFloat(document.getElementById('editSena').value) || 0;
  const resto = total - sena;
  document.getElementById('editRestoAPagar').textContent = `$${Math.max(0, resto).toFixed(2)}`;
}

function cerrarEditarOrden() {
  document.getElementById('modalEditarOrden').style.display = 'none';
  ordenEditandoId = null;
}

async function guardarEditarOrden() {
  if (!ordenEditandoId) return;

  const sena = parseFloat(document.getElementById('editSena').value);
  const fechaEntrega = document.getElementById('editFechaEntrega').value;
  const total = parseFloat(document.getElementById('editTotal').textContent.replace('$', ''));

  if (!sena || sena < 0 || sena > total) {
    puchiaAlert('Seña inválida', 'warning');
    return;
  }

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/ordenes/${ordenEditandoId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sena,
        resto_a_pagar: total - sena,
        fecha_entrega: fechaEntrega || null
      })
    });

    const data = await response.json();

    if (data.success) {
      puchiaAlert('Orden actualizada exitosamente', 'success');
      cerrarEditarOrden();
      loadAllOrders(); // Recargar tabla
    } else {
      puchiaAlert('Error al actualizar: ' + (data.error || 'desconocido'), 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    puchiaAlert('Error de conexión', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Cambios';
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/ordenes/${orderId}/estado`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ estado: newStatus })
    });

    if (response.ok) {
      puchiaAlert('Estado de la orden actualizado', 'success');
      loadAllOrders();
    }
  } catch (error) {
    console.error('Error actualizando estado:', error);
  }
}

let deleteOrderId = null;
function showDeleteConfirm(orderId, ordenIdUnico) {
  deleteOrderId = orderId;
  document.getElementById('deleteOrderId').textContent = ordenIdUnico || orderId;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.style.display = 'flex';
}

function closeDeleteConfirm() {
  deleteOrderId = null;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.style.display = 'none';
}

async function confirmarEliminarOrden() {
  if (!deleteOrderId) return;

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/ordenes/${deleteOrderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      puchiaAlert('Orden eliminada exitosamente', 'success');
      closeDeleteConfirm();
      loadAllOrders();
    } else {
      const errorData = await response.json();
      puchiaAlert(errorData.mensaje || 'Error al eliminar la orden', 'error');
    }
  } catch (error) {
    console.error('Error eliminando orden:', error);
    puchiaAlert('Error al eliminar la orden', 'error');
  }
}

async function viewOrder(id) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/ordenes/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      const orden = data.data;
      const modalContent = document.getElementById('productDetailContent');

      // Guardar datos de orden (nueva o pasada) para usar en botones
      ordenCreadaId = orden.id;
      ordenCreadaIdUnico = orden.id_unico;
      ordenActualData = orden; // Guardar datos completos para descargar ticket

      const total = parseFloat(orden.total) || 0;
      const sena = parseFloat(orden.sena) || (total / 2);
      const restoPagar = total - sena;
      const fechaCompra = formatDateLong(getOrderCreatedDate(orden));
      const fechaEntrega = formatDateLong(orden.fecha_entrega) !== '—' ? formatDateLong(orden.fecha_entrega) : 'No especificada';
      const shortId = formatShortOrderId(orden);

      modalContent.innerHTML = `
        <h2>Detalle de Orden</h2>
        <div style="margin-top: 20px;">

          <!-- INFO PRINCIPAL -->
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Número de Orden</div>
                <div style="font-size: 16px; font-weight: 700; color: #7f1f6e;" title="${orden.id_unico}">${shortId}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Estado</div>
                <div style="display: inline-block; padding: 6px 12px; background: #e8f5e9; color: #2e7d32; border-radius: 20px; font-size: 12px; font-weight: 600;">${orden.estado}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Fecha de Compra</div>
                <div style="font-size: 14px; color: #333;">${fechaCompra}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Entrega Estimada</div>
                <div style="font-size: 14px; color: #333;">${fechaEntrega}</div>
              </div>
            </div>
          </div>

          <!-- CLIENTE -->
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #333;">Cliente</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
              <div><strong>Nombre:</strong> ${orden.cliente_nombre}</div>
              <div><strong>Email:</strong> ${orden.cliente_email || '—'}</div>
              <div><strong>WhatsApp:</strong> ${orden.cliente_whatsapp || '—'}</div>
              <div><strong>DNI:</strong> ${orden.cliente_dni || '—'}</div>
              <div style="grid-column: 1 / -1;"><strong>Dirección:</strong> ${orden.cliente_direccion || '—'}</div>
              <div><strong>Ciudad:</strong> ${orden.cliente_ciudad || '—'}</div>
              <div><strong>CP:</strong> ${orden.cliente_cp || '—'}</div>
            </div>
          </div>

          <!-- MONTOS -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <div style="background: linear-gradient(135deg, #7f1f6e 0%, #5a1550 100%); color: white; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 6px;">Total</div>
              <div style="font-size: 24px; font-weight: 700;">$${total.toFixed(2)}</div>
            </div>
            <div style="background: #f9f9f9; border-left: 4px solid #333; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 6px;">Seña Pagada</div>
              <div style="font-size: 20px; font-weight: 700; color: #333;">$${sena.toFixed(2)}</div>
            </div>
            <div style="background: #f0f0f0; border-left: 4px solid #666; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 6px;">Resto a Pagar</div>
              <div style="font-size: 20px; font-weight: 700; color: #333;">$${restoPagar.toFixed(2)}</div>
            </div>
          </div>

          <!-- ITEMS -->
          <h3 style="margin: 20px 0 12px 0; font-size: 14px; color: #333;">Productos</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #ddd; background: #f9f9f9;">
                <th style="text-align: left; padding: 12px; font-weight: 600; color: #333;">Producto</th>
                <th style="text-align: center; padding: 12px; font-weight: 600; color: #333; width: 80px;">Cantidad</th>
                <th style="text-align: right; padding: 12px; font-weight: 600; color: #333; width: 100px;">Precio Unit.</th>
                <th style="text-align: right; padding: 12px; font-weight: 600; color: #333; width: 100px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${orden.items.map(item => {
                const precio = parseFloat(item.precio_unitario) || 0;
                const cantidad = item.cantidad || 0;
                const subtotal = precio * cantidad;
                return `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${item.producto?.nombre || item.nombre || 'Producto'}</td>
                    <td style="text-align: center; padding: 12px;">${cantidad}</td>
                    <td style="text-align: right; padding: 12px;">$${precio.toFixed(2)}</td>
                    <td style="text-align: right; padding: 12px; font-weight: 600;">$${subtotal.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <!-- NOTAS -->
          ${orden.notas ? `
            <div style="background: #fffbf0; padding: 16px; border-left: 4px solid #F3E93F; border-radius: 8px; margin-bottom: 20px;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Notas</div>
              <div style="font-size: 13px; color: #333; line-height: 1.6;">${orden.notas}</div>
            </div>
          ` : ''}

          <!-- BOTONES DE ACCIONES -->
          <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px;">
            <button type="button" class="btn btn-primary" onclick="descargarTicket()" style="display: flex; align-items: center; gap: 8px;">
              📋 Descargar Ticket (Imagen)
            </button>
            <button type="button" class="btn btn-secondary" onclick="copiarLinkSeguimiento()" style="display: flex; align-items: center; gap: 8px;">
              🔗 Copiar Link de Seguimiento
            </button>
          </div>
        </div>
      `;

      openProductDetail();
    }
  } catch (error) {
    console.error('Error cargando orden:', error);
  }
}

function openProductDetail() {
  document.getElementById('productDetailModal').classList.add('show');
}

function closeProductDetail() {
  document.getElementById('productDetailModal').classList.remove('show');
}

// ==================== SETTINGS ====================

async function loadSettings() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('logo').value = data.data.logo || 'P';
      document.getElementById('logoText').value = data.data.logo_text || 'Puchia';
      document.getElementById('announcement').value = data.data.announcement || '';
      document.getElementById('whatsapp').value = data.data.whatsapp_number || '';
    }
  } catch (error) {
    console.error('Error cargando settings:', error);
  }
}

async function saveSettings() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        logo: document.getElementById('logo').value,
        logo_text: document.getElementById('logoText').value,
        announcement: document.getElementById('announcement').value,
        whatsapp_number: document.getElementById('whatsapp').value
      })
    });

    const data = await response.json();

    if (data.success) {
      puchiaAlert('Configuración guardada exitosamente', 'success');
    }
  } catch (error) {
    console.error('Error guardando settings:', error);
    puchiaAlert('Error al guardar la configuración', 'error');
  }
}

// ==================== MEDIA MANAGEMENT (Fase 2) ====================

const BACKEND_URL = 'https://puchia-backend-production.up.railway.app';
let mediaCurrentProductoId = null;
let mediaQueuedFiles = [];
let mediaItems = [];

// Gallery modal state
let galleryProductoId = null;
let galleryItems = [];
let galleryCurrentIdx = 0;

function initMediaSection(productoId) {
  mediaCurrentProductoId = productoId;
  mediaQueuedFiles = [];
  mediaItems = [];
  const newMsg = document.getElementById('mediaNewProductMsg');
  if (productoId) {
    if (newMsg) newMsg.style.display = 'none';
    loadProductMedia(productoId);
  } else {
    if (newMsg) newMsg.style.display = 'block';
    renderMediaGallery([]);
  }
}

async function loadProductMedia(productoId) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const resp = await fetch(`${API_BASE_URL}/admin/media/productos/${productoId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await resp.json();
    mediaItems = data.data || [];
    renderMediaGallery(mediaItems);
  } catch (err) {
    console.error('Error cargando media:', err);
    renderMediaGallery([]);
  }
}

function renderMediaGallery(items) {
  const gallery = document.getElementById('mediaGallery');
  if (!gallery) return;

  if (items.length === 0 && mediaQueuedFiles.length === 0) {
    gallery.innerHTML = '';
    return;
  }

  const serverHtml = items.map((item, idx) => {
    const esPortada = item.es_portada;
    const esVideo = item.tipo === 'video';
    const border = esPortada ? '2px solid #f59e0b' : '2px solid #e0e0e0';

    const previewHtml = esVideo
      ? `<div style="width:100%;height:100%;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px;box-sizing:border-box;">
           <span style="font-size:20px;">▶️</span>
           <span style="color:rgba(255,255,255,0.65);font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:72px;text-align:center;">${item.url.split('/').pop()}</span>
         </div>`
      : `<img src="${BACKEND_URL}${item.url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='<div style=background:#f5f5f5;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px>📷</div>'">`;

    return `<div data-media-id="${item.id}" style="position:relative;width:88px;height:88px;border-radius:8px;overflow:hidden;border:${border};flex-shrink:0;cursor:pointer;" onclick="openGalleryViewModal(${mediaCurrentProductoId}, mediaItems, ${idx})">
      ${previewHtml}
      ${esPortada ? `<div style="position:absolute;bottom:2px;left:2px;background:#f59e0b;color:white;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700;">★</div>` : ''}
      <div style="position:absolute;top:2px;right:2px;display:flex;gap:2px;">
        ${!esPortada ? `<button type="button" onclick="event.stopPropagation();setPortadaMedia(${mediaCurrentProductoId},${item.id})" title="Marcar portada" style="background:rgba(245,158,11,0.9);color:white;border:none;width:20px;height:20px;border-radius:3px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0;">📌</button>` : ''}
        <button type="button" onclick="event.stopPropagation();deleteMediaItem(${item.id})" title="Eliminar" style="background:rgba(220,50,50,0.85);color:white;border:none;width:20px;height:20px;border-radius:3px;cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;">✕</button>
      </div>
      <div style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,0.55);color:white;border-radius:3px;padding:1px 4px;font-size:9px;">${idx + 1}</div>
    </div>`;
  });

  const queuedHtml = mediaQueuedFiles.map((qf, idx) => {
    const num = items.length + idx + 1;
    const previewHtml = qf.preview
      ? `<img src="${qf.preview}" style="width:100%;height:100%;object-fit:cover;">`
      : `<div style="width:100%;height:100%;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:20px;">▶️</div>`;

    return `<div style="position:relative;width:88px;height:88px;border-radius:8px;overflow:hidden;border:2px dashed #9d4cb8;flex-shrink:0;opacity:0.85;">
      ${previewHtml}
      <button type="button" onclick="removeQueuedFile(${idx})" style="position:absolute;top:2px;right:2px;background:rgba(220,50,50,0.85);color:white;border:none;width:20px;height:20px;border-radius:3px;cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;">✕</button>
      <div style="position:absolute;bottom:2px;left:2px;background:rgba(155,77,184,0.85);color:white;border-radius:3px;padding:1px 5px;font-size:8px;font-weight:700;">COLA</div>
      <div style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,0.55);color:white;border-radius:3px;padding:1px 4px;font-size:9px;">${num}</div>
    </div>`;
  });

  gallery.innerHTML = [...serverHtml, ...queuedHtml].join('');
}

function handleMediaDrop(event) {
  event.preventDefault();
  event.currentTarget.style.background = '#faf5ff';
  handleMediaFiles(Array.from(event.dataTransfer.files));
}

function handleMediaFileSelect(event) {
  const files = Array.from(event.target.files);
  event.target.value = '';
  handleMediaFiles(files);
}

function handleMediaFiles(files) {
  const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
  const VIDEOS = ['video/mp4', 'video/webm'];
  const errores = [];
  const validos = [];

  files.forEach(file => {
    const esImagen = IMAGENES.includes(file.type);
    const esVideo = VIDEOS.includes(file.type);
    if (!esImagen && !esVideo) {
      errores.push(`${file.name}: tipo "${file.type}" no permitido`);
      return;
    }
    if (esImagen && file.size > 5 * 1024 * 1024) {
      errores.push(`${file.name}: imagen supera 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    if (esVideo && file.size > 50 * 1024 * 1024) {
      errores.push(`${file.name}: video supera 50MB`);
      return;
    }
    validos.push({ file, tipo: esImagen ? 'foto' : 'video' });
  });

  if (errores.length > 0) puchiaAlert(errores.join('\n'), 'warning', 'Archivos rechazados');
  if (validos.length === 0) return;

  if (mediaCurrentProductoId) {
    uploadFilesNow(validos, mediaCurrentProductoId);
  } else {
    validos.forEach(v => {
      const preview = v.tipo === 'foto' ? URL.createObjectURL(v.file) : null;
      mediaQueuedFiles.push({ file: v.file, tipo: v.tipo, preview });
    });
    document.getElementById('mediaNewProductMsg').style.display = 'block';
    renderMediaGallery(mediaItems);
  }
}

async function uploadFilesNow(validos, productoId) {
  const progress = document.getElementById('mediaUploadProgress');
  const bar = document.getElementById('mediaProgressBar');
  const text = document.getElementById('mediaProgressText');
  if (progress) progress.style.display = 'block';

  for (let i = 0; i < validos.length; i++) {
    const { file } = validos[i];
    if (text) text.textContent = `Subiendo ${i + 1} de ${validos.length}: ${file.name}`;
    if (bar) bar.style.width = `${(i / validos.length) * 100}%`;
    await uploadMediaFile(file, productoId);
  }

  if (bar) bar.style.width = '100%';
  if (text) text.textContent = '✓ Completado';
  setTimeout(() => { if (progress) progress.style.display = 'none'; }, 1500);

  await loadProductMedia(productoId);
  loadProducts();
}

async function uploadMediaFile(file, productoId) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const formData = new FormData();
    formData.append('archivo', file);
    const resp = await fetch(`${API_BASE_URL}/admin/media/productos/${productoId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) throw new Error(data.error || 'Error al subir');
    return data.data;
  } catch (err) {
    puchiaAlert(`Error subiendo ${file.name}: ${err.message}`, 'error');
    return null;
  }
}

async function uploadQueuedMedia(productoId) {
  if (mediaQueuedFiles.length === 0) return;
  const progress = document.getElementById('mediaUploadProgress');
  const bar = document.getElementById('mediaProgressBar');
  const text = document.getElementById('mediaProgressText');
  if (progress) progress.style.display = 'block';

  for (let i = 0; i < mediaQueuedFiles.length; i++) {
    const qf = mediaQueuedFiles[i];
    if (text) text.textContent = `Subiendo ${i + 1} de ${mediaQueuedFiles.length}...`;
    if (bar) bar.style.width = `${(i / mediaQueuedFiles.length) * 100}%`;
    if (qf.preview) URL.revokeObjectURL(qf.preview);
    await uploadMediaFile(qf.file, productoId);
  }

  if (bar) bar.style.width = '100%';
  if (text) text.textContent = '✓ Archivos subidos';
  setTimeout(() => { if (progress) progress.style.display = 'none'; }, 2000);
  mediaQueuedFiles = [];
}

function removeQueuedFile(idx) {
  if (mediaQueuedFiles[idx]?.preview) URL.revokeObjectURL(mediaQueuedFiles[idx].preview);
  mediaQueuedFiles.splice(idx, 1);
  renderMediaGallery(mediaItems);
}

async function deleteMediaItem(mediaId) {
  const ok = await puchiaConfirm('¿Eliminar este archivo de la galería?', '¿Eliminar media?');
  if (!ok) return;
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const resp = await fetch(`${API_BASE_URL}/admin/media/${mediaId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await resp.json();
    if (resp.ok && data.success) {
      await loadProductMedia(mediaCurrentProductoId);
      loadProducts();
    } else {
      puchiaAlert(data.error || 'Error al eliminar', 'error');
    }
  } catch (err) {
    puchiaAlert('Error al eliminar media', 'error');
  }
}

async function setPortadaMedia(productoId, mediaId) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const resp = await fetch(`${API_BASE_URL}/admin/media/productos/${productoId}/media/${mediaId}/portada`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await resp.json();
    if (resp.ok && data.success) {
      await loadProductMedia(productoId);
      loadProducts();
    } else {
      puchiaAlert(data.error || 'Error', 'error');
    }
  } catch (err) {
    puchiaAlert('Error al marcar portada', 'error');
  }
}

// ==================== GALLERY VIEW MODAL ====================

function openProductGallery(productoId) {
  const product = productosGlobal.find(p => p.id === productoId);
  if (!product) return;
  const items = product.media || [];
  if (items.length === 0) {
    puchiaAlert('Este producto no tiene fotos o videos cargados.', 'info', 'Sin media');
    return;
  }
  openGalleryViewModal(productoId, items, 0);
}

function openGalleryViewModal(productoId, items, startIdx = 0) {
  if (!items || items.length === 0) return;
  galleryProductoId = productoId;
  galleryItems = [...items];
  galleryCurrentIdx = Math.min(startIdx, items.length - 1);

  const modal = document.getElementById('galleryViewModal');
  if (!modal) return;
  renderGalleryModal();
  modal.style.display = 'flex';
}

function closeGalleryViewModal() {
  const modal = document.getElementById('galleryViewModal');
  if (modal) modal.style.display = 'none';
  const video = document.getElementById('galleryMainVideo');
  if (video) { video.pause(); video.src = ''; }
}

function renderGalleryModal() {
  if (galleryItems.length === 0) return;
  const item = galleryItems[galleryCurrentIdx];

  const imgEl = document.getElementById('galleryMainImg');
  const videoEl = document.getElementById('galleryMainVideo');
  const counter = document.getElementById('galleryCounter');
  const portadaBadge = document.getElementById('galleryPortadaBadge');
  const title = document.getElementById('galleryTitle');

  if (title) title.textContent = `Producto #${galleryProductoId} — Galería`;
  if (counter) counter.textContent = `${galleryCurrentIdx + 1} / ${galleryItems.length}`;
  if (portadaBadge) portadaBadge.style.display = item.es_portada ? 'block' : 'none';

  if (item.tipo === 'video') {
    if (imgEl) imgEl.style.display = 'none';
    if (videoEl) {
      videoEl.style.display = 'block';
      videoEl.src = `${BACKEND_URL}${item.url}`;
      videoEl.load();
    }
  } else {
    if (videoEl) { videoEl.style.display = 'none'; videoEl.pause(); videoEl.src = ''; }
    if (imgEl) {
      imgEl.style.display = 'block';
      imgEl.src = `${BACKEND_URL}${item.url}`;
    }
  }

  const thumbsEl = document.getElementById('galleryThumbs');
  if (thumbsEl) {
    thumbsEl.innerHTML = galleryItems.map((it, idx) => {
      const isCurrent = idx === galleryCurrentIdx;
      const border = isCurrent ? '2.5px solid #9d4cb8' : (it.es_portada ? '2.5px solid #f59e0b' : '1.5px solid #444');
      const opacity = isCurrent ? '1' : '0.65';
      const previewHtml = it.tipo === 'video'
        ? `<div style="width:100%;height:100%;background:#111;display:flex;align-items:center;justify-content:center;font-size:16px;">▶</div>`
        : `<img src="${BACKEND_URL}${it.url}" style="width:100%;height:100%;object-fit:cover;">`;

      return `<div onclick="galleryGoTo(${idx})" style="width:58px;height:58px;border-radius:6px;overflow:hidden;border:${border};cursor:pointer;flex-shrink:0;opacity:${opacity};transition:opacity 0.2s;">${previewHtml}</div>`;
    }).join('');

    setTimeout(() => {
      const active = thumbsEl.children[galleryCurrentIdx];
      if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    }, 50);
  }
}

function galleryGoTo(idx) {
  galleryCurrentIdx = idx;
  renderGalleryModal();
}

function navigateGallery(dir) {
  const newIdx = galleryCurrentIdx + dir;
  if (newIdx < 0 || newIdx >= galleryItems.length) return;
  galleryCurrentIdx = newIdx;
  renderGalleryModal();
}

async function setPortadaFromGallery() {
  const item = galleryItems[galleryCurrentIdx];
  if (!item || !galleryProductoId) return;
  await setPortadaMedia(galleryProductoId, item.id);
  galleryItems.forEach(it => { it.es_portada = false; });
  galleryItems[galleryCurrentIdx].es_portada = true;
  renderGalleryModal();
  if (mediaCurrentProductoId === galleryProductoId) renderMediaGallery(mediaItems);
}

async function deleteFromGallery() {
  const item = galleryItems[galleryCurrentIdx];
  if (!item) return;
  const ok = await puchiaConfirm('¿Eliminar este archivo?', '¿Eliminar?');
  if (!ok) return;
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const resp = await fetch(`${API_BASE_URL}/admin/media/${item.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await resp.json();
    if (resp.ok && data.success) {
      galleryItems.splice(galleryCurrentIdx, 1);
      if (galleryItems.length === 0) {
        closeGalleryViewModal();
        loadProducts();
        return;
      }
      galleryCurrentIdx = Math.min(galleryCurrentIdx, galleryItems.length - 1);
      renderGalleryModal();
      loadProducts();
      if (mediaCurrentProductoId === galleryProductoId) await loadProductMedia(galleryProductoId);
    } else {
      puchiaAlert(data.error || 'Error al eliminar', 'error');
    }
  } catch (err) {
    puchiaAlert('Error al eliminar', 'error');
  }
}

// ==================== QUILL.JS EDITOR ====================

let quillEditor = null;

function initQuillEditor() {
  if (quillEditor) {
    quillEditor.enable(true);
    quillEditor.setContents([]);
    return;
  }

  const editorEl = document.getElementById('descripcion-editor');
  if (!editorEl) return;

  quillEditor = new Quill('#descripcion-editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['clean']
      ]
    },
    placeholder: 'Escribe la descripción del producto aquí...'
  });

  // Agregar botón de emojis personalizado
  const toolbar = document.querySelector('#descripcion-editor .ql-toolbar');
  if (toolbar && !toolbar.querySelector('.ql-emoji')) {
    const emojiBtn = document.createElement('button');
    emojiBtn.className = 'ql-emoji';
    emojiBtn.innerHTML = '😀';
    emojiBtn.title = 'Emojis';
    emojiBtn.type = 'button';
    emojiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openEmojiSelector('descripcion');
    });
    toolbar.appendChild(emojiBtn);
  }
}


function openEmojiSelector() {
  let modal = document.getElementById('emojiSelectorModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'emojiSelectorModal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 20px;
        width: 100%;
        max-width: 400px;
        max-height: 500px;
        overflow-y: auto;
      ">
        <h3 style="margin-top: 0; margin-bottom: 16px; color: #333;">Selecciona un emoji</h3>
        <div id="emojiGrid" style="
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        "></div>
        <button onclick="document.getElementById('emojiSelectorModal').style.display='none'" style="
          width: 100%;
          padding: 10px;
          margin-top: 16px;
          background: #f0e6f6;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          color: #7f1f6e;
        ">Cerrar</button>
      </div>
    `;
    document.body.appendChild(modal);

    const emojis = [
      '😊', '😄', '😍', '😎', '🤔', '😅', '😭',
      '👍', '👌', '✌️', '🙌', '👏', '❤️', '🔥',
      '🍕', '🍔', '🍜', '🍰', '☕', '⚽', '🏀',
      '🎾', '⛳', '✨', '🎉', '⭐', '💯', '🎈'
    ];

    const grid = document.getElementById('emojiGrid');
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.innerHTML = emoji;
      btn.style.cssText = `
        padding: 12px;
        font-size: 24px;
        border: 1px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        background: white;
        transition: all 0.2s;
      `;
      btn.onmouseover = () => {
        btn.style.transform = 'scale(1.2)';
        btn.style.background = '#f0e6f6';
      };
      btn.onmouseout = () => {
        btn.style.transform = 'scale(1)';
        btn.style.background = 'white';
      };
      btn.onclick = (e) => {
        e.preventDefault();
        if (quillEditor) {
          const range = quillEditor.getSelection();
          const index = range ? range.index : quillEditor.getLength();
          quillEditor.insertText(index, emoji);
        }
        document.getElementById('emojiSelectorModal').style.display = 'none';
      };
      grid.appendChild(btn);
    });
  }

  modal.style.display = 'flex';
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };
}

// Autoguardado en localStorage
function setupQuillAutosave(productoId) {
  // Limpiar intervalo anterior si existe
  if (window.autosaveInterval_desc) clearInterval(window.autosaveInterval_desc);

  // Cargar autoguardado para descripcion_completa
  const autosaveKey_desc = `quill_autosave_desc_${productoId}`;
  const autosave_desc = localStorage.getItem(autosaveKey_desc);
  if (autosave_desc && quillEditor) {
    try {
      quillEditor.root.innerHTML = autosave_desc;
      console.log(`[Autosave] Descripción cargada desde localStorage para producto ${productoId}`);
    } catch (e) {
      console.warn('[Autosave] Error cargando descripción:', e);
    }
  }

  // Guardar descripcion_completa cada 10 segundos
  window.autosaveInterval_desc = setInterval(() => {
    if (quillEditor) {
      const content = quillEditor.root.innerHTML;
      localStorage.setItem(autosaveKey_desc, content);
      console.log(`[Autosave] Descripción guardada a las ${new Date().toLocaleTimeString()}`);
    }
  }, 10000);
}

// Limpiar autoguardado cuando se cierra modal
function cleanupQuillAutosave() {
  if (window.autosaveInterval_desc) {
    clearInterval(window.autosaveInterval_desc);
    window.autosaveInterval_desc = null;
  }
}


// Wrapper para inicializar Quill editor
const originalOpenNewProductModal = openNewProductModal;
openNewProductModal = function() {
  originalOpenNewProductModal();
  setTimeout(() => {
    initQuillEditor();
    if (quillEditor) quillEditor.setContents([]);
    setupQuillAutosave('new');
  }, 100);
};

const originalEditProduct = editProduct;
editProduct = function(id) {
  originalEditProduct(id);
  setTimeout(() => {
    initQuillEditor();

    if (quillEditor && productoActualEnEdicion?.descripcion_completa) {
      try {
        quillEditor.root.innerHTML = productoActualEnEdicion.descripcion_completa;
      } catch (e) {
        quillEditor.setContents([]);
      }
    }

    setupQuillAutosave(id);
  }, 100);
};

const originalDuplicarProducto = duplicarProducto;
duplicarProducto = function(id) {
  originalDuplicarProducto(id);
  setTimeout(() => {
    initQuillEditor();

    const original = productosGlobal.find(p => p.id === id);

    if (quillEditor && original?.descripcion_completa) {
      try {
        quillEditor.root.innerHTML = original.descripcion_completa;
      } catch (e) {
        quillEditor.setContents([]);
      }
    }

    setupQuillAutosave('duplicate');
  }, 100);
};

/* ==================== EXPORTAR/IMPORTAR PRODUCTOS ==================== */

function exportarProductos() {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <h2 style="margin-bottom: 20px; color: #7b2d8e;">Exportar Productos</h2>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; border: 1px solid #ddd; border-radius: 8px; transition: all 0.2s;">
          <input type="radio" name="export-option" value="todos" checked style="cursor: pointer;">
          <span style="flex: 1;">
            <strong>Exportar TODOS los productos</strong>
            <div style="font-size: 12px; color: #999;">Descarga todos los productos activos</div>
          </span>
        </label>

        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; border: 1px solid #ddd; border-radius: 8px; transition: all 0.2s;">
          <input type="radio" name="export-option" value="categoria" style="cursor: pointer;">
          <span style="flex: 1;">
            <strong>Exportar por CATEGORÍA</strong>
            <div style="font-size: 12px; color: #999;">Selecciona una categoría</div>
          </span>
        </label>

        <div id="categoria-select" style="display: none; margin-left: 28px;">
          <select id="selectCategoria" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
            <option value="">-- Selecciona una categoría --</option>
            <option value="cumpleanos">Cumpleaños</option>
            <option value="regalos">Regalos</option>
            <option value="emprendedores">Emprendedores</option>
            <option value="promos">Promos</option>
          </select>
        </div>

        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; border: 1px solid #ddd; border-radius: 8px; transition: all 0.2s;">
          <input type="radio" name="export-option" value="plantilla" style="cursor: pointer;">
          <span style="flex: 1;">
            <strong>Exportar PLANTILLA VACÍA</strong>
            <div style="font-size: 12px; color: #999;">Solo encabezados y filas de ejemplo</div>
          </span>
        </label>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button onclick="this.closest('.modal').remove()" style="flex: 1; padding: 10px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancelar</button>
        <button onclick="ejecutarExportacion()" style="flex: 1; padding: 10px; background: #7b2d8e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Descargar Excel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.querySelectorAll('input[name="export-option"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const categoriaSelect = document.getElementById('categoria-select');
      if (radio.value === 'categoria') {
        categoriaSelect.style.display = 'block';
      } else {
        categoriaSelect.style.display = 'none';
      }
    });
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function ejecutarExportacion() {
  const opcion = document.querySelector('input[name="export-option"]:checked').value;
  const categoria = document.getElementById('selectCategoria')?.value;

  let productos = [];
  const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
  let nombreArchivo = '';

  if (opcion === 'todos') {
    productos = productosGlobal || [];
    nombreArchivo = `productos_export_${fecha}.xlsx`;
  } else if (opcion === 'categoria') {
    if (!categoria) {
      alert('Selecciona una categoría');
      return;
    }
    productos = (productosGlobal || []).filter(p => p.category === categoria);
    nombreArchivo = `productos_${categoria}_${fecha}.xlsx`;
  } else if (opcion === 'plantilla') {
    productos = [];
    nombreArchivo = 'plantilla_productos.xlsx';
  }

  const datos = productos.map(p => ({
    nombre: p.nombre,
    precio: p.precio,
    stock_cantidad: p.stock_cantidad || 0,
    stock_type: p.stock_type || 'simple',
    categorias: p.categorias?.map(c => c.nombre).join(', ') || '',
    habilitado: p.habilitado ? 'si' : 'no',
    descripcion_completa: p.descripcion || ''
  }));

  if (opcion === 'plantilla') {
    for (let i = 0; i < 5; i++) {
      datos.push({
        nombre: '',
        precio: '',
        stock_cantidad: '',
        stock_type: '',
        categorias: '',
        habilitado: '',
        descripcion_completa: ''
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 40 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, nombreArchivo);

  document.querySelector('.modal.show')?.remove();
  showToast('Excel descargado exitosamente', 'success');
}

function importarProductos() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        validarYImportarProductos(jsonData);
      } catch (error) {
        showToast('Error al leer el archivo Excel: ' + error.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

function validarYImportarProductos(jsonData) {
  const errores = [];
  const productosValidos = [];

  const columnasRequeridas = ['nombre', 'precio', 'stock_cantidad', 'stock_type', 'categorias', 'habilitado', 'descripcion_completa'];
  const columnasPresentes = Object.keys(jsonData[0] || {});

  for (const col of columnasRequeridas) {
    if (!columnasPresentes.map(c => c.toLowerCase()).includes(col.toLowerCase())) {
      errores.push(`Falta columna requerida: ${col}`);
    }
  }

  if (errores.length > 0) {
    mostrarErroresImportacion(errores);
    return;
  }

  jsonData.forEach((fila, index) => {
    const filaNum = index + 2;
    const erroresFila = [];

    if (!fila.nombre || fila.nombre.toString().trim() === '') {
      erroresFila.push('Nombre requerido');
    }

    const precio = parseFloat(fila.precio);
    if (isNaN(precio) || precio <= 0) {
      erroresFila.push('Precio debe ser número positivo');
    }

    const stock = parseInt(fila.stock_cantidad);
    if (isNaN(stock) || stock < 0) {
      erroresFila.push('Stock debe ser número >= 0');
    }

    const stockType = (fila.stock_type || '').toString().toLowerCase().trim();
    if (!['producto_simple', 'insumo'].includes(stockType)) {
      erroresFila.push('Stock type debe ser "producto_simple" o "insumo"');
    }

    const habilitado = (fila.habilitado || '').toString().toLowerCase().trim();
    if (!['si', 'no', 'true', 'false', 'verdadero', 'falso'].includes(habilitado)) {
      erroresFila.push('Habilitado debe ser si/no o true/false');
    }

    if (erroresFila.length > 0) {
      errores.push(`Fila ${filaNum}: ${erroresFila.join(', ')}`);
    } else {
      productosValidos.push({
        nombre: fila.nombre.toString().trim(),
        precio: precio,
        stock_cantidad: stock,
        stock_type: stockType === 'producto_simple' ? 'producto_simple' : 'insumo',
        categorias: (fila.categorias || '').toString().trim().split(',').map(c => c.trim()).filter(c => c),
        habilitado: ['si', 'true', 'verdadero'].includes(habilitado),
        descripcion: (fila.descripcion_completa || '').toString().trim()
      });
    }
  });

  if (errores.length > 0) {
    mostrarErroresImportacion(errores);
    return;
  }

  mostrarConfirmacionImportacion(productosValidos);
}

function mostrarErroresImportacion(errores) {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; max-height: 80vh; overflow-y: auto;">
      <h2 style="margin-bottom: 20px; color: #c5221f;">Errores en la importación</h2>
      <div style="background: #fce8e6; border: 1px solid #f1d5d3; border-radius: 8px; padding: 16px; margin-bottom: 20px; max-height: 300px; overflow-y: auto;">
        ${errores.map((e, i) => `<div style="margin-bottom: 8px; font-size: 13px;">❌ ${e}</div>`).join('')}
      </div>
      <div style="background: #fff3cd; border: 1px solid #ffe69c; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px;">
        ⚠️ Verifica los datos en el Excel y vuelve a intentar. Recuerda que las categorías deben existir en el sistema.
      </div>
      <button onclick="this.closest('.modal').remove()" style="width: 100%; padding: 10px; background: #7b2d8e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function mostrarConfirmacionImportacion(productos) {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <h2 style="margin-bottom: 20px; color: #7b2d8e;">Confirmar importación</h2>
      <div style="background: #f0f0f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 700; color: #7b2d8e;">${productos.length}</div>
        <div style="color: #666;">productos para importar</div>
      </div>
      <div style="display: flex; gap: 12px;">
        <button onclick="this.closest('.modal').remove()" style="flex: 1; padding: 10px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancelar</button>
        <button onclick="ejecutarImportacion(${JSON.stringify(productos).replace(/"/g, '&quot;')})" style="flex: 1; padding: 10px; background: #22c55e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Confirmar Importación</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function ejecutarImportacion(productos) {
  try {
    const response = await fetch(`${API_BASE_URL}/productos/importar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAdminToken()}`
      },
      body: JSON.stringify({ productos })
    });

    if (response.ok) {
      const data = await response.json();
      document.querySelector('.modal.show')?.remove();
      showToast(`✅ ${data.data.insertados} productos importados exitosamente`, 'success');
      loadProductsTable();
    } else {
      const error = await response.json();
      showToast('Error: ' + (error.error || 'Error en la importación'), 'error');
    }
  } catch (error) {
    showToast('Error al conectar con el servidor: ' + error.message, 'error');
  }
}

// Agregar event listeners a botones
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportProductBtn');
  const importBtn = document.getElementById('importProductBtn');

  if (exportBtn) exportBtn.addEventListener('click', exportarProductos);
  if (importBtn) importBtn.addEventListener('click', importarProductos);
});

// ==================== CATEGORÍAS CRUD ====================

async function loadCategorias() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/categorias`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    renderCategorias(data.data || []);
  } catch (error) {
    console.error('Error cargando categorías:', error);
    puchiaAlert('Error al cargar categorías', 'error');
  }
}

function renderCategorias(categorias) {
  const tbody = document.getElementById('categorias-list');
  if (!categorias || categorias.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999; padding: 20px;">Sin categorías registradas</td></tr>';
    return;
  }

  tbody.innerHTML = categorias.map(cat => `
    <tr>
      <td>${cat.id}</td>
      <td><strong>${cat.nombre}</strong></td>
      <td style="color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${cat.descripcion || '—'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editarCategoria(${cat.id}, '${cat.nombre.replace(/'/g, "\\'")}', '${(cat.descripcion || '').replace(/'/g, "\\'")}')" title="Editar">✏️ Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarCategoria(${cat.id})" title="Eliminar">🗑️ Eliminar</button>
      </td>
    </tr>
  `).join('');
}

async function guardarCategoria() {
  const nombre = document.getElementById('categoriaNombre').value.trim();
  const descripcion = document.getElementById('categoriaDescripcion').value.trim();
  const categoriaId = document.getElementById('categoriaId').value;

  // Validar nombre
  if (!nombre) {
    puchiaAlert('El nombre de la categoría es requerido', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const method = categoriaId ? 'PUT' : 'POST';
    const url = categoriaId
      ? `${API_BASE_URL}/admin/categorias/${categoriaId}`
      : `${API_BASE_URL}/admin/categorias`;

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nombre: nombre,
        descripcion: descripcion || null
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const accion = categoriaId ? 'actualizada' : 'creada';
      puchiaAlert(`Categoría ${accion} exitosamente`, 'success');

      // Limpiar formulario
      document.getElementById('categoriaId').value = '';
      document.getElementById('categoriaNombre').value = '';
      document.getElementById('categoriaDescripcion').value = '';
      document.getElementById('cancelarCategoriaBtn').style.display = 'none';

      // Recargar tabla
      loadCategorias();
    } else {
      puchiaAlert(data.message || 'Error al guardar la categoría', 'error');
    }
  } catch (error) {
    console.error('Error en guardarCategoria:', error);
    puchiaAlert('Error al conectar con el servidor: ' + error.message, 'error');
  }
}

function editarCategoria(id, nombre, descripcion) {
  document.getElementById('categoriaId').value = id;
  document.getElementById('categoriaNombre').value = nombre;
  document.getElementById('categoriaDescripcion').value = descripcion;
  document.getElementById('cancelarCategoriaBtn').style.display = 'inline-block';
  document.getElementById('categoriaNombre').focus();
}

async function eliminarCategoria(id) {
  const confirmar = await puchiaConfirm('¿Estás seguro de que quieres eliminar esta categoría?', '⚠️ Eliminar Categoría');

  if (!confirmar) return;

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/categorias/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok || response.status === 204) {
      puchiaAlert('Categoría eliminada exitosamente', 'success');
      loadCategorias();
    } else {
      const data = await response.json();
      puchiaAlert(data.message || 'Error al eliminar la categoría', 'error');
    }
  } catch (error) {
    console.error('Error en eliminarCategoria:', error);
    puchiaAlert('Error al conectar con el servidor: ' + error.message, 'error');
  }
}

// Agregar event listeners para categorías
document.addEventListener('DOMContentLoaded', () => {
  const guardarBtn = document.getElementById('guardarCategoriaBtn');
  const cancelarBtn = document.getElementById('cancelarCategoriaBtn');

  if (guardarBtn) {
    guardarBtn.addEventListener('click', guardarCategoria);
  }

  if (cancelarBtn) {
    cancelarBtn.addEventListener('click', () => {
      document.getElementById('categoriaId').value = '';
      document.getElementById('categoriaNombre').value = '';
      document.getElementById('categoriaDescripcion').value = '';
      cancelarBtn.style.display = 'none';
    });
  }
});

// ==================== ESTATUS DE ÓRDENES ====================

let orderStatuses = [];

async function loadOrderStatuses() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch('https://puchia-backend-production.up.railway.app/api/v1/admin/order-statuses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    orderStatuses = data.data || [];
    console.log('Estados de orden cargados:', orderStatuses);
  } catch (error) {
    console.error('Error cargando estados:', error);
  }
}

function getStatusBadge(status) {
  const statusObj = orderStatuses.find(s => s.nombre === status);
  if (!statusObj) return `<span class="badge">${status}</span>`;

  const colors = {
    'Pendiente': '#FFA500',
    'En Edición': '#1E90FF',
    'Preparándose': '#9370DB',
    'Listo para Retirar': '#32CD32',
    'Entregado': '#228B22'
  };

  return `<span class="badge" style="background-color: ${colors[status] || '#666'}">${status}</span>`;
}