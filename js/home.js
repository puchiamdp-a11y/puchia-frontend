/* HOME.JS - Con ANIMACIÓN DE ESTADÍSTICAS FUNCIONANDO */

const featuredBadges = {
    1: 'Más vendido',
    2: 'Nuevo',
    3: 'Más vendido',
    5: 'Nuevo'
};

let currentBanner = 0;

function updateUIWithSettings() {
    const settings = getSettings();
    
    const logo = document.getElementById('headerLogo');
    const logoText = document.getElementById('headerLogoText');
    const footerLogo = document.getElementById('footerLogo');
    const footerBrandText = document.getElementById('footerBrandText');
    const announcementBar = document.getElementById('announcementBar');
    
    if (logo) logo.textContent = settings.logo;
    if (logoText) logoText.textContent = settings.logoText;
    if (footerLogo) footerLogo.textContent = settings.logo;
    if (footerBrandText) footerBrandText.textContent = settings.logoText;
    if (announcementBar) announcementBar.textContent = settings.announceText;
}

function loadAndRenderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const featured = allProducts.slice(0, 6);

    const html = featured.map(product => {
        let badgeHtml = '';
        const badge = featuredBadges[product.id];
        if (badge) {
            const badgeClass = badge === 'Nuevo' ? 'badge-new' : 'badge-hot';
            badgeHtml = `<div class="product-badge ${badgeClass}">${badge}</div>`;
        }

        return `
            <div class="product-card" data-product-id="${product.id}">
                ${badgeHtml}
                <div class="product-image" style="cursor: pointer;">${product.icon}</div>
                <div class="product-info">
                    <div class="product-name" style="cursor: pointer;">${product.name}</div>
                    <div class="product-price">${formatCurrency(product.price)}</div>
                    <button class="product-btn" onclick="openProductDetail(${product.id})">
                        Agregar al Carrito
                    </button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;

    // Attach click listeners for image and name
    setTimeout(() => {
        grid.querySelectorAll('[data-product-id]').forEach(card => {
            card.querySelector('.product-image')?.addEventListener('click', () => {
                const productId = parseInt(card.dataset.productId);
                openProductDetail(productId);
            });
            card.querySelector('.product-name')?.addEventListener('click', () => {
                const productId = parseInt(card.dataset.productId);
                openProductDetail(productId);
            });
        });
    }, 0);
}

function addProductToCart(id, name, price) {
    const product = { id, name, price };
    addToCart(product);
    showToast(`${name} agregado al carrito`, 'success');
}

function changeBanner(index) {
    currentBanner = index;
    const banners = document.querySelectorAll('.banner');
    const dots = document.querySelectorAll('.dot');
    
    banners.forEach(b => b.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    if (banners[index]) banners[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
}

function nextBanner() {
    const banners = document.querySelectorAll('.banner');
    if (banners.length === 0) return;
    currentBanner = (currentBanner + 1) % banners.length;
    changeBanner(currentBanner);
}

setInterval(nextBanner, 5000);

/* ════════════════════════════════════════════════════════════════
   ANIMACIÓN DE ESTADÍSTICAS - FUNCIONANDO
   ════════════════════════════════════════════════════════════════ */

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    if (counters.length === 0) {
        console.log('No se encontraron contadores');
        return;
    }
    
    counters.forEach(el => {
        const target = parseInt(el.getAttribute('data-target'));
        if (!target) return;
        
        const isStar = target === 5;
        const isPercent = target === 100;
        
        let current = 0;
        const increment = target / 80;
        
        const timer = setInterval(() => {
            current += increment;
            
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            const value = Math.floor(current);
            
            if (isStar) {
                el.textContent = value + '★';
            } else if (isPercent) {
                el.textContent = value + '%';
            } else {
                el.textContent = value.toLocaleString('es-AR');
            }
        }, 25);
    });
}

/* ════════════════════════════════════════════════════════════════
   INICIALIZACIÓN
   ════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // Renderizar categorías dinámicamente
    renderCategoriesHome();
});

function goToPromos(category) {
    window.location.href = `proceso-compra.html?category=${encodeURIComponent(category)}`;
}

/* ════════════════════════════════════════════════════════════════
   MODAL DETALLE PRODUCTO
   ════════════════════════════════════════════════════════════════ */

async function openProductDetail(productId) {
  try {
    const product = allProducts.find(p => p.id === productId) || promoProducts.find(p => p.id === productId);

    if (!product) {
      showToast('Producto no encontrado', 'error');
      return;
    }

    const oldModal = document.getElementById('productDetailModal');
    if (oldModal) oldModal.remove();

    const modalHTML = `
      <div class="product-detail-modal" id="productDetailModal">
        <div class="modal-overlay"></div>
        <div class="modal-box">
          <button class="modal-box-close">✕</button>

          <div class="modal-detail-content">
            <div class="detail-image">${product.icon}</div>

            <div class="detail-info">
              <h2>${product.name}</h2>
              <p class="detail-category">Categoría: ${product.category}</p>
              <p class="detail-price">${formatCurrency(product.price)}</p>

              <div class="detail-quantity">
                <button class="qty-decrease">−</button>
                <input type="number" class="qty-input" value="1" min="1">
                <button class="qty-increase">+</button>
              </div>

              <p class="detail-description">
                ${product.descripcion || 'Sin descripción disponible'}
              </p>
            </div>

            <div class="detail-actions">
              <button class="btn-add-cart modal-add-cart">
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('productDetailModal');
    if (modal) {
      modal.style.display = 'flex';

      const qtyInput = modal.querySelector('.qty-input');
      const decreaseBtn = modal.querySelector('.qty-decrease');
      const increaseBtn = modal.querySelector('.qty-increase');

      decreaseBtn?.addEventListener('click', () => {
        if (parseInt(qtyInput.value) > 1) {
          qtyInput.value = parseInt(qtyInput.value) - 1;
        }
      });

      increaseBtn?.addEventListener('click', () => {
        qtyInput.value = parseInt(qtyInput.value) + 1;
      });

      modal.querySelector('.modal-overlay')?.addEventListener('click', closeProductDetail);
      modal.querySelector('.modal-box-close')?.addEventListener('click', closeProductDetail);
      modal.querySelector('.modal-add-cart')?.addEventListener('click', () => {
        const qty = parseInt(qtyInput.value) || 1;
        for (let i = 0; i < qty; i++) {
          addToCart(product);
        }
        qtyInput.value = 1;
        showToast(`${qty}x ${product.name} agregado al carrito`, 'success');
        closeProductDetail();
      });
    }
  } catch (error) {
    console.error('Error abriendo detalle:', error);
    showToast('Error al cargar el producto', 'error');
  }
}

