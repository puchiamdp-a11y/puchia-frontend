/**
 * Home Sections Renderer
 * Carga las secciones del HOME desde la API y las renderiza dinámicamente
 * Reemplaza las secciones hardcodeadas en index.html
 */

async function loadAndRenderHomeSections() {
  try {

    const response = await fetch(`${window.API_BASE_URL}/home-sections`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    const sections = result.data || result;

    // Ordenar secciones por display_order
    sections.sort((a, b) => a.display_order - b.display_order);

    // Renderizar cada sección
    sections.forEach(section => {
      if (section.enabled) {
        renderSection(section);
      }
    });

  } catch (error) {
    console.error('❌ Error cargando secciones:', error);
    // Fallback: mantener las secciones hardcodeadas si falla la API
    console.log('📌 Usando secciones por defecto del HTML');
  }
}

function renderSection(section) {
  const { section_type, config } = section;

  switch (section_type) {
    case 'scrolling_text':
      renderScrollingText(config);
      break;
    case 'banner':
      renderBanner(config);
      break;
    case 'stats':
      renderStats(config);
      break;
    case 'image':
      renderHowItWorks(config);
      break;
    case 'categories':
      // Las categorías ya se cargan dinámicamente en categorias.js
      break;
    case 'products':
      // Los productos ya se cargan dinámicamente en products-data.js
      break;
    case 'testimonials':
      renderTestimonials(config);
      break;
    default:
      console.warn(`Tipo de sección desconocido: ${section_type}`);
  }
}

function renderScrollingText(config) {
  const bar = document.getElementById('announcementBar');
  if (bar && config.text) {
    bar.textContent = config.text;
    if (config.background_color) {
      bar.style.backgroundColor = config.background_color;
    }
    if (config.text_color) {
      bar.style.color = config.text_color;
    }
  }
}

function renderBanner(config) {
  const carousel = document.querySelector('.banner-carousel');
  if (!carousel || !config.slides) return;

  // Limpiar banners existentes
  const oldBanners = carousel.querySelectorAll('.banner');
  oldBanners.forEach(b => {
    if (!b.classList.contains('active') || oldBanners.length > 0) {
      b.remove();
    }
  });

  // Agregar nuevos banners
  config.slides.forEach((slide, index) => {
    const banner = document.createElement('div');
    banner.className = `banner ${index === 0 ? 'active' : ''}`;
    banner.innerHTML = `
      <div class="banner-content">
        <div class="banner-eyebrow">${slide.eyebrow}</div>
        <h1>${slide.title}</h1>
        <p>${slide.subtitle}</p>
        <a href="${slide.button_url}" class="banner-btn">${slide.button_text}</a>
      </div>
    `;
    carousel.insertBefore(banner, carousel.querySelector('.carousel-dots'));
  });

  // Actualizar dots
  const dotsContainer = carousel.querySelector('.carousel-dots');
  dotsContainer.innerHTML = '';
  config.slides.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dot.onclick = () => changeBanner(index);
    dotsContainer.appendChild(dot);
  });
}

function renderStats(config) {
  const statsGrid = document.querySelector('.stats-grid');
  if (!statsGrid || !config.stats) return;

  statsGrid.innerHTML = '';
  config.stats.forEach((stat, index) => {
    if (index > 0) {
      const divider = document.createElement('div');
      divider.className = 'stat-divider';
      statsGrid.appendChild(divider);
    }

    const item = document.createElement('div');
    item.className = 'stat-item';
    const prefix = stat.prefix || '';
    const suffix = stat.suffix || '';
    item.innerHTML = `
      <div class="stat-number" data-target="${stat.number}">${prefix}0${suffix}</div>
      <div class="stat-label">${stat.label}</div>
    `;
    statsGrid.appendChild(item);
  });

  // Trigger animation
  animateStats();
}

function renderHowItWorks(config) {
  const howSection = document.querySelector('.how-section');
  if (!howSection || !config.steps) return;

  howSection.querySelector('.section-title').textContent = config.title;
  howSection.querySelector('.section-subtitle').textContent = config.subtitle;

  const howGrid = howSection.querySelector('.how-grid');
  howGrid.innerHTML = '';

  config.steps.forEach(step => {
    const stepEl = document.createElement('div');
    stepEl.className = 'how-step';
    stepEl.innerHTML = `
      <div class="how-icon">${step.icon}</div>
      <h3>${step.title}</h3>
      <p>${step.description}</p>
    `;
    howGrid.appendChild(stepEl);
  });
}

function renderTestimonials(config) {
  const section = document.querySelector('.testimonials-section');
  if (!section) return;

  section.querySelector('.testimonials-title').textContent = config.title;
  section.querySelector('.testimonials-subtitle').textContent = config.subtitle;

  const grid = section.querySelector('.testimonials-grid');
  grid.innerHTML = '';

  // Testimonios hardcodeados (podrían venir de la API en el futuro)
  const testimonios = [
    {
      text: 'Excelente trabajo, hermosa calidad y presentación. Entrega en tiempo y forma, además la atención excelente. ¡Un gusto!',
      author: 'Clienta verificada'
    },
    {
      text: 'Son muy amables y comprometidas en su trabajo. Productos de calidad y buen precio. Entregas en tiempo y forma. Super recomendables.',
      author: 'Clienta verificada'
    },
    {
      text: 'Excelente atención, muy amables, entregaron en tiempo y forma. Super recomiendo a Puchia para cualquier regalo especial.',
      author: 'Clienta verificada'
    }
  ];

  testimonios.forEach(testi => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <div class="google-badge">
        <div class="google-icon">G</div>
        <span class="google-label">Google Reviews</span>
      </div>
      <div class="stars">★★★★★</div>
      <div class="testimonial-text">${testi.text}</div>
      <div class="testimonial-author">${testi.author}</div>
    `;
    grid.appendChild(card);
  });

  // Agregar botón de reviews
  if (config.google_reviews_link) {
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.style.marginTop = '50px';
    container.innerHTML = `
      <a href="${config.google_reviews_link}" target="_blank" class="btn btn-primary" style="display: inline-block; background: var(--purple); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease;">
        ✨ Dejanos tu opinión
      </a>
    `;
    section.appendChild(container);
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAndRenderHomeSections);
} else {
  loadAndRenderHomeSections();
}
