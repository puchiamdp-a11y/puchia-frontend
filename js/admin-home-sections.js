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
  previewFrame.onload = () => fitPreviewToViewport();
  previewFrame.srcdoc = generateCompletePreviewDocument();
  console.log('✅ Preview updated with', sections.length, 'sections');
}

// El sitio real se diseña para escritorio: renderizamos a PREVIEW_WIDTH y
// escalamos para que entre en el panel sin deformar las proporciones.
const PREVIEW_WIDTH = 1280;

function fitPreviewToViewport() {
  const frame = document.getElementById('previewFrame');
  const stage = document.getElementById('previewStage');
  const viewport = document.getElementById('previewViewport');
  if (!frame || !stage || !viewport || !frame.contentDocument) return;

  const contentHeight = frame.contentDocument.documentElement.scrollHeight;
  const scale = viewport.clientWidth / PREVIEW_WIDTH;

  frame.style.height = contentHeight + 'px';
  frame.style.transform = `scale(${scale})`;
  stage.style.height = (contentHeight * scale) + 'px';
}

window.addEventListener('resize', fitPreviewToViewport);

// ======================== GENERAR DOCUMENTO HTML COMPLETO ========================
function generateCompletePreviewDocument() {
  const cssStyles = getCSSStyles();

  // Las secciones desactivadas no se publican, así que tampoco se previsualizan.
  const visibleSections = sections.filter(section => section.enabled !== false);

  let sectionsHTML = '';
  if (visibleSections.length === 0) {
    sectionsHTML = '<div style="text-align: center; padding: 60px 40px; color: #999;">Sin secciones configuradas</div>';
  } else {
    visibleSections.forEach((section, index) => {
      sectionsHTML += renderPreviewSection(section, index);
    });
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Preview - Puchia</title>
  <base href="${new URL('.', window.location.href).href}">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/common.css">
  <link rel="stylesheet" href="../css/home-critical.css">
  <link rel="stylesheet" href="../css/home.css">
  <link rel="stylesheet" href="../css/cliente.css">
  <style>
    ${cssStyles}
  </style>
</head>
<body>
  ${sectionsHTML}
</body>
</html>`;
}

// ======================== AJUSTES PROPIOS DEL PREVIEW ========================
// Solo overrides mínimos: el aspecto real viene de las hojas de estilo del sitio.
function getCSSStyles() {
  return `
    body { background-color: #fafbfc; }
    /* El preview no tiene JS del carrusel: mostramos siempre el primer banner. */
    .banner { position: relative; opacity: 1; }
    .banner-carousel { height: auto; min-height: 580px; }
    /* Sin interacciones dentro del preview. */
    a, button { pointer-events: none; }
  `;
}

// ======================== RENDERIZAR SECCIÓN EN PREVIEW ========================
function renderPreviewSection(section, index) {
  const config = section.config || {};
  let html = '';
  const actualType = getActualSectionType(section);

  switch (actualType) {
    case 'scrolling_text':
      html = renderPreviewScrollingText(config);
      break;
    case 'banner':
      html = renderPreviewBanner(config);
      break;
    case 'stats':
      html = renderPreviewStats(config);
      break;
    case 'como_funciona':
      html = renderPreviewComoFunciona(config);
      break;
    case 'image':
      html = renderPreviewImageGallery(config);
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

// ======================== HELPERS ========================
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function formatPreviewPrice(value) {
  const number = parseFloat(value);
  if (isNaN(number)) return '';
  return '$' + number.toLocaleString('es-AR');
}

function getIconoCategoriaPreview(nombre) {
  const iconos = {
    'CUMPLEAÑOS': '🎉',
    'REGALOS': '🎁',
    'EMPRENDEDORES': '💼',
    'PROMOS': '🎊'
  };
  return iconos[nombre] || '📦';
}

function previewPlaceholder(text) {
  return `<div style="padding: 60px 40px; text-align: center; color: #999; font-family: 'Poppins', sans-serif;">${escapeHTML(text)}</div>`;
}

// ======================== RENDERIZAR BANNER EN PREVIEW ========================
// Replica el markup de .banner-carousel en index.html
function renderPreviewBanner(config) {
  const banners = Array.isArray(config.banners) ? config.banners : [];
  if (banners.length === 0) return '';

  const bannersHTML = banners.map((banner, index) => {
    const bgStyle = banner.image_url
      ? ` style="background-image: url('${escapeHTML(banner.image_url)}'); background-size: cover; background-position: center;"`
      : '';

    // Si tiene URL, la imagen es clickeable pero sin botón
    const bannerContent = banner.url && banner.url !== ''
      ? `<a href="#" class="banner-content" style="cursor: pointer; text-decoration: none; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
          <h1>${escapeHTML(banner.title || '')}</h1>
          ${banner.subtitle ? `<p>${escapeHTML(banner.subtitle)}</p>` : ''}
        </a>`
      : `<div class="banner-content">
          <h1>${escapeHTML(banner.title || '')}</h1>
          ${banner.subtitle ? `<p>${escapeHTML(banner.subtitle)}</p>` : ''}
        </div>`;

    return `
      <div class="banner${index === 0 ? ' active' : ''}"${bgStyle}>
        ${bannerContent}
      </div>
    `;
  }).join('');

  const dotsHTML = banners.map((_, index) => `<div class="dot${index === 0 ? ' active' : ''}"></div>`).join('');

  return `
    <div class="banner-carousel">
      ${bannersHTML}
      ${banners.length > 1 ? `<div class="carousel-dots">${dotsHTML}</div>` : ''}
    </div>
  `;
}

// ======================== RENDERIZAR PRODUCTOS EN PREVIEW ========================
// Replica el markup de .featured-products en index.html / home.js
function renderPreviewProducts(config) {
  const title = config.title || 'Productos Destacados';
  const selectedProducts = (config.ids && config.ids.length > 0)
    ? allProducts.filter(p => config.ids.includes(p.id)).slice(0, config.limit || 6)
    : allProducts.slice(0, config.limit || 6);

  if (selectedProducts.length === 0) {
    return previewPlaceholder('Sin productos seleccionados');
  }

  const productsHTML = selectedProducts.map(product => {
    const categoria = product.categorias && product.categorias.length > 0 ? product.categorias[0].nombre : '';
    return `
      <div class="product-card">
        <div class="product-image">${getIconoCategoriaPreview(categoria)}</div>
        <div class="product-info">
          <div class="product-name">${escapeHTML(product.nombre)}</div>
          <div class="product-price">${formatPreviewPrice(product.precio)}</div>
          <button class="product-btn">Agregar al Carrito</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="featured-products">
      <h2 class="section-title">${escapeHTML(title)}</h2>
      <p class="section-subtitle">Nuestros favoritos, elegidos por nuestras clientes</p>
      <div class="products-grid">${productsHTML}</div>
      <div class="see-more-container">
        <a href="#" class="see-more-btn">Ver Todos los Productos →</a>
      </div>
    </section>
  `;
}

// ======================== RENDERIZAR CATEGORÍAS EN PREVIEW ========================
// Replica el markup de .categories-section en index.html / categorias.js
function renderPreviewCategories(config) {
  const title = config.title || 'Categorías Destacadas';
  const limit = config.limit || 10;
  const categoriesToShow = (config.show_all === false && config.ids && config.ids.length > 0)
    ? allCategories.filter(c => config.ids.includes(c.id)).slice(0, limit)
    : allCategories.slice(0, limit);

  if (categoriesToShow.length === 0) {
    return previewPlaceholder('Sin categorías disponibles');
  }

  const categoriesHTML = categoriesToShow.map(category => `
    <div class="category-card">
      <div class="category-card-icon">${getIconoCategoriaPreview(category.nombre)}</div>
      <div class="category-card-name">${escapeHTML(category.nombre)}</div>
      <p style="color: #999; font-size: 14px; margin-top: 8px;">${escapeHTML(category.descripcion || '')}</p>
    </div>
  `).join('');

  return `
    <section class="categories-section">
      <h2 class="section-title">${escapeHTML(title)}</h2>
      <p class="section-subtitle">Explorá nuestras principales opciones personalizadas</p>
      <div class="categories-grid">${categoriesHTML}</div>
    </section>
  `;
}

// ======================== RENDERIZAR TESTIMONIOS EN PREVIEW ========================
// Replica el markup de .testimonials-section en index.html
function renderPreviewTestimonials(config) {
  const title = config.title || 'Lo que dicen nuestras clientas';
  const testimonios = [
    { text: 'Excelente trabajo, hermosa calidad y presentación. Entrega en tiempo y forma, además la atención excelente. ¡Un gusto!', author: 'Clienta verificada' },
    { text: 'Son muy amables y comprometidas en su trabajo. Productos de calidad y buen precio. Entregas en tiempo y forma. Super recomendables.', author: 'Clienta verificada' },
    { text: 'Excelente atención, muy amables, entregaron en tiempo y forma. Super recomiendo a Puchia para cualquier regalo especial.', author: 'Clienta verificada' }
  ];

  const testimonialsHTML = testimonios.slice(0, config.limit || 3).map(testi => `
    <div class="testimonial-card">
      <div class="google-badge">
        <div class="google-icon">G</div>
        <span class="google-label">Google Reviews</span>
      </div>
      <div class="stars">★★★★★</div>
      <div class="testimonial-text">${escapeHTML(testi.text)}</div>
      <div class="testimonial-author">${escapeHTML(testi.author)}</div>
    </div>
  `).join('');

  return `
    <section class="testimonials-section">
      <h2 class="testimonials-title">${escapeHTML(title)}</h2>
      <p class="testimonials-subtitle">Opiniones reales verificadas en Google</p>
      <div class="testimonials-grid">${testimonialsHTML}</div>
      <div style="text-align: center; margin-top: 50px;">
        <a href="#" class="btn btn-primary" style="display: inline-block; background: var(--purple); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          ✨ Dejanos tu opinión
        </a>
      </div>
    </section>
  `;
}

// ======================== RENDERIZAR TEXTO DESPLAZABLE EN PREVIEW ========================
// Replica el markup de .announcement-bar en index.html
function renderPreviewScrollingText(config) {
  if (!config.text) return '';

  const styles = [];
  if (config.background_color) styles.push(`background-color: ${escapeHTML(config.background_color)}`);
  if (config.text_color) styles.push(`color: ${escapeHTML(config.text_color)}`);

  return `<div class="announcement-bar" style="${styles.join('; ')}">${escapeHTML(config.text)}</div>`;
}

// ======================== RENDERIZAR STATS EN PREVIEW ========================
// Replica el markup de .stats-section en index.html
function renderPreviewStats(config) {
  if (!config.stats || config.stats.length === 0) {
    return previewPlaceholder('Sin estadísticas configuradas');
  }

  const statsHTML = config.stats.map(stat => `
    <div class="stat-item">
      <div class="stat-number">${escapeHTML((stat.prefix || '') + stat.number + (stat.suffix || ''))}</div>
      <div class="stat-label">${escapeHTML(stat.label)}</div>
    </div>
  `).join('<div class="stat-divider"></div>');

  return `
    <section class="stats-section">
      <div class="stats-grid">${statsHTML}</div>
    </section>
  `;
}

// ======================== RENDERIZAR SECCIÓN IMAGEN / CÓMO FUNCIONA EN PREVIEW ========================
// Replica el markup de .how-section en index.html
function renderPreviewComoFunciona(config) {
  if (!config.title && !config.steps) return '';

  const steps = config.steps && config.steps.length > 0 ? config.steps : [
    { icon: '1️⃣', title: 'Elige tu Producto', description: 'Explora nuestro catálogo con cientos de opciones personalizadas' },
    { icon: '2️⃣', title: 'Personaliza', description: 'Agrega tu toque especial: nombres, colores, mensajes' },
    { icon: '3️⃣', title: 'Recibe tu Regalo', description: 'Entrega rápida y segura a tu domicilio' }
  ];

  const stepsHTML = steps.map(step => `
    <div class="how-step">
      <div class="how-icon">${escapeHTML(step.icon || '')}</div>
      <h3>${escapeHTML(step.title || '')}</h3>
      <p>${escapeHTML(step.description || '')}</p>
    </div>
  `).join('');

  return `
    <section class="how-section">
      <h2 class="section-title">${escapeHTML(config.title || '¿Cómo Funciona?')}</h2>
      <p class="section-subtitle">${escapeHTML(config.subtitle || '3 pasos simples para obtener tu regalo perfecto')}</p>
      <div class="how-grid">${stepsHTML}</div>
    </section>
  `;
}

function renderPreviewImageGallery(config) {
  if (!config.images || config.images.length === 0) {
    return `<div style="padding: 20px; background: #f0f0f0; border-radius: 8px; margin-bottom: 20px; color: #999;">Galería vacía - Agrega fotos</div>`;
  }

  const title = config.title ? `<h2 class="section-title">${escapeHTML(config.title)}</h2>` : '';
  const description = config.description ? `<p class="section-subtitle">${escapeHTML(config.description)}</p>` : '';
  const columns = config.columns || 3;

  const imagesHTML = (config.images || []).map(img => {
    const url = img.url || '';
    const imageStyle = `width: 100%; height: 200px; object-fit: contain; background: white; border-radius: 6px;`;
    const imgHTML = `<img src="${url}" alt="gallery" style="${imageStyle}" onerror="this.style.display='none';">`;

    if (img.link) {
      return `<a href="${escapeHTML(img.link)}" style="text-decoration: none;">${imgHTML}</a>`;
    }
    return imgHTML;
  }).join('');

  return `
    <section style="padding: 20px; margin-bottom: 20px;">
      ${title}
      ${description}
      <div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 12px; justify-items: center;">
        ${imagesHTML}
      </div>
    </section>
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
      <input type="checkbox" class="section-checkbox" title="Mostrar en la web" ${section.enabled !== false ? 'checked' : ''} onchange="toggleSectionEnabled(${section.id}, this.checked)">

      <div class="section-content">
        <div>
          <span class="section-type-badge" style="background-color: ${getSectionTypeColor(section.section_type)};">${getSectionTypeLabel(section.section_type)}</span>
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
          hasUnsavedChanges = true;
          updatePreview();
        }
      });
    } catch (error) {
      console.error('Error initializing SortableJS:', error);
    }
  }
}