function closeProductDetail() {
  const modal = document.getElementById('productDetailModal');
  if (modal) {
    modal.remove();
  }
}

window.addEventListener('load', async () => {
    // Load UI immediately with default products
    updateUIWithSettings();
    loadAndRenderProducts();
    updateCartCount();
    renderCartSidebar();

    // Ejecutar animación con delay
    setTimeout(() => {
        animateCounters();
    }, 800);

    // Fetch API data without blocking UI
    loadProductsFromAPI().then(() => {
        loadAndRenderProducts();
        startHomeProductPolling();
    });

    // Load HOME sections from CMS
    loadHomeSections().then((sections) => {
        if (sections && sections.length > 0) {
            renderSectionsFromCMS();
            startHomeSectionsPolling();
            console.log('[CMS] HOME CMS activo');
        } else {
            console.log('[CMS] Sin secciones disponibles, usando configuración por defecto');
        }
    });
});

let _lastHomeSnapshot = '';
let _homePollingInterval = null;
function _snapshotHome() {
    return (allProducts || []).map(p => `${p.id}|${p.name}|${p.price}|${p.stock}|${p.habilitado}|${p.category}`).join(';');
}
function startHomeProductPolling() {
    _lastHomeSnapshot = _snapshotHome();
    if (_homePollingInterval) clearInterval(_homePollingInterval);
    _homePollingInterval = setInterval(async () => {
        if (document.hidden) return;
        try {
            await loadProductsFromAPI();
            const newSnapshot = _snapshotHome();
            if (newSnapshot !== _lastHomeSnapshot) {
                _lastHomeSnapshot = newSnapshot;
                loadAndRenderProducts();
                console.log('[Polling Home] Productos actualizados');
            }
        } catch (err) {
            console.warn('[Polling Home] error:', err.message);
        }
    }, 30000);
}

// ==================== CATEGORÍAS DINÁMICAS ====================

function renderCategoriesHome() {
  const categoriasGrid = document.getElementById('categorias-grid');
  if (!categoriasGrid || !categories || categories.length === 0) return;

  const categoriesHTML = categories.map(cat => `
    <div class="category-card" onclick="goToPromos('${cat.id}')">
      <div class="category-icon">${cat.icon}</div>
      <h3>${cat.name}</h3>
      <p>${cat.description}</p>
    </div>
  `).join('');

  categoriasGrid.innerHTML = categoriesHTML;
}

// ==================== CMS INTEGRACIÓN - HOME SECTIONS ====================

let _homeSections = null;
let _lastSectionsSnapshot = '';

async function loadHomeSections() {
  try {
    const response = await fetch(`${API_BASE_URL}/home-sections`);
    if (!response.ok) {
      console.warn('[CMS] API responded with', response.status, '- usando fallback');
      return null;
    }
    const data = await response.json();
    if (data.success && data.data) {
      _homeSections = data.data;
      console.log('[CMS] Secciones cargadas:', _homeSections.length);
      return _homeSections;
    }
  } catch (error) {
    console.warn('[CMS] Error cargando secciones:', error.message);
  }
  return null;
}

