# 📱 AUDITORÍA MOBILE - PUCHIA FRONTEND

**Fecha de Auditoría:** 2026-08-11  
**Estado:** Análisis FASE 0 - Lectura y Documentación (SIN CAMBIOS)  
**Objetivo:** Identificar problemas de responsive design que impiden que el sitio funcione en móviles

---

## 📊 RESUMEN EJECUTIVO

- **Total de archivos HTML:** 13 páginas
- **Total de archivos CSS:** 4 (2,953 líneas)
- **Total de archivos JS:** 10 scripts
- **Media queries existentes:** 4 breakpoints identificados
- **!important inline:** 5 estilos inline con !important
- **Hardcoded sizes en JS:** 4 propiedades de ancho dinámico

**CRÍTICA:** El sitio tiene media queries pero están **INCOMPLETAS** y hay estilos inline que las **ROMPEN** con `!important`.

---

## ⚠️ PROBLEMA 1: ESTILOS INLINE CON !important

Los estilos inline con `!important` rompen las media queries porque NO pueden ser sobrescritos.

### Archivos Afectados:

#### 1. `admin/dashboard.html` (5 instancias)

| Línea | Selector | Propiedad | Problema |
|-------|----------|-----------|----------|
| 29 | `.modal.show` | `display: flex !important` | Fuerza flex inline, no responsive |
| 42 | `.product-tab-btn` | `color: #666 !important` | Fuerza color, rompe responsive |
| 43 | `.product-tab-btn:hover` | `color: #7b2d8e !important; background: #f9f9f9 !important` | Dos !important, no adaptable |
| 44 | `.product-tab-btn.active` | `color: #7b2d8e !important; border-bottom-color: #7b2d8e !important; font-weight: 600 !important` | Tres !important combinados |

#### 2. `recuperacion.html` (1 instancia)

| Línea | Selector | Propiedad | Problema |
|-------|----------|-----------|----------|
| 156 | (sin selector visible) | `font-size: 24px !important` | Hardcoded en medida fija, no escala en móvil |

### Impacto:
- No se pueden aplicar media queries para estos elementos
- Tamaños de fuente fijos en móvil (no se adaptan)
- Colores y estilos bloqueados

---

## ⚠️ PROBLEMA 2: HARDCODED SIZES EN JAVASCRIPT

El JavaScript genera HTML con estilos inline hardcodeados en pixels que no se adaptan a pantallas móviles.

### Archivo: `js/admin-clientes.js`

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 181 | `<span>` pagination | `font-size:13px; margin-left:8px` | Fuente fija, no escala móvil |
| 213 | `<div>` container | `margin-top:16px` | Márgenes fijos |
| 224 | `<div>` detail box | `margin-top:12px; padding:12px; background:#f5f5f5; border-radius:6px` | Padding/margin fijos |
| 227 | `<div>` detail row | `background:#fff; padding:8px; border-radius:4px; margin-top:8px` | Todo hardcodeado |
| 232 | `<div>` actions | `display:flex; gap:10px; margin-top:20px; justify-content:flex-end` | Gap fijo (10px) |
| 409 | `<details>` errors | `margin-top:8px` | Margin fijo |

### Archivo: `js/common.js`

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 69 | CSS modal | `max-width: 500px` | **No se adapta a pantallas < 500px** |
| 354 | `<span>` qty | `min-width: 30px; text-align: center; font-weight: 600` | Ancho mínimo fijo |
| 443 | `banner` | `background:#eafaf1; border:1px solid #a9dfbf; color:#1e8449; padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:18px` | **TODO hardcodeado** |

### Archivo: `js/categorias.js`

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 43 | `<p>` description | `color: #999; font-size: 14px; margin-top: 8px` | Font size fijo |
| 102 | `<button>` | `margin-top: 8px` | Margin fijo |

### Archivo: `js/admin.js` (CRÍTICO - Muchos estilos inline)

