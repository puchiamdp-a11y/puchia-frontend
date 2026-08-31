/* ═════════════════════════════════════════════════════════════════
   COMMON.JS - Funciones Compartidas Globales
   ═════════════════════════════════════════════════════════════════ */

// API Base URL - Constante Global
window.API_BASE_URL = 'https://puchia-backend-production.up.railway.app/api/v1';

function getSettings() {
    const defaults = {
        logo: 'P',
        logoText: 'Puchia',
        announceText: 'Envío gratis en compras mayores a $2.000 🎉',
        announceBgColor: '#bd0cd4',
        announceTextColor: '#ffffff',
        announceScrollSpeed: 50,
        whatsappNumber: '5492235847353',
    };
    const saved = localStorage.getItem('puchia_settings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

async function loadSettingsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();

        if (data.success && data.data) {
            const settings = {
                logo: 'P',
                logoText: data.data.logo_text || 'Puchia',
                announceText: data.data.announcement_text || 'Envío gratis en compras mayores a $2.000 🎉',
                announceBgColor: data.data.announcement_bg_color || '#bd0cd4',
                announceTextColor: data.data.announcement_text_color || '#ffffff',
                announceScrollSpeed: data.data.announcement_scroll_speed || 50,
                whatsappNumber: data.data.whatsapp_number || '5492235847353'
            };
            saveSettings(settings);
            return settings;
        }
    } catch (error) {
        console.warn('No se pudieron cargar settings de API, usando valores locales:', error);
    }
    return getSettings();
}

function saveSettings(settings) {
    localStorage.setItem('puchia_settings', JSON.stringify(settings));
}

function updateWhatsappLinks() {
    const whatsappNumber = getSettings().whatsappNumber || '5492235847353';
    document.querySelectorAll('a[data-whatsapp]').forEach(link => {
        link.href = `https://wa.me/${whatsappNumber}`;
    });
}

async function updateLogoAndFavicon() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/home-branding`);
        if (!response.ok) return;
        const data = await response.json();

        if (!data.success || !data.data) return;

        // Actualizar logo
        if (data.data.logo_url) {
            const logos = document.querySelectorAll('.logo');
            logos.forEach(logo => {
                logo.style.backgroundImage = `url('${data.data.logo_url}')`;
            });
        }

        // Actualizar favicon
        if (data.data.favicon_url) {
            let faviconLink = document.querySelector("link[rel='icon']");
            if (!faviconLink) {
                faviconLink = document.createElement('link');
                faviconLink.rel = 'icon';
                faviconLink.type = 'image/png';
                document.head.appendChild(faviconLink);
            }
            faviconLink.href = data.data.favicon_url;
        }
    } catch (error) {
        console.warn('No se pudo cargar logo/favicon:', error);
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') toast.style.background = '#e74c3c';
    if (type === 'success') toast.style.background = '#27ae60';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

/**
 * 🎨 Modal Elegante Puchia - Reemplaza alert()
 * @param {string} titulo - Título del modal
 * @param {string} mensaje - Mensaje a mostrar
 * @param {array} botones - [{texto: "...", clase: "primary|secondary", callback: () => {}}]
 */
function showPuchiaModal(titulo, mensaje, botones = []) {
    // Remover modal anterior si existe
    const modalAnterior = document.getElementById('puchiaModal');
    if (modalAnterior) modalAnterior.remove();

    const modalId = 'puchiaModal';
    const botonesHTML = botones.map((btn, idx) => `
        <button
            class="modal-btn ${btn.clase || 'secondary'} modal-button-responsive"
            onclick="document.getElementById('${modalId}')?.remove(); ${btn.callback || ''}"
        >
            ${btn.texto}
        </button>
    `).join('');

    const modalHTML = `
        <div id="${modalId}" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
        ">
            <div style="
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                max-width: 500px;
                width: 90%;
                padding: 32px;
                text-align: center;
                animation: slideUp 0.3s ease;
            ">
                <h2 class="modal-header-responsive">
                    ${titulo}
                </h2>
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 28px;">
                    ${mensaje}
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    ${botonesHTML}
                </div>
            </div>
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .modal-btn.primary {
                    background: #9b2d7d;
                    color: white;
                }
                .modal-btn.primary:hover {
                    background: #7a2062;
                    transform: scale(1.05);
                }
                .modal-btn.secondary {
                    background: #f0f0f0;
                    color: #333;
                    border: 1px solid #ddd;
                }
                .modal-btn.secondary:hover {
                    background: #e8e8e8;
                    transform: scale(1.05);
                }
                .modal-btn:active {
                    transform: scale(0.98);
                }
            </style>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Cerrar al clickear fuera del modal
    const backdrop = document.getElementById(modalId);
    backdrop?.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.remove();
    });
}

