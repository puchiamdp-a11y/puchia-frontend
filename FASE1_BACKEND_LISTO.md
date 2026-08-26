# CMS Puchia HOME - Fase 1 Backend Completado ✅

**Fecha:** 2026-08-26  
**Estado:** Backend 100% Funcional - Frontend en progreso  
**Deadline:** Fin de semana

---

## 📡 Backend APIs Disponibles

El backend está completamente listo con las siguientes APIs:

### Admin - Gestión de Secciones
```
GET    /api/v1/admin/home-sections           → Obtener todas las secciones
GET    /api/v1/admin/home-sections/:id       → Obtener sección específica
POST   /api/v1/admin/home-sections           → Crear nueva sección
PUT    /api/v1/admin/home-sections/:id       → Actualizar sección
DELETE /api/v1/admin/home-sections/:id       → Eliminar sección
PUT    /api/v1/admin/home-sections/batch/reorder → Reordenar secciones
POST   /api/v1/admin/home-sections/:id/duplicate → Duplicar sección
```

### Admin - Gestión de Borrador
```
GET    /api/v1/admin/home-draft              → Obtener borrador actual
POST   /api/v1/admin/home-draft/save         → Guardar cambios en borrador
PUT    /api/v1/admin/home-draft/publish      → Publicar cambios
POST   /api/v1/admin/home-draft/discard      → Descartar cambios
PUT    /api/v1/admin/home-draft/mark-unsaved → Marcar cambios sin guardar
```

### Admin - Gestión de Branding
```
GET    /api/v1/admin/home-branding           → Obtener logo/favicon
POST   /api/v1/admin/home-branding/upload    → Subir logo/favicon
```

### Público - Lectura
```
GET    /api/v1/home-sections                 → Obtener secciones publicadas
GET    /api/v1/home-branding                 → Obtener branding publicado
```

---

## 🎯 Tipos de Secciones Disponibles

### 1. Banner
```javascript
{
  "section_type": "banner",
  "config": {
    "title": "Banner Principal",
    "subtitle": "Subtítulo",
    "image_url": "https://...",
    "button_text": "Ver Más",
    "button_url": "/productos",
    "autoplay": true,
    "autoplay_interval": 5000,
    "images": [...]
  }
}
```

### 2. Categorías
```javascript
{
  "section_type": "categories",
  "config": {
    "title": "Nuestras Categorías",
    "show_all": true,
    "ids": [1, 5, 8],
    "limit": 10,
    "columns": 4,
    "display_type": "grid"
  }
}
```

### 3. Productos Destacados
```javascript
{
  "section_type": "products",
  "config": {
    "title": "Productos Destacados",
    "custom_label": "⭐",
    "ids": [15, 20, 45],
    "limit": 10,
    "columns": 4,
    "show_price": true,
    "show_rating": true
  }
}
```

### 4. Stats ⭐ (Nuevo)
```javascript
{
  "section_type": "stats",
  "config": {
    "title": "Nuestros Logros",
    "stats": [
      {
        "number": "2500+",
        "subtitle": "Clientes",
        "icon": "👥",
        "animate": true,
        "animation_duration": 2000
      }
    ],
    "layout": "row",
    "animation_type": "counter"
  }
}
```

### 5. Testimonios
```javascript
{
  "section_type": "testimonials",
  "config": {
    "title": "Lo que Dicen Nuestros Clientes",
    "min_rating": 4,
    "limit": 5,
    "display_type": "carousel",
    "auto_rotate": true,
    "rotation_interval": 5000
  }
}
```

### 6. Imagen ⭐ (Nuevo)
```javascript
{
  "section_type": "image",
  "config": {
    "title": "Personalización",
    "description": "Cada regalo es único",
    "image_url": "https://...",
    "button_text": "Crear Mi Regalo",
    "button_url": "/productos",
    "text_overlay": {
      "enabled": false,
      "text": "Texto sobre imagen",
      "position": "bottom",
      "text_color": "#FFFFFF"
    }
  }
}
```

