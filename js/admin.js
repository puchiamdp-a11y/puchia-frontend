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
    console.log('📍 [loadAdminCategories] Iniciando carga de categorías...');
    const response = await fetch(`${API_BASE_URL}/categorias`);
    const data = await response.json();
    adminCategories = data.data || [];
    console.log('✅ [loadAdminCategories] Categorías cargadas:', adminCategories.length, 'categorías');
    adminCategories.forEach(cat => console.log('  -', cat.nombre));
  } catch (error) {
    console.error('❌ [loadAdminCategories] Error cargando categorías:', error);
  }
}

function populateProductCategoryDropdown() {
  const select = document.getElementById('productCategoria');
  if (!select) return;

  console.log('📍 [populateProductCategoryDropdown] Llenando dropdown con', adminCategories.length, 'categorías');

  if (adminCategories.length === 0) {
    select.innerHTML = '<option value="">-- Sin categorías disponibles --</option>';
    select.disabled = true;
    return;
  }

  select.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
  select.disabled = false;

  adminCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.nombre;
    select.appendChild(option);
  });
}

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', async () => {
  checkAdminAuth();
  await loadAdminCategories();
  await loadOrderStatuses();
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
  // Menu toggle handler para Stock
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const toggleItem = menuToggle.closest('.menu-toggle-item');
      toggleItem.classList.toggle('expanded');
      console.log('Stock menu toggled:', toggleItem.classList.contains('expanded'));
    });
  }

  // Navegación sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a:not(.menu-toggle)');
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
        } else if (page === 'stocks') {
          initStocks();
        } else if (page === 'insumos') {
          loadInsumos();
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

  // Modal Stock
  document.getElementById('formStock')?.addEventListener('submit', guardarStock);

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

  // Insumos
  document.getElementById('newInsumoBtn')?.addEventListener('click', openNewInsumoModal);
  document.getElementById('formInsumo')?.addEventListener('submit', saveInsumo);
  document.getElementById('insumoSearchInput')?.addEventListener('input', (e) => {
    insumosFiltroTexto = e.target.value;
    aplyInsumoFilters();
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
      ? `<td style="padding:6px;"><img src="${BACKEND_URL}${portada.url}" class="image-thumbnail-small" style="cursor:pointer;display:block;" onclick="openProductGallery(${p.id})" title="Ver galería" onerror="this.outerHTML='<span style=font-size:22px>${emoji}</span>'"></td>`
      : `<td style="padding:6px;text-align:center;"><span style="font-size:22px;" title="Sin fotos">${emoji}</span></td>`;

    return `<tr>
      <td>${p.id}</td>
      ${fotoCell}
      <td>${p.nombre}</td>
      <td>$${precio}</td>
      <td id="stock-cell-${p.id}" style="cursor: pointer; padding: 8px; border-radius: 4px; background-color: transparent; transition: background 0.2s;" onclick="editarStock(${p.id}, ${p.stock_cantidad || 0})" onmouseover="this.style.backgroundColor='#f0f0f0'" onmouseout="this.style.backgroundColor='transparent'">${stockVal}</td>
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
  loadInsumosForForm();
  toggleProductTypeFields();
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

  // Cargar insumos y esperar a que se complete
  loadInsumosForForm().then(() => {
    // Si es producto tipo insumo, restaurar insumo_id y variante
    if (productoActualEnEdicion.stock_type === 'insumo' && productoActualEnEdicion.producto_insumo) {
      console.log('📍 [editProduct] Restaurando insumo para producto:', id);
      console.log('📍 [editProduct] producto_insumo:', productoActualEnEdicion.producto_insumo);

      const insumoId = productoActualEnEdicion.producto_insumo.insumo_id;
      document.getElementById('productInsumo').value = insumoId || '';

      // Cargar variantes del insumo y restaurar selección
      loadInsumoVariantes().then(() => {
        if (productoActualEnEdicion.producto_insumo?.insumo_variant_id) {
          document.getElementById('productInsumoVariante').value = productoActualEnEdicion.producto_insumo.insumo_variant_id;
          console.log('✅ [editProduct] Variante restaurada:', productoActualEnEdicion.producto_insumo.insumo_variant_id);
        }
      });
    }
  });

  toggleProductTypeFields(true);  // true = estamos editando, no cargar insumos nuevamente

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

/**
 * Muestra/oculta campos según tipo de producto seleccionado
 */
function toggleProductTypeFields(isEditing = false) {
  const stockType = document.querySelector('input[name="stockType"]:checked').value;

  // Ocultar todas las secciones
  document.getElementById('simpleStockSection').style.display = 'none';
  document.getElementById('insumoSection').style.display = 'none';
  document.getElementById('insumoVarianteSection').style.display = 'none';

  // Mostrar según tipo
  if (stockType === 'simple') {
    document.getElementById('simpleStockSection').style.display = 'flex';
  } else if (stockType === 'insumo') {
    document.getElementById('insumoSection').style.display = 'flex';
    document.getElementById('insumoVarianteSection').style.display = 'flex';
    // Solo cargar insumos si NO estamos editando (editProduct ya lo hace)
    if (!isEditing) {
      loadInsumosForForm();
    }
  }
  // Si es 'infinito' no muestra nada de stock
}

/**
 * Carga variantes del insumo seleccionado
 */
async function loadInsumoVariantes() {
  const insumoId = document.getElementById('productInsumo').value;
  if (!insumoId) {
    document.getElementById('productInsumoVariante').innerHTML = '<option value="">-- Selecciona insumo primero --</option>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/insumos/${insumoId}`);
    const data = await response.json();

    console.log('📍 [loadInsumoVariantes] Insumo cargado:', data);

    if (data.data && data.data.insumo_variants) {
      const varianteSelect = document.getElementById('productInsumoVariante');
      varianteSelect.innerHTML = '<option value="">-- Selecciona variante (opcional) --</option>';
      data.data.insumo_variants.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `${v.nombre} (Stock: ${v.cantidad_en_stock})`;
        varianteSelect.appendChild(opt);
      });
      console.log('✅ [loadInsumoVariantes] Variantes cargadas:', data.data.insumo_variants.length);
    } else {
      console.warn('⚠️ [loadInsumoVariantes] Insumo sin variantes:', data.data?.nombre);
      document.getElementById('productInsumoVariante').innerHTML = '<option value="">-- Este insumo no tiene variantes --</option>';
    }
  } catch (error) {
    console.error('❌ [loadInsumoVariantes] Error cargando variantes:', error);
  }
}

