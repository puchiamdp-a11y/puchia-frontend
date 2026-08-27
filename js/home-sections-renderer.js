/**
 * Home Sections Renderer
 * Única fuente de renderizado del HOME a partir de las secciones publicadas en el CMS.
 * Genera el mismo markup que el preview del panel de administración, así lo que la
 * administradora ve al editar es lo que termina viendo el cliente.
 *
 * Si la API falla, se conservan las secciones hardcodeadas de index.html como fallback.
 */

const HOME_SECTIONS_API = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';

let homeSectionsData = null;
let homeSectionsCategories = [];
let homeSectionsSnapshot = '';
let homeSectionsPollingInterval = null;

// ======================== HELPERS ========================
function escapeHomeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function getIconoCategoriaHome(nombre) {
  const iconos = {
    'CUMPLEAÑOS': '🎉',
    'REGALOS': '🎁',
    'EMPRENDEDORES': '💼',
    'PROMOS': '🎊'
  };
  return iconos[nombre] || '📦';
}

function formatHomePrice(value) {
  if (typeof formatCurrency === 'function') return formatCurrency(value);
  const number = parseFloat(value);
  return isNaN(number) ? '' : '$' + number.toLocaleString('es-AR');
}

function homeSectionsPlaceholder(text) {
  return `<div style="padding: 60px 40px; text-align: center; color: #999;">${escapeHomeHTML(text)}</div>`;
}

