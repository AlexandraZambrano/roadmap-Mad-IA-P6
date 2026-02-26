/**
 * student-tracking.js
 * Módulo de Fichas de Seguimiento Integral del Coder
 * Funcionalidad independiente de promotion-detail.js
 * 
 * Expone: window.StudentTracking
 */

(function (window) {
    'use strict';

    const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;

    // ─── Estado interno ───────────────────────────────────────────────────────
    let _promotionId = null;
    let _currentStudentId = null;
    let _currentStudent = null;
    let _promotionModules = [];
    let _promotionPildoras = [];
    let _promotionProjects = [];      // [{name, moduleId, moduleName}]
    let _promotionEmployability = []; // [{name, url}]
    let _modulesPildarasExtended = []; // ExtendedInfo modulesPildoras con status/fecha
    let _hasUnsavedTechnical = false;
    let _hasUnsavedTransversal = false;

    // ─── Datos temporales en memoria (se persisten al guardar) ────────────────
    let _teacherNotes = [];
    let _teams = [];
    let _competences = [];
    let _completedModules = [];
    let _completedPildoras = [];
    let _employabilitySessions = [];
    let _individualSessions = [];
    let _incidents = [];

    // ─── Constantes UI ────────────────────────────────────────────────────────
    const LEVEL_LABELS = { 1: 'Insuficiente', 2: 'Básico', 3: 'Competente', 4: 'Excelente' };
    const LEVEL_COLORS = { 1: 'danger', 2: 'warning', 3: 'primary', 4: 'success' };

    const INCIDENT_TYPES = [
        'Roces con compañeros/as',
        'Falta de compromiso',
        'Activación entorno protector',
        'Problemas técnicos recurrentes',
        'Absentismo',
        'Otro'
    ];

    const ADMIN_SITUATIONS = [
        { value: 'nacional', label: 'Nacional' },
        { value: 'solicitante_asilo', label: 'Solicitante de asilo' },
        { value: 'ciudadano_europeo', label: 'Ciudadano/a europeo/a' },
        { value: 'permiso_trabajo', label: 'Con permiso de trabajo' },
        { value: 'no_permiso_trabajo', label: 'Sin permiso de trabajo' },
        { value: 'otro', label: 'Otro' }
    ];

    const COMUNIDADES = [
        'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
        'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Ceuta', 'Comunidad de Madrid',
        'Comunidad Valenciana', 'Extremadura', 'Galicia', 'La Rioja', 'Melilla',
        'Murcia', 'Navarra', 'País Vasco'
    ];

    // ─── Inicialización ───────────────────────────────────────────────────────

    function init(promotionId) {
        _promotionId = promotionId;
        _loadPromotionModules();
    }

    async function _loadPromotionModules() {
        try {
            const token = localStorage.getItem('token');
            // Fetch promotion data (modules, projects, employability)
            const [promoRes, pildarasRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${_promotionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/promotions/${_promotionId}/modules-pildoras`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            if (promoRes.ok) {
                const promo = await promoRes.json();
                _promotionModules = promo.modules || [];
                _promotionPildoras = [];
                _promotionProjects = [];
                _promotionModules.forEach(m => {
                    (m.pildoras || []).forEach(p => {
                        _promotionPildoras.push({ ...p, moduleName: m.name, moduleId: m.id });
                    });
                    (m.projects || []).forEach(p => {
                        _promotionProjects.push({ name: p.name, url: p.url, moduleId: m.id, moduleName: m.name });
                    });
                });
                _promotionEmployability = promo.employability || [];
            }
            if (pildarasRes.ok) {
                const pildarasData = await pildarasRes.json();
                _modulesPildarasExtended = pildarasData.modulesPildoras || [];
            }
        } catch (e) {
            console.error('[StudentTracking] Error cargando módulos:', e);
        }
    }

    // ─── Abrir ficha de seguimiento ───────────────────────────────────────────

    async function openFicha(studentId) {
        _currentStudentId = studentId;
        _hasUnsavedTechnical = false;
        _hasUnsavedTransversal = false;

        // Mostrar spinner mientras carga
        _showFichaModal();
        _setFichaLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${studentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('No se pudo cargar el estudiante');
            _currentStudent = await res.json();
        } catch (e) {
            console.error('[StudentTracking] Error cargando estudiante:', e);
            _setFichaLoading(false);
            _showToast('Error cargando datos del estudiante', 'danger');
            return;
        }

        // Cargar datos en memoria
        const tt = _currentStudent.technicalTracking || {};
        const tr = _currentStudent.transversalTracking || {};
        _teacherNotes = (tt.teacherNotes || []).map(n => ({ ...n }));
        _teams = (tt.teams || []).map(t => ({ ...t }));
        _competences = (tt.competences || []).map(c => ({ ...c }));
        _completedModules = (tt.completedModules || []).map(m => ({ ...m }));
        _completedPildoras = (tt.completedPildoras || []).map(p => ({ ...p }));
        _employabilitySessions = (tr.employabilitySessions || []).map(s => ({ ...s }));
        _individualSessions = (tr.individualSessions || []).map(s => ({ ...s }));
        _incidents = (tr.incidents || []).map(i => ({ ...i }));

        _setFichaLoading(false);
        _renderFicha();
    }

    // ─── Modal principal ──────────────────────────────────────────────────────

    function _showFichaModal() {
        const modal = _getOrCreateModal();
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();
    }

    function _getOrCreateModal() {
        let modal = document.getElementById('fichaModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.innerHTML = _fichaModalTemplate();
            document.body.appendChild(modal.firstElementChild);
            modal = document.getElementById('fichaModal');
        }
        return modal;
    }

    function _fichaModalTemplate() {
        return `
        <div class="modal fade" id="fichaModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header bg-light">
                        <div>
                            <h5 class="modal-title mb-0">
                                <i class="bi bi-person-lines-fill me-2 text-primary"></i>
                                Ficha de Seguimiento del Coder
                            </h5>
                            <small class="text-muted" id="ficha-student-subtitle">—</small>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0">
                        <!-- Loading overlay -->
                        <div id="ficha-loading" class="text-center p-5 d-none">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p class="mt-2 text-muted">Cargando datos del coder...</p>
                        </div>

                        <!-- Content -->
                        <div id="ficha-content">
                            <!-- Tabs -->
                            <ul class="nav nav-tabs nav-fill border-bottom px-3 pt-3 bg-light" id="fichaTabList" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="ficha-tab-personal" data-bs-toggle="tab"
                                        data-bs-target="#ficha-panel-personal" type="button" role="tab">
                                        <i class="bi bi-person-vcard me-1"></i> Datos Personales
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="ficha-tab-technical" data-bs-toggle="tab"
                                        data-bs-target="#ficha-panel-technical" type="button" role="tab">
                                        <i class="bi bi-gear me-1"></i> Seguimiento Técnico
                                        <span class="badge bg-danger ms-1 d-none" id="badge-technical-unsaved">●</span>
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="ficha-tab-transversal" data-bs-toggle="tab"
                                        data-bs-target="#ficha-panel-transversal" type="button" role="tab">
                                        <i class="bi bi-people me-1"></i> Seguimiento Transversal
                                        <span class="badge bg-danger ms-1 d-none" id="badge-transversal-unsaved">●</span>
                                    </button>
                                </li>
                            </ul>

                            <div class="tab-content p-4" id="fichaTabContent">

                                <!-- ══ PESTAÑA DATOS PERSONALES ══ -->
                                <div class="tab-pane fade show active" id="ficha-panel-personal" role="tabpanel">
                                    <form id="ficha-personal-form" novalidate>
                                        <div class="row g-3">
                                            <div class="col-12"><h6 class="text-primary border-bottom pb-1">Datos Obligatorios</h6></div>

                                            <div class="col-md-6">
                                                <label class="form-label fw-semibold">Nombre(s) <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="fp-name" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label fw-semibold">Apellido(s) <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="fp-lastname" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label fw-semibold">Email <span class="text-danger">*</span></label>
                                                <input type="email" class="form-control" id="fp-email" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label fw-semibold">Teléfono <span class="text-danger">*</span></label>
                                                <input type="tel" class="form-control" id="fp-phone" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label fw-semibold">Edad <span class="text-danger">*</span></label>
                                                <input type="number" class="form-control" id="fp-age" min="16" max="99" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label fw-semibold">Situación Administrativa <span class="text-danger">*</span></label>
                                                <select class="form-select" id="fp-admin-situation" required>
                                                    <option value="">Seleccionar...</option>
                                                    ${ADMIN_SITUATIONS.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                                                </select>
                                            </div>

                                            <div class="col-12 mt-2"><h6 class="text-secondary border-bottom pb-1">Datos Opcionales</h6></div>

                                            <div class="col-md-4">
                                                <label class="form-label">Nacionalidad</label>
                                                <input type="text" class="form-control" id="fp-nationality" placeholder="Ej: Española, Colombiana...">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Documento Identificativo</label>
                                                <input type="text" class="form-control" id="fp-document" placeholder="DNI / NIE / Pasaporte">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Sexo</label>
                                                <select class="form-select" id="fp-gender">
                                                    <option value="">—</option>
                                                    <option value="mujer">Mujer</option>
                                                    <option value="hombre">Hombre</option>
                                                    <option value="no_binario">No binario / Otro</option>
                                                    <option value="no_especifica">Prefiero no especificar</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Nivel de inglés</label>
                                                <select class="form-select" id="fp-english-level">
                                                    <option value="">—</option>
                                                    <option value="A1">A1 - Principiante</option>
                                                    <option value="A2">A2 - Elemental</option>
                                                    <option value="B1">B1 - Intermedio</option>
                                                    <option value="B2">B2 - Intermedio alto</option>
                                                    <option value="C1">C1 - Avanzado</option>
                                                    <option value="C2">C2 - Maestría</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Nivel Educativo</label>
                                                <select class="form-select" id="fp-education-level">
                                                    <option value="">—</option>
                                                    <option value="sin_estudios">Sin estudios formales</option>
                                                    <option value="eso">ESO</option>
                                                    <option value="bachillerato">Bachillerato / FP Básica</option>
                                                    <option value="fp_medio">FP Grado Medio</option>
                                                    <option value="fp_superior">FP Grado Superior</option>
                                                    <option value="grado">Grado Universitario</option>
                                                    <option value="postgrado">Postgrado / Máster</option>
                                                    <option value="doctorado">Doctorado</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Profesión</label>
                                                <input type="text" class="form-control" id="fp-profession" placeholder="Ej: Diseñadora, Economista...">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Comunidad de Residencia</label>
                                                <select class="form-select" id="fp-community">
                                                    <option value="">—</option>
                                                    ${COMUNIDADES.map(c => `<option value="${c}">${c}</option>`).join('')}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="d-flex justify-content-end mt-4">
                                            <button type="submit" class="btn btn-primary">
                                                <i class="bi bi-floppy me-1"></i> Guardar Datos Personales
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <!-- ══ PESTAÑA SEGUIMIENTO TÉCNICO ══ -->
                                <div class="tab-pane fade" id="ficha-panel-technical" role="tabpanel">

                                    <!-- Notas del profesor -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-chat-left-text me-1"></i> Notas del Profesor</h6>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openNoteForm()">
                                                <i class="bi bi-plus-lg me-1"></i>Añadir Nota
                                            </button>
                                        </div>
                                        <div id="ficha-teacher-notes-list" class="notes-list"></div>
                                    </div>

                                    <!-- Equipos -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-people-fill me-1"></i> Equipos</h6>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openTeamForm()">
                                                <i class="bi bi-plus-lg me-1"></i>Añadir Equipo
                                            </button>
                                        </div>
                                        <div id="ficha-teams-list"></div>
                                    </div>

                                    <!-- Competencias -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-award me-1"></i> Competencias</h6>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openCompetenceForm()">
                                                <i class="bi bi-plus-lg me-1"></i>Añadir Competencia
                                            </button>
                                        </div>
                                        <div id="ficha-competences-list"></div>
                                    </div>

                                    <!-- Módulos completados -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-book-half me-1"></i> Módulos Completados</h6>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openModuleForm()">
                                                <i class="bi bi-plus-lg me-1"></i>Registrar Módulo
                                            </button>
                                        </div>
                                        <div id="ficha-modules-list"></div>
                                    </div>

                                    <!-- Píldoras completadas -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-lightning-charge me-1"></i> Píldoras Presentadas</h6>
                                            <span class="badge bg-secondary rounded-pill" id="ficha-pildoras-count">Automático</span>
                                        </div>
                                        <div id="ficha-pildoras-list"></div>
                                    </div>

                                    <div class="d-flex justify-content-end mt-3">
                                        <button class="btn btn-primary" onclick="window.StudentTracking._saveTechnical()">
                                            <i class="bi bi-floppy me-1"></i> Guardar Seguimiento Técnico
                                        </button>
                                    </div>
                                </div>

                                <!-- ══ PESTAÑA SEGUIMIENTO TRANSVERSAL ══ -->
                                <div class="tab-pane fade" id="ficha-panel-transversal" role="tabpanel">

                                    <!-- Sesiones de empleabilidad -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-briefcase me-1"></i> Sesiones de Empleabilidad</h6>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openEmpSessionForm()">
                                                <i class="bi bi-plus-lg me-1"></i>Añadir Sesión
                                            </button>
                                        </div>
                                        <div id="ficha-emp-sessions-list"></div>
                                    </div>

                                    <!-- Sesiones individuales -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-person-workspace me-1"></i> Sesiones Individuales</h6>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openIndSessionForm()">
                                                <i class="bi bi-plus-lg me-1"></i>Añadir Sesión
                                            </button>
                                        </div>
                                        <div id="ficha-ind-sessions-list"></div>
                                    </div>

                                    <!-- Incidencias -->
                                    <div class="tracking-section mb-4">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="text-primary mb-0"><i class="bi bi-exclamation-triangle me-1"></i> Incidencias</h6>
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openIncidentForm()">
                                                <i class="bi bi-plus-lg me-1"></i>Registrar Incidencia
                                            </button>
                                        </div>
                                        <div id="ficha-incidents-list"></div>
                                    </div>

                                    <div class="d-flex justify-content-end mt-3">
                                        <button class="btn btn-primary" onclick="window.StudentTracking._saveTransversal()">
                                            <i class="bi bi-floppy me-1"></i> Guardar Seguimiento Transversal
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function _setFichaLoading(isLoading) {
        const loading = document.getElementById('ficha-loading');
        const content = document.getElementById('ficha-content');
        if (loading) loading.classList.toggle('d-none', !isLoading);
        if (content) content.classList.toggle('d-none', isLoading);
    }

    function _renderFicha() {
        const s = _currentStudent;
        if (!s) return;

        // Subtítulo del modal
        const sub = document.getElementById('ficha-student-subtitle');
        if (sub) sub.textContent = `${s.name || ''} ${s.lastname || ''} — ${s.email || ''}`;

        // ── Datos Personales ──
        _setVal('fp-name', s.name);
        _setVal('fp-lastname', s.lastname);
        _setVal('fp-email', s.email);
        _setVal('fp-phone', s.phone);
        _setVal('fp-age', s.age);
        _setVal('fp-admin-situation', s.administrativeSituation);
        _setVal('fp-nationality', s.nationality);
        _setVal('fp-document', s.identificationDocument);
        _setVal('fp-gender', s.gender);
        _setVal('fp-english-level', s.englishLevel);
        _setVal('fp-education-level', s.educationLevel);
        _setVal('fp-profession', s.profession);
        _setVal('fp-community', s.community);

        // ── Tracking técnico ──
        _renderTeacherNotes();
        _renderTeams();
        _renderCompetences();
        _renderModules();
        _renderPildoras();

        // ── Tracking transversal ──
        _renderEmpSessions();
        _renderIndSessions();
        _renderIncidents();

        // ── Formulario personal: submit ──
        const form = document.getElementById('ficha-personal-form');
        if (form) {
            form.onsubmit = (e) => { e.preventDefault(); _savePersonal(); };
        }
    }

    // ─── Helpers de UI ────────────────────────────────────────────────────────

    function _setVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = (value !== null && value !== undefined) ? value : '';
    }

    function _markUnsaved(type) {
        if (type === 'technical') {
            _hasUnsavedTechnical = true;
            const badge = document.getElementById('badge-technical-unsaved');
            if (badge) badge.classList.remove('d-none');
        } else {
            _hasUnsavedTransversal = true;
            const badge = document.getElementById('badge-transversal-unsaved');
            if (badge) badge.classList.remove('d-none');
        }
    }

    function _markSaved(type) {
        if (type === 'technical') {
            _hasUnsavedTechnical = false;
            const badge = document.getElementById('badge-technical-unsaved');
            if (badge) badge.classList.add('d-none');
        } else {
            _hasUnsavedTransversal = false;
            const badge = document.getElementById('badge-transversal-unsaved');
            if (badge) badge.classList.add('d-none');
        }
    }

    function _showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed shadow`;
        toast.style.cssText = 'top:20px;right:20px;z-index:99999;min-width:280px;max-width:380px;';
        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
        toast.innerHTML = `<i class="bi ${icon} me-2"></i>${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
    }

    function _emptyState(icon, text) {
        return `<div class="text-center text-muted py-3">
            <i class="bi bi-${icon} fs-3 d-block mb-1 opacity-50"></i>
            <small>${text}</small>
        </div>`;
    }

    function _todayISO() {
        return new Date().toISOString().split('T')[0];
    }

    // ─── Renderizado: Notas del profesor ──────────────────────────────────────

    function _renderTeacherNotes() {
        const container = document.getElementById('ficha-teacher-notes-list');
        if (!container) return;
        if (!_teacherNotes.length) {
            container.innerHTML = _emptyState('journal-text', 'Sin notas registradas');
            return;
        }
        container.innerHTML = _teacherNotes.map((n, i) => `
            <div class="card mb-2 border-start border-4 border-info">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <p class="mb-1">${_esc(n.note || '')}</p>
                            <small class="text-muted">
                                <i class="bi bi-calendar3 me-1"></i>${_fmtDate(n.createdAt)}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="window.StudentTracking._removeNote(${i})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openNoteForm() {
        _showInlineForm('ficha-teacher-notes-list', `
            <div class="card border-primary mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Nota / Observación</label>
                            <textarea class="form-control form-control-sm" id="note-content" rows="3" placeholder="Escribe aquí la nota del profesor..."></textarea>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-teacher-notes-list')">Cancelar</button>
                        <button class="btn btn-sm btn-primary" onclick="window.StudentTracking._saveNote()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveNote() {
        const note = document.getElementById('note-content')?.value?.trim() || '';
        if (!note) { _showToast('La nota no puede estar vacía', 'warning'); return; }
        _teacherNotes.push({ note, createdAt: new Date().toISOString() });
        _markUnsaved('technical');
        _renderTeacherNotes();
        _cancelInlineForm('ficha-teacher-notes-list');
    }

    function _removeNote(i) {
        _teacherNotes.splice(i, 1);
        _markUnsaved('technical');
        _renderTeacherNotes();
    }

    // ─── Renderizado: Equipos ─────────────────────────────────────────────────

    function _renderTeams() {
        const container = document.getElementById('ficha-teams-list');
        if (!container) return;
        if (!_teams.length) {
            container.innerHTML = _emptyState('people', 'Sin proyectos/equipos registrados');
            return;
        }
        container.innerHTML = _teams.map((t, i) => `
            <div class="card mb-2 border-start border-4 border-success">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-semibold"><i class="bi bi-people-fill text-success me-1"></i>${_esc(t.teamName || 'Proyecto')}</div>
                            <small class="text-muted">
                                Rol: <strong>${_esc(t.role || '—')}</strong>
                                &nbsp;|&nbsp; Módulo: <strong>${_esc(t.moduleName || '—')}</strong>
                                ${t.assignedDate ? `&nbsp;|&nbsp;<i class="bi bi-calendar3 me-1"></i>${_fmtDate(t.assignedDate)}` : ''}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="window.StudentTracking._removeTeam(${i})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openTeamForm() {
        const projectOptions = _promotionProjects.length
            ? _promotionProjects.map((p, i) => `<option value="${i}">${_esc(p.moduleName)} → ${_esc(p.name)}</option>`).join('')
            : '';
        const projectField = _promotionProjects.length
            ? `<select class="form-select form-select-sm" id="team-project-select">
                <option value="">Seleccionar proyecto del roadmap...</option>
                ${projectOptions}
              </select>`
            : `<input type="text" class="form-control form-control-sm" id="team-project-select" placeholder="Nombre del proyecto (no hay proyectos en el roadmap)">`;

        _showInlineForm('ficha-teams-list', `
            <div class="card border-success mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Proyecto del roadmap</label>
                            ${projectField}
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold">Rol en el equipo</label>
                            <select class="form-select form-select-sm" id="team-role">
                                <option value="Dev">Dev</option>
                                <option value="QA">QA / Tester</option>
                                <option value="Scrum Master">Scrum Master</option>
                                <option value="Product Owner">Product Owner</option>
                                <option value="Diseño">Diseño / UX</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Fecha inicio</label>
                            <input type="date" class="form-control form-control-sm" id="team-date" value="${_todayISO()}">
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-teams-list')">Cancelar</button>
                        <button class="btn btn-sm btn-success" onclick="window.StudentTracking._saveTeam()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveTeam() {
        const selectEl = document.getElementById('team-project-select');
        let teamName = '';
        let moduleName = '';
        if (selectEl.tagName === 'SELECT') {
            const idx = parseInt(selectEl.value);
            if (isNaN(idx) || !_promotionProjects[idx]) { _showToast('Selecciona un proyecto del roadmap', 'warning'); return; }
            teamName = _promotionProjects[idx].name;
            moduleName = _promotionProjects[idx].moduleName;
        } else {
            teamName = selectEl.value.trim();
            if (!teamName) { _showToast('El nombre del proyecto es obligatorio', 'warning'); return; }
        }
        const role = document.getElementById('team-role')?.value?.trim() || '';
        const assignedDate = document.getElementById('team-date')?.value || _todayISO();
        _teams.push({ teamName, role, moduleName, assignedDate });
        _markUnsaved('technical');
        _renderTeams();
        _cancelInlineForm('ficha-teams-list');
    }

    function _removeTeam(i) {
        _teams.splice(i, 1);
        _markUnsaved('technical');
        _renderTeams();
    }

    // ─── Renderizado: Competencias ────────────────────────────────────────────

    function _renderCompetences() {
        const container = document.getElementById('ficha-competences-list');
        if (!container) return;
        if (!_competences.length) {
            container.innerHTML = _emptyState('trophy', 'Sin competencias registradas');
            return;
        }
        container.innerHTML = _competences.map((c, i) => `
            <div class="card mb-2 border-start border-4 border-warning">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-semibold"><i class="bi bi-award text-warning me-1"></i>${_esc(c.competenceName || `Competencia ${c.competenceId || i+1}`)}</div>
                            <small class="text-muted">
                                <span class="badge bg-${LEVEL_COLORS[c.level] || 'secondary'} me-1">Nivel ${c.level || '—'}: ${LEVEL_LABELS[c.level] || ''}</span>
                                ${c.toolsUsed?.length ? `Herramientas: ${c.toolsUsed.join(', ')}` : ''}
                                ${c.evaluatedDate ? `&nbsp;|&nbsp;<i class="bi bi-calendar3 me-1"></i>${_fmtDate(c.evaluatedDate)}` : ''}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="window.StudentTracking._removeCompetence(${i})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openCompetenceForm() {
        _showInlineForm('ficha-competences-list', `
            <div class="card border-warning mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Competencia</label>
                            <input type="text" class="form-control form-control-sm" id="comp-name" placeholder="Nombre de la competencia">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Nivel</label>
                            <select class="form-select form-select-sm" id="comp-level">
                                <option value="1">1 - Bajo</option>
                                <option value="2" selected>2 - Medio</option>
                                <option value="3">3 - Alto</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold">Fecha evaluación</label>
                            <input type="date" class="form-control form-control-sm" id="comp-date" value="${_todayISO()}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Herramientas utilizadas (separadas por coma)</label>
                            <input type="text" class="form-control form-control-sm" id="comp-tools" placeholder="Ej: React, Node.js, Docker">
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-competences-list')">Cancelar</button>
                        <button class="btn btn-sm btn-warning" onclick="window.StudentTracking._saveCompetence()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveCompetence() {
        const name = document.getElementById('comp-name')?.value?.trim() || '';
        const level = parseInt(document.getElementById('comp-level')?.value) || 2;
        const evaluatedDate = document.getElementById('comp-date')?.value || _todayISO();
        const toolsRaw = document.getElementById('comp-tools')?.value || '';
        const toolsUsed = toolsRaw.split(',').map(t => t.trim()).filter(Boolean);
        if (!name) { _showToast('El nombre de la competencia es obligatorio', 'warning'); return; }
        _competences.push({ competenceName: name, level, evaluatedDate, toolsUsed });
        _markUnsaved('technical');
        _renderCompetences();
        _cancelInlineForm('ficha-competences-list');
    }

    function _removeCompetence(i) {
        _competences.splice(i, 1);
        _markUnsaved('technical');
        _renderCompetences();
    }

    // ─── Renderizado: Módulos completados ─────────────────────────────────────

    function _renderModules() {
        const container = document.getElementById('ficha-modules-list');
        if (!container) return;
        if (!_completedModules.length) {
            container.innerHTML = _emptyState('book', 'Sin módulos completados');
            return;
        }
        container.innerHTML = _completedModules.map((m, i) => `
            <div class="card mb-2 border-start border-4 border-primary">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-semibold"><i class="bi bi-book-fill text-primary me-1"></i>${_esc(m.moduleName || '—')}</div>
                            <small class="text-muted">
                                <i class="bi bi-calendar-check me-1"></i>${_fmtDate(m.completionDate)}
                                &nbsp;|&nbsp; Nota: <span class="badge bg-${LEVEL_COLORS[m.finalGrade] || 'secondary'}">${LEVEL_LABELS[m.finalGrade] || m.finalGrade || 'N/A'}</span>
                                ${m.notes ? `&nbsp;|&nbsp;${_esc(m.notes)}` : ''}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="window.StudentTracking._removeModule(${i})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openModuleForm() {
        const moduleOptions = _promotionModules.length
            ? _promotionModules.map(m => `<option value="${_esc(m.name)}" data-id="${m.id}">${_esc(m.name)}</option>`).join('')
            : '<option value="">No hay módulos en el roadmap</option>';
        _showInlineForm('ficha-modules-list', `
            <div class="card border-primary mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Módulo</label>
                            <select class="form-select form-select-sm" id="mod-select">
                                <option value="">Seleccionar módulo...</option>
                                ${moduleOptions}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Nota final</label>
                            <select class="form-select form-select-sm" id="mod-grade">
                                <option value="1">1 - Insuficiente</option>
                                <option value="2">2 - Básico</option>
                                <option value="3" selected>3 - Competente</option>
                                <option value="4">4 - Excelente</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold">Fecha completado</label>
                            <input type="date" class="form-control form-control-sm" id="mod-date" value="${_todayISO()}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Observaciones</label>
                            <input type="text" class="form-control form-control-sm" id="mod-notes" placeholder="Observaciones opcionales">
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-modules-list')">Cancelar</button>
                        <button class="btn btn-sm btn-primary" onclick="window.StudentTracking._saveModule()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveModule() {
        const select = document.getElementById('mod-select');
        const moduleName = select?.options[select.selectedIndex]?.text || '';
        const moduleId = select?.options[select.selectedIndex]?.dataset?.id || '';
        const finalGrade = parseInt(document.getElementById('mod-grade')?.value) || 3;
        const completionDate = document.getElementById('mod-date')?.value || _todayISO();
        const notes = document.getElementById('mod-notes')?.value?.trim() || '';
        if (!moduleName || moduleName === 'Seleccionar módulo...') { _showToast('Selecciona un módulo', 'warning'); return; }
        _completedModules.push({ moduleId, moduleName, finalGrade, completionDate, notes });
        _markUnsaved('technical');
        _renderModules();
        _cancelInlineForm('ficha-modules-list');
    }

    function _removeModule(i) {
        _completedModules.splice(i, 1);
        _markUnsaved('technical');
        _renderModules();
    }

    // ─── Renderizado: Píldoras completadas (automático desde BD) ─────────────

    function _renderPildoras() {
        const container = document.getElementById('ficha-pildoras-list');
        if (!container) return;

        // Construir lista de píldoras presentadas vinculadas a este estudiante
        const presented = [];
        _modulesPildarasExtended.forEach(mp => {
            (mp.pildoras || []).forEach(p => {
                const assignedIds = _getAssignedIdsForPildora(p.id || p.pildoraId, mp.moduleId);
                const isAssigned = assignedIds.includes(_currentStudentId) ||
                                   assignedIds.includes(String(_currentStudentId));
                if (isAssigned && p.status === 'Presentada') {
                    presented.push({
                        pildoraName: p.title || '—',
                        moduleName: mp.moduleName || '—',
                        moduleId: mp.moduleId,
                        date: p.date || null,
                        mode: p.mode || null
                    });
                }
            });
        });

        if (!presented.length) {
            container.innerHTML = _emptyState('lightning-charge', 'No hay píldoras presentadas vinculadas a este coder');
            return;
        }

        container.innerHTML = presented.map(p => `
            <div class="card mb-2 border-start border-4 border-info">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-semibold">
                                <i class="bi bi-lightning-charge-fill text-info me-1"></i>${_esc(p.pildoraName)}
                            </div>
                            <small class="text-muted">
                                Módulo: <strong>${_esc(p.moduleName)}</strong>
                                ${p.date ? `&nbsp;|&nbsp;<i class="bi bi-calendar3 me-1"></i>${_fmtDate(p.date)}` : ''}
                                ${p.mode ? `&nbsp;|&nbsp;<i class="bi bi-display me-1"></i>${_esc(p.mode)}` : ''}
                            </small>
                        </div>
                        <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Presentada</span>
                    </div>
                </div>
            </div>`).join('');
    }

    // Helper: obtiene los assignedStudentIds de una píldora desde _promotionPildoras (Promotion model)
    function _getAssignedIdsForPildora(pildoraId, moduleId) {
        const found = _promotionPildoras.find(p =>
            (p.id === pildoraId || p._id === pildoraId) && p.moduleId === moduleId
        );
        return found?.assignedStudentIds || [];
    }

    // ─── Renderizado: Sesiones de empleabilidad ───────────────────────────────

    function _renderEmpSessions() {
        const container = document.getElementById('ficha-emp-sessions-list');
        if (!container) return;
        if (!_employabilitySessions.length) {
            container.innerHTML = _emptyState('briefcase', 'Sin sesiones de empleabilidad registradas');
            return;
        }
        container.innerHTML = _employabilitySessions.map((s, i) => `
            <div class="card mb-2 border-start border-4 border-success">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="fw-semibold"><i class="bi bi-briefcase-fill text-success me-1"></i>${_esc(s.topic || '—')}</div>
                            <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${_fmtDate(s.sessionDate)}</small>
                            ${s.cvLink || s.portfolioLink || s.linkedinLink ? `
                            <div class="mt-1 d-flex gap-2 flex-wrap">
                                ${s.cvLink ? `<a href="${_esc(s.cvLink)}" target="_blank" class="badge bg-light text-dark border text-decoration-none"><i class="bi bi-file-person me-1"></i>CV</a>` : ''}
                                ${s.portfolioLink ? `<a href="${_esc(s.portfolioLink)}" target="_blank" class="badge bg-light text-dark border text-decoration-none"><i class="bi bi-globe me-1"></i>Portfolio</a>` : ''}
                                ${s.linkedinLink ? `<a href="${_esc(s.linkedinLink)}" target="_blank" class="badge bg-light text-dark border text-decoration-none"><i class="bi bi-linkedin me-1"></i>LinkedIn</a>` : ''}
                            </div>` : ''}
                            ${s.notes ? `<p class="mt-1 mb-0 small fst-italic">${_esc(s.notes)}</p>` : ''}
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="window.StudentTracking._removeEmpSession(${i})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openEmpSessionForm() {
        const empOptions = _promotionEmployability.length
            ? _promotionEmployability.map((e, i) => `<option value="${i}">${_esc(e.name)}</option>`).join('')
            : '';
        const topicField = _promotionEmployability.length
            ? `<select class="form-select form-select-sm" id="emp-topic-select">
                <option value="">Seleccionar sesión del roadmap...</option>
                ${empOptions}
              </select>`
            : `<select class="form-select form-select-sm" id="emp-topic-select">
                <option value="">Seleccionar tema...</option>
                <option value="CV">Elaboración de CV</option>
                <option value="LinkedIn">Perfil de LinkedIn</option>
                <option value="Portfolio">Portfolio / GitHub</option>
                <option value="Entrevista Técnica">Entrevista Técnica</option>
                <option value="Entrevista RRHH">Entrevista RRHH</option>
                <option value="Marca Personal">Marca Personal</option>
                <option value="Job Search">Búsqueda de empleo</option>
                <option value="Otro">Otro</option>
              </select>`;

        _showInlineForm('ficha-emp-sessions-list', `
            <div class="card border-success mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Sesión de empleabilidad</label>
                            ${topicField}
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Fecha</label>
                            <input type="date" class="form-control form-control-sm" id="emp-date" value="${_todayISO()}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold">Asistencia</label>
                            <select class="form-select form-select-sm" id="emp-attended">
                                <option value="true">Sí asistió</option>
                                <option value="false">No asistió</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold"><i class="bi bi-file-person me-1"></i>CV (link)</label>
                            <input type="url" class="form-control form-control-sm" id="emp-cv" placeholder="https://...">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold"><i class="bi bi-globe me-1"></i>Portfolio (link)</label>
                            <input type="url" class="form-control form-control-sm" id="emp-portfolio" placeholder="https://...">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold"><i class="bi bi-linkedin me-1"></i>LinkedIn (link)</label>
                            <input type="url" class="form-control form-control-sm" id="emp-linkedin" placeholder="https://linkedin.com/in/...">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Notas</label>
                            <textarea class="form-control form-control-sm" id="emp-notes" rows="2" placeholder="Observaciones..."></textarea>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-emp-sessions-list')">Cancelar</button>
                        <button class="btn btn-sm btn-success" onclick="window.StudentTracking._saveEmpSession()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveEmpSession() {
        const selectEl = document.getElementById('emp-topic-select');
        let topic = '';
        if (selectEl.tagName === 'SELECT') {
            const val = selectEl.value;
            if (!val) { _showToast('Selecciona una sesión de empleabilidad', 'warning'); return; }
            // If using promotion employability, get the name from the array
            const idx = parseInt(val);
            topic = !isNaN(idx) && _promotionEmployability[idx] ? _promotionEmployability[idx].name : val;
        } else {
            topic = selectEl.value.trim();
        }
        if (!topic) { _showToast('El tema de la sesión es obligatorio', 'warning'); return; }
        const sessionDate = document.getElementById('emp-date')?.value || _todayISO();
        const attended = document.getElementById('emp-attended')?.value === 'true';
        const cvLink = document.getElementById('emp-cv')?.value?.trim() || '';
        const portfolioLink = document.getElementById('emp-portfolio')?.value?.trim() || '';
        const linkedinLink = document.getElementById('emp-linkedin')?.value?.trim() || '';
        const notes = document.getElementById('emp-notes')?.value?.trim() || '';
        _employabilitySessions.push({ topic, sessionDate, attended, cvLink, portfolioLink, linkedinLink, notes });
        _markUnsaved('transversal');
        _renderEmpSessions();
        _cancelInlineForm('ficha-emp-sessions-list');
    }

    function _removeEmpSession(i) {
        _employabilitySessions.splice(i, 1);
        _markUnsaved('transversal');
        _renderEmpSessions();
    }

    // ─── Renderizado: Sesiones individuales ───────────────────────────────────

    function _renderIndSessions() {
        const container = document.getElementById('ficha-ind-sessions-list');
        if (!container) return;
        if (!_individualSessions.length) {
            container.innerHTML = _emptyState('person-workspace', 'Sin sesiones individuales registradas');
            return;
        }
        container.innerHTML = _individualSessions.map((s, i) => `
            <div class="card mb-2 border-start border-4 border-primary">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-semibold"><i class="bi bi-person-workspace text-primary me-1"></i>${_esc(s.topic || 'Sesión individual')}</div>
                            <small class="text-muted"><i class="bi bi-calendar3 me-1"></i>${_fmtDate(s.sessionDate)}</small>
                            ${s.notes ? `<p class="mt-1 mb-0 small fst-italic">${_esc(s.notes)}</p>` : ''}
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="window.StudentTracking._removeIndSession(${i})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openIndSessionForm() {
        _showInlineForm('ficha-ind-sessions-list', `
            <div class="card border-primary mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Tema / motivo</label>
                            <input type="text" class="form-control form-control-sm" id="ind-topic" placeholder="Ej: Orientación, dificultades técnicas...">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Fecha</label>
                            <input type="date" class="form-control form-control-sm" id="ind-date" value="${_todayISO()}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Notas</label>
                            <textarea class="form-control form-control-sm" id="ind-notes" rows="2" placeholder="Notas de la sesión..."></textarea>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-ind-sessions-list')">Cancelar</button>
                        <button class="btn btn-sm btn-primary" onclick="window.StudentTracking._saveIndSession()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveIndSession() {
        const topic = document.getElementById('ind-topic')?.value?.trim() || '';
        const sessionDate = document.getElementById('ind-date')?.value || _todayISO();
        const notes = document.getElementById('ind-notes')?.value?.trim() || '';
        _individualSessions.push({ topic, sessionDate, notes });
        _markUnsaved('transversal');
        _renderIndSessions();
        _cancelInlineForm('ficha-ind-sessions-list');
    }

    function _removeIndSession(i) {
        _individualSessions.splice(i, 1);
        _markUnsaved('transversal');
        _renderIndSessions();
    }

    // ─── Renderizado: Incidencias ─────────────────────────────────────────────

    function _renderIncidents() {
        const container = document.getElementById('ficha-incidents-list');
        if (!container) return;
        if (!_incidents.length) {
            container.innerHTML = _emptyState('shield-check', 'Sin incidencias registradas');
            return;
        }
        const severityColors = { baja: 'info', media: 'warning', alta: 'danger' };
        container.innerHTML = _incidents.map((inc, i) => `
            <div class="card mb-2 border-start border-4 border-${severityColors[inc.severity] || 'secondary'}">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2">
                                <span class="fw-semibold"><i class="bi bi-exclamation-triangle-fill text-${severityColors[inc.severity] || 'secondary'} me-1"></i>${_esc(inc.type || '—')}</span>
                                <span class="badge bg-${inc.resolved ? 'success' : 'warning text-dark'}">${inc.resolved ? 'Resuelta' : 'Pendiente'}</span>
                            </div>
                            <p class="mb-1 small text-muted">${_esc(inc.description || '')}</p>
                            <small class="text-muted">
                                <i class="bi bi-calendar3 me-1"></i>${_fmtDate(inc.incidentDate)}
                                ${inc.resolved && inc.resolutionDate ? `&nbsp;→ Resuelta: ${_fmtDate(inc.resolutionDate)}` : ''}
                            </small>
                        </div>
                        <div class="d-flex gap-1 ms-2">
                            ${!inc.resolved ? `<button class="btn btn-sm btn-outline-success py-0" onclick="window.StudentTracking._resolveIncident(${i})" title="Marcar como resuelta"><i class="bi bi-check-lg"></i></button>` : ''}
                            <button class="btn btn-sm btn-link text-danger p-0" onclick="window.StudentTracking._removeIncident(${i})"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openIncidentForm() {
        const typeOptions = INCIDENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
        _showInlineForm('ficha-incidents-list', `
            <div class="card border-danger mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Tipo de incidencia</label>
                            <select class="form-select form-select-sm" id="inc-type">
                                ${typeOptions}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Severidad</label>
                            <select class="form-select form-select-sm" id="inc-severity">
                                <option value="baja">Baja</option>
                                <option value="media" selected>Media</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold">Fecha</label>
                            <input type="date" class="form-control form-control-sm" id="inc-date" value="${_todayISO()}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Descripción</label>
                            <textarea class="form-control form-control-sm" id="inc-desc" rows="2" placeholder="Describe la incidencia..."></textarea>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-incidents-list')">Cancelar</button>
                        <button class="btn btn-sm btn-danger" onclick="window.StudentTracking._saveIncident()">Registrar</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveIncident() {
        const type = document.getElementById('inc-type')?.value || '';
        const severity = document.getElementById('inc-severity')?.value || 'media';
        const incidentDate = document.getElementById('inc-date')?.value || _todayISO();
        const description = document.getElementById('inc-desc')?.value?.trim() || '';
        if (!description) { _showToast('La descripción es obligatoria', 'warning'); return; }
        _incidents.push({ type, severity, incidentDate, description, resolved: false });
        _markUnsaved('transversal');
        _renderIncidents();
        _cancelInlineForm('ficha-incidents-list');
    }

    function _resolveIncident(i) {
        _incidents[i].resolved = true;
        _incidents[i].resolutionDate = _todayISO();
        _markUnsaved('transversal');
        _renderIncidents();
    }

    function _removeIncident(i) {
        _incidents.splice(i, 1);
        _markUnsaved('transversal');
        _renderIncidents();
    }

    // ─── Formulario inline helper ─────────────────────────────────────────────

    function _showInlineForm(containerId, html, prepend = false) {
        const container = document.getElementById(containerId);
        if (!container) return;
        // Eliminar formulario previo si existe
        const prev = container.querySelector('.inline-form-wrapper');
        if (prev) prev.remove();
        const wrapper = document.createElement('div');
        wrapper.className = 'inline-form-wrapper';
        wrapper.innerHTML = html;
        if (prepend) container.prepend(wrapper);
        else container.append(wrapper);
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function _cancelInlineForm(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const wrapper = container.querySelector('.inline-form-wrapper');
        if (wrapper) wrapper.remove();
    }

    // ─── Persistencia (API calls) ─────────────────────────────────────────────

    async function _savePersonal() {
        const token = localStorage.getItem('token');
        const payload = {
            name: document.getElementById('fp-name')?.value?.trim(),
            lastname: document.getElementById('fp-lastname')?.value?.trim(),
            email: document.getElementById('fp-email')?.value?.trim(),
            phone: document.getElementById('fp-phone')?.value?.trim(),
            age: parseInt(document.getElementById('fp-age')?.value) || null,
            administrativeSituation: document.getElementById('fp-admin-situation')?.value,
            nationality: document.getElementById('fp-nationality')?.value?.trim(),
            identificationDocument: document.getElementById('fp-document')?.value?.trim(),
            gender: document.getElementById('fp-gender')?.value,
            englishLevel: document.getElementById('fp-english-level')?.value,
            educationLevel: document.getElementById('fp-education-level')?.value,
            profession: document.getElementById('fp-profession')?.value?.trim(),
            community: document.getElementById('fp-community')?.value,
        };

        // Validación de obligatorios
        const required = ['name', 'lastname', 'email', 'phone', 'administrativeSituation'];
        const missing = required.filter(f => !payload[f]);
        if (missing.length || !payload.age) {
            _showToast('Completa todos los campos obligatorios (*)', 'warning');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${_currentStudentId}/ficha/personal`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
            const updated = await res.json();
            _currentStudent = { ..._currentStudent, ...payload };
            // Actualizar nombre en el subtítulo
            const sub = document.getElementById('ficha-student-subtitle');
            if (sub) sub.textContent = `${payload.name} ${payload.lastname} — ${payload.email}`;
            // Actualizar la tabla de estudiantes si está visible
            _syncStudentInTable(updated.student || _currentStudent);
            _showToast('Datos personales guardados correctamente ✓');
        } catch (e) {
            console.error('[StudentTracking] savePersonal error:', e);
            _showToast(e.message || 'Error al guardar datos personales', 'danger');
        }
    }

    async function _saveTechnical() {
        const token = localStorage.getItem('token');
        const payload = {
            teacherNotes: _teacherNotes,
            teams: _teams,
            competences: _competences,
            completedModules: _completedModules
            // completedPildoras se deriva automáticamente de ExtendedInfo, no se persiste aquí
        };
        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${_currentStudentId}/ficha/technical`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
            _markSaved('technical');
            _showToast('Seguimiento técnico guardado ✓');
        } catch (e) {
            console.error('[StudentTracking] saveTechnical error:', e);
            _showToast(e.message || 'Error al guardar seguimiento técnico', 'danger');
        }
    }

    async function _saveTransversal() {
        const token = localStorage.getItem('token');
        const payload = {
            employabilitySessions: _employabilitySessions,
            individualSessions: _individualSessions,
            incidents: _incidents
        };
        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${_currentStudentId}/ficha/transversal`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
            _markSaved('transversal');
            _showToast('Seguimiento transversal guardado ✓');
        } catch (e) {
            console.error('[StudentTracking] saveTransversal error:', e);
            _showToast(e.message || 'Error al guardar seguimiento transversal', 'danger');
        }
    }

    // Actualiza la fila del estudiante en la tabla de students sin recargar la página
    function _syncStudentInTable(student) {
        if (!window.currentStudents) return;
        const idx = window.currentStudents.findIndex(s => s.id === _currentStudentId || s._id === _currentStudentId);
        if (idx !== -1) {
            window.currentStudents[idx] = { ...window.currentStudents[idx], ...student };
            // Refrescar sólo si displayStudents está disponible
            if (typeof window.displayStudents === 'function') {
                window.displayStudents(window.currentStudents);
            }
        }
    }

    // ─── Utilidades ───────────────────────────────────────────────────────────

    function _esc(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function _fmtDate(dateStr) {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    }

    // ─── API pública ──────────────────────────────────────────────────────────

    window.StudentTracking = {
        init,
        openFicha,
        // Exponer internos necesarios por onclick en HTML generado dinámicamente
        _openNoteForm, _saveNote, _removeNote,
        _openTeamForm, _saveTeam, _removeTeam,
        _openCompetenceForm, _saveCompetence, _removeCompetence,
        _openModuleForm, _saveModule, _removeModule,
        _openEmpSessionForm, _saveEmpSession, _removeEmpSession,
        _openIndSessionForm, _saveIndSession, _removeIndSession,
        _openIncidentForm, _saveIncident, _resolveIncident, _removeIncident,
        _cancelInlineForm,
        _saveTechnical, _saveTransversal
    };

})(window);