/**
 * Carga lista de insumos disponibles - retorna Promise
 */
async function loadInsumosForForm() {
  try {
    const response = await fetch(`${API_BASE_URL}/insumos`);
    const data = await response.json();

    console.log('📍 [loadInsumosForForm] Insumos cargados:', data);

    if (data.data && Array.isArray(data.data)) {
      const insumoSelect = document.getElementById('productInsumo');
      insumoSelect.innerHTML = '<option value="">-- Selecciona insumo --</option>';
      data.data.forEach(insumo => {
        const opt = document.createElement('option');
        opt.value = insumo.id;
        opt.textContent = `${insumo.nombre} (${insumo.insumo_variants ? insumo.insumo_variants.length : 0} variantes)`;
        insumoSelect.appendChild(opt);
      });
      console.log('✅ [loadInsumosForForm] Dropdown de insumos actualizado con', data.data.length, 'insumos');
      return Promise.resolve();
    } else {
      console.warn('⚠️ [loadInsumosForForm] Respuesta sin datos:', data);
      return Promise.resolve();
    }
  } catch (error) {
    console.error('❌ [loadInsumosForForm] Error cargando insumos:', error);
    return Promise.resolve();
  }
}

async function saveProduct(e) {
  e.preventDefault();

  const nombre = document.getElementById('productNombre').value;
  const precio = document.getElementById('productPrecio').value;
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

  // Validar según tipo de producto
  if (stockType === 'simple') {
    const stock = document.getElementById('productStock').value;
    if (!stock || stock < 0) {
      puchiaAlert('Debes ingresar un stock válido para producto simple', 'warning');
      return;
    }
  } else if (stockType === 'insumo') {
    const insumoId = document.getElementById('productInsumo')?.value;
    if (!insumoId) {
      puchiaAlert('Debes seleccionar un insumo', 'warning');
      return;
    }
    // Variante es opcional - si no se selecciona, se muestran todas las variantes al cliente
  }
  // Si es 'infinito' no necesita validación de stock

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
      stock_type: stockType,
      categorias: [Number(categoriaId)],
      habilitado
    };
    console.log('DEBUG saveProduct - requestPayload:', requestPayload);

    // Agregar datos según tipo de producto
    if (stockType === 'simple') {
      const stock = document.getElementById('productStock').value;
      requestPayload.stock_cantidad = Number(stock);
      requestPayload.tiene_variantes_stock = false;
    } else if (stockType === 'insumo') {
      const insumoId = document.getElementById('productInsumo')?.value;
      const insumoVarianteId = document.getElementById('productInsumoVariante')?.value;
      console.log('📍 [saveProduct] INSUMO - insumoId:', insumoId, 'type:', typeof insumoId);
      console.log('📍 [saveProduct] INSUMO - insumoVarianteId:', insumoVarianteId, 'type:', typeof insumoVarianteId);
      requestPayload.insumo_id = Number(insumoId);
      if (insumoVarianteId) {
        requestPayload.insumo_variant_id = Number(insumoVarianteId);
      }
      requestPayload.tiene_variantes_stock = false;
      console.log('📍 [saveProduct] INSUMO - requestPayload COMPLETO:', JSON.stringify(requestPayload, null, 2));
    } else if (stockType === 'infinito') {
      requestPayload.stock_cantidad = null;
      requestPayload.tiene_variantes_stock = false;
    }

    console.log('📍 [saveProduct] Enviando petición:', method, url);
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json();

    console.log('📍 [saveProduct] Respuesta status:', response.status, response.ok);
    console.log('📍 [saveProduct] Respuesta data:', JSON.stringify(data, null, 2));

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