// ======================== CARGA DE DATOS ========================
async function loadHomeSectionsData() {
  const response = await fetch(`${HOME_SECTIONS_API}/home-sections`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const result = await response.json();
  const data = result.data || result;
  return Array.isArray(data) ? data : null;
}

async function loadHomeSectionsCategories() {
  try {
    const response = await fetch(`${HOME_SECTIONS_API}/categorias`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    homeSectionsCategories = result.data || [];
  } catch (error) {
    console.warn('[CMS] No se pudieron cargar las categorías:', error.message);
    homeSectionsCategories = [];
  }
}

// Los productos y las categorías se cargan sólo si alguna sección visible los necesita.
async function ensureHomeSectionsDependencies(data) {
  const visible = data.filter(s => s.enabled !== false);
  const tasks = [];

  const needsProducts = visible.some(s => s.section_type === 'products');
  if (needsProducts && typeof loadProductsFromAPI === 'function' &&
      (typeof allProducts === 'undefined' || !allProducts || allProducts.length === 0)) {
    tasks.push(loadProductsFromAPI());
  }

  const needsCategories = visible.some(s => s.section_type === 'categories');
  if (needsCategories && homeSectionsCategories.length === 0) {
    tasks.push(loadHomeSectionsCategories());
  }

  await Promise.all(tasks);
}

// ======================== RENDER PRINCIPAL ========================
async function loadAndRenderHomeSections() {
  const container = document.getElementById('homeSections');
  if (!container) return;

  try {
    const data = await loadHomeSectionsData();

    if (!data || data.length === 0) {
      console.log('[CMS] Sin secciones publicadas, se mantiene el HOME por defecto');
      return;
    }

    homeSectionsData = data;
    await ensureHomeSectionsDependencies(data);

    renderHomeSections();
    startHomeSectionsPolling();
    console.log('[CMS] HOME renderizado desde el CMS:', data.length, 'secciones');
  } catch (error) {
    console.error('[CMS] Error cargando secciones:', error.message);
    console.log('[CMS] Se mantienen las secciones por defecto del HTML');
  }
}

function renderHomeSections() {
  const container = document.getElementById('homeSections');
  if (!container || !homeSectionsData) return;

  const ordered = [...homeSectionsData].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  let html = '';

  ordered.forEach(section => {
    // Las secciones desactivadas en el panel no se muestran al cliente.
    if (section.enabled === false) return;

    const config = section.config || {};

    try {
      switch (section.section_type) {
        case 'scrolling_text':
          // La barra de anuncios vive arriba del header, se actualiza en su lugar.
          applyHomeScrollingText(config);
          break;
        case 'banner':
          html += renderHomeBanner(config);
          break;
        case 'stats':
          html += renderHomeStats(config);
          break;
        case 'image':
          html += renderHomeHowItWorks(config);
          break;
        case 'categories':
          html += renderHomeCategories(config);
          break;
        case 'products':
          html += renderHomeProducts(config);
          break;
        case 'testimonials':
          html += renderHomeTestimonials(config);
          break;
        default:
          console.warn(`[CMS] Tipo de sección desconocido: ${section.section_type}`);
      }
    } catch (error) {
      console.error(`[CMS] Error renderizando ${section.section_type}:`, error);
    }
  });

  if (!html.trim()) return;

  container.innerHTML = html;

  // Marca que el HOME lo controla el CMS, para que home.js no pise estas secciones.
  window.__cmsHomeActive = true;
  homeSectionsSnapshot = JSON.stringify(homeSectionsData);

  attachHomeSectionsBehaviour();
}

// Reconecta las animaciones y listeners que dependen del markup recién generado.
function attachHomeSectionsBehaviour() {
  if (typeof animateCounters === 'function') {
    setTimeout(animateCounters, 200);
  }

  const grid = document.getElementById('productsGrid');
  if (grid && typeof openProductDetail === 'function') {
    grid.querySelectorAll('[data-product-id]').forEach(card => {
      const productId = parseInt(card.dataset.productId);
      card.querySelector('.product-image')?.addEventListener('click', () => openProductDetail(productId));
      card.querySelector('.product-name')?.addEventListener('click', () => openProductDetail(productId));
    });
  }
}

// ======================== SECCIONES ========================
function applyHomeScrollingText(config) {
  const bar = document.getElementById('announcementBar');
  if (!bar || !config.text) return;

  bar.textContent = config.text;
  if (config.background_color) bar.style.backgroundColor = config.background_color;
  if (config.text_color) bar.style.color = config.text_color;
}

function renderHomeBanner(config) {
  if (!config.title) return '';

  const bgStyle = config.image_url
    ? ` style="background-image: url('${escapeHomeHTML(config.image_url)}'); background-size: cover; background-position: center;"`
    : '';
  const buttonUrl = config.button_url || 'proceso-compra.html';

  return `
    <div class="banner-carousel"${bgStyle}>
      <div class="banner active">
        <div class="banner-content">
          ${config.eyebrow ? `<div class="banner-eyebrow">${escapeHomeHTML(config.eyebrow)}</div>` : ''}
          <h1>${escapeHomeHTML(config.title)}</h1>
          ${config.subtitle ? `<p>${escapeHomeHTML(config.subtitle)}</p>` : ''}
          ${config.button_text ? `<a href="${escapeHomeHTML(buttonUrl)}" class="banner-btn">${escapeHomeHTML(config.button_text)}</a>` : ''}
        </div>
      </div>
      <div class="carousel-dots"><div class="dot active"></div></div>
    </div>
  `;
}

function renderHomeStats(config) {
  if (!config.stats || config.stats.length === 0) return '';

  const statsHTML = config.stats.map(stat => {
    const prefix = stat.prefix || '';
    const suffix = stat.suffix || '';
    return `
      <div class="stat-item">
        <div class="stat-number" data-target="${escapeHomeHTML(stat.number)}">${escapeHomeHTML(prefix + '0' + suffix)}</div>
        <div class="stat-label">${escapeHomeHTML(stat.label)}</div>
      </div>
    `;
  }).join('<div class="stat-divider"></div>');

  return `
    <section class="stats-section">
      <div class="stats-grid">${statsHTML}</div>
    </section>
  `;
}

function renderHomeHowItWorks(config) {
  if (!config.title && !config.steps) return '';

  const steps = config.steps && config.steps.length > 0 ? config.steps : [
    { icon: '1️⃣', title: 'Elige tu Producto', description: 'Explora nuestro catálogo con cientos de opciones personalizadas' },
    { icon: '2️⃣', title: 'Personaliza', description: 'Agrega tu toque especial: nombres, colores, mensajes' },
    { icon: '3️⃣', title: 'Recibe tu Regalo', description: 'Entrega rápida y segura a tu domicilio' }
  ];

  const stepsHTML = steps.map(step => `
    <div class="how-step">
      <div class="how-icon">${escapeHomeHTML(step.icon || '')}</div>
      <h3>${escapeHomeHTML(step.title || '')}</h3>
      <p>${escapeHomeHTML(step.description || '')}</p>
    </div>
  `).join('');

  return `
    <section class="how-section">
      <h2 class="section-title">${escapeHomeHTML(config.title || '¿Cómo Funciona?')}</h2>
      <p class="section-subtitle">${escapeHomeHTML(config.subtitle || '3 pasos simples para obtener tu regalo perfecto')}</p>
      <div class="how-grid">${stepsHTML}</div>
    </section>
  `;
}

function renderHomeCategories(config) {
  const title = config.title || 'Categorías Destacadas';
  const limit = config.limit || 10;
  const categoriesToShow = (config.show_all === false && config.ids && config.ids.length > 0)
    ? homeSectionsCategories.filter(c => config.ids.includes(c.id)).slice(0, limit)
    : homeSectionsCategories.slice(0, limit);

  if (categoriesToShow.length === 0) {
    return `
      <section class="categories-section" id="categorias">
        <h2 class="section-title">${escapeHomeHTML(title)}</h2>
        <p class="section-subtitle">Explorá nuestras principales opciones personalizadas</p>
        ${homeSectionsPlaceholder('Sin categorías disponibles')}
      </section>
    `;
  }

  const categoriesHTML = categoriesToShow.map(category => {
    const slug = String(category.nombre || '').toLowerCase().replace(/ñ/g, 'n');
    return `
      <div class="category-card" onclick="goToPromos('${escapeHomeHTML(slug)}')">
        <div class="category-card-icon">${getIconoCategoriaHome(category.nombre)}</div>
        <div class="category-card-name">${escapeHomeHTML(category.nombre)}</div>
        <p style="color: #999; font-size: 14px; margin-top: 8px;">${escapeHomeHTML(category.descripcion || '')}</p>
      </div>
    `;
  }).join('');

  return `
    <section class="categories-section" id="categorias">
      <h2 class="section-title">${escapeHomeHTML(title)}</h2>
      <p class="section-subtitle">Explorá nuestras principales opciones personalizadas</p>
      <div class="categories-grid" id="categorias-grid">${categoriesHTML}</div>
    </section>
  `;
}

function renderHomeProducts(config) {
  const title = config.title || 'Productos Destacados';
  const limit = config.limit || 6;
  const source = (typeof allProducts !== 'undefined' && Array.isArray(allProducts)) ? allProducts : [];

  const selectedProducts = (config.ids && config.ids.length > 0)
    ? source.filter(p => config.ids.includes(p.id)).slice(0, limit)
    : source.slice(0, limit);

  const productsHTML = selectedProducts.length === 0
    ? homeSectionsPlaceholder('Sin productos disponibles')
    : `<div class="products-grid" id="productsGrid">${selectedProducts.map(product => `
        <div class="product-card" data-product-id="${product.id}">
          <div class="product-image" style="cursor: pointer;">${escapeHomeHTML(product.icon || '📦')}</div>
          <div class="product-info">
            <div class="product-name" style="cursor: pointer;">${escapeHomeHTML(product.name)}</div>
            <div class="product-price">${formatHomePrice(product.price)}</div>
            <button class="product-btn" onclick="openProductDetail(${product.id})">
              Agregar al Carrito
            </button>
          </div>
        </div>
      `).join('')}</div>`;

  return `
    <section class="featured-products" id="productos">
      <h2 class="section-title">${escapeHomeHTML(title)}</h2>
      <p class="section-subtitle">Nuestros favoritos, elegidos por nuestras clientes</p>
      ${productsHTML}
      <div class="see-more-container">
        <a href="proceso-compra.html" class="see-more-btn">Ver Todos los Productos →</a>
      </div>
    </section>
  `;
}

function renderHomeTestimonials(config) {
  const title = config.title || 'Lo que dicen nuestras clientas';
  const reviewsLink = config.google_reviews_link || 'https://g.page/r/CQLxoMJXZrJ5EAE/review';

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
      <div class="testimonial-text">${escapeHomeHTML(testi.text)}</div>
      <div class="testimonial-author">${escapeHomeHTML(testi.author)}</div>
    </div>
  `).join('');

  return `
    <section class="testimonials-section" id="opiniones">
      <h2 class="testimonials-title">${escapeHomeHTML(title)}</h2>
      <p class="testimonials-subtitle">Opiniones reales verificadas en Google</p>
      <div class="testimonials-grid">${testimonialsHTML}</div>
      <div style="text-align: center; margin-top: 50px;">
        <a href="${escapeHomeHTML(reviewsLink)}" target="_blank" class="btn btn-primary" style="display: inline-block; background: var(--purple); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease;">
          ✨ Dejanos tu opinión
        </a>
      </div>
    </section>
  `;
}

// ======================== POLLING ========================
// Detecta publicaciones nuevas sin que el cliente tenga que recargar la página.
function startHomeSectionsPolling() {
  if (homeSectionsPollingInterval) clearInterval(homeSectionsPollingInterval);

  homeSectionsPollingInterval = setInterval(async () => {
    if (document.hidden) return;

    try {
      const data = await loadHomeSectionsData();
      if (!data || data.length === 0) return;

      if (JSON.stringify(data) !== homeSectionsSnapshot) {
        homeSectionsData = data;
        await ensureHomeSectionsDependencies(data);
        renderHomeSections();
        console.log('[CMS] Secciones actualizadas via polling');
      }
    } catch (error) {
      console.warn('[CMS Polling] Error:', error.message);
    }
  }, 60000);
}

// Inicializar cuando la página terminó de cargar, para que los datos de productos
// y las funciones de home.js ya estén disponibles.
if (document.readyState === 'complete') {
  loadAndRenderHomeSections();
} else {
  window.addEventListener('load', loadAndRenderHomeSections);
}
