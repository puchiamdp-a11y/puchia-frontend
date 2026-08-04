/* CLIENTE.JS - PRODUCTOS Y PROMOS */

// Variables globales - ahora usando los datos compartidos de products-data.js
let currentFilter = 'todas';
let currentView = 'productos';

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

function loadInterface() {
    updateUIWithSettings();

    // Check URL parameters for category/promos view
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const view = urlParams.get('view');

    if (view === 'promos' || category === 'promos') {
        showPromos();
    } else {
        if (category) {
            currentFilter = category;
        }
        showProducts();
    }
}

function showProducts() {
    const productsSection = document.getElementById('productsSection');
    const promosSection = document.getElementById('promosSection');
    const filtersBar = document.querySelector('.filters-bar');

    if (productsSection) productsSection.style.display = 'block';
    if (promosSection) promosSection.style.display = 'none';
    if (filtersBar) filtersBar.style.display = 'none';

    loadAndRenderProducts();
}

function showAllProducts() {
    currentFilter = 'todas';
    showProducts();
}

function showPromos() {
    const productsSection = document.getElementById('productsSection');
    const promosSection = document.getElementById('promosSection');
    const filtersBar = document.querySelector('.filters-bar');

    if (productsSection) productsSection.style.display = 'none';
    if (promosSection) promosSection.style.display = 'block';
    if (filtersBar) filtersBar.style.display = 'none';

    loadAndRenderPromos();
}

function showOnlyPromos() {
    showPromos();
}

function loadAndRenderProducts() {
    // Filtrar productos por categoría
    const filtered = currentFilter === 'todas'
        ? allProducts
        : allProducts.filter(p => p.category === currentFilter);

    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>Sin productos en esta categoría</p></div>';
        return;
    }

    const BACKEND = 'https://puchia-backend-production.up.railway.app';
    const html = filtered.map(product => {
        const imgContent = product.portada
            ? `<img src="${BACKEND}${product.portada}" alt="${product.name}" style="width:100%;height:180px;object-fit:cover;" onerror="this.outerHTML='<div style=font-size:80px;display:flex;align-items:center;justify-content:center;height:180px>${product.icon}</div>'">`
            : `<div style="font-size: 80px; text-align: center; padding: 40px 20px; display: flex; align-items: center; justify-content: center; height: 180px;">${product.icon}</div>`;

        // Determine summary text
        const summaryText = product.resumen || (product.descripcion_completa ? product.descripcion_completa.substring(0, 100) : '');

        return `<div class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrapper" style="cursor: pointer; background: var(--gray-light); min-height: 180px; overflow: hidden;">
                ${imgContent}
            </div>
            <div class="product-info" style="padding: 20px;">
                <div class="product-name-wrapper" style="cursor: pointer; font-weight: 600; font-size: 16px; color: var(--purple); margin-bottom: 8px;">
                    ${product.name}
                </div>
                <div class="product-price" style="font-size: 20px; font-weight: 700; color: var(--purple); margin-bottom: 16px;">
                    ${formatCurrency(product.price)}
                </div>
                <button class="product-btn btn-add-to-cart" style="width: 100%; padding: 12px; background: var(--purple); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                    Agregar al Carrito
                </button>
            </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        grid.querySelectorAll('[data-product-id]').forEach(card => {
            const productId = parseInt(card.dataset.productId);
            const product = filtered.find(p => p.id === productId);
            const addBtn = card.querySelector('.btn-add-to-cart');

            addBtn?.addEventListener('click', () => {
                addToCart(product);
                showToast(`${product.name} agregado al carrito`, 'success');
            });

            card.querySelector('.product-image-wrapper')?.addEventListener('click', () => openProductDetail(productId));
            card.querySelector('.product-name-wrapper')?.addEventListener('click', () => openProductDetail(productId));
        });
    }, 0);
}

function loadAndRenderPromos() {
    const grid = document.getElementById('promosGrid');
    if (!grid) return;

    if (promoProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>Sin promociones disponibles</p></div>';
        return;
    }

    const BACKEND_PROMO = 'https://puchia-backend-production.up.railway.app';
    const html = promoProducts.map(product => {
        const imgContent = product.portada
            ? `<img src="${BACKEND_PROMO}${product.portada}" alt="${product.name}" style="width:100%;height:180px;object-fit:cover;" onerror="this.outerHTML='<div style=font-size:80px;display:flex;align-items:center;justify-content:center;height:180px>${product.icon}</div>'">`
            : `<div style="font-size: 80px; text-align: center; padding: 40px 20px; display: flex; align-items: center; justify-content: center; height: 180px;">${product.icon}</div>`;

        // Determine summary text
        const summaryText = product.resumen || (product.descripcion_completa ? product.descripcion_completa.substring(0, 100) : '');

        return `<div class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrapper" style="cursor: pointer; background: var(--gray-light); min-height: 180px; overflow: hidden;">
                ${imgContent}
            </div>
            <div class="product-info" style="padding: 20px;">
                <div class="product-name-wrapper" style="cursor: pointer; font-weight: 600; font-size: 16px; color: var(--purple); margin-bottom: 8px;">
                    ${product.name}
                </div>
                <div class="product-price" style="font-size: 20px; font-weight: 700; color: var(--purple); margin-bottom: 16px;">
                    ${formatCurrency(product.price)}
                </div>
                <button class="product-btn btn-add-to-cart" style="width: 100%; padding: 12px; background: var(--purple); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                    Agregar al Carrito
                </button>
            </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;

    // Attach event listeners
    setTimeout(() => {
        grid.querySelectorAll('[data-product-id]').forEach(card => {
            const productId = parseInt(card.dataset.productId);
            const product = promoProducts.find(p => p.id === productId);
            const addBtn = card.querySelector('.btn-add-to-cart');

            addBtn?.addEventListener('click', () => {
                addToCart(product);
                showToast(`${product.name} agregado al carrito`, 'success');
            });

            card.querySelector('.product-image-wrapper')?.addEventListener('click', () => openProductDetail(productId));
            card.querySelector('.product-name-wrapper')?.addEventListener('click', () => openProductDetail(productId));
        });
    }, 0);
}

function filterProducts(category) {
    currentFilter = category;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    loadAndRenderProducts();
}

function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
}

