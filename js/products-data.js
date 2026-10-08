/* PRODUCTS-DATA.JS - API-only Product Data */

let allProducts = [];
let promoProducts = [];
let productsLoadError = false;

// Usar la constante global de common.js
const API_BASE_URL = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';

const ICONOS_CATEGORIA = {
  'cumpleanos': '🎈',
  'regalos': '🎁',
  'emprendedores': '💼',
  'promos': '🎉',
  'otras': '📦'
};

// Las fotos de producto se guardan en el backend con una ruta relativa (/uploads/productos/...).
// Esta función arma la URL absoluta (el sitio está en Vercel y las fotos en Railway).
function resolveMediaUrl(url) {
  if (!url) return '';
  if (/^(https?:)?\/\/|^data:|^blob:/i.test(url)) return url;
  const base = (window.API_BASE_URL || API_BASE_URL).replace(/\/api\/v1\/?$/, '');
  return base + (url.startsWith('/') ? '' : '/') + url;
}

// Foto de portada del producto (o el emoji si no tiene foto o no carga).
// imgStyle: estilo inline de la <img>; el emoji queda igual que antes.
function productImageHTML(product, imgStyle) {
  if (!product || !product.portada) return product && product.icon ? product.icon : '📦';
  const alt = String(product.name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const style = imgStyle || 'width:100%;height:180px;object-fit:cover;border-radius:8px;display:block;';
  return `<img src="${resolveMediaUrl(product.portada)}" alt="${alt}" style="${style}" loading="lazy" onerror="this.outerHTML='<span>${product.icon || '📦'}</span>'">`;
}

// Varios scripts piden los productos al arrancar (home, renderer, categorías): se comparte
// una sola petición en curso en vez de repetirla.
let _productsInflight = null;
function loadProductsFromAPI() {
  if (!_productsInflight) {
    _productsInflight = _loadProductsFromAPI().finally(() => { _productsInflight = null; });
  }
  return _productsInflight;
}

async function _loadProductsFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/productos?limite=1000`);
    const data = await response.json();

    if (data.success && data.data && Array.isArray(data.data)) {
      const products = data.data.map(p => {
        const categoryName = p.categorias && p.categorias.length > 0
          ? p.categorias[0].nombre.toLowerCase().replace(/ñ/g, 'n')
          : 'otras';
        const mediaList = (p.media || []).map(m => ({ ...m, tipo: m.tipo === 'video' ? 'video' : 'foto' }));
        const portadaItem = mediaList.find(m => m.es_portada) || mediaList[0] || null;

        // Usar stock_disponible del backend (calculado para 'insumo' y 'simple')
        const effectiveStock = p.stock_disponible || 0;


        return {
          id: p.id,
          name: p.nombre,
          price: parseFloat(p.precio) || 0,
          icon: ICONOS_CATEGORIA[categoryName] || '📦',
          category: categoryName,
          categorias: p.categorias,
          descripcion: p.descripcion || 'Sin descripción disponible',
          descripcion_completa: p.descripcion || 'Sin descripción disponible',
          stock_cantidad: effectiveStock,
          stock: effectiveStock,
          stock_type: p.stock_type,
          producto_insumo: p.producto_insumo,
          // Opciones (color, tamaño, modelo…): el cliente elige cuántas de cada una; cada una trae su precio y cuántas quedan
          tiene_opciones: p.tiene_opciones === true,
          opciones: (p.opciones || []).map(o => ({ id: o.id, nombre: o.nombre, precio: o.precio === null || o.precio === undefined ? null : Number(o.precio), disponibles: Number(o.disponibles) || 0 })),
          es_combo: p.es_combo === true,
          // Combo: lo que lleva cada parte, con cuántas unidades se pueden elegir y qué opciones quedan
          combo: p.combo ? { componentes: (p.combo.componentes || []).map(c => ({ componente_id: c.componente_id, producto_id: c.producto_id, producto: c.producto, cantidad_min: c.cantidad_min, cantidad_max: c.cantidad_max, disponibles: c.disponibles, opciones: c.opciones || [] })) } : null,
          compra_minima: p.compra_minima || null,
          compra_maxima: p.compra_maxima || null,
          controla_stock: p.controla_stock !== false,
          habilitado: p.habilitado !== false,
          media: mediaList,
          portada: portadaItem ? portadaItem.url : null
        };
      }).filter(p => p.habilitado);

      // Filtrar por categoría "PROMOS" en lugar de IDs hardcodeados
      promoProducts = products.filter(p => p.categorias && p.categorias.some(cat => cat.nombre === 'PROMOS'));
      allProducts = products.filter(p => !p.categorias || !p.categorias.some(cat => cat.nombre === 'PROMOS'));
    } else {
      allProducts = [];
      promoProducts = [];
    }
  } catch (error) {
    console.error('Error cargando productos desde API:', error);
    allProducts = [];
    promoProducts = [];
    productsLoadError = true;
  }
}

function getFeaturedProducts() {
  return allProducts.slice(0, 6);
}
