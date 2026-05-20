/* HOME.JS - Con ANIMACIÓN DE ESTADÍSTICAS FUNCIONANDO */

const featuredProducts = [
    { id: 1, name: 'Banderín Personalizado', price: 4800, icon: '🎈', category: 'cumpleaños', badge: 'Más vendido' },
    { id: 2, name: 'Bolsitas Golosineras', price: 990, icon: '🍬', category: 'cumpleaños', badge: 'Nuevo' },
    { id: 3, name: 'Bolsitas 3D', price: 1050, icon: '📦', category: 'cumpleaños', badge: 'Más vendido' },
    { id: 4, name: 'Calendarios Negocios', price: 790, icon: '📅', category: 'emprendedores' },
    { id: 5, name: 'Imágenes Decorativas', price: 1200, icon: '🖼️', category: 'cumpleaños', badge: 'Nuevo' },
    { id: 6, name: 'Librito para Pintar', price: 990, icon: '🎨', category: 'cumpleaños' },
];

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
    
    const html = featuredProducts.map(product => {
        let badgeHtml = '';
        if (product.badge) {
            const badgeClass = product.badge === 'Nuevo' ? 'badge-new' : 'badge-hot';
            badgeHtml = `<div class="product-badge ${badgeClass}">${product.badge}</div>`;
        }
        
        return `
            <div class="product-card">
                ${badgeHtml}
                <div class="product-image">${product.icon}</div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">${formatCurrency(product.price)}</div>
                    <button class="product-btn" onclick="addProductToCart(${product.id}, '${product.name}', ${product.price})">
                        Agregar al Carrito
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = html;
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
});

function goToPromos(category) {
    localStorage.setItem('selectedCategory', category);
    window.location.href = 'proceso-compra.html';
}

window.addEventListener('load', () => {
    updateUIWithSettings();
    loadAndRenderProducts();
    updateCartCount();
    
    // Ejecutar animación con delay
    setTimeout(() => {
        animateCounters();
    }, 800);
});