// ==================== INSUMOS ====================
let insumosGlobal = [];
let insumosFiltroTexto = '';

async function loadInsumos() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/insumos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    insumosGlobal = data.data || [];
    renderInsumos(insumosGlobal);
  } catch (error) {
    console.error('Error cargando insumos:', error);
    document.getElementById('insumos-list').innerHTML = '<tr><td colspan="5" style="text-align: center; color: #c5221f; padding: 20px;">Error cargando insumos</td></tr>';
  }
}

function renderInsumos(lista) {
  const tbody = document.getElementById('insumos-list');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">Sin insumos creados</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(i => {
    const variantes = Array.isArray(i.insumo_variants) ? i.insumo_variants.length : 0;
    const descripcion = (i.descripcion || '').substring(0, 50) + (i.descripcion && i.descripcion.length > 50 ? '...' : '');
    return `<tr>
      <td>${i.id}</td>
      <td><strong>${i.nombre}</strong></td>
      <td>${descripcion}</td>
      <td><span style="background:#e8f5e9;color:#2e7d32;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;">${variantes} variantes</span></td>
      <td class="acciones-cell">
        <button class="btn btn-sm btn-secondary" onclick="editInsumo(${i.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="deleteInsumo(${i.id})">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

function aplyInsumoFilters() {
  let lista = [...insumosGlobal];

  if (insumosFiltroTexto) {
    const txt = insumosFiltroTexto.toLowerCase();
    lista = lista.filter(i =>
      (i.nombre || '').toLowerCase().includes(txt) ||
      (i.descripcion || '').toLowerCase().includes(txt)
    );
  }

  renderInsumos(lista);
}

function openNewInsumoModal() {
  const modal = document.getElementById('modalInsumo');
  if (!modal) {
    console.warn('Modal modalInsumo no encontrado');
    return;
  }

  console.log('📍 [openNewInsumoModal] Abriendo modal para nuevo insumo');

  document.getElementById('insumoTitle').textContent = 'Nuevo Insumo';
  document.getElementById('formInsumo').reset();
  document.getElementById('insumoId').value = '';

  // IMPORTANTE: Inicializar variantes vacías
  insumoVariantesEdit = [];
  console.log('📍 [openNewInsumoModal] insumoVariantesEdit inicializado:', insumoVariantesEdit);

  // Limpiar y renderizar contenedor
  const variantesContainer = document.getElementById('insumoVariantesContainer');
  if (variantesContainer) {
    variantesContainer.innerHTML = '';
    renderInsumoVariants();
  }

  modal.style.display = 'block';
}

async function editInsumo(id) {
  try {
    console.log('📍 [editInsumo] Cargando insumo:', id);

    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/insumos/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    const insumo = data.data;

    console.log('📍 [editInsumo] Insumo cargado:', insumo.nombre);
    console.log('📍 [editInsumo] Variantes en BD:', JSON.stringify(insumo.insumo_variants, null, 2));

    document.getElementById('insumoTitle').textContent = `Editar Insumo: ${insumo.nombre}`;
    document.getElementById('insumoId').value = insumo.id;
    document.getElementById('insumoNombre').value = insumo.nombre;
    document.getElementById('insumoTipoVariante').value = insumo.tipo_variante || 'Color';

    // IMPORTANTE: Cargar variantes en variable global
    if (Array.isArray(insumo.insumo_variants)) {
      insumoVariantesEdit = insumo.insumo_variants.map(v => ({
        id: v.id,
        nombre: v.nombre,
        cantidad_en_stock: v.cantidad_en_stock || 0,
        cantidad_minima: v.cantidad_minima || 0
      }));
      console.log('📍 [editInsumo] insumoVariantesEdit cargado:', JSON.stringify(insumoVariantesEdit, null, 2));
    } else {
      insumoVariantesEdit = [];
      console.log('📍 [editInsumo] Sin variantes en BD');
    }

    // Renderizar variantes
    renderInsumoVariants();

    document.getElementById('modalInsumo').style.display = 'block';
    console.log('✅ [editInsumo] Modal abierto');
  } catch (error) {
    console.error('❌ [editInsumo] Error:', error);
    console.error('❌ [editInsumo] Stack:', error.stack);
    puchiaAlert('Error cargando insumo', 'error');
  }
}

async function saveInsumo(e) {
  e.preventDefault();

  const id = document.getElementById('insumoId').value;
  const nombre = document.getElementById('insumoNombre').value?.trim();
  const tipo_variante = document.getElementById('insumoTipoVariante').value;

  console.log('📍 [saveInsumo] Iniciando guardado de insumo');
  console.log('📍 [saveInsumo] ID:', id || 'NUEVO');
  console.log('📍 [saveInsumo] Nombre:', nombre);
  console.log('📍 [saveInsumo] Tipo de variante:', tipo_variante);
  console.log('📍 [saveInsumo] Variantes en insumoVariantesEdit:', JSON.stringify(insumoVariantesEdit, null, 2));

  if (!nombre) {
    puchiaAlert('El nombre del insumo es requerido', 'error');
    return;
  }

  // Validar que todas las variantes sean válidas: nombre no vacío Y cantidad > 0
  const variantesValidas = insumoVariantesEdit.filter(v =>
    v.nombre && v.nombre.trim() && v.cantidad_en_stock > 0
  );

  console.log('📍 [saveInsumo] Variantes válidas:', variantesValidas.length, 'de', insumoVariantesEdit.length);

  // Si hay variantes inválidas, mostrar error
  if (insumoVariantesEdit.length > 0 && variantesValidas.length < insumoVariantesEdit.length) {
    const invalidas = insumoVariantesEdit.length - variantesValidas.length;
    puchiaAlert(`No se pueden guardar ${invalidas} variante(s) sin nombre o cantidad. Cada variante debe tener nombre y cantidad > 0`, 'error');
    return;
  }

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const url = id ? `${API_BASE_URL}/insumos/${id}` : `${API_BASE_URL}/insumos`;
    const method = id ? 'PUT' : 'POST';

    const payload = {
      nombre,
      tipo_variante,
      variantes: variantesValidas
    };

    console.log('📍 [saveInsumo] Payload completo:', JSON.stringify(payload, null, 2));
    console.log('📍 [saveInsumo] Enviando a:', url);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('📍 [saveInsumo] Response status:', response.status);
    const data = await response.json();
    console.log('📍 [saveInsumo] Response data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ [saveInsumo] Guardado exitoso');
      puchiaAlert(id ? 'Insumo actualizado' : 'Insumo creado', 'success');
      document.getElementById('modalInsumo').style.display = 'none';
      insumoVariantesEdit = [];
      loadInsumos();
    } else {
      console.log('❌ [saveInsumo] Error en respuesta:', data.message);
      puchiaAlert(data.message || 'Error guardando insumo', 'error');
    }
  } catch (error) {
    console.error('❌ [saveInsumo] Error:', error);
    console.error('❌ [saveInsumo] Stack:', error.stack);
    puchiaAlert('Error guardando insumo', 'error');
  }
}

async function deleteInsumo(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este insumo?')) {
    return;
  }

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/insumos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      puchiaAlert('Insumo eliminado', 'success');
      loadInsumos();
    } else {
      puchiaAlert(data.message || 'Error eliminando insumo', 'error');
    }
  } catch (error) {
    console.error('Error eliminando insumo:', error);
    puchiaAlert('Error eliminando insumo', 'error');
  }
}

// Helper functions para variantes de insumos
let insumoVariantesEdit = [];

function addInsumoVariant() {
  insumoVariantesEdit.push({ nombre: '', cantidad_en_stock: 0, cantidad_minima: 0 });
  renderInsumoVariants();
}

function removeInsumoVariant(idx) {
  insumoVariantesEdit.splice(idx, 1);
  renderInsumoVariants();
}

function renderInsumoVariants() {
  const container = document.getElementById('insumoVariantesContainer');

  const validVariants = insumoVariantesEdit.filter(v => v.nombre && v.nombre.trim() && v.cantidad_en_stock > 0);
  const invalidVariants = insumoVariantesEdit.filter(v => !v.nombre || !v.nombre.trim() || v.cantidad_en_stock <= 0);

  container.innerHTML = insumoVariantesEdit.map((v, idx) => {
    const isValid = v.nombre && v.nombre.trim() && v.cantidad_en_stock > 0;
    const borderColor = isValid ? '#ddd' : '#ffcccc';
    const bgColor = isValid ? '#fafafa' : '#fff5f5';

    return `
    <div class="flex-layout-responsive" style="background: ${bgColor}; border: 1px solid ${borderColor};">
      <input type="text" placeholder="Nombre variante *" value="${v.nombre || ''}" onchange="updateInsumoVariant(${idx}, 'nombre', this.value)" style="flex: 1; padding: 6px; border: 1px solid ${borderColor}; border-radius: 4px; font-size: 13px;">
      <input type="number" placeholder="Stock *" min="1" value="${v.cantidad_en_stock || ''}" onchange="updateInsumoVariant(${idx}, 'cantidad_en_stock', this.value)" class="input-stock-responsive" style="border-color: ${borderColor};">
      <button type="button" class="btn btn-sm btn-danger" onclick="removeInsumoVariant(${idx})" style="padding: 6px 12px;">×</button>
      ${!isValid ? `<span style="font-size: 12px; color: #d32f2f; white-space: nowrap;">⚠️ Incompleta</span>` : ''}
    </div>
  `;
  }).join('') + `
    <div style="font-size: 12px; color: #666; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
      📋 ${validVariants.length} variante(s) válida(s)${invalidVariants.length > 0 ? ` | ⚠️ ${invalidVariants.length} incompleta(s)` : ''}
    </div>
  `;
}

function updateInsumoVariant(idx, field, value) {
  if (insumoVariantesEdit[idx]) {
    insumoVariantesEdit[idx][field] = field === 'cantidad_en_stock' ? parseInt(value) : value;
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
    // DEBUG API: Ver respuesta completa
    console.log('API RESPONSE COMPLETO (loadAllOrders):', data);
    if (data.data && data.data.length > 0) {
      console.log('Primera orden:', data.data[0]);
    }
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
      <tr class="table-row-responsive">
        <td style="padding: 8px 12px; font-weight: 600; color: #7f1f6e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${orden.id_unico}">${shortId}</td>
        <td style="padding: 8px 12px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fechaCompra}</td>
        <td class="table-cell-cliente" title="${orden.cliente_nombre}">${orden.cliente_nombre}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">$${restoPagar.toFixed(2)}</td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #7f1f6e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">$${parseFloat(orden.total).toFixed(2)}</td>
        <td style="padding: 8px 12px;">
          <select onchange="updateOrderStatus(${orden.id}, this.value)" style="padding: 3px 6px; border-radius: 4px; border: 1px solid #ddd; font-size: 12px; width: 100%; overflow: hidden; text-overflow: ellipsis;">
            ${orderStatuses.map(s => `<option value="${s.valor}" ${orden.estado === s.valor ? 'selected' : ''}>${s.nombre}</option>`).join('')}
          </select>
        </td>
        <td style="padding: 8px 12px; font-size: 13px; color: #1a1a1a; font-weight: 500; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fechaEntrega}</td>
        <td style="padding: 8px 12px; display: flex; gap: 3px; justify-content: center; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <button class="btn btn-sm btn-secondary button-table-action" onclick="viewOrder(${orden.id})" title="Ver">👁️</button>
          <button class="btn btn-sm btn-primary button-table-action" onclick="abrirEditarOrden(${orden.id})" title="Editar">✏️</button>
          <button class="btn btn-sm btn-danger button-table-action" onclick="showDeleteConfirm(${orden.id}, '${orden.id_unico}')" title="Eliminar">🗑️</button>
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

  // PASO 1: Calcular total sumando todos los productos × cantidades
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

  // PASO 2: Mostrar total
  document.getElementById('ordenTotal').textContent = `$${total.toFixed(2)}`;

  // PASO 3: Calcular SEÑA = TOTAL * 0.5 AUTOMÁTICAMENTE (SIEMPRE)
  const senaPorDefecto = (total / 2).toFixed(2);
  const inputSena = document.getElementById('ordenSena');
  if (inputSena) {
    inputSena.value = senaPorDefecto;
  }

  // PASO 4: Actualizar RESTO = TOTAL - SEÑA
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
      <div class="modal-responsive" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; box-sizing: border-box; color: #333;">
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

    return `<div data-media-id="${item.id}" class="media-thumbnail" style="border:${border};cursor:pointer;" onclick="openGalleryViewModal(${mediaCurrentProductoId}, mediaItems, ${idx})">
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
      <div class="modal-responsive" style="padding: 20px; border-radius: 12px; overflow-y: auto;">
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
    <div class="modal-responsive">
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
    <div class="modal-responsive" style="overflow-y: auto;">
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

// ==================== STOCKS (VARIANTES) ====================

let productosStock = []; // Productos que tienen variantes
let currentStockPage = 1;
const STOCKS_PER_PAGE = 20;

/**
 * Carga productos que tienen variantes (tiene_variantes_stock = true)
 */
async function cargarProductosConVariantes() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/productos?limite=1000`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    productosStock = (data.data || []).filter(p => p.tiene_variantes_stock === true);
    console.log('[Stocks] Productos con variantes:', productosStock);
  } catch (error) {
    console.error('[Stocks] Error cargando productos:', error);
    puchiaAlert('Error al cargar productos', 'error');
  }
}

/**
 * Abre modal para agregar nuevo stock
 */
function abrirModalAgregarStock() {
  document.getElementById('stockId').value = '';
  document.getElementById('formStock').reset();
  document.getElementById('stockModalTitulo').textContent = 'Agregar Stock';

  // Llenar dropdown de productos
  const selectProducto = document.getElementById('stockProducto');
  selectProducto.innerHTML = '<option value="">-- Selecciona un producto --</option>';
  productosStock.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.nombre} (ID: ${p.id})`;
    selectProducto.appendChild(option);
  });

  // Limpiar variantes
  document.getElementById('variantesRows').innerHTML = '';
  agregarVarianteRow();

  document.getElementById('modalStock').style.display = 'flex';
}