// ======================== ACTIVAR / DESACTIVAR SECCIÓN ========================
function toggleSectionEnabled(sectionId, enabled) {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return;

  section.enabled = enabled;
  hasUnsavedChanges = true;
  updatePreview();
  showStatus(
    enabled
      ? '✅ Sección activada (clickea "Guardar Cambios" para publicar)'
      : '✅ Sección ocultada (clickea "Guardar Cambios" para publicar)',
    'success'
  );
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

  // Detectar tipo real (para compatibilidad con secciones antiguas)
  const actualType = getActualSectionType(section);

  // Mostrar formulario según tipo
  document.querySelectorAll('.edit-fields').forEach(f => f.style.display = 'none');
  document.getElementById(`${actualType}-fields`).style.display = 'block';

  // Llenar formulario con datos actuales
  fillFormWithSectionData(section);

  // Mostrar modal
  document.getElementById('editSectionModal').classList.add('show');

  // Configurar preview en vivo cuando edita
  setupPreviewAutoUpdate();
}

// ======================== DETECTAR TIPO REAL DE SECCIÓN ========================
// Detecta si una sección "image" antigua es realmente "como_funciona"
function getActualSectionType(section) {
  const type = section.section_type;
  const config = section.config || {};

  // Si es "image", verificar si es realmente "como_funciona" (antigua)
  if (type === 'image') {
    // Si tiene image_url y button_text, es la sección antigua "como_funciona"
    if (config.image_url || config.button_text) {
      return 'como_funciona';
    }
    // Si tiene array de images, es la nueva galería
    if (Array.isArray(config.images)) {
      return 'image';
    }
  }

  return type;
}

