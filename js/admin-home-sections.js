// ======================== CONFIG ========================
const API_BASE_URL = 'https://puchia-backend-production.up.railway.app/api/v1';
let currentEditingSection = null;
let sections = [];
let allProducts = [];
let allCategories = [];

// ======================== INICIALIZACIÓN ========================
document.addEventListener('DOMContentLoaded', async () => {
  // Mostrar nombre del usuario
  const userName = localStorage.getItem('adminUserName');
  if (userName) {
    const userNameEl = document.getElementById('adminUserName');
    if (userNameEl) userNameEl.textContent = userName;
  }

  // Cargar secciones
  await loadSections();

  // Cargar datos para selectors
  await loadProductsForSelector();
  await loadCategoriesForSelector();

  // Setup event listeners
  setupEventListeners();
});

// ======================== OBTENER TOKEN CON RETRY ========================
async function getTokenWithRetry(maxAttempts = 30, delayMs = 100) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const token = localStorage.getItem('puchia_admin_token');
    if (token) {
      console.log(`[TokenRetry] Token obtenido en intento ${attempt}/${maxAttempts}`);
      return token;
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.error('[TokenRetry] Token no disponible después de ' + (maxAttempts * delayMs) + 'ms');
  return null;
}

// ======================== CARGAR SECCIONES ========================
async function loadSections() {
  try {
    const token = await getTokenWithRetry();

    if (!token) {
      throw new Error('No autenticado. Por favor inicia sesión nuevamente.');
    }

    const response = await fetch(`${API_BASE_URL}/admin/home-sections`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token inválido o expirado. Por favor inicia sesión nuevamente.');
      }
      throw new Error('Error al cargar secciones (HTTP ' + response.status + ')');
    }

    const result = await response.json();
    sections = result.data || [];
    renderSections();
    console.log('[Admin Panel] ' + sections.length + ' secciones cargadas');
  } catch (error) {
    console.error('Error al cargar secciones:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== ACTUALIZAR PREVIEW EN VIVO ========================
function updatePreview() {
  const previewFrame = document.getElementById('previewFrame');

  // El preview ahora muestra un IFRAME del HOME cliente real
  // El HOME cliente hace polling automático de /api/v1/home-sections
  // Por lo que los cambios se reflejan automáticamente cada ~60 segundos
  if (!previewFrame.querySelector('iframe')) {
    previewFrame.innerHTML = '<iframe src="https://puchia-web.vercel.app/" style="width: 100%; height: 100%; border: none; border-radius: 8px;"></iframe>';
    previewFrame.style.padding = '0';
  }
}

// ======================== RENDERIZAR SECCIONES ========================
function renderSections() {
  const listContainer = document.getElementById('sectionsList');
  const noSections = document.getElementById('noSections');

  if (!listContainer) {
    console.error('❌ Elemento sectionsList no encontrado en el DOM');
    return;
  }

  if (sections.length === 0) {
    listContainer.style.display = 'none';
    noSections.style.display = 'block';
    updatePreview();
    return;
  }

  listContainer.style.display = 'flex';
  noSections.style.display = 'none';
  updatePreview();

  listContainer.innerHTML = sections.map((section, index) => `
    <div class="section-item" data-section-id="${section.id}">
      <input type="checkbox" class="section-checkbox" checked>

      <div class="section-content">
        <div>
          <span class="section-type-badge">${getSectionTypeLabel(section.section_type)}</span>
          <div class="section-title">${getSectionTitle(section)}</div>
        </div>
        <div class="section-config">
          ${getSectionConfigDisplay(section)}
        </div>
      </div>

      <div class="section-actions">
        <button class="icon-btn" title="Editar" onclick="editSection(${section.id})">✏️</button>
        <button class="icon-btn ${index === 0 ? 'disabled' : ''}" title="Mover arriba" onclick="moveSection(${section.id}, -1)" ${index === 0 ? 'disabled' : ''}>⬆️</button>
        <button class="icon-btn ${index === sections.length - 1 ? 'disabled' : ''}" title="Mover abajo" onclick="moveSection(${section.id}, 1)" ${index === sections.length - 1 ? 'disabled' : ''}>⬇️</button>
        <button class="icon-btn" title="Duplicar" onclick="duplicateSection(${section.id})">⧉</button>
        <button class="icon-btn btn-danger" title="Eliminar" onclick="deleteSection(${section.id})">✕</button>
      </div>
    </div>
  `).join('');

  // Inicializar SortableJS para drag-drop con verificación defensiva
  if (listContainer && listContainer.children.length > 0) {
    try {
      new Sortable(listContainer, {
        animation: 150,
        ghostClass: 'ghost',
        dragClass: 'dragging',
        onEnd: (evt) => {
          // Reordenar array local
          const items = document.querySelectorAll('.section-item');
          const newOrder = Array.from(items).map(item =>
            parseInt(item.getAttribute('data-section-id'))
          );
          sections.sort((a, b) => {
            return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
          });
          // Actualizar preview en tiempo real
          updatePreview();
        }
      });
      console.log('✅ SortableJS inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar SortableJS:', error);
    }
  }
}

// ======================== CARGAR PRODUCTOS ========================
async function loadProductsForSelector() {
  try {
    const response = await fetch(`${API_BASE_URL}/productos`);
    if (!response.ok) throw new Error('Error cargando productos');
    const result = await response.json();
    allProducts = result.data || [];
  } catch (error) {
    console.error('Error:', error);
  }
}

// ======================== CARGAR CATEGORÍAS ========================
async function loadCategoriesForSelector() {
  try {
    const response = await fetch(`${API_BASE_URL}/categorias`);
    if (!response.ok) throw new Error('Error cargando categorías');
    const result = await response.json();
    allCategories = result.data || [];
  } catch (error) {
    console.error('Error:', error);
  }
}

// ======================== EDITAR SECCIÓN ========================
async function editSection(sectionId) {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return;

  currentEditingSection = section;

  // Mostrar formulario según tipo
  document.querySelectorAll('.edit-fields').forEach(f => f.style.display = 'none');
  document.getElementById(`${section.section_type}-fields`).style.display = 'block';

  // Llenar formulario con datos actuales
  fillFormWithSectionData(section);

  // Mostrar modal
  document.getElementById('editSectionModal').classList.add('show');
}

// ======================== LLENAR FORMULARIO ========================
function fillFormWithSectionData(section) {
  const config = section.config || {};

  switch (section.section_type) {
    case 'banner':
      document.getElementById('banner-title').value = config.title || '';
      document.getElementById('banner-subtitle').value = config.subtitle || '';
      document.getElementById('banner-image').value = config.image_url || '';
      document.getElementById('banner-button-text').value = config.button_text || 'Ver Más';
      document.getElementById('banner-button-url').value = config.button_url || '#';
      document.getElementById('banner-eyebrow').value = config.eyebrow || '';
      break;

    case 'products':
      document.getElementById('products-title').value = config.title || 'Productos Destacados';
      document.getElementById('products-limit').value = config.limit || 10;
      renderProductSelector(config.ids || []);
      break;

    case 'categories':
      document.getElementById('categories-title').value = config.title || 'Categorías';
      document.getElementById('categories-show-all').checked = config.show_all !== false;
      document.getElementById('categories-selector').style.display = config.show_all === false ? 'block' : 'none';
      document.getElementById('categories-limit').value = config.limit || 10;
      renderCategorySelector(config.ids || []);
      break;

    case 'testimonials':
      document.getElementById('testimonials-title').value = config.title || 'Lo que Dicen Nuestros Clientes';
      document.getElementById('testimonials-show-all').checked = config.show_all !== false;
      document.getElementById('testimonials-rating').value = config.min_rating || 0;
      document.getElementById('testimonials-limit').value = config.limit || 5;
      break;
  }
}

// ======================== RENDERIZAR SELECTOR DE PRODUCTOS ========================
function renderProductSelector(selectedIds = []) {
  const container = document.getElementById('products-list');
  container.innerHTML = allProducts.map(product => `
    <div class="product-item">
      <input type="checkbox" class="product-checkbox" value="${product.id}" ${selectedIds.includes(product.id) ? 'checked' : ''}>
      <label>${product.nombre}</label>
    </div>
  `).join('');
}

// ======================== RENDERIZAR SELECTOR DE CATEGORÍAS ========================
function renderCategorySelector(selectedIds = []) {
  const container = document.getElementById('categories-list');
  container.innerHTML = allCategories.map(category => `
    <div class="product-item">
      <input type="checkbox" class="category-checkbox" value="${category.id}" ${selectedIds.includes(category.id) ? 'checked' : ''}>
      <label>${category.nombre}</label>
    </div>
  `).join('');
}

// ======================== GUARDAR SECCIÓN ========================
async function saveSectionFromForm(e) {
  e.preventDefault();

  const token = await getTokenWithRetry();
  if (!token) {
    showStatus('Error: No autenticado. Por favor recarga la página e inicia sesión nuevamente.', 'error');
    return;
  }

  console.log('📝 saveSectionFromForm - Saving section:', currentEditingSection.section_type, 'ID:', currentEditingSection.id);

  let config = {};
  let isValid = true;

  // Validar y recopilar datos según tipo
  if (currentEditingSection.section_type === 'banner') {
    config = {
      title: document.getElementById('banner-title').value.trim(),
      subtitle: document.getElementById('banner-subtitle').value.trim(),
      image_url: document.getElementById('banner-image').value.trim(),
      button_text: document.getElementById('banner-button-text').value.trim() || 'Ver Más',
      button_url: document.getElementById('banner-button-url').value.trim() || '#',
      eyebrow: document.getElementById('banner-eyebrow').value.trim()
    };
    if (!config.title || !config.image_url) {
      showStatus('Falta llenar: Título e Imagen', 'error');
      isValid = false;
    }
  } else if (currentEditingSection.section_type === 'products') {
    const selectedIds = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(cb => parseInt(cb.value));
    config = {
      title: document.getElementById('products-title').value.trim() || 'Productos Destacados',
      ids: selectedIds,
      limit: parseInt(document.getElementById('products-limit').value) || 10
    };
    if (selectedIds.length === 0) {
      showStatus('Selecciona al menos un producto', 'error');
      isValid = false;
    }
  } else if (currentEditingSection.section_type === 'categories') {
    const showAll = document.getElementById('categories-show-all').checked;
    const selectedIds = showAll ? [] : Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => parseInt(cb.value));
    config = {
      title: document.getElementById('categories-title').value.trim() || 'Categorías',
      show_all: showAll,
      ids: selectedIds,
      limit: parseInt(document.getElementById('categories-limit').value) || 10
    };
  } else if (currentEditingSection.section_type === 'testimonials') {
    config = {
      title: document.getElementById('testimonials-title').value.trim() || 'Lo que Dicen Nuestros Clientes',
      show_all: document.getElementById('testimonials-show-all').checked,
      min_rating: parseInt(document.getElementById('testimonials-rating').value) || 0,
      limit: parseInt(document.getElementById('testimonials-limit').value) || 5
    };
  } else {
    console.warn('⚠️ saveSectionFromForm - Unsupported section type:', currentEditingSection.section_type);
    showStatus('Tipo de sección no soportado aún en el formulario. El backend usará valores por defecto.', 'warning');
  }

  if (!isValid) return;

  try {
    const url = currentEditingSection.id
      ? `${API_BASE_URL}/admin/home-sections/${currentEditingSection.id}`
      : `${API_BASE_URL}/admin/home-sections`;

    const method = currentEditingSection.id ? 'PUT' : 'POST';

    console.log('📝 saveSectionFromForm - Sending:', { method, url, hasId: !!currentEditingSection.id });

    const requestBody = currentEditingSection.id
      ? { config }
      : { section_type: currentEditingSection.section_type, config };

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('📝 saveSectionFromForm - Response:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    showStatus('✅ Sección guardada correctamente', 'success');
    closeModal('editSectionModal');
    await loadSections();
  } catch (error) {
    console.error('❌ saveSectionFromForm - Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== CREAR SECCIÓN ========================
async function selectSectionType(type) {
  const token = await getTokenWithRetry();
  if (!token) {
    showStatus('Error: No autenticado. Por favor recarga la página e inicia sesión nuevamente.', 'error');
    return;
  }

  console.log('📝 selectSectionType - Creating section type:', type);

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-sections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ section_type: type, config: {} })
    });

    const responseText = await response.text();
    console.log('📝 selectSectionType - Response:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('✅ selectSectionType - Section created:', result.data?.id);

    closeModal('selectTypeModal');
    await loadSections();
    const newSection = sections[sections.length - 1];
    editSection(newSection.id);
  } catch (error) {
    console.error('❌ selectSectionType - Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== MOVER SECCIÓN ========================
async function moveSection(sectionId, direction) {
  const currentIndex = sections.findIndex(s => s.id === sectionId);
  if (currentIndex === -1) return;

  const newIndex = currentIndex + direction;
  if (newIndex < 0 || newIndex >= sections.length) return;

  // Intercambiar en el array local
  [sections[currentIndex], sections[newIndex]] = [sections[newIndex], sections[currentIndex]];

  // Actualizar display_order
  const newOrder = sections.map(s => s.id);
  await reorderSections(newOrder);
}

// ======================== REORDENAR SECCIONES ========================
async function reorderSections(order) {
  const token = await getTokenWithRetry();
  if (!token) {
    showStatus('Error: No autenticado. Por favor recarga la página e inicia sesión nuevamente.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-sections/batch/reorder`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ order })
    });

    if (!response.ok) {
      throw new Error('Error reordenando secciones');
    }

    renderSections();
    showStatus('✅ Orden actualizado', 'success');
  } catch (error) {
    console.error('Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== DUPLICAR SECCIÓN ========================
async function duplicateSection(sectionId) {
  const token = await getTokenWithRetry();
  if (!token) {
    showStatus('Error: No autenticado. Por favor recarga la página e inicia sesión nuevamente.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-sections/${sectionId}/duplicate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error duplicando sección');
    }

    showStatus('✅ Sección duplicada', 'success');
    await loadSections();
  } catch (error) {
    console.error('Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== ELIMINAR SECCIÓN ========================
async function deleteSection(sectionId) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta sección?')) return;

  const token = await getTokenWithRetry();
  if (!token) {
    showStatus('Error: No autenticado. Por favor recarga la página e inicia sesión nuevamente.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-sections/${sectionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error eliminando sección');
    }

    showStatus('✅ Sección eliminada', 'success');
    await loadSections();
  } catch (error) {
    console.error('Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== PREVIEW ========================
function openPreview() {
  window.open('../index.html', '_blank');
}

// ======================== UTILITIES ========================
function getSectionTypeLabel(type) {
  const labels = {
    banner: 'Banner',
    products: 'Productos',
    categories: 'Categorías',
    testimonials: 'Testimonios'
  };
  return labels[type] || type;
}

function getSectionTitle(section) {
  const config = section.config || {};
  return config.title || `${getSectionTypeLabel(section.section_type)} sin título`;
}

function getSectionConfigDisplay(section) {
  const config = section.config || {};
  const items = [];

  if (config.image_url) {
    items.push(`<div class="section-config-item">Imagen: ${config.image_url.substring(0, 30)}...</div>`);
  }

  if (Array.isArray(config.ids) && config.ids.length > 0) {
    items.push(`<div class="section-config-item">Items: ${config.ids.length}</div>`);
  }

  if (config.show_all) {
    items.push(`<div class="section-config-item">Mostrar todos</div>`);
  }

  return items.join('') || '<div class="section-config-item" style="color: #999;">Sin configuración</div>';
}

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = 'status-bar ' + type;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 4000);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// ======================== EVENT LISTENERS ========================
function setupEventListeners() {
  const addSectionBtn = document.getElementById('addSectionBtn');
  if (addSectionBtn) {
    addSectionBtn.addEventListener('click', () => {
      const selectTypeModal = document.getElementById('selectTypeModal');
      if (selectTypeModal) selectTypeModal.classList.add('show');
    });
  }

  const previewBtn = document.getElementById('previewBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', openPreview);
  }

  const saveSectionOrderBtn = document.getElementById('saveSectionOrderBtn');
  if (saveSectionOrderBtn) {
    saveSectionOrderBtn.addEventListener('click', async () => {
      const order = sections.map(s => s.id);
      await reorderSections(order);
    });
  }

  const editSectionForm = document.getElementById('editSectionForm');
  if (editSectionForm) {
    editSectionForm.addEventListener('submit', saveSectionFromForm);
  }

  const categoriesShowAll = document.getElementById('categories-show-all');
  if (categoriesShowAll) {
    categoriesShowAll.addEventListener('change', (e) => {
      const categoriesSelector = document.getElementById('categories-selector');
      if (categoriesSelector) {
        categoriesSelector.style.display = e.target.checked ? 'none' : 'block';
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('puchia_admin_token');
      localStorage.removeItem('puchia_admin_user');
      window.location.href = '../admin/login.html';
    });
  }

  // Cerrar modales al hacer click fuera
  window.addEventListener('click', (e) => {
    const selectTypeModal = document.getElementById('selectTypeModal');
    const editSectionModal = document.getElementById('editSectionModal');

    if (e.target === selectTypeModal) selectTypeModal.classList.remove('show');
    if (e.target === editSectionModal) editSectionModal.classList.remove('show');
  });
}