**Tabla de imagen/galería (CRÍTICO para móvil):**

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 401 | `<img>` portada | `width:40px; height:40px; object-fit:cover; border-radius:4px` | **Imagen fija 40x40px** |
| 1088 | `<div>` flex container | `display: flex; gap: 8px; margin-bottom: 8px; padding: 8px` | Gap y padding fijos |
| 1090 | `<input>` stock | `width: 80px; padding: 6px; border-radius: 4px; font-size: 13px` | **Input fijo 80px ancho** |
| 1264 | `<tr>` table row | `border-bottom: 1px solid #eee; height: 44px` | Altura fija 44px |
| 1267 | `<td>` nombre | `padding: 8px 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px` | **max-width fijo 150px** |
| 1509-1520 | `<td>` cells | `padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px` | Multiple cells, font fijo |

**Modal de órdenes (CRÍTICO):**

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 1765 | `.modal-content` | `width: 400px` | **Modal fijo 400px - NO cabe en móvil** |
| 1778 | `<img>` logo | `height: 55px; margin-bottom: 8px` | Altura fija |
| 1812+ | Multiple `<div>` | `margin-bottom: 15px; background: #f9f9f9; padding: 12px` | Padding/margin fijos |
| 2212 | `<table>` | `width: 100%; border-collapse: collapse` | Tabla ancha |
| 2216-2218 | `<th>` headers | `padding: 12px; width: 80px/100px` | **Ancho fijo de columnas** |

**Galería de media (CRÍTICO):**

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 2387 | `<div>` media item | `width:88px; height:88px; border-radius:8px` | **Miniatura fija 88x88px** |
| 2404 | `<div>` queue item | `width:88px; height:88px; border-radius:8px` | **Miniatura fija 88x88px** |
| 2644 | `<div>` gallery thumb | `width:58px; height:58px; border-radius:6px` | **Thumbnail fijo 58x58px** |

**Modales:**

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 2777 | `.modal-content` | `max-width: 400px; max-height: 500px` | **Modal fijo 400x500px** |
| 2942 | `.modal-content` | `max-width: 400px` | **Modal fijo 400px** |
| 3170 | `.modal-content` | `max-width: 500px; max-height: 80vh` | **Modal fijo 500px** |
| 3192 | `.modal-content` | `max-width: 400px` | **Modal fijo 400px** |

### Archivo: `js/cliente.js` (Galería producto)

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 90, 100 | `<img>` portada | `width:100%; height:180px; object-fit:cover` | **Altura fija 180px** |
| 101 | `<div>` icon | `font-size: 80px; height: 180px` | **Altura fija 180px** |
| 484 | `<video>` | `width:100%; max-height:280px; object-fit:contain` | **Max height fijo 280px** |
| 485 | `<img>` | `width:100%; max-height:280px; object-fit:contain` | **Max height fijo 280px** |
| 494 | `<div>` thumb | `width:56px; height:56px; flex-shrink:0; border-radius:6px` | **Thumbnail fijo 56x56px** |
| 512 | `.modal-box` | `max-width: 600px; width: 90%; max-height: 85vh` | Modal bastante responsivo pero NO en screens < 360px |
| 525-528 | Qty controls | `width: 32px; height: 32px` (buttons), `width: 50px` (input) | **Botones/inputs fijos** |

### Archivo: `js/admin-alertas-config.js`

| Línea | Elemento | Estilos Inline | Problema |
|-------|----------|----------------|----------|
| 135 | `<div>` | `position:fixed; bottom:24px; right:24px; background:#7f1f6e; color:white` | Posición fija |

---

## ⚠️ PROBLEMA 3: MEDIA QUERIES INCOMPLETAS

El proyecto TIENE media queries pero son **INCOMPLETAS** y no cubren todos los elementos.

### Breakpoints Existentes:

| Breakpoint | Archivos | Estado | Problemas |
|-----------|----------|--------|----------|
| **768px (tablet)** | common.css, home.css, cliente.css, admin.css | ✅ Existe | Incompleto, falta adaptación de estilos inline JS |
| **600px (móvil grande)** | cliente.css | ⚠️ Parcial | Solo en cliente.css, no en otros archivos |
| **480px (móvil pequeño)** | admin.css | ⚠️ Muy limitado | Solo en admin.css, no en home/cliente |
| **360px (móvil muy pequeño)** | ❌ NO EXISTE | ❌ Falta | Sin cobertura para devices muy pequeños |

### Análisis Detallado:

#### `common.css` - @media (max-width: 768px)

```css
@media (max-width: 768px) {
    header { padding: 15px 20px; flex-direction: column; gap: 15px; }
    .header-left { width: 100%; justify-content: space-between; }
    nav { gap: 20px; }
    footer { flex-direction: column; gap: 20px; text-align: center; }
    .modal-content { padding: 20px; }
}
```

**Problemas:**
- No cubre `.toast` (position: bottom 100px, right 30px - NO se adapta)
- No cubre `.modal` padding interior completo
- No ajusta `.container` padding
- No cubre elementos generados por JavaScript

#### `home.css` - @media (max-width: 768px)

```css
@media (max-width: 768px) {
    .banner-carousel { height: 400px; }
    .banner h1 { font-size: 40px; }
    .banner p { font-size: 16px; }
    .stats-grid { flex-direction: column; gap: 50px; }
    .stat-number { font-size: 42px; }
    .how-grid, .categories-grid, .products-grid, .testimonials-grid { grid-template-columns: 1fr; }
    .how-grid::before { width: 1px; height: 100%; top: 0; left: 36px; }
    .featured-products, .how-section, .categories-section, .testimonials-section { padding: 60px 20px; }
    .section-title { font-size: 28px; }
    .categories-grid { grid-template-columns: repeat(2, 1fr); }
    .stats-section { padding: 60px 20px; min-height: auto; }
}
```

**Problemas:**
- `.banner-carousel` height 400px SIGUE SIENDO GRANDE en móviles (debería ser ~250px para 480px)
- NO hay breakpoint para 480px o 360px
- `.banner` padding 60px 40px NO se ajusta (sigue muy grande)
- `.category-card` padding 48px 30px NO se ajusta
- `.products-grid` gap: 30px NO se ajusta (muy grande en móvil)

#### `cliente.css` - @media (max-width: 768px) + @media (max-width: 600px)

```css
@media (max-width: 768px) {
    .products-grid { grid-template-columns: 1fr; }
    .categories-grid { grid-template-columns: 1fr; }
    .cart-sidebar { width: 100%; right: -100%; }
    .products-section { padding: 40px 20px; }
}

@media (max-width: 600px) {
    .modal-box { padding: 20px; }
    .detail-image { font-size: 60px; }
    .detail-info h2 { font-size: 20px; }
    .detail-price { font-size: 24px; }
    .detail-actions { flex-direction: column; }
    .btn-add-cart, .btn-close { width: 100%; }
}
```

**Problemas:**
- `.cart-sidebar` width: 100% ✅ BIEN
- `.cart-sidebar` NO tiene `max-height: 100vh` en móvil (puede ser más alto que la pantalla)
- En 600px, NO cubre `.modal-box` width (sigue 90%, puede ser muy ancho)
- NO cubre thumbs de galería (56x56px sigue igual)
- NO cubre controles de cantidad (32x32px buttons)

#### `admin.css` - @media (max-width: 768px) + @media (max-width: 480px)

```css
@media (max-width: 768px) {
    .admin-header { padding: 15px 20px; }
    .admin-sidebar { width: 200px; padding: 15px; }
    .admin-content { padding: 20px; }
    .page-title { font-size: 20px; }
    .stats-grid { grid-template-columns: 1fr; }
    .table-container { overflow-x: auto; }
    table { min-width: 600px; }
}

@media (max-width: 480px) {
    .admin-container { flex-direction: column; }
    .admin-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #e0e0e0; padding: 10px; }
    .sidebar-nav a { padding: 10px; font-size: 12px; }
    .admin-content { padding: 15px; }
}
```

