// ======================== CONFIG ========================
const API_BASE_URL = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';
let currentEditingSection = null;
let sections = [];
let allProducts = [];
let allCategories = [];
let hasUnsavedChanges = false;
let previewRefreshInterval = null;

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

    let draftSections = null;

    // Intenta cargar el borrador primero (cambios sin publicar)
    try {
      const draftResponse = await fetch(`${API_BASE_URL}/admin/home-draft`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (draftResponse.ok) {
        const draftResult = await draftResponse.json();
        if (draftResult.data && Array.isArray(draftResult.data.sections) && draftResult.data.sections.length > 0) {
          draftSections = draftResult.data.sections;
        }
      }
    } catch (draftError) {
    }

    // Si hay borrador, usarlo; si no, cargar secciones publicadas
    if (draftSections && draftSections.length > 0) {
      sections = draftSections;
      console.log('✅ Draft sections loaded:', sections.length, 'sections');
    } else {
      console.log('📥 Loading published sections...');
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
      console.log('✅ Published sections loaded:', sections.length, 'sections');
    }

    console.log('🎨 Calling renderSections()...');
    renderSections();
  } catch (error) {
    console.error('Error al cargar secciones:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== ACTUALIZAR PREVIEW EN VIVO ========================
function updatePreview() {
  const previewFrame = document.getElementById('previewFrame');
  console.log('🎬 updatePreview() called. previewFrame found:', !!previewFrame);

  if (!previewFrame) {
    console.error('❌ previewFrame element not found in DOM');
    return;
  }

  // Generar HTML de preview basado en las secciones en memoria
  const previewHTML = generatePreviewHTML();
  previewFrame.innerHTML = previewHTML;
  previewFrame.style.padding = '20px';
  console.log('✅ Preview updated with', sections.length, 'sections');
}

// ======================== GENERAR HTML DEL PREVIEW ========================
function generatePreviewHTML() {
  let html = `
    <div style="font-family: 'Poppins', sans-serif; background: #f5f5f5; color: #333;">
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  `;

  if (sections.length === 0) {
    html += '<div style="text-align: center; padding: 40px; color: #999;">Sin secciones configuradas</div>';
  } else {
    sections.forEach((section, index) => {
      html += renderPreviewSection(section, index);
    });
  }

  html += `
      </div>
    </div>
  `;
  return html;
}

// ======================== RENDERIZAR SECCIÓN EN PREVIEW ========================
function renderPreviewSection(section, index) {
  const config = section.config || {};
  let html = '';

  switch (section.section_type) {
    case 'scrolling_text':
      html = renderPreviewScrollingText(config);
      break;
    case 'banner':
      html = renderPreviewBanner(config);
      break;
    case 'stats':
      html = renderPreviewStats(config);
      break;
    case 'image':
      html = renderPreviewImage(config);
      break;
    case 'categories':
      html = renderPreviewCategories(config);
      break;
    case 'products':
      html = renderPreviewProducts(config);
      break;
    case 'testimonials':
      html = renderPreviewTestimonials(config);
      break;
    default:
      html = `<div style="padding: 20px; background: #f0f0f0; border-radius: 8px; margin-bottom: 20px; color: #999;">Tipo desconocido: ${section.section_type}</div>`;
  }

  return html;
}

// ======================== RENDERIZAR BANNER EN PREVIEW ========================
function renderPreviewBanner(config) {
  if (!config.title) return '';

  const bgImage = config.image_url ? `background-image: url('${config.image_url}'); background-size: cover; background-position: center;` : 'background: linear-gradient(135deg, #7f1f6e 0%, #a01f8a 100%);';

  return `
    <div style="position: relative; width: 100%; height: 300px; border-radius: 8px; overflow: hidden; margin-bottom: 20px; ${bgImage}">
      <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: white;">
        ${config.eyebrow ? `<div style="font-size: 12px; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px;">${config.eyebrow}</div>` : ''}
        <h1 style="font-size: 32px; font-weight: 700; margin: 10px 0;">${config.title}</h1>
        ${config.subtitle ? `<p style="font-size: 16px; margin: 10px 0; max-width: 600px;">${config.subtitle}</p>` : ''}
        ${config.button_text ? `<a href="${config.button_url || '#'}" style="display: inline-block; margin-top: 20px; background: #ff1493; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">${config.button_text}</a>` : ''}
      </div>
    </div>
  `;
}

// ======================== RENDERIZAR PRODUCTOS EN PREVIEW ========================
function renderPreviewProducts(config) {
  if (!config.ids || config.ids.length === 0) {
    return '<div style="padding: 20px; background: #f0f0f0; border-radius: 8px; margin-bottom: 20px; color: #999;">Sin productos seleccionados</div>';
  }

  const title = config.title || 'Productos Destacados';
  const selectedProducts = allProducts.filter(p => config.ids.includes(p.id)).slice(0, config.limit || 10);

  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${title}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
  `;

  selectedProducts.forEach(product => {
    const imageUrl = product.image_url || 'https://via.placeholder.com/150';
    html += `
      <div style="background: white; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e0e0e0;">
        <img src="${imageUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;" alt="${product.nombre}">
        <h3 style="font-size: 14px; font-weight: 600; margin: 8px 0;">${product.nombre}</h3>
        ${product.precio ? `<p style="font-size: 13px; color: #7f1f6e; font-weight: 700;">$${product.precio}</p>` : ''}
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

// ======================== RENDERIZAR CATEGORÍAS EN PREVIEW ========================
function renderPreviewCategories(config) {
  const title = config.title || 'Categorías';
  let categoriesToShow = [];

  if (config.show_all !== false && allCategories.length > 0) {
    categoriesToShow = allCategories.slice(0, config.limit || 10);
  } else if (config.ids && config.ids.length > 0) {
    categoriesToShow = allCategories.filter(c => config.ids.includes(c.id)).slice(0, config.limit || 10);
  }

  if (categoriesToShow.length === 0) {
    return '<div style="padding: 20px; background: #f0f0f0; border-radius: 8px; margin-bottom: 20px; color: #999;">Sin categorías disponibles</div>';
  }

  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${title}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; margin-top: 20px;">
  `;

  categoriesToShow.forEach(category => {
    const imageUrl = category.image_url || 'https://via.placeholder.com/140';
    html += `
      <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; cursor: pointer; text-align: center;">
        <img src="${imageUrl}" style="width: 100%; height: 120px; object-fit: cover;" alt="${category.nombre}">
        <div style="padding: 10px;">
          <h3 style="font-size: 13px; font-weight: 600;">${category.nombre}</h3>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

// ======================== RENDERIZAR TESTIMONIOS EN PREVIEW ========================
function renderPreviewTestimonials(config) {
  const title = config.title || 'Lo que dicen nuestras clientas';
  const testimonios = [
    {
      text: 'Excelente trabajo, hermosa calidad y presentación. Entrega en tiempo y forma, además la atención excelente. ¡Un gusto!',
      author: 'Clienta verificada',
      rating: 5
    },
    {
      text: 'Son muy amables y comprometidas en su trabajo. Productos de calidad y buen precio. Entregas en tiempo y forma. Super recomendables.',
      author: 'Clienta verificada',
      rating: 5
    },
    {
      text: 'Excelente atención, muy amables, entregaron en tiempo y forma. Super recomiendo a Puchia para cualquier regalo especial.',
      author: 'Clienta verificada',
      rating: 5
    }
  ];

  const limit = config.limit || 3;
  const filtered = testimonios.slice(0, limit);

  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${title}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-top: 20px;">
  `;

  filtered.forEach(testi => {
    html += `
      <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid #e0e0e0;">
        <div style="font-size: 12px; color: #999; margin-bottom: 8px;">Google Reviews</div>
        <div style="font-size: 14px; color: #ff1493; margin-bottom: 10px;">★★★★★</div>
        <p style="font-size: 13px; line-height: 1.5; margin-bottom: 10px; color: #555;">"${testi.text}"</p>
        <p style="font-size: 12px; font-weight: 600; color: #7f1f6e;">${testi.author}</p>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

// ======================== RENDERIZAR TEXTO DESPLAZABLE EN PREVIEW ========================
function renderPreviewScrollingText(config) {
  if (!config.text) return '';

  return `
    <div style="background: ${config.background_color || '#FF1493'}; color: ${config.text_color || '#FFFFFF'}; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 600; overflow: hidden;">
      <div style="animation: scroll 30s linear infinite; white-space: nowrap;">
        ${config.text}
      </div>
    </div>
    <style>
      @keyframes scroll {
        0% { transform: translateX(100%); }
        100% { transform: translateX(-100%); }
      }
    </style>
  `;
}

// ======================== RENDERIZAR STATS EN PREVIEW ========================
function renderPreviewStats(config) {
  if (!config.stats || config.stats.length === 0) {
    return '<div style="padding: 20px; background: #f0f0f0; border-radius: 8px; margin-bottom: 20px; color: #999;">Sin estadísticas configuradas</div>';
  }

  const title = config.title || 'Nuestros Logros';
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 20px;">${title}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">
  `;

  config.stats.forEach((stat, idx) => {
    if (idx > 0) {
      html += '<div style="display: none;"></div>';
    }
    html += `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 28px; font-weight: 700; color: #7f1f6e; margin-bottom: 8px;">${stat.number}</div>
        <div style="font-size: 14px; color: #666;">${stat.label}</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

// ======================== RENDERIZAR IMAGEN EN PREVIEW ========================
function renderPreviewImage(config) {
  if (!config.title && !config.image_url) return '';

  const bgImage = config.image_url ? `background-image: url('${config.image_url}'); background-size: cover; background-position: center;` : 'background: linear-gradient(135deg, #e0e0e0 0%, #f0f0f0 100%);';

  return `
    <div style="position: relative; width: 100%; height: 250px; border-radius: 8px; overflow: hidden; margin-bottom: 20px; ${bgImage}">
      <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.2); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: white;">
        ${config.title ? `<h2 style="font-size: 28px; font-weight: 700; margin: 0;">${config.title}</h2>` : ''}
        ${config.subtitle ? `<p style="font-size: 14px; margin: 8px 0;">${config.subtitle}</p>` : ''}
        ${config.button_text ? `<a href="${config.button_url || '#'}" style="display: inline-block; margin-top: 15px; background: #7f1f6e; color: white; padding: 10px 25px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">${config.button_text}</a>` : ''}
      </div>
    </div>
  `;
}

// ======================== RENDERIZAR SECCIONES ========================
function renderSections() {
  const listContainer = document.getElementById('sectionsList');
  const noSections = document.getElementById('noSections');

  console.log('🔍 renderSections() called. Sections count:', sections.length);
  console.log('🔍 listContainer found:', !!listContainer);
  console.log('🔍 noSections found:', !!noSections);

  if (!listContainer) {
    console.error('❌ sectionsList element not found in DOM');
    return;
  }

  if (sections.length === 0) {
    console.log('⚠️ No sections found, showing empty state');
    listContainer.style.display = 'none';
    if (noSections) {
      noSections.style.display = 'block';
    }
    updatePreview();
    return;
  }

  console.log('✅ Rendering', sections.length, 'sections');
  listContainer.style.display = 'flex';
  if (noSections) {
    noSections.style.display = 'none';
  }
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

  console.log('✅ HTML inserted into sectionsList. Children count:', listContainer.children.length);
  console.log('✅ listContainer innerHTML length:', listContainer.innerHTML.length);

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
    } catch (error) {
      console.error('Error initializing SortableJS:', error);
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

    case 'scrolling_text':
      document.getElementById('scrolling-text-content').value = config.text || '';
      document.getElementById('scrolling-bg-color').value = config.background_color || '#FF1493';
      document.getElementById('scrolling-text-color').value = config.text_color || '#FFFFFF';
      document.getElementById('scrolling-speed').value = config.scroll_speed || 50;
      break;

    case 'stats':
      document.getElementById('stats-title').value = config.title || 'Nuestros Logros';
      if (config.stats && config.stats.length >= 1) {
        document.getElementById('stats-1-number').value = config.stats[0].number || '';
        document.getElementById('stats-1-label').value = config.stats[0].label || '';
      }
      if (config.stats && config.stats.length >= 2) {
        document.getElementById('stats-2-number').value = config.stats[1].number || '';
        document.getElementById('stats-2-label').value = config.stats[1].label || '';
      }
      if (config.stats && config.stats.length >= 3) {
        document.getElementById('stats-3-number').value = config.stats[2].number || '';
        document.getElementById('stats-3-label').value = config.stats[2].label || '';
      }
      break;

    case 'image':
      document.getElementById('image-title').value = config.title || '';
      document.getElementById('image-subtitle').value = config.subtitle || '';
      document.getElementById('image-url').value = config.image_url || '';
      document.getElementById('image-button-text').value = config.button_text || 'Crear Mi Regalo';
      document.getElementById('image-button-url').value = config.button_url || '/productos';
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
  } else if (currentEditingSection.section_type === 'scrolling_text') {
    config = {
      text: document.getElementById('scrolling-text-content').value.trim() || '',
      background_color: document.getElementById('scrolling-bg-color').value,
      text_color: document.getElementById('scrolling-text-color').value,
      scroll_speed: parseInt(document.getElementById('scrolling-speed').value) || 50
    };
    if (!config.text) {
      showStatus('El texto del anuncio es requerido', 'error');
      isValid = false;
    }
  } else if (currentEditingSection.section_type === 'stats') {
    config = {
      title: document.getElementById('stats-title').value.trim() || 'Nuestros Logros',
      stats: [
        {
          number: document.getElementById('stats-1-number').value || '0',
          label: document.getElementById('stats-1-label').value.trim() || ''
        },
        {
          number: document.getElementById('stats-2-number').value || '0',
          label: document.getElementById('stats-2-label').value.trim() || ''
        },
        {
          number: document.getElementById('stats-3-number').value || '0',
          label: document.getElementById('stats-3-label').value.trim() || ''
        }
      ]
    };
  } else if (currentEditingSection.section_type === 'image') {
    config = {
      title: document.getElementById('image-title').value.trim() || '',
      subtitle: document.getElementById('image-subtitle').value.trim() || '',
      image_url: document.getElementById('image-url').value.trim() || '',
      button_text: document.getElementById('image-button-text').value.trim() || 'Crear Mi Regalo',
      button_url: document.getElementById('image-button-url').value.trim() || '/productos'
    };
  } else {
    console.error('Unsupported section type:', currentEditingSection.section_type);
    showStatus('Tipo de sección no soportado aún en el formulario. El backend usará valores por defecto.', 'warning');
  }

  if (!isValid) return;

  try {
    // Actualizar sección en memoria primero
    const sectionIndex = sections.findIndex(s => s.id === currentEditingSection.id);
    if (sectionIndex !== -1) {
      sections[sectionIndex].config = config;
    }

    // Actualizar UI inmediatamente
    renderSections();
    updatePreview(); // Refrescar preview
    hasUnsavedChanges = true;
    showStatus('✅ Cambios guardados en borrador (sin publicar aún)', 'success');
    closeModal('editSectionModal');

    // Guardar en borrador (sin publicar)
    const saveDraftUrl = `${API_BASE_URL}/admin/home-draft/save`;
    const draftResponse = await fetch(saveDraftUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sections })
    });

    if (!draftResponse.ok) {
    }
  } catch (error) {
    console.error('Error saving section:', error);
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


  try {
    // Crear sección en memoria con ID temporal
    const tempId = Math.max(...sections.map(s => s.id || 0), 0) + 1;
    const newSection = {
      id: tempId,
      section_type: type,
      display_order: sections.length + 1,
      enabled: true,
      config: {},
      created_by: null,
      updated_by: null
    };

    sections.push(newSection);

    closeModal('selectTypeModal');
    renderSections();
    updatePreview(); // Refrescar preview
    hasUnsavedChanges = true;
    editSection(newSection.id);

    showStatus('✅ Nueva sección creada en borrador (sin publicar aún)', 'success');

    // Guardar en borrador de forma asincrónica
    const saveDraftUrl = `${API_BASE_URL}/admin/home-draft/save`;
    await fetch(saveDraftUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sections })
    }).catch(err => console.error('Draft save failed:', err));
  } catch (error) {
    console.error('Error selecting section type:', error);
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
    // Reordenar en memoria
    const reorderedSections = order.map(id => sections.find(s => s.id === id)).filter(Boolean);
    sections = reorderedSections;

    // Actualizar UI
    renderSections();
    updatePreview(); // Refrescar preview
    hasUnsavedChanges = true;
    showStatus('✅ Orden actualizado en borrador (sin publicar aún)', 'success');

    // Guardar en borrador de forma asincrónica
    const saveDraftUrl = `${API_BASE_URL}/admin/home-draft/save`;
    await fetch(saveDraftUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sections })
    }).catch(err => console.error('Draft save failed:', err));
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
    // Encontrar la sección original
    const originalSection = sections.find(s => s.id === sectionId);
    if (!originalSection) {
      throw new Error('Sección no encontrada');
    }

    // Duplicar en memoria
    const tempId = Math.max(...sections.map(s => s.id || 0), 0) + 1;
    const duplicatedSection = {
      id: tempId,
      section_type: originalSection.section_type,
      display_order: sections.length + 1,
      enabled: originalSection.enabled,
      config: JSON.parse(JSON.stringify(originalSection.config))
    };

    sections.push(duplicatedSection);

    // Actualizar UI
    renderSections();
    updatePreview(); // Refrescar preview
    hasUnsavedChanges = true;
    showStatus('✅ Sección duplicada en borrador (sin publicar aún)', 'success');

    // Guardar en borrador de forma asincrónica
    const saveDraftUrl = `${API_BASE_URL}/admin/home-draft/save`;
    await fetch(saveDraftUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sections })
    }).catch(err => console.error('Draft save failed:', err));
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
    // Eliminar de la memoria
    sections = sections.filter(s => s.id !== sectionId);

    // Actualizar UI inmediatamente
    renderSections();
    updatePreview(); // Refrescar preview
    hasUnsavedChanges = true;
    showStatus('✅ Sección eliminada del borrador (sin publicar aún)', 'success');

    // Guardar en borrador de forma asincrónica
    const saveDraftUrl = `${API_BASE_URL}/admin/home-draft/save`;
    await fetch(saveDraftUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sections })
    }).catch(err => console.error('Draft save failed:', err));
  } catch (error) {
    console.error('Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

// ======================== PUBLICAR CAMBIOS ========================
async function publishChanges() {
  const token = await getTokenWithRetry();
  if (!token) {
    showStatus('Error: No autenticado. Por favor recarga la página e inicia sesión nuevamente.', 'error');
    return;
  }

  try {
    console.log('📤 Publicando cambios...');
    showStatus('Publicando cambios...', 'success');

    const response = await fetch(`${API_BASE_URL}/admin/home-draft/publish`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log('📤 publishChanges - Response:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    showStatus('✅ Cambios publicados correctamente. Los cambios son visibles al público.', 'success');

    // Recargar secciones para mostrar las publicadas
    await loadSections();
  } catch (error) {
    console.error('❌ publishChanges - Error:', error);
    showStatus('Error publicando cambios: ' + error.message, 'error');
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
      await publishChanges();
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