// ======================== LLENAR FORMULARIO ========================
function fillFormWithSectionData(section) {
  const config = section.config || {};
  const actualType = getActualSectionType(section);

  switch (actualType) {
    case 'banner':
      // Cargar banners
      const banners = Array.isArray(config.banners) ? config.banners : [];
      const bannersList = document.getElementById('banners-list');
      if (bannersList) {
        bannersList.innerHTML = '';
        banners.forEach((banner, index) => {
          addBannerField(banner, index);
        });
      }

      // Si no hay banners, agregar uno vacío por defecto
      if (banners.length === 0) {
        addBannerField();
      }

      // Cargar opciones de rotación automática
      const autoRotateCheckbox = document.getElementById('banner-auto-rotate');
      if (autoRotateCheckbox) {
        autoRotateCheckbox.checked = config.auto_rotate === true;
      }

      const rotationSpeedInput = document.getElementById('banner-rotation-speed');
      if (rotationSpeedInput) {
        rotationSpeedInput.value = config.rotation_interval || 5000;
        const valueDisplay = document.getElementById('banner-rotation-speed-value');
        if (valueDisplay) {
          const seconds = (parseInt(rotationSpeedInput.value) / 1000).toFixed(1);
          valueDisplay.textContent = seconds + 's';
        }
      }

      const rotationSpeedGroup = document.getElementById('banner-rotation-speed-group');
      if (rotationSpeedGroup) {
        rotationSpeedGroup.style.display = config.auto_rotate === true ? 'flex' : 'none';
      }

      // Inicializar drag-drop para reordenar banners
      if (window.Sortable && bannersList) {
        Sortable.create(bannersList, {
          handle: '.banner-item',
          ghostClass: 'dragging',
          animation: 150,
          onEnd: updatePreview
        });
      }
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
      const bgColor = config.background_color || '#FF1493';
      const textColor = config.text_color || '#FFFFFF';
      const scrollSpeed = config.scroll_speed || 50;

      document.getElementById('scrolling-bg-color').value = bgColor;
      document.getElementById('scrolling-text-color').value = textColor;
      document.getElementById('scrolling-speed').value = scrollSpeed;

      // Actualizar previsualizaciones de color
      const bgPreview = document.getElementById('scrolling-bg-preview');
      if (bgPreview) bgPreview.style.backgroundColor = bgColor;

      const textPreview = document.getElementById('scrolling-text-preview');
      if (textPreview) textPreview.style.color = textColor;

      // Actualizar color picker de texto
      const scrollingTextColorPicker = document.getElementById('scrolling-text-color-picker');
      if (scrollingTextColorPicker) scrollingTextColorPicker.value = textColor;

      // Actualizar valor mostrado de velocidad
      const speedValue = document.getElementById('scrolling-speed-value');
      if (speedValue) speedValue.textContent = scrollSpeed;
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

    case 'como_funciona':
      document.getElementById('como_funciona-title').value = config.title || '';
      document.getElementById('como_funciona-subtitle').value = config.subtitle || '';
      document.getElementById('como_funciona-url').value = config.image_url || '';
      document.getElementById('como_funciona-button-text').value = config.button_text || 'Crear Mi Regalo';
      document.getElementById('como_funciona-button-url').value = config.button_url || '/productos';
      break;

    case 'image':
      document.getElementById('image-title').value = config.title || '';
      document.getElementById('image-description').value = config.description || '';
      const images = config.images && config.images.length > 0 ? config.images : [{ url: '', link: '' }];
      renderImageGalleryForm(images);
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
  const actualType = getActualSectionType(currentEditingSection);

  // Validar y recopilar datos según tipo
  if (actualType === 'banner') {
    const banners = [];
    const bannerItems = document.querySelectorAll('.banner-item');

    bannerItems.forEach((item, index) => {
      const title = item.querySelector('.banner-item-title').value.trim();
      const subtitle = item.querySelector('.banner-item-subtitle').value.trim();
      const imageUrl = item.querySelector('.banner-item-image').value.trim();
      const url = item.querySelector('.banner-item-url').value.trim();

      // Al menos un banner debe tener título e imagen
      if (title || imageUrl) {
        banners.push({
          title: title,
          subtitle: subtitle,
          image_url: imageUrl,
          url: url || ''
        });
      }
    });

    if (banners.length === 0) {
      showStatus('Agrega al menos un banner con título e imagen', 'error');
      isValid = false;
    }

    config = {
      banners: banners,
      auto_rotate: document.getElementById('banner-auto-rotate').checked,
      rotation_interval: parseInt(document.getElementById('banner-rotation-speed').value) || 5000
    };
  } else if (actualType === 'products') {
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
  } else if (actualType === 'categories') {
    const showAll = document.getElementById('categories-show-all').checked;
    const selectedIds = showAll ? [] : Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => parseInt(cb.value));
    config = {
      title: document.getElementById('categories-title').value.trim() || 'Categorías',
      show_all: showAll,
      ids: selectedIds,
      limit: parseInt(document.getElementById('categories-limit').value) || 10
    };
  } else if (actualType === 'testimonials') {
    config = {
      title: document.getElementById('testimonials-title').value.trim() || 'Lo que Dicen Nuestros Clientes',
      show_all: document.getElementById('testimonials-show-all').checked,
      min_rating: parseInt(document.getElementById('testimonials-rating').value) || 0,
      limit: parseInt(document.getElementById('testimonials-limit').value) || 5
    };
  } else if (actualType === 'scrolling_text') {
    const bgColor = document.getElementById('scrolling-bg-color').value.trim();
    const textColor = document.getElementById('scrolling-text-color').value.trim();

    // Validar formato de colores HEX
    const isValidHex = (color) => /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(color);

    if (!isValidHex(bgColor)) {
      showStatus('Color de fondo inválido. Usa formato HEX (ej: #FF1493)', 'error');
      isValid = false;
    }

    if (!isValidHex(textColor)) {
      showStatus('Color de texto inválido. Usa formato HEX (ej: #FFFFFF)', 'error');
      isValid = false;
    }

    config = {
      text: document.getElementById('scrolling-text-content').value.trim() || '',
      background_color: bgColor,
      text_color: textColor,
      scroll_speed: parseInt(document.getElementById('scrolling-speed').value) || 50
    };
    if (!config.text) {
      showStatus('El texto del anuncio es requerido', 'error');
      isValid = false;
    }
  } else if (actualType === 'stats') {
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
  } else if (actualType === 'como_funciona') {
    config = {
      title: document.getElementById('como_funciona-title').value.trim() || '',
      subtitle: document.getElementById('como_funciona-subtitle').value.trim() || '',
      image_url: document.getElementById('como_funciona-url').value.trim() || '',
      button_text: document.getElementById('como_funciona-button-text').value.trim() || 'Crear Mi Regalo',
      button_url: document.getElementById('como_funciona-button-url').value.trim() || '/productos'
    };
  } else if (actualType === 'image') {
    const images = getImageGalleryFromForm();

    if (images.length === 0) {
      showStatus('Agrega al menos una foto a la galería', 'error');
      isValid = false;
    }

    config = {
      title: document.getElementById('image-title').value.trim() || '',
      description: document.getElementById('image-description').value.trim() || '',
      images: images
    };
  } else {
    console.error('Unsupported section type:', currentEditingSection.section_type);
    showStatus('Tipo de sección no soportado aún en el formulario. El backend usará valores por defecto.', 'warning');
  }

  if (!isValid) return;

  try {
    // Si es una sección nueva (id === null), crearla en memoria
    if (currentEditingSection.id === null) {
      const tempId = Math.max(...sections.map(s => s.id || 0), 0) + 1;
      currentEditingSection.id = tempId;
      currentEditingSection.config = config;
      sections.push(currentEditingSection);
    } else {
      // Si es existente, solo actualizar config
      const sectionIndex = sections.findIndex(s => s.id === currentEditingSection.id);
      if (sectionIndex !== -1) {
        sections[sectionIndex].config = config;
      }
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
  try {
    // Solo preparar el formulario - NO crear la sección todavía
    const tempId = Math.max(...sections.map(s => s.id || 0), 0) + 1;
    const newSection = {
      id: null,
      section_type: type,
      display_order: sections.length + 1,
      enabled: true,
      config: type === 'image' ? { images: [{ url: '', link: '' }] } : {},
      created_by: null,
      updated_by: null
    };

    currentEditingSection = newSection;

    closeModal('selectTypeModal');

    // Mostrar el formulario apropiado
    document.querySelectorAll('.edit-fields').forEach(f => f.style.display = 'none');
    const fieldsId = type === 'image' ? 'image-fields' : type === 'como_funciona' ? 'como_funciona-fields' : type + '-fields';
    const fieldsEl = document.getElementById(fieldsId);
    if (fieldsEl) fieldsEl.style.display = 'block';

    // Llenar el formulario con valores iniciales
    fillFormWithSectionData(newSection);

    // Abrir el modal de edición
    document.getElementById('editSectionModal').classList.add('show');
    showStatus('Completa el formulario y presiona "Guardar Sección"', 'info');
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
    showStatus('Guardando y publicando cambios...', 'success');

    // 1) Guardar el estado actual en el borrador.
    // Las ediciones del formulario solo viven en memoria hasta este punto, así que
    // hay que persistirlas antes de publicar o se publicaría una versión vieja.
    const saveResponse = await fetch(`${API_BASE_URL}/admin/home-draft/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sections })
    });

    if (!saveResponse.ok) {
      const saveText = await saveResponse.text();
      throw new Error(`No se pudo guardar el borrador (HTTP ${saveResponse.status}): ${saveText}`);
    }

    console.log('💾 Borrador guardado con', sections.length, 'secciones');

    // 2) Publicar el borrador para que sea visible al público.
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
    hasUnsavedChanges = false;
    showStatus('✅ Cambios publicados correctamente. Los cambios son visibles al público.', 'success');

    // Recargar secciones para mostrar las publicadas
    await loadSections();
  } catch (error) {
    console.error('❌ publishChanges - Error:', error);
    showStatus('Error publicando cambios: ' + error.message, 'error');
  }
}

// ======================== MANEJO DE BANNERS ========================
function addBannerField(banner = {}, index = null) {
  const bannersList = document.getElementById('banners-list');
  if (!bannersList) return;

  const bannerId = index !== null ? index : Date.now();
  const totalBanners = bannersList.querySelectorAll('.banner-item').length + 1;

  const html = `
    <div class="banner-item" style="margin-bottom: 15px; padding: 15px; border: 2px solid #ddd; border-radius: 6px; background-color: white; cursor: move; position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #666;">📌 Banner ${totalBanners}</h4>
        <button type="button" class="btn-delete-banner" data-banner-id="${bannerId}" style="padding: 4px 8px; background: #ff4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">🗑️ Eliminar</button>
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">Etiqueta (identificación)</label>
        <input type="text" class="form-input banner-item-label" placeholder="Ej: Banner Principal" value="${escapeHTML(banner.label || '')}" style="font-size: 12px; padding: 6px;">
      </div>

      <!-- Image Upload Area -->
      <div class="banner-image-upload" style="margin-bottom: 10px; padding: 12px; border: 2px dashed #999; border-radius: 4px; background-color: #f9f9f9; text-align: center; cursor: pointer;">
        <input type="file" class="banner-image-input" accept="image/*" style="display: none;">
        <div class="banner-image-preview" style="display: none; margin-bottom: 8px;">
          <img src="" style="max-width: 100%; max-height: 150px; border-radius: 4px;">
        </div>
        <div class="banner-image-placeholder">
          <div style="font-size: 24px; margin-bottom: 4px;">📷</div>
          <div style="font-size: 12px; color: #666;">Arrastra imagen aquí o haz click</div>
        </div>
      </div>
      <input type="hidden" class="banner-item-image" value="${escapeHTML(banner.image_url || '')}">

      <div style="margin-bottom: 10px; padding: 10px; background-color: #fffbea; border-left: 3px solid #fbbf24; border-radius: 4px; font-size: 12px; color: #666;">
        <strong style="color: #f59e0b;">💡 Tamaño recomendado:</strong> 1200px (ancho) × 400px (alto) para que la imagen se vea perfecta en todos los dispositivos.
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">Título *</label>
        <input type="text" class="form-input banner-item-title" placeholder="Título del banner" value="${escapeHTML(banner.title || '')}" style="font-size: 12px; padding: 6px;">
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">Subtítulo</label>
        <input type="text" class="form-input banner-item-subtitle" placeholder="Subtítulo (opcional)" value="${escapeHTML(banner.subtitle || '')}" style="font-size: 12px; padding: 6px;">
      </div>

      <div class="form-group">
        <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">URL al hacer click (opcional)</label>
        <input type="url" class="form-input banner-item-url" placeholder="https://ejemplo.com" value="${escapeHTML(banner.url || '')}" style="font-size: 12px; padding: 6px;">
      </div>
    </div>
  `;

  const temp = document.createElement('div');
  temp.innerHTML = html;
  const bannerElement = temp.firstElementChild;
  bannersList.appendChild(bannerElement);

  // Agregar event listener para eliminar banner
  const deleteBtn = bannerElement.querySelector('.btn-delete-banner');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bannerElement.remove();
      updatePreview();
    });
  }

  // Manejar upload de imagen
  const imageUploadArea = bannerElement.querySelector('.banner-image-upload');
  const imageInput = bannerElement.querySelector('.banner-image-input');
  const imagePreview = bannerElement.querySelector('.banner-image-preview');
  const imagePlaceholder = bannerElement.querySelector('.banner-image-placeholder');
  const imageHiddenInput = bannerElement.querySelector('.banner-item-image');

  if (imageUploadArea && imageInput) {
    imageUploadArea.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        uploadBannerImage(file, bannerElement, imageHiddenInput, imagePreview, imagePlaceholder);
      }
    });

    // Drag and drop
    imageUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      imageUploadArea.style.backgroundColor = '#e8e8e8';
    });

    imageUploadArea.addEventListener('dragleave', () => {
      imageUploadArea.style.backgroundColor = '#f9f9f9';
    });

    imageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      imageUploadArea.style.backgroundColor = '#f9f9f9';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        uploadBannerImage(file, bannerElement, imageHiddenInput, imagePreview, imagePlaceholder);
      }
    });
  }

  // Mostrar preview si ya hay imagen
  if (banner.image_url) {
    const img = imagePreview.querySelector('img');
    if (img) {
      img.src = banner.image_url;
      imagePreview.style.display = 'block';
      imagePlaceholder.style.display = 'none';
    }
  }

  // Agregar event listeners para actualizar preview
  bannerElement.querySelectorAll('input[type="text"], input[type="url"]').forEach(input => {
    input.addEventListener('input', updatePreview);
  });
}

async function uploadBannerImage(file, bannerElement, imageHiddenInput, imagePreview, imagePlaceholder) {
  try {
    const token = localStorage.getItem('puchia_admin_token');
    const formData = new FormData();
    formData.append('archivo', file);

    const response = await fetch(`${API_BASE_URL}/admin/media/home-banners`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al subir imagen');
    }

    const imageUrl = data.data?.url || data.data;
    imageHiddenInput.value = imageUrl;

    const img = imagePreview.querySelector('img');
    if (img) {
      img.src = imageUrl;
      imagePreview.style.display = 'block';
      imagePlaceholder.style.display = 'none';
    }

    updatePreview();
    showStatus(`✅ Imagen cargada correctamente`, 'success');
  } catch (error) {
    showStatus(`❌ Error al subir imagen: ${error.message}`, 'error');
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
    testimonials: 'Opiniones',
    scrolling_text: 'Zona de Texto',
    stats: 'Animación de Números',
    image: 'Imagen',
    como_funciona: '¿Cómo Funciona?'
  };
  return labels[type] || type;
}

function getSectionTypeColor(type) {
  const colors = {
    banner: '#2563EB',           // Azul
    products: '#16A34A',         // Verde
    categories: '#EA580C',       // Naranja
    testimonials: '#DC2626',     // Rojo
    scrolling_text: '#9333EA',   // Púrpura
    stats: '#EAB308',            // Amarillo
    image: '#0891B2',            // Turquesa
    como_funciona: '#64748B'     // Gris
  };
  return colors[type] || '#7b2d8e';
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

  // Si se está cerrando el modal de edición, limpiar la sección si es nueva sin guardar
  if (modalId === 'editSectionModal' && currentEditingSection && currentEditingSection.id === null) {
    currentEditingSection = null;
  }
}

// ======================== IMAGE GALLERY FUNCTIONS ========================
function renderImageGalleryForm(images = []) {
  const container = document.getElementById('images-list-gallery');
  if (!container) return;

  container.innerHTML = '';
  images.forEach((img, idx) => {
    renderImageSquare(img, idx, images.length);
  });
}

function renderImageSquare(img, idx, totalCount) {
  const container = document.getElementById('images-list-gallery');
  if (!container) return;

  const itemDiv = document.createElement('div');
  itemDiv.className = 'image-gallery-item';
  itemDiv.dataset.index = idx;
  itemDiv.dataset.url = img.url || '';
  itemDiv.dataset.link = img.link || '';

  const squareDiv = document.createElement('div');
  squareDiv.className = img.url ? 'image-square-wrapper has-image' : 'image-square-wrapper empty';

  if (img.url) {
    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = 'Galería de imagen';
    squareDiv.appendChild(imgEl);
  } else {
    squareDiv.innerHTML = '📷';
  }

  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'image-gallery-controls';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'image-url-field';
  urlInput.placeholder = 'URL imagen';
  urlInput.value = escapeHTML(img.url || '');
  urlInput.addEventListener('change', (e) => {
    itemDiv.dataset.url = e.target.value;
    updateImageSquareDisplay(idx, e.target.value);
  });

  const linkInput = document.createElement('input');
  linkInput.type = 'text';
  linkInput.className = 'image-link-field';
  linkInput.placeholder = 'Link (opcional)';
  linkInput.value = escapeHTML(img.link || '');
  linkInput.addEventListener('change', (e) => {
    itemDiv.dataset.link = e.target.value;
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'image-remove-btn';
  removeBtn.textContent = 'Quitar';
  removeBtn.addEventListener('click', () => {
    removeImageFromGallery(idx);
  });

  controlsDiv.appendChild(urlInput);
  controlsDiv.appendChild(linkInput);
  controlsDiv.appendChild(removeBtn);

  itemDiv.appendChild(squareDiv);
  itemDiv.appendChild(controlsDiv);
  container.appendChild(itemDiv);
}

function updateImageSquareDisplay(idx, url) {
  const items = document.querySelectorAll('.image-gallery-item');
  if (items[idx]) {
    const squareWrapper = items[idx].querySelector('.image-square-wrapper');
    if (url) {
      squareWrapper.className = 'image-square-wrapper has-image';
      squareWrapper.innerHTML = `<img src="${url}" alt="Galería de imagen">`;
    } else {
      squareWrapper.className = 'image-square-wrapper empty';
      squareWrapper.innerHTML = '📷';
    }
  }
}

function addImageToGallery() {
  const container = document.getElementById('images-list-gallery');
  if (!container || container.children.length >= 10) {
    alert('Máximo 10 imágenes permitidas');
    return;
  }

  const newImage = { url: '', link: '' };
  const newIdx = container.children.length;
  renderImageSquare(newImage, newIdx, newIdx + 1);
}

function removeImageFromGallery(idx) {
  const container = document.getElementById('images-list-gallery');
  if (idx !== undefined && container.children[idx]) {
    container.children[idx].remove();
  }
}

function getImageGalleryFromForm() {
  const container = document.getElementById('images-list-gallery');
  if (!container) return [];

  const images = [];
  container.querySelectorAll('.image-gallery-item').forEach((item) => {
    const url = item.dataset.url || '';
    const link = item.dataset.link || '';
    if (url) {
      images.push({ url, link });
    }
  });
  return images;
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

  // Color picker para color de fondo de Zona de Texto (bidireccional)
  const scrollingBgColorPicker = document.getElementById('scrolling-bg-color-picker');
  const scrollingBgColorInput = document.getElementById('scrolling-bg-color');
  if (scrollingBgColorPicker && scrollingBgColorInput) {
    // Inicializar con valor por defecto
    scrollingBgColorInput.value = '#FF1493';

    // Cuando cambia el color picker, actualizar el texto HEX
    scrollingBgColorPicker.addEventListener('input', (e) => {
      scrollingBgColorInput.value = e.target.value;
      updatePreview();
    });

    // Cuando cambia el texto HEX, actualizar el color picker
    scrollingBgColorInput.addEventListener('input', (e) => {
      let value = e.target.value.trim();
      if (!value.startsWith('#')) value = '#' + value;
      if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value)) {
        scrollingBgColorPicker.value = value;
        scrollingBgColorInput.value = value;
      }
      updatePreview();
    });
  }

  // Color picker para color de texto de Zona de Texto (bidireccional)
  const scrollingTextColorPicker = document.getElementById('scrolling-text-color-picker');
  const scrollingTextColorInput = document.getElementById('scrolling-text-color');
  if (scrollingTextColorPicker && scrollingTextColorInput) {
    // Inicializar con valor por defecto
    scrollingTextColorInput.value = '#FFFFFF';

    // Cuando cambia el color picker, actualizar el texto HEX
    scrollingTextColorPicker.addEventListener('input', (e) => {
      scrollingTextColorInput.value = e.target.value;
      updatePreview();
    });

    // Cuando cambia el texto HEX, actualizar el color picker
    scrollingTextColorInput.addEventListener('input', (e) => {
      let value = e.target.value.trim();
      if (!value.startsWith('#')) value = '#' + value;
      if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value)) {
        scrollingTextColorPicker.value = value;
      }
      updatePreview();
    });
  }

  // Evento para actualizar el valor mostrado de velocidad de scroll
  const scrollingSpeedInput = document.getElementById('scrolling-speed');
  if (scrollingSpeedInput) {
    scrollingSpeedInput.addEventListener('input', (e) => {
      const valueDisplay = document.getElementById('scrolling-speed-value');
      if (valueDisplay) valueDisplay.textContent = e.target.value;
      updatePreview();
    });
  }

  // Evento para mostrar/ocultar opciones de velocidad de rotación de banners
  const bannerAutoRotateCheckbox = document.getElementById('banner-auto-rotate');
  if (bannerAutoRotateCheckbox) {
    bannerAutoRotateCheckbox.addEventListener('change', (e) => {
      const rotationSpeedGroup = document.getElementById('banner-rotation-speed-group');
      if (rotationSpeedGroup) {
        rotationSpeedGroup.style.display = e.target.checked ? 'flex' : 'none';
      }
      updatePreview();
    });
  }

  // Evento para actualizar el valor mostrado de velocidad de rotación
  const bannerRotationSpeedInput = document.getElementById('banner-rotation-speed');
  if (bannerRotationSpeedInput) {
    bannerRotationSpeedInput.addEventListener('input', (e) => {
      const valueDisplay = document.getElementById('banner-rotation-speed-value');
      if (valueDisplay) {
        const seconds = (parseInt(e.target.value) / 1000).toFixed(1);
        valueDisplay.textContent = seconds + 's';
      }
      updatePreview();
    });
  }

  // Evento para agregar un nuevo banner
  const addBannerBtn = document.getElementById('add-banner-btn');
  if (addBannerBtn) {
    addBannerBtn.addEventListener('click', addBannerField);
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

  // ======================== BRANDING SETUP ========================
  initBrandingUpload();
}

// ======================== BRANDING FUNCTIONS ========================
async function initBrandingUpload() {
  const token = localStorage.getItem('puchia_admin_token');

  // Si no hay token, mostrar placeholders y permitir upload después
  if (!token) {
    console.log('Token no disponible aún, inicializando controles de branding...');
    setupLogoUpload();
    setupFaviconUpload();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-branding`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn(`No se pudo cargar branding (${response.status}), usando placeholders`);
      setupLogoUpload();
      setupFaviconUpload();
      return;
    }

    const result = await response.json();

    if (result.success && result.data) {
      const { logo_url, favicon_url } = result.data;

      if (logo_url) {
        displayLogo(logo_url);
      }
      if (favicon_url) {
        displayFavicon(favicon_url);
      }
    }
  } catch (error) {
    console.error('Error loading branding:', error);
  }

  setupLogoUpload();
  setupFaviconUpload();
}

function displayLogo(logoUrl) {
  const preview = document.getElementById('logoPreview');
  const placeholder = document.getElementById('logoPlaceholder');
  const removeBtn = document.getElementById('logoRemoveBtn');

  preview.src = `${logoUrl}?t=${Date.now()}`;
  preview.style.display = 'block';
  placeholder.style.display = 'none';
  removeBtn.style.display = 'inline-block';
}

function displayFavicon(faviconUrl) {
  const preview = document.getElementById('faviconPreview');
  const placeholder = document.getElementById('faviconPlaceholder');
  const removeBtn = document.getElementById('faviconRemoveBtn');

  preview.src = `${faviconUrl}?t=${Date.now()}`;
  preview.style.display = 'block';
  placeholder.style.display = 'none';
  removeBtn.style.display = 'inline-block';
}

function setupLogoUpload() {
  const fileInput = document.getElementById('logoFileInput');
  const status = document.getElementById('logoStatus');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await uploadBrandingFile(file, 'logo', status);
  });
}

