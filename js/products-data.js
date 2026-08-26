/* PRODUCTS-DATA.JS - API-only Product Data */

let allProducts = [];
let promoProducts = [];

// Usar la constante global de common.js
const API_BASE_URL = window.API_BASE_URL || 'https://puchia-backend-production.up.railway.app/api/v1';

const ICONOS_CATEGORIA = {
  'cumpleanos': '🎈',
  'regalos': '🎁',
  'emprendedores': '💼',
  'promos': '🎉',
  'otras': '📦'
};

async function loadProductsFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/productos?limite=100`);
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

        // DEBUG: Verificar datos de insumo
        if (p.producto_insumo || p.stock_type === 'insumo') {
          console.log(`📍 [loadProductsFromAPI] Producto ${p.id} (${p.nombre}):`, {
            stock_type: p.stock_type,
            producto_insumo: p.producto_insumo,
            insumo_id: p.producto_insumo?.insumo_id,
            insumo_variant: p.producto_insumo?.insumo_variant
          });
        }

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
  }
}

function getFeaturedProducts() {
  return allProducts.slice(0, 6);
}
