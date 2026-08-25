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

// ======================== CARGAR SECCIONES ========================
async function loadSections() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_BASE_URL}/admin/home-sections`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al cargar secciones');
    }

    const result = await response.json();
    sections = result.data || [];
    renderSections();
  } catch (error) {
    console.error('Error:', error);
    showStatus('Error al cargar secciones: ' + error.message, 'error');
  }
}

// ======================== ACTUALIZAR PREVIEW EN VIVO ========================
function updatePreview() {
  const previewFrame = document.getElementById('previewFrame');

  if (sections.length === 0) {
    previewFrame.innerHTML = '<div class="preview-empty">No hay secciones. Agrega una para ver el preview.</div>';
    return;
  }

  let html = '';

  sections.forEach(section => {
    if (!section.enabled) {
      html += `<div class="preview-section" style="opacity: 0.5; background: #f5f5f5;">
                <div style="color: #999; text-align: center; padding: 12px;">
                  [DESHABILITADO] ${getSectionTypeLabel(section.section_type)}
                </div>
              </div>`;
      return;
    }

    const config = section.config || {};

    switch (section.section_type) {
      case 'banner':
        html += `<div class="preview-section">
                  ${config.image_url ? `<img src="${config.image_url}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; margin-bottom: 12px;" alt="Banner">` : ''}
                  <div class="preview-banner" style="background: linear-gradient(135deg, #7b2d8e, #9d4cb8);">
                    ${config.eyebrow ? `<div style="font-size: 11px; letter-spacing: 1px; margin-bottom: 8px;">${config.eyebrow}</div>` : ''}
                    <div class="preview-banner-title">${config.title || 'Banner sin título'}</div>
                    ${config.subtitle ? `<div class="preview-banner-subtitle">${config.subtitle}</div>` : ''}
                    ${config.button_text ? `<div style="margin-top: 12px;"><button style="background: white; color: #7b2d8e; padding: 8px 16px; border-radius: 4px; border: none; font-weight: 600; cursor: pointer;">${config.button_text}</button></div>` : ''}
                  </div>
                </div>`;
        break;

      case 'products':
        html += `<div class="preview-section">
                  <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">${config.title || 'Productos Destacados'}</div>
                  <div class="preview-products-grid">
                    ${config.ids && config.ids.length > 0
                      ? config.ids.slice(0, 4).map(id => `
                          <div class="preview-product-card">
                            <div class="preview-product-card-title">Producto ${id}</div>
                            <div class="preview-product-card-price">$199</div>
                          </div>
                        `).join('')
                      : '<div style="color: #999; padding: 20px; text-align: center;">Sin productos seleccionados</div>'
                    }
                  </div>
                </div>`;
        break;

      case 'categories':
        html += `<div class="preview-section">
                  <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">${config.title || 'Categorías'}</div>
                  <div>
                    ${config.show_all
                      ? '<div class="preview-category-item">Cumpleaños</div><div class="preview-category-item">Regalos</div><div class="preview-category-item">Decoración</div>'
                      : config.ids && config.ids.length > 0
                      ? config.ids.map(id => `<div class="preview-category-item">Categoría ${id}</div>`).join('')
                      : '<div style="color: #999;">Sin categorías</div>'
                    }
                  </div>
                </div>`;
        break;

      case 'testimonials':
        html += `<div class="preview-section">
                  <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">${config.title || 'Testimonios'}</div>
                  <div>
                    <div class="preview-testimonial">
                      <div class="preview-stars">★★★★★</div>
                      <div class="preview-testimonial-text">Excelente servicio y calidad. Muy recomendable.</div>
                      <div class="preview-testimonial-author">Cliente verificado</div>
                    </div>
                  </div>
                </div>`;
        break;
    }
  });

  previewFrame.innerHTML = html;
}

// ======================== RENDERIZAR SECCIONES ========================
function renderSections() {
  const listContainer = document.getElementById('sectionsList');
  const noSections = document.getElementById('noSections');

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

  // Inicializar SortableJS para drag-drop
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

  const token = localStorage.getItem('adminToken');
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
  }

  if (!isValid) return;

  try {
    const url = currentEditingSection.id
      ? `${API_BASE_URL}/admin/home-sections/${currentEditingSection.id}`
      : `${API_BASE_URL}/admin/home-sections`;

    const method = currentEditingSection.id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ config })
    });

    if (!response.ok) {
      throw new Error('Error guardando sección');
    }

    const result = await response.json();
    showStatus('✅ Sección guardada correctamente', 'success');
    closeModal('editSectionModal');
    await loadSections();
  } catch (error) {
    console.error('Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== CREAR SECCIÓN ========================
async function selectSectionType(type) {
  const token = localStorage.getItem('adminToken');

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-sections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ section_type: type, config: {} })
    });

    if (!response.ok) {
      throw new Error('Error creando sección');
    }

    closeModal('selectTypeModal');
    await loadSections();
    const newSection = sections[sections.length - 1];
    editSection(newSection.id);
  } catch (error) {
    console.error('Error:', error);
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
  const token = localStorage.getItem('adminToken');

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
  const token = localStorage.getItem('adminToken');

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

  const token = localStorage.getItem('adminToken');

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
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUserName');
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