async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function getCart() {
    const saved = localStorage.getItem('puchia_cart');
    return saved ? JSON.parse(saved) : [];
}

function saveCart(cart) {
    localStorage.setItem('puchia_cart', JSON.stringify(cart));
}

function getOrders() {
    const saved = localStorage.getItem('puchia_orders');
    return saved ? JSON.parse(saved) : [];
}

function saveOrders(orders) {
    localStorage.setItem('puchia_orders', JSON.stringify(orders));
}

function getAdminToken() {
    return localStorage.getItem('puchia_admin_token');
}

function saveAdminToken(token) {
    localStorage.setItem('puchia_admin_token', token);
}

function clearAdminToken() {
    localStorage.removeItem('puchia_admin_token');
}

function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '$0.00';
    return '$' + parseFloat(amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

function generateId(prefix = 'ORD') {
    return prefix + '-' + Date.now();
}

/**
 * ➕ Agregar producto al carrito forzadamente (último disponible)
 */
function addToCartForced(productId) {
    const allProds = [...(allProducts || []), ...(promoProducts || [])];
    const product = allProds.find(p => p.id === productId);
    if (!product) {
        showToast('Producto no encontrado', 'error');
        return;
    }

    let cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    saveCart(cart);
    updateCartCount();
    renderCartSidebar();
    showToast(`✅ ${product.name} agregado al carrito`, 'success');
}

function addToCart(product) {
    // Validar stock disponible
    if (!product.stock_cantidad || product.stock_cantidad <= 0) {
        showPuchiaModal(
            '⚠️ Producto Agotado',
            `Lamentablemente <strong>${product.name}</strong> no tiene stock disponible en este momento.`,
            [
                { texto: 'Cerrar', clase: 'secondary', callback: '' }
            ]
        );
        return null;
    }
    
    let cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    
    // Validar que no se agregue más cantidad que stock disponible
    const cantidadActual = existingItem ? existingItem.qty : 0;
    if (cantidadActual + 1 > product.stock_cantidad) {
        const stockDisponible = product.stock_cantidad - cantidadActual;
        showPuchiaModal(
            '⚠️ Stock Limitado',
            `Ya tienes ${cantidadActual} en el carrito. Solo hay ${stockDisponible} más disponible(s) de <strong>${product.name}</strong>.`,
            [
                {
                    texto: `Agregar 1 más (Total: ${cantidadActual + 1})`,
                    clase: 'primary',
                    callback: 'addToCartForced(' + product.id + ')'
                },
                { texto: 'Cancelar', clase: 'secondary', callback: '' }
            ]
        );
        return cart;
    }
    
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    
    saveCart(cart);
    updateCartCount();
    renderCartSidebar();
    return cart;
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    updateCartCount();
    renderCartSidebar();
    return cart;
}

function updateCartQty(productId, qty) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.qty = Math.max(1, parseInt(qty));
        saveCart(cart);
        updateCartCount();
        renderCartSidebar();
    }
    return cart;
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const elements = document.querySelectorAll('#cartCount');
    elements.forEach(el => el.textContent = count);
}

function getCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function clearCart() {
    localStorage.removeItem('puchia_cart');
    updateCartCount();
    renderCartSidebar();
}

function toggleCart(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
        renderCartSidebar();
    }
}

function closeCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

function renderCartSidebar() {
    const cart = getCart();
    const container = document.getElementById('cartItemsContainer');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const totalElement = document.getElementById('cartTotal');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart"><p>Tu carrito está vacío</p></div>';
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (checkoutBtn) checkoutBtn.disabled = false;
        const html = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-icon">${item.icon || '🎁'}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name" style="cursor: pointer; color: #9b2d7d; font-weight: 600;" onclick="openProductFromCart(${item.id})">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                        <span style="min-width: 30px; text-align: center; font-weight: 600;">${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeItem(${item.id})">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    }
    
    if (totalElement) {
        totalElement.textContent = formatCurrency(getCartTotal());
    }
}

function changeQty(productId, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.qty += delta;
        if (item.qty < 1) item.qty = 1;
        saveCart(cart);
        updateCartCount();
        renderCartSidebar();
    }
}