### 7. Línea de Texto ⭐ (Nuevo)
```javascript
{
  "section_type": "scrolling_text",
  "config": {
    "text": "🎉 ENVIOS GRATIS • 🚀 PERSONALIZAMOS • ⭐ GARANTÍA 100%",
    "scroll_mode": "auto",
    "scroll_speed": 50,
    "background_color": "#FF1493",
    "text_color": "#FFFFFF",
    "position_on_page": "top",
    "visible": true
  }
}
```

---

## 📋 Flujo de Trabajo para Frontend

### 1. Listar Secciones
```bash
curl -H "Authorization: Bearer {token}" \
  https://api.puchia.com/api/v1/admin/home-sections
```

### 2. Crear Nueva Sección
```bash
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"section_type":"stats","config":{...}}' \
  https://api.puchia.com/api/v1/admin/home-sections
```

### 3. Guardar en Borrador
```bash
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"sections":[...],"logo_url":"..."}' \
  https://api.puchia.com/api/v1/admin/home-draft/save
```

### 4. Publicar Cambios
```bash
curl -X PUT -H "Authorization: Bearer {token}" \
  https://api.puchia.com/api/v1/admin/home-draft/publish
```

---

## 🎨 Integración Frontend

### Estado Global Recomendado
```javascript
const [sections, setSections] = useState([]);
const [draft, setDraft] = useState(null);
const [unsavedChanges, setUnsavedChanges] = useState(false);
const [selectedSection, setSelectedSection] = useState(null);
```

### Cargar Secciones
```javascript
async function loadSections() {
  const response = await fetch('/api/v1/admin/home-sections', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  setSections(result.data);
}

async function loadDraft() {
  const response = await fetch('/api/v1/admin/home-draft', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  setDraft(result.data);
  setUnsavedChanges(result.data.has_unsaved_changes);
}
```

### Guardar Cambios
```javascript
async function saveDraft() {
  const response = await fetch('/api/v1/admin/home-draft/save', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sections: sections,
      logo_url: draft?.logo_url,
      favicon_url: draft?.favicon_url
    })
  });
  const result = await response.json();
  setUnsavedChanges(false);
  return result;
}
```

### Publicar Cambios
```javascript
async function publishChanges() {
  const response = await fetch('/api/v1/admin/home-draft/publish', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const result = await response.json();
  return result;
}
```

---

## 🔐 Autenticación

Todas las rutas admin requieren un Bearer token en el header:

```javascript
headers: {
  'Authorization': 'Bearer {token}',
  'Content-Type': 'application/json'
}
```

El token se obtiene del login admin y se guarda en `localStorage.getItem('puchia_admin_token')`

---

## ✅ Checklist Frontend - Fase 1

- [ ] Componente de edición por tipo de sección
- [ ] UI para editar Stats (máx 6 items)
- [ ] UI para editar Imagen (upload, título, descripción)
- [ ] UI para editar Línea de Texto (scroll mode, velocidad)
- [ ] Preview en tiempo real en iframe
- [ ] Sistema de indicador "Cambios sin guardar"
- [ ] Botón "Guardar Cambios"
- [ ] Botón "Publicar Cambios"
- [ ] Confirmación antes de abandonar página
- [ ] Upload de logo y favicon
- [ ] Testing de integraciones API

---

## 📚 Recursos

- **Arquitectura Completa:** [ARQUITECTURA_CMS_PUCHIA_HOME_FASE1.md](../puchia-backend/ARQUITECTURA_CMS_PUCHIA_HOME_FASE1.md)
- **Implementación Backend:** [FASE1_IMPLEMENTACION_COMPLETADA.md](../puchia-backend/FASE1_IMPLEMENTACION_COMPLETADA.md)
- **Artifact Visual:** https://claude.ai/code/artifact/e4395e66-63f9-4f65-841e-bda91d1187c0

---

**Backend Status:** ✅ LISTO  
**Frontend Status:** ⏳ EN PROGRESO  
**Deadline:** Fin de semana  
**Branch:** `claude/puchia-cms-backend-arch-e3p5qr`