/**
 * Cierra modal de stock
 */
function cerrarModalStock() {
  document.getElementById('modalStock').style.display = 'none';
}

/**
 * Agrega una fila para ingresar una variante (tipo + valor)
 */
function agregarVarianteRow() {
  const container = document.getElementById('variantesRows');
  const rowId = Date.now();

  const row = document.createElement('div');
  row.id = `variant-row-${rowId}`;
  row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
  row.innerHTML = `
    <input type="text" placeholder="Tipo (e.g., Color)" class="variant-tipo" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" />
    <input type="text" placeholder="Valor (e.g., Rojo)" class="variant-valor" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" />
    <button type="button" class="btn btn-danger" onclick="eliminarVarianteRow('${rowId}')" style="padding: 6px 10px; font-size: 12px;">−</button>
  `;
  container.appendChild(row);
}

/**
 * Elimina una fila de variante
 */
function eliminarVarianteRow(rowId) {
  const row = document.getElementById(`variant-row-${rowId}`);
  if (row) row.remove();
}

/**
 * Guarda un nuevo stock o edita uno existente
 */
async function guardarStock(e) {
  e.preventDefault();

  const stockId = document.getElementById('stockId').value;
  const productoId = document.getElementById('stockProducto').value;
  const cantidad = parseInt(document.getElementById('stockCantidad').value);

  // Recopilar variantes
  const variantesRows = document.querySelectorAll('#variantesRows > div');
  const variantes = Array.from(variantesRows)
    .map(row => {
      const tipo = row.querySelector('.variant-tipo').value.trim();
      const valor = row.querySelector('.variant-valor').value.trim();
      return tipo && valor ? { tipo, valor } : null;
    })
    .filter(v => v !== null);

  if (!productoId || !cantidad || variantes.length === 0) {
    puchiaAlert('Por favor completa todos los campos y agrega al menos una variante', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const payload = {
      producto_id: parseInt(productoId),
      cantidad,
      variantes
    };

    const method = stockId ? 'PATCH' : 'POST';
    const endpoint = stockId ? `/admin/stocks/${stockId}` : '/admin/stocks';
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      puchiaAlert(data.message || 'Error al guardar stock', 'error');
      return;
    }

    puchiaAlert(stockId ? 'Stock actualizado' : 'Stock creado exitosamente', 'success');
    cerrarModalStock();
    currentStockPage = 1; // Reset pagination
    cargarStocks();
  } catch (error) {
    console.error('[Stocks] Error guardando stock:', error);
    puchiaAlert('Error al guardar stock: ' + error.message, 'error');
  }
}