function setupFaviconUpload() {
  const fileInput = document.getElementById('faviconFileInput');
  const status = document.getElementById('faviconStatus');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await uploadBrandingFile(file, 'favicon', status);
  });
}

async function uploadBrandingFile(file, type, statusElement) {
  if (!file.type.startsWith('image/')) {
    statusElement.textContent = '❌ Por favor, sube solo archivos de imagen';
    statusElement.style.display = 'block';
    statusElement.style.color = '#c5221f';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    statusElement.textContent = '❌ Archivo muy grande (máximo 2MB)';
    statusElement.style.display = 'block';
    statusElement.style.color = '#c5221f';
    return;
  }

  statusElement.textContent = '⏳ Subiendo...';
  statusElement.style.display = 'block';
  statusElement.style.color = '#666';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-branding/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      statusElement.textContent = `✅ ${type === 'logo' ? 'Foto de perfil' : 'Favicon'} actualizado correctamente`;
      statusElement.style.color = '#1a7c3a';

      if (type === 'logo') {
        displayLogo(result.data.logo_url);
      } else {
        displayFavicon(result.data.favicon_url);
      }

      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    } else {
      statusElement.textContent = `❌ ${result.error || 'Error al subir archivo'}`;
      statusElement.style.color = '#c5221f';
    }
  } catch (error) {
    console.error('Error uploading branding:', error);
    statusElement.textContent = '❌ Error al subir archivo';
    statusElement.style.color = '#c5221f';
  }
}

