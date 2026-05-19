/* CLIENTE.JS - Lógica para proceso-compra.html */

// PRODUCTOS COMPLETOS (Todos los 9)
const allProducts = [
    { id: 1, name: 'Banderín Personalizado', price: 4800, icon: '🎈', category: 'cumpleaños', desc: 'Banderín decorativo personalizado.' },
    { id: 2, name: 'Bolsitas Golosineras', price: 990, icon: '🍬', category: 'cumpleaños', desc: 'Bolsitas de papel para golosinas.' },
    { id: 3, name: 'Bolsitas 3D', price: 1050, icon: '📦', category: 'cumpleaños', desc: 'Bolsitas 3D con diseño especial.' },
    { id: 4, name: 'Calendarios Negocios', price: 790, icon: '📅', category: 'emprendedores', desc: 'Calendario personalizado.' },
    { id: 5, name: 'Imágenes Decorativas', price: 1200, icon: '🖼️', category: 'cumpleaños', desc: 'Imágenes personalizadas.' },
    { id: 6, name: 'Librito para Pintar', price: 990, icon: '🎨', category: 'cumpleaños', desc: 'Librito para colorear.' },
    { id: 7, name: 'Llaveros Acrílico', price: 1190, icon: '🔑', category: 'regalos', desc: 'Llaveros acrílicos personalizados.' },
    { id: 8, name: 'Mini Toppers x15', price: 3900, icon: '🎂', category: 'cumpleaños', desc: 'Set de 15 mini toppers.' },
    { id: 9, name: 'Stickers A4 Vinilo', price: 2500, icon: '🏷️', category: 'cumpleaños', desc: 'Lámina de stickers vinilo.' },
];

let currentFilter = 'todas';

// ════════════════════════════════════════════════════════════════
// CARGAR INTERFAZ
// ════════════════════════════════════════════════════════════════

function loadInterface() {
    updateUIWithSettings();
    loadAndRenderProducts();
    updateCartCount();
    updateCartTotal();
}

function updateUIWithSettings() {
    const settings = getSettings();
    document.getElementById('headerLogo').textContent = settings.logo;
    document.getElementById('headerLogoText').textContent = settings.logoText;
    document.getElementById('footerLogo').textContent = settings.logo;
    document.getElementById('footerBrandText').textContent = settings.logoText;
    document.getElementById('announcementBar').textContent = settings.announceText;
}

function loadAndRenderProducts() {
    const filtered = currentFilter === 'todas' 
        ? allProducts 
        : allProducts.filter(p => p.category === currentFilter);
    
    const html = filtered.map(product => `
        <div class="product-card">
            <div class="product-image">${product.icon}</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <button class="product-btn" onclick="addProductToCart(${product.id}, '${product.name}', ${product.price}, '${product.icon}')">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('productsGrid').innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// FILTROS
// ════════════════════════════════════════════════════════════════

function filterProducts(category) {
    currentFilter = category;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadAndRenderProducts();
}

// ════════════════════════════════════════════════════════════════
// CARRITO
// ════════════════════════════════════════════════════════════════

function addProductToCart(id, name, price, icon) {
    const product = { id, name, price, icon };
    addToCart(product);
    renderCart();
    showToast(`${name} agregado al carrito`, 'success');
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
    renderCart();
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
}

function renderCart() {
    const cart = getCart();
    const container = document.getElementById('cartItemsContainer');
    const emptyMessage = document.getElementById('emptyCartMessage');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (cart.length === 0) {
        emptyMessage.style.display = 'block';
        checkoutBtn.disabled = true;
        container.innerHTML = '<div class="empty-cart"><p>Tu carrito está vacío</p></div>';
    } else {
        emptyMessage.style.display = 'none';
        checkoutBtn.disabled = false;
        const html = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-icon">${item.icon}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateQty(${item.id}, -1)">−</button>
                        <input type="number" value="${item.qty}" onchange="updateQtyDirect(${item.id}, this.value)" style="width: 40px; text-align: center; border: 1px solid #ddd; border-radius: 4px; padding: 4px;">
                        <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
        container.innerHTML = html;
    }
    
    updateCartTotal();
}

function updateQty(productId, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.qty += delta;
        if (item.qty < 1) item.qty = 1;
        saveCart(cart);
        updateCartCount();
        renderCart();
    }
}

function updateQtyDirect(productId, value) {
    let cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.qty = Math.max(1, parseInt(value) || 1);
        saveCart(cart);
        updateCartCount();
        renderCart();
    }
}

function updateCartTotal() {
    const total = getCartTotal();
    document.getElementById('cartTotal').textContent = formatCurrency(total);
}

function removeProductFromCart(productId) {
    const cart = getCart();
    const product = cart.find(p => p.id === productId);
    if (product) {
        removeFromCart(productId);
        renderCart();
        showToast(`${product.name} removido del carrito`);
    }
}

// ════════════════════════════════════════════════════════════════
// CHECKOUT
// ════════════════════════════════════════════════════════════════

function goToCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('Agrega productos al carrito primero');
        return;
    }
    closeCart();
    document.getElementById('checkoutModal').classList.add('active');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
}

function submitOrder(e) {
    e.preventDefault();
    
    const name = document.getElementById('checkoutName').value;
    const email = document.getElementById('checkoutEmail').value;
    const phone = document.getElementById('checkoutPhone').value;
    const dni = document.getElementById('checkoutDNI').value;
    const province = document.getElementById('checkoutProvince').value;
    const address = document.getElementById('checkoutAddress').value;
    const notes = document.getElementById('checkoutNotes').value;
    
    if (!name || !email || !phone || !dni || !province || !address) {
        showToast('Completa todos los campos obligatorios', 'error');
        return;
    }
    
    const orderId = generateId('ORD');
    const cart = getCart();
    const total = getCartTotal();
    const today = new Date().toISOString().split('T')[0];
    
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
    
    // Mostrar confirmación
    document.getElementById('confirmationNumber').textContent = `Orden: ${orderId}`;
    closeCheckout();
    
    // Limpiar carrito
    clearCart();
    renderCart();
    
    // Mostrar modal de confirmación
    document.getElementById('confirmationModal').classList.add('active');
    
    showToast('¡Orden confirmada!', 'success');
}

function goToHome() {
    window.location.href = 'index.html';
}

// ════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
    loadInterface();
});