/**
 * Carga y muestra los stocks con paginación
 */
async function cargarStocks(page = 1) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const offset = (page - 1) * STOCKS_PER_PAGE;

    const response = await fetch(`${API_BASE_URL}/admin/stocks?limite=${STOCKS_PER_PAGE}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      puchiaAlert('Error cargando stocks', 'error');
      return;
    }

    const stocks = data.data || [];
    const total = data.total || 0;
    currentStockPage = page;

    renderStocks(stocks);
    renderStocksPagination(total);
  } catch (error) {
    console.error('[Stocks] Error cargando stocks:', error);
    puchiaAlert('Error al cargar stocks: ' + error.message, 'error');
  }
}

/**
 * Renderiza la tabla de stocks
 */
function renderStocks(stocks) {
  const tbody = document.getElementById('stocks-list');

  if (stocks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999; padding: 20px;">No hay stocks registrados</td></tr>';
    return;
  }

  tbody.innerHTML = stocks.map(stock => {
    // Obtener nombre del producto
    const producto = productosStock.find(p => p.id === stock.producto_id);
    const nombreProducto = producto?.nombre || `Producto ${stock.producto_id}`;

    // Formatear variantes
    const variantesStr = stock.variantes && stock.variantes.length > 0
      ? stock.variantes.map(v => `${v.tipo}: ${v.valor}`).join(', ')
      : 'Sin variantes';

    return `
      <tr>
        <td>${nombreProducto}</td>
        <td>${variantesStr}</td>
        <td>
          <input type="number" value="${stock.cantidad}" onchange="actualizarCantidadStock(${stock.id}, this.value)" style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" />
        </td>
        <td>
          <div class="acciones-cell">
            <button class="btn btn-sm btn-secondary" onclick="editarStock(${stock.id})">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="eliminarStock(${stock.id})">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Actualiza la cantidad de un stock (inline)
 */
async function actualizarCantidadStock(stockId, nuevaCantidad) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const cantidad = parseInt(nuevaCantidad);

    if (isNaN(cantidad) || cantidad < 1) {
      puchiaAlert('La cantidad debe ser mayor a 0', 'error');
      cargarStocks(currentStockPage);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/stocks/${stockId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cantidad })
    });

    const data = await response.json();
    if (!response.ok) {
      puchiaAlert(data.message || 'Error al actualizar', 'error');
      cargarStocks(currentStockPage);
      return;
    }

    puchiaAlert('Cantidad actualizada', 'success');
  } catch (error) {
    console.error('[Stocks] Error actualizando cantidad:', error);
    puchiaAlert('Error al actualizar: ' + error.message, 'error');
  }
}