function renderSectionsFromCMS() {
  if (!_homeSections || _homeSections.length === 0) {
    console.log('[CMS] Sin secciones disponibles, usando configuración por defecto');
    return;
  }

  // Actualizar secciones según tipo
  _homeSections.forEach(section => {
    if (!section.enabled) return;

    try {
      switch (section.section_type) {
        case 'banner':
          updateBannersFromCMS(section);
          break;
        case 'categories':
          // Las categorías ya se cargan dinámicamente desde loadCategoriasFromAPI
          // Aquí solo actualizamos el título si es necesario
          const catTitle = document.querySelector('.categories-section .section-title');
          if (catTitle && section.config.title) {
            catTitle.textContent = section.config.title;
          }
          break;
        case 'products':
          updateProductsFromCMS(section);
          break;
        case 'testimonials':
          updateTestimonialsFromCMS(section);
          break;
      }
    } catch (err) {
      console.error(`[CMS] Error renderizando ${section.section_type}:`, err);
    }
  });

  console.log('[CMS] Secciones renderizadas');
}

function updateBannersFromCMS(section) {
  const bannerCarousel = document.querySelector('.banner-carousel');
  if (!bannerCarousel || !section.config) return;

  const config = section.config;
  const banners = bannerCarousel.querySelectorAll('.banner');

  if (banners.length > 0) {
    const firstBanner = banners[0];
    const bannerContent = firstBanner.querySelector('.banner-content');

    if (bannerContent) {
      const eyebrowEl = bannerContent.querySelector('.banner-eyebrow');
      const titleEl = bannerContent.querySelector('h1');
      const descEl = bannerContent.querySelector('p');
      const btnEl = bannerContent.querySelector('.banner-btn');

      if (eyebrowEl && config.eyebrow) eyebrowEl.textContent = config.eyebrow;
      if (titleEl && config.title) titleEl.textContent = config.title;
      if (descEl && config.subtitle) descEl.textContent = config.subtitle;
      if (btnEl) {
        if (config.button_text) btnEl.textContent = config.button_text;
        if (config.button_url) btnEl.href = config.button_url;
      }
    }
  }
}

function updateProductsFromCMS(section) {
  if (!section.config || !Array.isArray(section.config.ids)) return;

  // Filtrar productos según IDs especificados
  const productIds = section.config.ids;
  const filteredProducts = allProducts.filter(p => productIds.includes(p.id));

  if (filteredProducts.length === 0) {
    console.warn('[CMS] No hay productos con los IDs especificados');
    return;
  }

  // Renderizar productos
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const html = filteredProducts.slice(0, section.config.limit || 6).map(product => {
    let badgeHtml = '';
    const badge = featuredBadges[product.id];
    if (badge) {
      const badgeClass = badge === 'Nuevo' ? 'badge-new' : 'badge-hot';
      badgeHtml = `<div class="product-badge ${badgeClass}">${badge}</div>`;
    }

    return `
      <div class="product-card" data-product-id="${product.id}">
        ${badgeHtml}
        <div class="product-image" style="cursor: pointer;">${product.icon}</div>
        <div class="product-info">
          <div class="product-name" style="cursor: pointer;">${product.name}</div>
          <div class="product-price">${formatCurrency(product.price)}</div>
          <button class="product-btn" onclick="openProductDetail(${product.id})">
            Agregar al Carrito
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = html;

  // Re-attach listeners
  setTimeout(() => {
    grid.querySelectorAll('[data-product-id]').forEach(card => {
      card.querySelector('.product-image')?.addEventListener('click', () => {
        openProductDetail(parseInt(card.dataset.productId));
      });
      card.querySelector('.product-name')?.addEventListener('click', () => {
        openProductDetail(parseInt(card.dataset.productId));
      });
    });
  }, 0);

  // Actualizar título si es necesario
  const prodTitle = document.querySelector('.featured-products .section-title');
  if (prodTitle && section.config.title) {
    prodTitle.textContent = section.config.title;
  }
}

function updateTestimonialsFromCMS(section) {
  const testimonialsTitle = document.querySelector('.testimonials-section .testimonials-title');
  if (testimonialsTitle && section.config.title) {
    testimonialsTitle.textContent = section.config.title;
  }
}

function _snapshotHomeSections() {
  return JSON.stringify(_homeSections || []);
}

function startHomeSectionsPolling() {
  if (!_homeSections) return;

  _lastSectionsSnapshot = _snapshotHomeSections();

  // Polling cada 60 segundos
  setInterval(async () => {
    if (document.hidden) return;
    try {
      const sections = await loadHomeSections();
      if (sections) {
        const newSnapshot = _snapshotHomeSections();
        if (newSnapshot !== _lastSectionsSnapshot) {
          _lastSectionsSnapshot = newSnapshot;
          renderSectionsFromCMS();
          console.log('[CMS] Secciones actualizadas via polling');
        }
      }
    } catch (err) {
      console.warn('[CMS Polling] Error:', err.message);
    }
  }, 60000);
}
