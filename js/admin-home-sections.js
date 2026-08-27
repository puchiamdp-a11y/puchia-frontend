// ======================== CONFIG ========================
const API_BASE_URL = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';
let currentEditingSection = null;
let sections = [];
let allProducts = [];
let allCategories = [];
let hasUnsavedChanges = false;
let previewRefreshInterval = null;
let previewUpdateTimeout = null;

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

  // Generar documento HTML completo con todos los estilos CSS reales
  const previewHTML = generateCompletePreviewDocument();
  previewFrame.srcdoc = previewHTML;
  console.log('✅ Preview updated with', sections.length, 'sections');
}

// ======================== GENERAR DOCUMENTO HTML COMPLETO ========================
function generateCompletePreviewDocument() {
  const cssStyles = getCSSStyles();

  let sectionsHTML = '';
  if (sections.length === 0) {
    sectionsHTML = '<div style="text-align: center; padding: 60px 40px; color: #999;">Sin secciones configuradas</div>';
  } else {
    sections.forEach((section, index) => {
      sectionsHTML += renderPreviewSection(section, index);
    });
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - Puchia</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${cssStyles}
  </style>
</head>
<body>
  <div class="preview-content">
    ${sectionsHTML}
  </div>
</body>
</html>`;
}

// ======================== OBTENER ESTILOS CSS PARA PREVIEW ========================
function getCSSStyles() {
  return `
/* Root variables */
:root {
  --purple: #7f1f6e;
  --purple-light: #a01f8a;
  --yellow: #F3E93F;
  --white: #ffffff;
  --gray-light: #f5f5f5;
  --gray-text: #7a8794;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', sans-serif;
  background-color: #fafbfc;
  color: #2c3e50;
  line-height: 1.6;
}

.preview-content {
  width: 100%;
  background: white;
}

/* BANNER STYLES */
.preview-banner-section {
  position: relative;
  width: 100%;
  height: 400px;
  background: linear-gradient(135deg, var(--purple) 0%, #5a1f5c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
  overflow: hidden;
  margin-bottom: 40px;
}

.preview-banner-section-overlay {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.preview-banner-content {
  position: relative;
  z-index: 2;
  max-width: 700px;
  padding: 40px;
}

.preview-banner-eyebrow {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 15px;
  opacity: 0.9;
}

.preview-banner-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 15px;
  line-height: 1.2;
}

.preview-banner-subtitle {
  font-size: 18px;
  margin-bottom: 30px;
  opacity: 0.9;
  font-weight: 300;
}

.preview-banner-btn {
  display: inline-block;
  background: white;
  color: var(--purple);
  padding: 13px 40px;
  border-radius: 50px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  font-size: 14px;
}

.preview-banner-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
  background: var(--yellow);
}

/* PRODUCTS SECTION */
.preview-section {
  padding: 60px 40px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #2c3e50;
}

.section-subtitle {
  font-size: 16px;
  color: var(--gray-text);
  margin-bottom: 40px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.product-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  text-align: center;
}

.product-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  transform: translateY(-4px);
}

.product-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  background: #f5f5f5;
}

.product-info {
  padding: 15px;
}

.product-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #2c3e50;
}

.product-price {
  color: var(--purple);
  font-weight: 700;
  font-size: 13px;
}

/* CATEGORIES SECTION */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.category-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.category-image {
  width: 100%;
  height: 140px;
  object-fit: cover;
  background: #f5f5f5;
}

.category-name {
  padding: 12px;
  font-weight: 600;
  font-size: 13px;
  color: #2c3e50;
}

/* STATS SECTION */
.stats-section {
  background: white;
  padding: 60px 40px;
  border-bottom: 1px solid #f0f0f0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  text-align: center;
}

.stat-item {
  padding: 20px;
}

.stat-number {
  font-size: 36px;
  font-weight: 700;
  color: var(--purple);
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  color: var(--gray-text);
}

/* TESTIMONIALS SECTION */
.testimonials-section {
  padding: 60px 40px;
  background: #f5f5f5;
  border-bottom: 1px solid #f0f0f0;
}