/**
 * Edita un stock existente
 */
async function editarStock(stockId) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/stocks/${stockId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      puchiaAlert('Error cargando stock', 'error');
      return;
    }

    const stock = data.data;
    document.getElementById('stockId').value = stock.id;
    document.getElementById('stockProducto').value = stock.producto_id;
    document.getElementById('stockCantidad').value = stock.cantidad;
    document.getElementById('stockModalTitulo').textContent = 'Editar Stock';

    // Cargar variantes
    const variantesContainer = document.getElementById('variantesRows');
    variantesContainer.innerHTML = '';

    if (stock.variantes && stock.variantes.length > 0) {
      stock.variantes.forEach(v => {
        const rowId = Date.now() + Math.random();
        const row = document.createElement('div');
        row.id = `variant-row-${rowId}`;
        row.style.cssText = 'display: flex; gap: 8px; align-items: center;';
        row.innerHTML = `
          <input type="text" value="${v.tipo}" class="variant-tipo" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" />
          <input type="text" value="${v.valor}" class="variant-valor" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" />
          <button type="button" class="btn btn-danger" onclick="eliminarVarianteRow('${rowId}')" style="padding: 6px 10px; font-size: 12px;">−</button>
        `;
        variantesContainer.appendChild(row);
      });
    }

    document.getElementById('modalStock').style.display = 'flex';
  } catch (error) {
    console.error('[Stocks] Error cargando stock:', error);
    puchiaAlert('Error al cargar stock: ' + error.message, 'error');
  }
}

