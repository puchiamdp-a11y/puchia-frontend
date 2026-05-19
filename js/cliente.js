/* CLIENTE.JS - Lógica para proceso-compra.html - FASE 2 CON PROMOS */

// PRODUCTOS COMPLETOS (Todos los 9 + PROMOS)
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
    
    // PRODUCTOS PROMOS (con descuento)
    { id: 101, name: 'Combo Cumpleaños', price: 2990, icon: '🎉', category: 'promos', desc: 'Banderín + Bolsitas + Toppers por solo $2.990!' },
    { id: 102, name: 'Pack Regalos', price: 3490, icon: '🎁', category: 'promos', desc: 'Llaveros + Stickers + Imágenes por $3.490!' },
    { id: 103, name: 'Oferta Emprendedor', price: 1490, icon: '💼', category: 'promos', desc: 'Calendario + 50 tarjetas por $1.490!' },
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
    renderCartSidebar();
    showToast(`${name} agregado al carrito`, 'success');
}

function updateCartTotal() {
    const total = getCartTotal();
    const totalElement = document.getElementById('cartTotal');
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }
}

// ════════════════════════════════════════════════════════════════
// CHECKOUT
// ════════════════════════════════════════════════════════════════

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
    renderCartSidebar();
    
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
    const selected = localStorage.getItem('selectedCategory');
    if (selected) {
        currentFilter = selected;
        localStorage.removeItem('selectedCategory');
        
        // Actualizar botones de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const buttons = document.querySelectorAll('.filter-btn');
        const categoryMap = { 'todas': 0, 'cumpleaños': 1, 'regalos': 2, 'emprendedores': 3, 'promos': 4 };
        if (buttons[categoryMap[selected]]) {
            buttons[categoryMap[selected]].classList.add('active');
        }
    }
    
    loadInterface();
});