.testimonials-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 10px;
  text-align: center;
}

.testimonials-subtitle {
  font-size: 16px;
  color: var(--gray-text);
  text-align: center;
  margin-bottom: 40px;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.testimonial-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.testimonial-badge {
  font-size: 11px;
  color: #999;
  margin-bottom: 10px;
  text-transform: uppercase;
  font-weight: 600;
}

.testimonial-stars {
  color: #fbbf24;
  font-size: 13px;
  margin-bottom: 12px;
}

.testimonial-text {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  line-height: 1.5;
  font-style: italic;
}

.testimonial-author {
  font-size: 12px;
  color: var(--purple);
  font-weight: 600;
}

/* SCROLLING TEXT SECTION */
.scrolling-text-section {
  background: var(--purple);
  color: white;
  padding: 20px 40px;
  text-align: center;
  font-weight: 600;
  overflow: hidden;
  margin-bottom: 40px;
}

.scrolling-text-content {
  animation: scroll 30s linear infinite;
  white-space: nowrap;
  display: inline-block;
}

@keyframes scroll {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

/* IMAGE SECTION */
.image-section {
  position: relative;
  width: 100%;
  height: 320px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  border-radius: 12px;
  overflow: hidden;
}

.image-section-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
}

.image-section-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  padding: 40px;
}

.image-section-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 10px;
}

.image-section-subtitle {
  font-size: 16px;
  margin-bottom: 20px;
  opacity: 0.9;
}

.image-section-btn {
  display: inline-block;
  background: var(--purple);
  color: white;
  padding: 12px 35px;
  border-radius: 50px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
}

.image-section-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  background: var(--purple-light);
}

@media (max-width: 768px) {
  .preview-section { padding: 40px 20px; }
  .section-title { font-size: 24px; }
  .preview-banner-section { height: 300px; }
  .preview-banner-title { font-size: 32px; }
  .products-grid { grid-template-columns: repeat(2, 1fr); }
  .categories-grid { grid-template-columns: repeat(3, 1fr); }
  .stats-grid { grid-template-columns: 1fr; }
}
  `;
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

  const bgStyle = config.image_url ? `style="background-image: url('${config.image_url}');"` : '';

  return `
    <div class="preview-banner-section" ${bgStyle}>
      <div class="preview-banner-section-overlay"></div>
      <div class="preview-banner-content">
        ${config.eyebrow ? `<div class="preview-banner-eyebrow">${config.eyebrow}</div>` : ''}
        <h1 class="preview-banner-title">${config.title}</h1>
        ${config.subtitle ? `<p class="preview-banner-subtitle">${config.subtitle}</p>` : ''}
        ${config.button_text ? `<button class="preview-banner-btn">${config.button_text}</button>` : ''}
      </div>
    </div>
  `;
}

// ======================== RENDERIZAR PRODUCTOS EN PREVIEW ========================
function renderPreviewProducts(config) {
  if (!config.ids || config.ids.length === 0) {
    return '<div class="preview-section"><div style="padding: 40px; background: #f0f0f0; border-radius: 8px; color: #999; text-align: center;">Sin productos seleccionados</div></div>';
  }

  const title = config.title || 'Productos Destacados';
  const selectedProducts = allProducts.filter(p => config.ids.includes(p.id)).slice(0, config.limit || 10);

  let productsHTML = selectedProducts.map(product => `
    <div class="product-card">
      <img src="${product.image_url || 'https://via.placeholder.com/200x150'}" alt="${product.nombre}" class="product-image">
      <div class="product-info">
        <div class="product-name">${product.nombre}</div>
        ${product.precio ? `<div class="product-price">$${product.precio}</div>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div class="preview-section">
      <h2 class="section-title">${title}</h2>
      <div class="products-grid">
        ${productsHTML}
      </div>
    </div>
  `;
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
    return '<div class="preview-section"><div style="padding: 40px; background: #f0f0f0; border-radius: 8px; color: #999; text-align: center;">Sin categorías disponibles</div></div>';
  }

  let categoriesHTML = categoriesToShow.map(category => `
    <div class="category-card">
      <img src="${category.image_url || 'https://via.placeholder.com/200x150'}" alt="${category.nombre}" class="category-image">
      <div class="category-name">${category.nombre}</div>
    </div>
  `).join('');

  return `
    <div class="preview-section">
      <h2 class="section-title">${title}</h2>
      <div class="categories-grid">
        ${categoriesHTML}
      </div>
    </div>
  `;
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

  let testimonialsHTML = filtered.map(testi => `
    <div class="testimonial-card">
      <div class="testimonial-badge">Google Reviews</div>
      <div class="testimonial-stars">★★★★★</div>
      <p class="testimonial-text">"${testi.text}"</p>
      <p class="testimonial-author">${testi.author}</p>
    </div>
  `).join('');

  return `
    <div class="testimonials-section">
      <h2 class="testimonials-title">${title}</h2>
      <p class="testimonials-subtitle">Opiniones reales verificadas en Google</p>
      <div class="testimonials-grid">
        ${testimonialsHTML}
      </div>
    </div>
  `;
}