/**
 * Elimina un stock con confirmación
 */
async function eliminarStock(stockId) {
  const confirmar = await puchiaConfirm(
    '¿Estás seguro de que deseas eliminar este stock?',
    'Confirmar eliminación'
  );

  if (!confirmar) return;

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/stocks/${stockId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      puchiaAlert(data.message || 'Error al eliminar', 'error');
      return;
    }

    puchiaAlert('Stock eliminado exitosamente', 'success');
    cargarStocks(currentStockPage);
  } catch (error) {
    console.error('[Stocks] Error eliminando stock:', error);
    puchiaAlert('Error al eliminar: ' + error.message, 'error');
  }
}

/**
 * Renderiza controles de paginación
 */
function renderStocksPagination(total) {
  const paginationDiv = document.getElementById('stocksPagination');
  const totalPages = Math.ceil(total / STOCKS_PER_PAGE);

  if (totalPages <= 1) {
    paginationDiv.innerHTML = '';
    return;
  }

  let html = '';

  // Botón anterior
  if (currentStockPage > 1) {
    html += `<button class="btn btn-secondary" onclick="cargarStocks(${currentStockPage - 1})">← Anterior</button>`;
  }

  // Números de página
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentStockPage) {
      html += `<button class="btn btn-primary" disabled>${i}</button>`;
    } else if (i <= 5 || i > totalPages - 2 || Math.abs(i - currentStockPage) <= 1) {
      html += `<button class="btn btn-secondary" onclick="cargarStocks(${i})">${i}</button>`;
    } else if (i === 6) {
      html += `<span style="padding: 0 8px; align-self: center;">...</span>`;
    }
  }

  // Botón siguiente
  if (currentStockPage < totalPages) {
    html += `<button class="btn btn-secondary" onclick="cargarStocks(${currentStockPage + 1})">Siguiente →</button>`;
  }

  paginationDiv.innerHTML = html;
}

