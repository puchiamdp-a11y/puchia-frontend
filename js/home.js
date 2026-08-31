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

    if (logo) logo.textContent = settings.logo;
    if (logoText) logoText.textContent = settings.logoText;
    if (footerLogo) footerLogo.textContent = settings.logo;
    if (footerBrandText) footerBrandText.textContent = settings.logoText;
    // La zona de texto ya no es un elemento fijo: es una sección del CMS
    // que sólo se renderiza en el HOME (home-sections-renderer.js).
}

function loadAndRenderProducts() {
    // Cuando el HOME lo controla el CMS, la sección de productos la arma
    // home-sections-renderer.js respetando los productos elegidos en el panel.
    if (window.__cmsHomeActive) {
        if (typeof renderHomeSections === 'function') renderHomeSections();
        return;
    }

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

function prevBanner() {
    const banners = document.querySelectorAll('.banner');
    if (banners.length === 0) return;
    currentBanner = (currentBanner - 1 + banners.length) % banners.length;
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

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar settings desde la API antes de actualizar UI
    await loadSettingsFromAPI();
    await updateLogoAndFavicon();
    updateUIWithSettings();
    updateWhatsappLinks();

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

    // Las secciones del HOME las renderiza home-sections-renderer.js desde el CMS.
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
  // Bajo el CMS, la sección de categorías la arma home-sections-renderer.js.
  if (window.__cmsHomeActive) return;

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

// Las secciones del HOME (banner, stats, categorías, productos, testimonios)
// se renderizan desde el CMS en js/home-sections-renderer.js.