async function removeLogo() {
  if (!confirm('¿Estás seguro que deseas eliminar la foto de perfil?')) return;

  const preview = document.getElementById('logoPreview');
  const placeholder = document.getElementById('logoPlaceholder');
  const removeBtn = document.getElementById('logoRemoveBtn');
  const status = document.getElementById('logoStatus');

  status.textContent = '⏳ Eliminando...';
  status.style.display = 'block';
  status.style.color = '#666';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-branding/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      },
      body: JSON.stringify({ type: 'logo' })
    });

    const result = await response.json();

    if (result.success) {
      preview.style.display = 'none';
      placeholder.style.display = 'block';
      removeBtn.style.display = 'none';
      status.textContent = '✅ Foto de perfil eliminada';
      status.style.color = '#1a7c3a';

      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
    }
  } catch (error) {
    console.error('Error removing logo:', error);
    status.textContent = '❌ Error al eliminar';
    status.style.color = '#c5221f';
  }
}

async function removeFavicon() {
  if (!confirm('¿Estás seguro que deseas eliminar el favicon?')) return;

  const preview = document.getElementById('faviconPreview');
  const placeholder = document.getElementById('faviconPlaceholder');
  const removeBtn = document.getElementById('faviconRemoveBtn');
  const status = document.getElementById('faviconStatus');

  status.textContent = '⏳ Eliminando...';
  status.style.display = 'block';
  status.style.color = '#666';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/home-branding/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('puchia_admin_token')}`
      },
      body: JSON.stringify({ type: 'favicon' })
    });

    const result = await response.json();

    if (result.success) {
      preview.style.display = 'none';
      placeholder.style.display = 'block';
      removeBtn.style.display = 'none';
      status.textContent = '✅ Favicon eliminado';
      status.style.color = '#1a7c3a';

      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
    }
  } catch (error) {
    console.error('Error removing favicon:', error);
    status.textContent = '❌ Error al eliminar';
    status.style.color = '#c5221f';
  }
}