/**
 * Inicializa la sección de stocks
 */
async function initStocks() {
  await cargarProductosConVariantes();
  await cargarStocks(1);
}

// ==================== GESTIÓN DE VARIANTES EN PRODUCTOS ====================

/**
 * Alterna visibilidad de sección de variantes
 */
function toggleVariantesSection() {
  const checkbox = document.getElementById('tieneVariantes');
  const section = document.getElementById('variantesSection');
  const container = document.getElementById('variantesContainer');

  if (checkbox.checked) {
    section.style.display = 'block';
    if (container.children.length === 0) {
      agregarVarianteProducto();
    }
  } else {
    section.style.display = 'none';
    container.innerHTML = '';
  }
}

/**
 * Agrega una fila para definir una variante (tipo + valores)
 */
function agregarVarianteProducto() {
  const container = document.getElementById('variantesContainer');
  const rowId = Date.now();

  const row = document.createElement('div');
  row.id = `variante-row-${rowId}`;
  row.style.cssText = 'display: grid; grid-template-columns: 150px 1fr 30px; gap: 8px; align-items: center; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e0e0e0;';
  row.innerHTML = `
    <input type="text" placeholder="Tipo" class="var-tipo" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" />
    <input type="text" placeholder="Valores: Rojo, Verde, Azul" class="var-valores" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" />
    <button type="button" class="btn btn-danger" onclick="eliminarVarianteProducto('${rowId}')" style="padding: 4px 8px; font-size: 11px; height: 30px;">−</button>
  `;
  container.appendChild(row);
}

/**
 * Elimina una fila de variante
 */
function eliminarVarianteProducto(rowId) {
  const row = document.getElementById(`variante-row-${rowId}`);
  if (row) row.remove();
}

/**
 * Extrae variantes del formulario como array de objetos
 */
function extraerVariantesProducto() {
  const tieneVariantes = document.getElementById('tieneVariantes').checked;

  if (!tieneVariantes) {
    return null;
  }

  const rows = document.querySelectorAll('#variantesContainer > div');
  const variantes = [];

  rows.forEach(row => {
    const tipoEl = row.querySelector('.var-tipo');
    const valoresEl = row.querySelector('.var-valores');

    // Proteger contra null si los elementos no existen
    if (!tipoEl || !valoresEl) {
      console.warn('⚠️ Elemento de variante no encontrado, saltando fila');
      return;
    }

    const tipo = tipoEl.value.trim();
    const valoresStr = valoresEl.value.trim();

    if (tipo && valoresStr) {
      // Parsear valores: "Rojo, Verde, Azul" → ["Rojo", "Verde", "Azul"]
      const valores = valoresStr.split(',').map(v => v.trim()).filter(v => v);

      if (valores.length > 0) {
        variantes.push({
          tipo,
          valores
        });
      }
    }
  });

  return variantes.length > 0 ? variantes : null;
}

/**
 * Carga variantes existentes en el formulario (edición)
 */
function cargarVariantesEnFormulario(variantes) {
  if (!variantes || variantes.length === 0) {
    document.getElementById('tieneVariantes').checked = false;
    document.getElementById('variantesSection').style.display = 'none';
    return;
  }

  document.getElementById('tieneVariantes').checked = true;
  document.getElementById('variantesSection').style.display = 'block';

  const container = document.getElementById('variantesContainer');
  container.innerHTML = '';

  variantes.forEach(v => {
    const rowId = Date.now() + Math.random();
    const row = document.createElement('div');
    row.id = `variante-row-${rowId}`;
    row.style.cssText = 'display: grid; grid-template-columns: 150px 1fr 30px; gap: 8px; align-items: center; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e0e0e0;';

    const valoresStr = (v.valores || []).join(', ');
    row.innerHTML = `
      <input type="text" value="${v.tipo}" class="var-tipo" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" />
      <input type="text" value="${valoresStr}" class="var-valores" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;" />
      <button type="button" class="btn btn-danger" onclick="eliminarVarianteProducto('${rowId}')" style="padding: 4px 8px; font-size: 11px; height: 30px;">−</button>
    `;
    container.appendChild(row);
  });
}

// FUERZA UPDATE: 2026-08-08 17:51
