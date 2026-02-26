/**
 * program-competences.js
 * Módulo de Competencias para Program Info
 * Gestiona el catálogo de competencias del programa por área.
 * El catálogo se carga dinámicamente desde /api/competences (MongoDB Atlas).
 *
 * Expone: window.ProgramCompetences
 */
(function (window) {
    'use strict';

    const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;

    // ─── Catálogo cargado desde la BD (reemplaza el hardcoded) ────────────────
    let COMPETENCES_CATALOG = [];
    let AREAS = [];

    // ─── Estado interno ────────────────────────────────────────────────────────
    let _programCompetences = []; // competencias seleccionadas para este programa (con selectedTools)
    let _catalogLoaded = false;

    // ─── Carga el catálogo desde la API ───────────────────────────────────────
    async function _loadCatalog() {
        if (_catalogLoaded) return;
        const token = localStorage.getItem('token');
        console.log('[ProgramCompetences] Cargando catálogo desde /api/competences...');
        try {
            const res = await fetch(`${API_URL}/api/competences`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                console.error('[ProgramCompetences] Error HTTP al cargar catálogo:', res.status, res.statusText);
                return;
            }
            const data = await res.json();
            console.log('[ProgramCompetences] Competencias recibidas de la API:', data.length, data);

            // Normalize DB shape → internal shape
            // DB shape: { id, name, description, areas:[{id,name,icon}], levels:[{levelId,levelName,levelDescription,indicators:[{id,name,description}]}], tools:[{id,name}] }
            COMPETENCES_CATALOG = data.map(comp => {
                const areaName = (comp.areas && comp.areas[0]) ? comp.areas[0].name : 'Sin área';
                const levels = (comp.levels || []).map(l => ({
                    level: l.levelId,
                    description: l.levelName || `Nivel ${l.levelId}`,
                    indicators: (l.indicators || []).map(i => i.name)
                }));
                const allTools = (comp.tools || []).map(t => t.name);
                return {
                    id: comp.id,
                    area: areaName,
                    name: comp.name,
                    description: comp.description || '',
                    levels,
                    allTools
                };
            });

            AREAS = [...new Set(COMPETENCES_CATALOG.map(c => c.area))];
            console.log('[ProgramCompetences] Áreas encontradas:', AREAS);
            _catalogLoaded = true;
        } catch (e) {
            console.error('[ProgramCompetences] Excepción al cargar catálogo:', e);
        }
    }

    // ─── Inicialización ────────────────────────────────────────────────────────
    async function init(savedCompetences) {
        _programCompetences = Array.isArray(savedCompetences) ? savedCompetences : [];
        await _loadCatalog();
        _populateAreaFilter();
        _render();
    }

    // ─── Rellena el selector de área en promotion-detail con las áreas de la BD
    function _populateAreaFilter() {
        const sel = document.getElementById('competences-area-filter');
        if (!sel) return;
        // Keep only the first "Todas las áreas" option, then append DB areas
        sel.innerHTML = '<option value="">Todas las áreas</option>';
        AREAS.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area;
            opt.textContent = area;
            sel.appendChild(opt);
        });
        console.log('[ProgramCompetences] Filtro de área rellenado con:', AREAS);
    }

    // ─── Obtiene las competencias actuales para guardar ───────────────────────
    function getCompetences() {
        return JSON.parse(JSON.stringify(_programCompetences));

    }

    // ─── Renderiza el panel de competencias ───────────────────────────────────
    function _render() {
        const container = document.getElementById('competences-list-container');
        if (!container) return;

        const filterArea = document.getElementById('competences-area-filter')?.value || '';

        if (!_programCompetences.length) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-award fs-1 d-block mb-2 opacity-50"></i>
                    <span>No hay competencias añadidas al programa. Usa el botón "Añadir Competencia".</span>
                </div>`;
            return;
        }

        const filtered = filterArea
            ? _programCompetences.filter(c => c.area === filterArea)
            : _programCompetences;

        if (!filtered.length) {
            container.innerHTML = `<div class="text-center py-3 text-muted"><i class="bi bi-filter-circle me-2"></i>No hay competencias en el área seleccionada.</div>`;
            return;
        }

        container.innerHTML = filtered.map((comp, globalIdx) => {
            const realIdx = _programCompetences.indexOf(comp);
            return _renderCompetenceCard(comp, realIdx);
        }).join('');
    }

    function _renderCompetenceCard(comp, idx) {
        const areaColor = _areaColor(comp.area);
        const toolBadges = (comp.selectedTools || []).map(t =>
            `<span class="badge bg-light text-dark border me-1 mb-1"><i class="bi bi-tools me-1"></i>${_esc(t)}</span>`
        ).join('');

        const levelRows = (comp.levels || []).map(l => `
            <div class="d-flex align-items-start gap-2 mb-1">
                <span class="badge bg-${_levelColor(l.level)} flex-shrink-0" style="min-width:2rem; text-align:center;">${l.level}</span>
                <div>
                    <strong class="small">${_esc(l.description)}</strong>
                    <ul class="mb-0 ps-3 small text-muted">
                        ${(l.indicators || []).map(i => `<li>${_esc(i)}</li>`).join('')}
                    </ul>
                </div>
            </div>`).join('');

        return `
        <div class="card mb-3 border-start border-4 border-${areaColor}" data-competence-idx="${idx}">
            <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
                <div>
                    <span class="badge bg-${areaColor} me-2">${_esc(comp.area)}</span>
                    <strong>${_esc(comp.name)}</strong>
                    ${comp.description ? `<small class="text-muted ms-2 d-none d-md-inline">${_esc(comp.description)}</small>` : ''}
                </div>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary" title="Editar herramientas seleccionadas"
                        onclick="window.ProgramCompetences._openToolsEditor(${idx})">
                        <i class="bi bi-tools"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="Quitar competencia"
                        onclick="window.ProgramCompetences._removeCompetence(${idx})">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
            <div class="card-body py-2 px-3">
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="small text-uppercase text-muted mb-2"><i class="bi bi-bar-chart-steps me-1"></i>Niveles</h6>
                        ${levelRows}
                    </div>
                    <div class="col-md-6 border-start">
                        <h6 class="small text-uppercase text-muted mb-2"><i class="bi bi-tools me-1"></i>Herramientas del programa</h6>
                        ${toolBadges || '<span class="text-muted small fst-italic">Sin herramientas seleccionadas</span>'}
                    </div>
                </div>
            </div>
        </div>`;
    }

    // ─── Helper: obtener o crear instancia de Modal ───────────────────────────
    function _getOrCreateModalInstance(el) {
        return bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
    }

    // ─── Abre modal para añadir competencia del catálogo ──────────────────────
    function openAddCompetenceModal() {
        _buildAddCompetenceModal();
        const el = document.getElementById('addCompetenceModal');
        _getOrCreateModalInstance(el).show();
    }

    function _buildAddCompetenceModal() {
        let modal = document.getElementById('addCompetenceModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addCompetenceModal';
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            document.body.appendChild(modal);
        }

        const areaOptions = AREAS.map(a =>
            `<option value="${_esc(a)}">${_esc(a)}</option>`
        ).join('');

        const catalogCards = COMPETENCES_CATALOG.map((comp, i) => {
            const alreadyAdded = _programCompetences.some(pc => pc.id === comp.id);
            return `
            <div class="catalog-card col-12 mb-2" data-area="${_esc(comp.area)}" data-catalog-idx="${i}">
                <div class="card ${alreadyAdded ? 'border-success' : ''}">
                    <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-${_areaColor(comp.area)} me-2">${_esc(comp.area)}</span>
                            <strong>${_esc(comp.name)}</strong>
                            <small class="text-muted ms-2 d-none d-md-inline">${_esc(comp.description)}</small>
                        </div>
                        <button class="btn btn-sm ${alreadyAdded ? 'btn-success' : 'btn-outline-primary'}"
                            ${alreadyAdded ? 'disabled' : `onclick="window.ProgramCompetences._addFromCatalog(${i})"`}>
                            ${alreadyAdded ? '<i class="bi bi-check-lg"></i> Añadida' : '<i class="bi bi-plus"></i> Añadir'}
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-award me-2"></i>Añadir Competencia al Programa</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Filtrar por área</label>
                        <select class="form-select" id="catalog-area-filter" onchange="window.ProgramCompetences._filterCatalog()">
                            <option value="">Todas las áreas</option>
                            ${areaOptions}
                        </select>
                    </div>
                    <div class="row" id="catalog-cards-container">
                        ${catalogCards}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>`;
    }

    function _filterCatalog() {
        const filterVal = document.getElementById('catalog-area-filter')?.value || '';
        document.querySelectorAll('#catalog-cards-container .catalog-card').forEach(el => {
            const area = el.dataset.area;
            el.style.display = (!filterVal || area === filterVal) ? '' : 'none';
        });
    }

    function _addFromCatalog(catalogIdx) {
        const source = COMPETENCES_CATALOG[catalogIdx];
        if (!source) return;
        if (_programCompetences.some(pc => pc.id === source.id)) return;

        _programCompetences.push({
            id: source.id,
            area: source.area,
            name: source.name,
            description: source.description,
            levels: JSON.parse(JSON.stringify(source.levels)),
            allTools: [...(source.allTools || [])],
            selectedTools: []
        });

        // Rebuild modal content to update "Añadida" buttons, keep it open
        _buildAddCompetenceModal();
        const filterVal = document.getElementById('catalog-area-filter')?.value || '';
        if (filterVal) {
            document.querySelectorAll('#catalog-cards-container .catalog-card').forEach(el => {
                el.style.display = el.dataset.area === filterVal ? '' : 'none';
            });
        }

        _render();
        _markUnsaved();
    }

    // ─── Quitar competencia ───────────────────────────────────────────────────
    function _removeCompetence(idx) {
        if (!confirm(`¿Quitar la competencia "${_programCompetences[idx]?.name}" del programa?`)) return;
        _programCompetences.splice(idx, 1);
        _render();
        _markUnsaved();
    }

    // ─── Editor de herramientas seleccionadas ─────────────────────────────────
    function _openToolsEditor(idx) {
        const comp = _programCompetences[idx];
        if (!comp) return;

        let modal = document.getElementById('toolsEditorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'toolsEditorModal';
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            document.body.appendChild(modal);
        }

        const checkboxes = (comp.allTools || []).map(tool => {
            const checked = (comp.selectedTools || []).includes(tool) ? 'checked' : '';
            return `
            <div class="form-check">
                <input class="form-check-input tools-checkbox" type="checkbox" value="${_esc(tool)}" id="tool-${_esc(tool.replace(/\s/g, '-'))}" ${checked}>
                <label class="form-check-label" for="tool-${_esc(tool.replace(/\s/g, '-'))}">${_esc(tool)}</label>
            </div>`;
        }).join('');

        modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-tools me-2"></i>Herramientas para "${_esc(comp.name)}"</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small">Selecciona las herramientas que se utilizarán en este programa.</p>
                    ${checkboxes || '<span class="text-muted">No hay herramientas en el catálogo para esta competencia.</span>'}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="window.ProgramCompetences._saveToolsSelection(${idx})">
                        <i class="bi bi-save me-1"></i>Guardar selección
                    </button>
                </div>
            </div>
        </div>`;

        bootstrap.Modal.getInstance(modal)?.hide();
        _getOrCreateModalInstance(modal).show();
    }

    function _saveToolsSelection(idx) {
        const selected = Array.from(
            document.querySelectorAll('#toolsEditorModal .tools-checkbox:checked')
        ).map(cb => cb.value);
        _programCompetences[idx].selectedTools = selected;
        const toolsModal = document.getElementById('toolsEditorModal');
        bootstrap.Modal.getInstance(toolsModal)?.hide();
        _render();
        _markUnsaved();
    }

    // ─── Filtro de área en la vista del programa ───────────────────────────────
    function filterByArea() {
        _render();
    }

    // ─── Notifica al sistema principal que hay cambios sin guardar ────────────
    function _markUnsaved() {
        // Integración con promotion-detail.js: activa el badge de "unsaved"
        const badge = document.getElementById('competences-unsaved-badge');
        if (badge) badge.classList.remove('d-none');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function _esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function _areaColor(area) {
        const map = {
            'Frontend': 'primary',
            'Backend': 'success',
            'DevOps': 'warning',
            'Testing': 'danger',
            'Soft Skills': 'info',
            'UX/UI': 'secondary',
            'IA': 'dark'
        };
        return map[area] || 'secondary';
    }

    function _levelColor(level) {
        return { 1: 'secondary', 2: 'warning', 3: 'primary', 4: 'success' }[level] || 'secondary';
    }

    // ─── API pública ──────────────────────────────────────────────────────────
    window.ProgramCompetences = {
        init,
        getCompetences,
        openAddCompetenceModal,
        filterByArea,
        _addFromCatalog,
        _filterCatalog,
        _removeCompetence,
        _openToolsEditor,
        _saveToolsSelection
    };

}(window));
