/* CLIENTE.JS - Lógica para proceso-compra.html - FINAL COMPLETO */

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

const promoProducts = [
    { id: 10, name: 'Pack Cumpleaños x3', price: 1500, icon: '🎊', category: 'promos', desc: 'Combo especial de 3 productos.' },
    { id: 11, name: 'Oferta Mega Regalos', price: 2000, icon: '🎁', category: 'promos', desc: 'Descuento en paquete de regalos.' },
    { id: 12, name: 'Promoción Emprendedor', price: 899, icon: '💼', category: 'promos', desc: 'Oferta especial para negocios.' },
];

let currentFilter = 'todas';
let currentSection = 'productos';

function loadInterface() {
    updateUIWithSettings();
    
    const selected = localStorage.getItem('selectedCategory');
    if (selected === 'promos') {
        currentSection = 'promos';
        localStorage.removeItem('selectedCategory');
        showSection('promos');
    } else {
        currentSection = 'productos';
        if (selected) {
            currentFilter = selected;
            localStorage.removeItem('selectedCategory');
        }
        showSection('productos');
    }
}

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

function showSection(section) {
    currentSection = section;
    
    const productsSection = document.getElementById('productsSection');
    const promosSection = document.getElementById('promosSection');
    const prodBtn = document.getElementById('productosBtn');
    const promBtn = document.getElementById('promosBtn');
    
    if (section === 'productos') {
        if (productsSection) productsSection.style.display = 'block';
        if (promosSection) promosSection.style.display = 'none';
        if (prodBtn) prodBtn.classList.add('active');
        if (promBtn) promBtn.classList.remove('active');
        loadAndRenderProducts();
    } else {
        if (productsSection) productsSection.style.display = 'none';
        if (promosSection) promosSection.style.display = 'block';
        if (prodBtn) prodBtn.classList.remove('active');
        if (promBtn) promBtn.classList.add('active');
        loadAndRenderPromos();
    }
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
    
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML = html;
}

function loadAndRenderPromos() {
    const html = promoProducts.map(product => `
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
    
    const grid = document.getElementById('promosGrid');
    if (grid) grid.innerHTML = html;
}

function filterProducts(category) {
    currentFilter = category;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadAndRenderProducts();
}

function addProductToCart(id, name, price, icon) {
    const product = { id, name, price, icon };
    addToCart(product);
    showToast(`${name} agregado al carrito`, 'success');
}

function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
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
    
    const confirmNumber = document.getElementById('confirmationNumber');
    if (confirmNumber) {
        confirmNumber.textContent = `Orden: ${orderId}`;
    }
    
    closeCheckout();
    clearCart();
    renderCartSidebar();
    
    const confirmModal = document.getElementById('confirmationModal');
    if (confirmModal) {
        confirmModal.classList.add('active');
    }
    
    showToast('¡Orden confirmada!', 'success');
}

function goToHome() {
    window.location.href = 'index.html';
}

window.addEventListener('load', () => {
    loadInterface();
    updateCartCount();
    renderCartSidebar();
});
