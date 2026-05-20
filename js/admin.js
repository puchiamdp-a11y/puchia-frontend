// API_BASE_URL ya está definido en el HTML

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  loadDashboardStats();
  loadRecentOrders();
  setupEventListeners();
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
        } else if (page === 'settings') {
          loadSettings();
        }
      }
    });
  });

  // Botones
  document.getElementById('newProductBtn')?.addEventListener('click', openNewProductModal);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
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
      document.getElementById('stat-pending').textContent = data.data.ordenes_pendientes || 0;
      document.getElementById('stat-completed').textContent = data.data.ordenes_completadas || 0;
      document.getElementById('stat-sales').textContent = `$${(data.data.total_ventas || 0).toLocaleString()}`;
      document.getElementById('stat-products').textContent = data.data.productos_habilitados || 0;
    }
  } catch (error) {
    console.error('Error cargando stats:', error);
  }
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
          <td>${new Date(orden.creado_en).toLocaleDateString()}</td>
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

async function loadProducts() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/productos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    const tbody = document.getElementById('productos-list');

    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(producto => `
        <tr>
          <td>${producto.nombre}</td>
          <td>$${producto.precio}</td>
          <td>${producto.stock_type === 'simple' ? producto.stock_cantidad : 'Insumo'}</td>
          <td>${producto.categorias?.[0]?.nombre || 'Sin categoría'}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="editProduct(${producto.id})">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct(${producto.id})">Eliminar</button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Sin productos</td></tr>';
    }
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

function openNewProductModal() {
  alert('Modal de nuevo producto - A implementar');
}

function editProduct(id) {
  alert(`Editar producto ${id} - A implementar`);
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;

  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/productos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      alert('Producto eliminado');
      loadProducts();
    }
  } catch (error) {
    console.error('Error eliminando producto:', error);
  }
}

// ==================== ÓRDENES ====================

async function loadAllOrders() {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/ordenes`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    const tbody = document.getElementById('all-orders');

    if (data.success && data.data.length > 0) {
      tbody.innerHTML = data.data.map(orden => `
        <tr>
          <td>${orden.id_unico || orden.id}</td>
          <td>${orden.cliente_nombre}</td>
          <td>$${orden.total}</td>
          <td>
            <select onchange="updateOrderStatus(${orden.id}, this.value)" style="padding: 4px; border-radius: 4px;">
              <option value="pendiente" ${orden.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="en_edicion" ${orden.estado === 'en_edicion' ? 'selected' : ''}>En Edición</option>
              <option value="preparandose" ${orden.estado === 'preparandose' ? 'selected' : ''}>Preparándose</option>
              <option value="listo_retirar" ${orden.estado === 'listo_retirar' ? 'selected' : ''}>Listo Retirar</option>
              <option value="entregado" ${orden.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
            </select>
          </td>
          <td>${new Date(orden.creado_en).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewOrder(${orden.id})">Ver</button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Sin órdenes</td></tr>';
    }
  } catch (error) {
    console.error('Error cargando órdenes:', error);
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
      alert('Estado actualizado');
      loadAllOrders();
    }
  } catch (error) {
    console.error('Error actualizando estado:', error);
  }
}

function viewOrder(id) {
  alert(`Ver detalle orden ${id} - A implementar`);
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
      alert('Configuración guardada');
    }
  } catch (error) {
    console.error('Error guardando settings:', error);
    alert('Error al guardar');
  }
}