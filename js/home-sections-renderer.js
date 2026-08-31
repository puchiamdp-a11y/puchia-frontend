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

// Detecta el tipo real de sección (compatibilidad con secciones antiguas)
function getActualSectionType(section) {
  const type = section.section_type;
  const config = section.config || {};

  if (type === 'image') {
    if (config.image_url || config.button_text) {
      return 'como_funciona';
    }
    if (Array.isArray(config.images)) {
      return 'image';
    }
  }

  return type;
}

// ======================== CARGA DE DATOS ========================
async function loadHomeSectionsData() {
  // Agregar timestamp para evitar caché del navegador
  const timestamp = new Date().getTime();
  const response = await fetch(`${HOME_SECTIONS_API}/home-sections?t=${timestamp}`, {
    cache: 'no-store'
  });
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
      hideLoadingScreen();
      return;
    }

    homeSectionsData = data;
    await ensureHomeSectionsDependencies(data);

    renderHomeSections();
    hideLoadingScreen();
    startHomeSectionsPolling();
    console.log('[CMS] HOME renderizado desde el CMS:', data.length, 'secciones');
  } catch (error) {
    console.error('[CMS] Error cargando secciones:', error.message);
    console.log('[CMS] Se mantienen las secciones por defecto del HTML');
    hideLoadingScreen();
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('cms-loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
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
    const actualType = getActualSectionType(section);

    try {
      switch (actualType) {
        case 'scrolling_text':
          // Renderizar como sección del contenido (permite múltiples zonas de texto)
          html += renderHomeScrollingText(config);
          break;
        case 'banner':
          html += renderHomeBanner(config);
          break;
        case 'stats':
          html += renderHomeStats(config);
          break;
        case 'como_funciona':
          html += renderHomeHowItWorks(config);
          break;
        case 'image':
          html += renderHomeImageGallery(config);
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
// Renderizar zona de texto como sección del contenido (permite múltiples)
function renderHomeScrollingText(config) {
  if (!config.text) return '';

  const bgColor = config.background_color || '#FF1493';
  const textColor = config.text_color || '#FFFFFF';
  const scrollSpeed = config.scroll_speed || 50;
  const padding = config.padding || '12px 0';

  return `
    <div class="home-scrolling-text-section" style="background-color: ${escapeHomeHTML(bgColor)}; color: ${escapeHomeHTML(textColor)}; padding: ${escapeHomeHTML(padding)}; text-align: center; font-weight: bold;">
      <div style="animation: scroll-left ${Math.max(10, 100 - scrollSpeed)}s linear infinite; white-space: nowrap;">
        ${escapeHomeHTML(config.text)}
      </div>
    </div>
  `;
}

// Renderizar zona de texto como sección del contenido (permite múltiples)
function renderHomeScrollingText(config) {
  if (!config.text) return '';

  const bgColor = config.background_color || '#FF1493';
  const textColor = config.text_color || '#FFFFFF';
  const scrollSpeed = config.scroll_speed || 50;
  const padding = config.padding || '12px 0';

  return `
    <div class="home-scrolling-text-section" style="background-color: ${escapeHomeHTML(bgColor)}; color: ${escapeHomeHTML(textColor)}; padding: ${escapeHomeHTML(padding)}; text-align: center; font-weight: bold;">
      <div style="animation: scroll-left ${Math.max(10, 100 - scrollSpeed)}s linear infinite; white-space: nowrap;">
        ${escapeHomeHTML(config.text)}
      </div>
    </div>
  `;
}

function renderHomeBanner(config) {
  // Compatibilidad: buscar en 'slides' (estructura anterior) o 'banners' (nueva estructura)
  const banners = Array.isArray(config.slides) ? config.slides :
                  Array.isArray(config.banners) ? config.banners : [];
  if (banners.length === 0) return '';

  const bannersHTML = banners.map((banner, index) => {
    const bgStyle = banner.image_url
      ? ` style="background-image: url('${escapeHomeHTML(banner.image_url)}'); background-size: cover; background-position: center;"`
      : '';

    // Compatibilidad: usar button_url (backend) o url (frontend)
    const bannerUrl = banner.button_url || banner.url || '';

    // Si tiene URL, hacer el banner clickable (sin botón)
    if (bannerUrl) {
      return `
        <div class="banner${index === 0 ? ' active' : ''}"${bgStyle}>
          <a href="${escapeHomeHTML(bannerUrl)}" class="banner-content" style="cursor: pointer; text-decoration: none;">
            ${banner.eyebrow ? `<div class="banner-eyebrow">${escapeHomeHTML(banner.eyebrow)}</div>` : ''}
            <h1>${escapeHomeHTML(banner.title || '')}</h1>
            ${banner.subtitle ? `<p>${escapeHomeHTML(banner.subtitle)}</p>` : ''}
          </a>
        </div>
      `;
    }

    // Sin botón: solo contenido de texto
    const bannerContent = `<div class="banner-content">
      ${banner.eyebrow ? `<div class="banner-eyebrow">${escapeHomeHTML(banner.eyebrow)}</div>` : ''}
      <h1>${escapeHomeHTML(banner.title || '')}</h1>
      ${banner.subtitle ? `<p>${escapeHomeHTML(banner.subtitle)}</p>` : ''}
    </div>`;

    return `
      <div class="banner${index === 0 ? ' active' : ''}"${bgStyle}>
        ${bannerContent}
      </div>
    `;
  }).join('');

  const dotsHTML = banners.map((_, index) => `<div class="dot${index === 0 ? ' active' : ''}"></div>`).join('');
  const autoRotateClass = config.auto_rotate === true ? ' data-auto-rotate="true" data-rotation-interval="' + (config.rotation_interval || 5000) + '"' : '';

  return `
    <div class="banner-carousel"${autoRotateClass}>
      ${bannersHTML}
      ${banners.length > 1 ? `
        <button class="banner-arrow banner-arrow-left" onclick="prevBanner()" title="Banner anterior" aria-label="Banner anterior">❮</button>
        <button class="banner-arrow banner-arrow-right" onclick="nextBanner()" title="Siguiente banner" aria-label="Siguiente banner">❯</button>
        <div class="carousel-dots">${dotsHTML}</div>
      ` : ''}
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
    : `<div class="products-grid" id="productsGrid">${selectedProducts.map(product => {
        const badge = config.badges && config.badges[product.id];
        return `
        <div class="product-card" data-product-id="${product.id}">
          ${badge ? `<div class="product-badge badge-${badge.toLowerCase().replace(/ /g, '-')}">${escapeHomeHTML(badge)}</div>` : ''}
          <div class="product-image" style="cursor: pointer;">${escapeHomeHTML(product.icon || '📦')}</div>
          <div class="product-info">
            <div class="product-name" style="cursor: pointer;">${escapeHomeHTML(product.name)}</div>
            <div class="product-price">${formatHomePrice(product.price)}</div>
            <button class="product-btn" onclick="openProductDetail(${product.id})">
              Agregar al Carrito
            </button>
          </div>
        </div>
      `;
      }).join('')}</div>`;

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

function renderHomeImageGallery(config) {
  if (!config.images || config.images.length === 0) return '';

  const title = config.title ? `<h2 class="section-title">${escapeHomeHTML(config.title)}</h2>` : '';
  const description = config.description ? `<p class="section-subtitle">${escapeHomeHTML(config.description)}</p>` : '';
  const columns = config.columns || 3;

  // Responsive columns
  const responsiveColumns = `
    @media (max-width: 1200px) {
      .image-gallery-grid-${Math.random().toString(36).substr(2, 9)} {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }
    @media (max-width: 768px) {
      .image-gallery-grid-${Math.random().toString(36).substr(2, 9)} {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  const gridClass = `image-gallery-grid-${Math.random().toString(36).substr(2, 9)}`;

  const imagesHTML = (config.images || []).map(img => {
    const url = img.url || '';
    if (!url) return '';

    const imageHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 200px; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
        <img src="${escapeHomeHTML(url)}" alt="gallery" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.style.display='none';">
      </div>
    `;

    if (img.link) {
      return `<a href="${escapeHomeHTML(img.link)}" style="text-decoration: none; display: block; transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${imageHTML}</a>`;
    }
    return imageHTML;
  }).filter(html => html).join('');

  if (!imagesHTML) return '';

  return `
    <section style="padding: 40px 20px;">
      <style>${responsiveColumns}</style>
      ${title}
      ${description}
      <div class="${gridClass}" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 20px; justify-items: center;">
        ${imagesHTML}
      </div>
    </section>
  `;
}

// ======================== POLLING ========================
// Detecta publicaciones nuevas sin que el cliente tenga que recargar la página.
function startHomeSectionsPolling() {
  if (homeSectionsPollingInterval) clearInterval(homeSectionsPollingInterval);

  // Chequear cambios cada 10 segundos (en lugar de 60) para detectar cambios rápidamente
  homeSectionsPollingInterval = setInterval(async () => {
    if (document.hidden) return;

    try {
      const data = await loadHomeSectionsData();
      if (!data || data.length === 0) return;

      const newSnapshot = JSON.stringify(data);
      if (newSnapshot !== homeSectionsSnapshot) {
        console.log('[CMS] Cambios detectados, actualizando secciones...');
        homeSectionsData = data;
        homeSectionsSnapshot = newSnapshot;  // ⚠️ CRÍTICO: Actualizar snapshot DESPUÉS de detectar cambios
        await ensureHomeSectionsDependencies(data);
        renderHomeSections();
        console.log('[CMS] Secciones actualizadas via polling', data.length, 'secciones');
      }
    } catch (error) {
      console.warn('[CMS Polling] Error:', error.message);
    }
  }, 10000);  // ⚠️ Reducido de 60000ms (1 min) a 10000ms (10 seg)
}

// Inicializar cuando la página terminó de cargar, para que los datos de productos
// y las funciones de home.js ya estén disponibles.
if (document.readyState === 'complete') {
  loadAndRenderHomeSections();
} else {
  window.addEventListener('load', loadAndRenderHomeSections);
}