**Problemas:**
- 768px: `.admin-sidebar` width: 200px SIGUE OCUPANDO MUCHO (en 768px es 26% del ancho)
- 480px: Sidebar pasa a 100% ✅ BIEN
- NO hay media queries para los estilos inline generados por JS
- Tablas con `min-width: 600px` en 480px seguirán siendo muy anchas
- NO cubre modales inline de admin.js

---

## 📋 RESUMEN DE PROBLEMAS POR PRIORIDAD

### 🔴 CRÍTICOS (Rompen funcionalidad en móvil):

1. **Modal width fijo 400px-500px en admin.js** (líneas 1765, 2777, 2942, 3170)
   - Modales de órdenes NO caben en pantallas < 400px
   - **Afecta:** Confirmar pedidos, ver errores, exportar productos

2. **Tabla con columnas ancho fijo en admin.js** (línea 2216-2218)
   - Columnas con width: 80px/100px NO se adaptan
   - **Afecta:** Admin panel - gestión de ordenes

3. **Galería de media con tamaño fijo 88x88px en admin.js** (línea 2387, 2404, 2644)
   - Miniaturas ocupan espacio fijo, no adaptable
   - **Afecta:** Gestión de fotos de productos

4. **Altura imagen producto 180px fija en cliente.js** (línea 90, 100)
   - **Afecta:** Catálogo de productos se ve mal en móvil

### 🟠 ALTOS (Afectan experiencia):

5. **Estilos !important en dashboard.html** (5 instancias)
   - Imposible aplicar media queries a esos elementos
   - **Afecta:** Panel de admin

6. **Padding/margin hardcodeados en JavaScript** (múltiples archivos)
   - Espaciado no se adapta a pantallas pequeñas
   - **Afecta:** Toda la interfaz generada dinámicamente

7. **NO hay media queries para 360px-480px**
   - Solo hay 768px, 600px, 480px
   - **Falta:** Breakpoint para 360px (celulares populares)

### 🟡 MEDIOS (Mejora continua):

8. **Toast position fija** (common.js línea 300-310)
   - `bottom: 100px` muy lejos del borde en móvil

9. **Inputs con width fijo** (admin.js línea 1090)
   - `width: 80px` puede ser muy ancho en móvil

---

## 📑 ARCHIVOS AFECTADOS - RANKING

| Archivo | Críticos | Altos | Medios | Total Problemas |
|---------|----------|-------|--------|-----------------|
| `js/admin.js` | 4 | 3 | 5 | **12** |
| `js/cliente.js` | 2 | 2 | 1 | **5** |
| `js/admin-clientes.js` | 0 | 2 | 3 | **5** |
| `js/common.js` | 1 | 1 | 1 | **3** |
| `admin/dashboard.html` | 0 | 2 | 0 | **2** |
| `js/categorias.js` | 0 | 1 | 1 | **2** |
| `recuperacion.html` | 0 | 1 | 0 | **1** |
| `js/admin-alertas-config.js` | 0 | 0 | 1 | **1** |

---

## 🔧 LÍNEA DE CÓDIGO MÁS PROBLEMÁTICA

**admin.js línea 1765:** `width: 400px` en modal de órdenes
- Bloquea toda orden en pantallas < 400px
- **DEBE CAMBIAR A:** `max-width: 90vw; width: 100%; max-width: 600px`

---

## 🎯 SIGUIENTE PASO: FASE 1

### Tareas Prioritarias para Limpiar Código:

1. **Remover `!important` de HTML** (5 instancias en dashboard.html + recuperacion.html)
2. **Extraer estilos inline de JavaScript a CSS clases** (especialmente admin.js)
3. **Convertir tamaños hardcodeados a CSS variables responsive**
4. **Agregar media queries faltantes** (360px breakpoint)
5. **Verificar modales** (todos deben ser responsive con max-width)

---

**Reporte Completo:** ✅ LISTO PARA FASE 1