function removeItem(productId) {
    removeFromCart(productId);
    showToast('Producto removido del carrito');
}

function openProductFromCart(productId) {
    closeCart();
    // Buscar el producto en los datos disponibles
    const product = allProducts?.find(p => p.id === productId) || promoProducts?.find(p => p.id === productId);
    if (product && window.openProductDetail) {
        window.openProductDetail(productId);
    } else {
        showToast('Producto no encontrado', 'error');
    }
}

function goToCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('Agrega productos al carrito primero');
        return;
    }
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        closeCart();
        checkoutModal.classList.add('active');
        prefillCheckoutFromUser();
    } else {
        localStorage.setItem('openCheckout', 'true');
        window.location.href = 'proceso-compra.html';
    }
}

function getLoggedCliente() {
    const saved = localStorage.getItem('puchia_cliente_user');
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
}

function prefillCheckoutFromUser() {
    const user = getLoggedCliente();
    if (!user) return;

    const fields = {
        checkoutName:     user.nombre,
        checkoutEmail:    user.email,
        checkoutPhone:    user.whatsapp || user.telefono,
        checkoutDNI:      user.dni,
        checkoutAddress:  user.direccion,
        checkoutProvince: user.provincia || user.ciudad,
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
    });

    // Banner indicando que los datos fueron pre-cargados
    const form = document.getElementById('checkoutForm');
    if (form && !document.getElementById('prefillBanner')) {
        const banner = document.createElement('div');
        banner.id = 'prefillBanner';
        banner.className = 'banner-prefill-responsive';
        banner.innerHTML = `✓ Hola <strong>${user.nombre || ''}</strong>, pre-cargamos tus datos. Podés editarlos si necesitás.`;
        form.insertBefore(banner, form.firstChild);
    }
}

function injectCartSidebar() {
    if (document.getElementById('cartSidebar')) return;
    
    const sidebarHTML = `
        <div class="cart-overlay" id="cartOverlay" onclick="closeCart()"></div>
        <div class="cart-sidebar" id="cartSidebar">
            <div class="cart-header">
                <h2>Tu Carrito</h2>
                <button class="close-cart" onclick="closeCart()">✕</button>
            </div>
            <div class="cart-items" id="cartItemsContainer">
                <div class="empty-cart" id="emptyCartMessage">
                    <p>Tu carrito está vacío</p>
                </div>
            </div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>Total:</span>
                    <span id="cartTotal">$0</span>
                </div>
                <button class="checkout-btn" onclick="goToCheckout()" id="checkoutBtn" disabled>
                    Ir a Checkout
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', sidebarHTML);
}

function isAdminLoggedIn() {
    return !!getAdminToken();
}

function adminLogout() {
    clearAdminToken();
    window.location.href = '/admin/login.html';
}

window.addEventListener('load', () => {
    injectCartSidebar();
    updateCartCount();
    renderCartSidebar();
});

window.addEventListener('storage', (e) => {
    if (e.key === 'puchia_cart') {
        updateCartCount();
        renderCartSidebar();
    }
});

/* ═════════════════════════════════════════════════════════════════
   HAMBURGER MENU - Mobile Navigation
   ═════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    const navLinks = document.querySelectorAll('.mobile-nav-sidebar a');

    if (!hamburgerBtn || !mobileNav) return;

    // Close mobile nav on page load
    mobileNav.classList.remove('open');

    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileNav.classList.toggle('open');
    });

    mobileNav.addEventListener('click', (e) => {
        if (e.target === mobileNav) {
            mobileNav.classList.remove('open');
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!hamburgerBtn.contains(e.target) && !mobileNav.contains(e.target)) {
            mobileNav.classList.remove('open');
        }
    });

    // Close menu on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            mobileNav.classList.remove('open');
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// Función para animar números en la sección de estadísticas
// ═══════════════════════════════════════════════════════════════
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');

    statNumbers.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        const suffix = stat.textContent.replace(/[0-9]/g, '');
        let current = 0;

        const increment = Math.ceil(target / 30);
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            stat.textContent = current + suffix;
        }, 50);
    });
}