// ======================== RENDERIZAR TEXTO DESPLAZABLE EN PREVIEW ========================
function renderPreviewScrollingText(config) {
  if (!config.text) return '';

  const bgColor = config.background_color || '#7f1f6e';
  const textColor = config.text_color || '#FFFFFF';

  return `
    <div class="scrolling-text-section" style="background: ${bgColor}; color: ${textColor};">
      <div class="scrolling-text-content">${config.text}</div>
    </div>
  `;
}

// ======================== RENDERIZAR STATS EN PREVIEW ========================
function renderPreviewStats(config) {
  if (!config.stats || config.stats.length === 0) {
    return '<div class="preview-section"><div style="padding: 40px; background: #f0f0f0; border-radius: 8px; color: #999; text-align: center;">Sin estadísticas configuradas</div></div>';
  }

  const title = config.title || 'Nuestros Logros';

  let statsHTML = config.stats.map(stat => `
    <div class="stat-item">
      <div class="stat-number">${stat.number}</div>
      <div class="stat-label">${stat.label}</div>
    </div>
  `).join('');

  return `
    <div class="stats-section">
      <h2 class="section-title">${title}</h2>
      <div class="stats-grid">
        ${statsHTML}
      </div>
    </div>
  `;
}

// ======================== RENDERIZAR IMAGEN EN PREVIEW ========================
function renderPreviewImage(config) {
  if (!config.title && !config.image_url) return '';

  const bgStyle = config.image_url ? `style="background-image: url('${config.image_url}');"` : '';

  return `
    <div class="image-section" ${bgStyle}>
      <div class="image-section-overlay"></div>
      <div class="image-section-content">
        ${config.title ? `<h2 class="image-section-title">${config.title}</h2>` : ''}
        ${config.subtitle ? `<p class="image-section-subtitle">${config.subtitle}</p>` : ''}
        ${config.button_text ? `<button class="image-section-btn">${config.button_text}</button>` : ''}
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

// ======================== CONFIGURAR PREVIEW EN VIVO ========================
function setupPreviewAutoUpdate() {
  const formInputs = document.querySelectorAll('#editSectionForm input, #editSectionForm select, #editSectionForm textarea');

  formInputs.forEach(input => {
    input.addEventListener('change', debouncePreviewUpdate);
    input.addEventListener('input', debouncePreviewUpdate);
  });
}

function debouncePreviewUpdate() {
  clearTimeout(previewUpdateTimeout);
  previewUpdateTimeout = setTimeout(() => {
    console.log('🎨 Updating preview (user edited field)');
    updatePreview();
  }, 2000); // 2s debounce
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

  // Configurar preview en vivo cuando edita
  setupPreviewAutoUpdate();
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
    showStatus('✅ Cambios en memoria (clickea "Guardar Cambios" para publicar)', 'success');
    closeModal('editSectionModal');
  } catch (error) {
    console.error('Error updating section:', error);
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