async function submitOrder(e) {
    console.log('submitOrder() INICIADO - Timestamp:', new Date().toISOString());
    console.log('Stack trace:', new Error().stack);
    e.preventDefault();
    
    // Deshabilitar botón para evitar clicks duplicados
    const confirmBtn = document.getElementById("confirmOrderBtn");
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Procesando...";
        confirmBtn.style.opacity = "0.6";
    }
    const name     = document.getElementById('checkoutName').value;
    const email    = document.getElementById('checkoutEmail').value;
    const phone    = document.getElementById('checkoutPhone').value;
    const dni      = document.getElementById('checkoutDNI').value;
    const province = document.getElementById('checkoutProvince').value;
    const address  = document.getElementById('checkoutAddress').value;
    const notes    = document.getElementById('checkoutNotes').value;

    if (!name || !email || !phone || !dni || !province || !address) {
        showToast('Completa todos los campos obligatorios', 'error');
        return;
    }

    const orderId = generateId('ORD');
    const cart    = getCart();
    const total   = getCartTotal();
    const today   = new Date().toISOString().split('T')[0];

    // Guardar orden localmente
    const order = {
        id: orderId,
        client: name,
        email: email,
        phone: phone,
        dni: dni,
        province: province,
        address: address,
        notes: notes,
        total: total,
        status: 'Pendiente',
        date: today,
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price
        }))
    };

    let orders = getOrders();
    orders.push(order);
    saveOrders(orders);

    // Enviar al backend — asocia por WhatsApp si ya existe, actualiza email si faltaba
    try {
        console.log('Preparando fetch a /ordenes...');
        const backendPayload = {
            cliente_nombre:   name,
            cliente_email:    email,
            cliente_dni:      dni,
            cliente_whatsapp: phone,
            cliente_direccion: address,
            cliente_ciudad:   province,
            notas: notes,
            items: cart.map(item => ({
                producto_id:   item.id,
                cantidad:      item.qty,
                atributos_json: item.atributos || {}
            }))
        };
        const token = typeof getClienteToken === 'function' ? getClienteToken() : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        console.log('Enviando fetch a /ordenes...');
        const res = await fetch(`${API_BASE_URL}/ordenes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(backendPayload)
        });
        console.log('Fetch completado. Status:', res.status, 'OK:', res.ok);
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.id_unico) {
                localStorage.setItem('lastBackendOrderId', data.data.id_unico);
            }
        }
    } catch (err) {
        // Backend no disponible — la orden local sigue siendo válida
        console.warn('Orden no enviada al backend:', err.message);
    }

    closeCheckout();
    clearCart();
    renderCartSidebar();

    localStorage.setItem('lastOrderId', orderId);

    setTimeout(() => {
        window.location.href = 'orden-confirmada.html';
    }, 300);

    showToast('¡Orden confirmada!', 'success');
}

function goToHome() {
    window.location.href = 'index.html';
}

window.addEventListener('load', async () => {
    // Load defaults immediately, then fetch API in background
    loadInterface();
    renderCategoryFilters();
    updateCartCount();
    renderCartSidebar();

    // Si venimos de "Ir a Checkout" desde otra página, abrir el modal
    if (localStorage.getItem('openCheckout') === 'true') {
        localStorage.removeItem('openCheckout');
        setTimeout(() => {
            if (typeof goToCheckout === 'function') goToCheckout();
        }, 150);
    }

    // Fetch API data without blocking UI
    loadProductsFromAPI().then(() => {
        loadAndRenderProducts();
        loadAndRenderPromos();
        startProductPolling();
    });
});

// ==================== POLLING AUTOMÁTICO ====================
// Cada 30s consulta la API. Si los productos cambiaron, re-renderiza.

let _lastProductsSnapshot = '';
let _pollingInterval = null;

function snapshotProducts() {
    const all = (allProducts || []).map(p => `${p.id}|${p.name}|${p.price}|${p.stock}|${p.habilitado}|${p.category}|${p.portada || ''}`).join(';');
    const promo = (promoProducts || []).map(p => `${p.id}|${p.name}|${p.price}|${p.stock}|${p.habilitado}|${p.portada || ''}`).join(';');
    return all + '###' + promo;
}

function startProductPolling() {
    _lastProductsSnapshot = snapshotProducts();
    if (_pollingInterval) clearInterval(_pollingInterval);
    _pollingInterval = setInterval(async () => {
        if (document.hidden) return;
        try {
            await loadProductsFromAPI();
            const newSnapshot = snapshotProducts();
            if (newSnapshot !== _lastProductsSnapshot) {
                _lastProductsSnapshot = newSnapshot;
                if (typeof loadAndRenderProducts === 'function') loadAndRenderProducts();
                if (typeof loadAndRenderPromos === 'function') loadAndRenderPromos();
                if (typeof showToast === 'function') {
                    showToast('Catálogo actualizado', 'info');
                }
                console.log('[Polling] Productos actualizados desde BD');
            }
        } catch (err) {
            console.warn('[Polling] error:', err.message);
        }
    }, 60000);
}

/* ==================== MODAL DETALLE PRODUCTO ==================== */

async function openProductDetail(productId) {
  try {
    const product = allProducts.find(p => p.id === productId) || promoProducts.find(p => p.id === productId);

    if (!product) {
      showToast('Producto no encontrado', 'error');
      return;
    }

    const oldModal = document.getElementById('productDetailModal');
    if (oldModal) oldModal.remove();

    const BK = 'https://puchia-backend-production.up.railway.app';
    const mediaList = product.media || [];
    window._currentDetailMedia = mediaList;
    const portadaItem = mediaList.find(m => m.es_portada) || mediaList[0] || null;

    // Display principal: foto/video o emoji
    let displayHTML;
    if (portadaItem) {
      const mainMedia = portadaItem.tipo === 'video'
        ? `<video id="detailMainMedia" src="${BK}${portadaItem.url}" controls style="width:100%;max-height:280px;object-fit:contain;border-radius:8px;background:#000;"></video>`
        : `<img id="detailMainMedia" src="${BK}${portadaItem.url}" alt="${product.name}" style="width:100%;max-height:280px;object-fit:contain;border-radius:8px;" onerror="this.outerHTML='<div style=font-size:80px;text-align:center;padding:20px>${product.icon}</div>'">`;

      const thumbsHTML = mediaList.length > 1
        ? `<div style="display:flex;gap:6px;overflow-x:auto;padding:8px 0;scrollbar-width:thin;">
            ${mediaList.map((m, idx) => {
              const isFirst = idx === 0;
              const thumbContent = m.tipo === 'video'
                ? `<div style="width:100%;height:100%;background:#333;display:flex;align-items:center;justify-content:center;font-size:14px;color:white;">▶</div>`
                : `<img src="${BK}${m.url}" style="width:100%;height:100%;object-fit:cover;">`;
              return `<div class="detail-thumb" onclick="changeDetailMedia(${idx})" style="width:56px;height:56px;flex-shrink:0;border-radius:6px;overflow:hidden;cursor:pointer;border:${isFirst ? '2px solid #9b2d7d' : '2px solid #ddd'};">${thumbContent}</div>`;
            }).join('')}
           </div>`
        : '';

      displayHTML = `<div style="margin-bottom:12px;">
        <div style="width:100%;background:#f5f5f5;border-radius:10px;overflow:hidden;margin-bottom:${mediaList.length > 1 ? '0' : '0'};">
          ${mainMedia}
        </div>
        ${thumbsHTML}
      </div>`;
    } else {
      displayHTML = `<div class="detail-image" style="font-size:100px;margin-bottom:16px;text-align:center;">${product.icon}</div>`;
    }

    const modalHTML = `
      <div class="product-detail-modal" id="productDetailModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 3000;">
        <div class="modal-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); cursor: pointer;"></div>
        <div class="modal-box" style="position: relative; background: white; border-radius: 16px; padding: 32px; max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto; z-index: 1001; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);">
          <button class="modal-box-close" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 28px; cursor: pointer; color: #666; z-index:2;">✕</button>

          <div class="modal-detail-content" style="text-align: center; display: flex; flex-direction: column;">
            ${displayHTML}

            <div class="detail-info">
              <h2 style="font-size: 24px; color: #9b2d7d; margin: 0 0 8px; font-weight: 700;">${product.name}</h2>
              <p class="detail-category" style="color: #888; font-size: 13px; margin: 0 0 12px;">Categoría: ${product.category}</p>
              <p class="detail-price" style="font-size: 30px; color: #9b2d7d; font-weight: 700; margin: 0 0 16px;">
                ${formatCurrency(product.price)}
              </p>

              <div class="detail-quantity" style="display: flex; gap: 8px; align-items: center; justify-content: center; margin-bottom: 16px; padding: 0 0 16px 0; border-bottom: 1px solid #eee;">
                <button class="qty-decrease" style="width: 32px; height: 32px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-weight: 600; color: #9b2d7d;">−</button>
                <input type="number" class="qty-input" value="1" min="1" style="width: 50px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-weight: 600; font-size: 14px;">
                <button class="qty-increase" style="width: 32px; height: 32px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-weight: 600; color: #9b2d7d;">+</button>
              </div>

              <!-- DESCRIPCIÓN COMPLETA -->
              <div class="detail-description" id="product-desc-${product.id}" style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">
              </div>

              <!-- ESPECIFICACIONES -->
              <div class="detail-specifications" id="product-spec-${product.id}" style="display: none; margin: 20px 0; padding: 16px 0; border-top: 1px solid #eee; text-align: left;">
                <h3 style="color: #333; font-size: 16px; margin: 0 0 12px; font-weight: 600;">⚙️ Especificaciones Técnicas</h3>
                <div style="color: #666; font-size: 14px; line-height: 1.6;"></div>
              </div>

              <!-- INSTRUCCIONES -->
              <div class="detail-instructions" id="product-instr-${product.id}" style="display: none; margin: 20px 0; padding: 16px 0; border-top: 1px solid #eee; text-align: left;">
                <h3 style="color: #333; font-size: 16px; margin: 0 0 12px; font-weight: 600;">📖 Instrucciones de Uso</h3>
                <div style="color: #666; font-size: 14px; line-height: 1.6;"></div>
              </div>
            </div>

            <div class="detail-actions" style="display: flex; gap: 12px; flex-wrap: wrap; background: white; padding-top: 16px; border-top: 1px solid #eee;">
              <button class="btn-add-cart modal-add-cart" style="flex: 1; min-width: 150px; padding: 12px 24px; background: #9b2d7d; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.3s;">
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
      const descDiv = document.getElementById(`product-desc-${product.id}`);
      if (descDiv) {
        descDiv.innerHTML = product.descripcion_completa || product.descripcion || '<em>Sin descripción disponible</em>';
      }

      // Especificaciones
      const specDiv = document.getElementById(`product-spec-${product.id}`);
      if (specDiv && product.especificaciones) {
        specDiv.style.display = 'block';
        specDiv.querySelector('div:last-child').innerHTML = product.especificaciones;
      }

      // Instrucciones
      const instrDiv = document.getElementById(`product-instr-${product.id}`);
      if (instrDiv && product.instrucciones) {
        instrDiv.style.display = 'block';
        instrDiv.querySelector('div:last-child').innerHTML = product.instrucciones;
      }
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
  if (modal) modal.remove();
}

// Cambia la foto/video principal al hacer click en thumbnail del modal
function changeDetailMedia(idx) {
  const media = window._currentDetailMedia || [];
  const item = media[idx];
  if (!item) return;

  const BK = 'https://puchia-backend-production.up.railway.app';
  const mainEl = document.getElementById('detailMainMedia');
  if (!mainEl) return;

  const thumbs = document.getElementById('productDetailModal')?.querySelectorAll('.detail-thumb');
  thumbs?.forEach((t, i) => { t.style.border = i === idx ? '2px solid #9b2d7d' : '2px solid #ddd'; });

  if (item.tipo === 'video') {
    if (mainEl.tagName === 'VIDEO') {
      mainEl.src = `${BK}${item.url}`;
      mainEl.load();
    } else {
      const vid = document.createElement('video');
      vid.id = 'detailMainMedia';
      vid.src = `${BK}${item.url}`;
      vid.controls = true;
      vid.style.cssText = 'width:100%;max-height:280px;object-fit:contain;border-radius:8px;background:#000;';
      mainEl.replaceWith(vid);
    }
  } else {
    if (mainEl.tagName === 'IMG') {
      mainEl.src = `${BK}${item.url}`;
    } else {
      mainEl.pause();
      const img = document.createElement('img');
      img.id = 'detailMainMedia';
      img.src = `${BK}${item.url}`;
      img.alt = '';
      img.style.cssText = 'width:100%;max-height:280px;object-fit:contain;border-radius:8px;';
      mainEl.replaceWith(img);
    }
  }
}

// ==================== FILTROS DE CATEGORÍAS DINÁMICOS ====================

function renderCategoryFilters() {
  const filtersBar = document.getElementById('filters-bar');
  if (!filtersBar) return;

  // Crear botón para cada categoría
  const categoryButtons = (categories || []).map(cat =>
    `<button class="filter-btn" onclick="filterProducts('${cat.id}')">${cat.icon} ${cat.name}</button>`
  ).join('');

  // Agregar después del botón "Todos"
  filtersBar.innerHTML = `
    <button class="filter-btn active" onclick="filterProducts('todas')">Todos</button>
    ${categoryButtons}
  `;
}
