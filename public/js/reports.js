/**
 * reports.js
 * PDF Report generation via print-window technique
 * 4 report types:
 *   1. Ficha Seguimiento Técnico   (per student)
 *   2. Ficha Seguimiento Transversal (per student)
 *   3. Acta de Inicio               (program-level)
 *   4. Descripción Técnica Formación (full bootcamp)
 */

(function (window) {
    'use strict';

    const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;

    // ─── Brand colours (Factoría F5 palette) ────────────────────────────────
    const PRIMARY   = '#FF6B35';   // orange
    const DARK      = '#1A1A2E';   // dark navy
    const SECONDARY = '#4A4A6A';   // muted purple-grey
    const LIGHT_BG  = '#F8F9FA';
    const BORDER    = '#DEE2E6';

    // ─── Shared print CSS ────────────────────────────────────────────────────
    function _baseCss() {
        return `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @page { margin: 18mm 16mm 18mm 16mm; size: A4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 10pt; color: #222; line-height: 1.5; background:#fff; }
        h1 { font-size: 18pt; font-weight: 700; color: ${DARK}; }
        h2 { font-size: 14pt; font-weight: 600; color: ${DARK}; margin-top: 14pt; margin-bottom: 6pt; }
        h3 { font-size: 11pt; font-weight: 600; color: ${PRIMARY}; margin-top: 10pt; margin-bottom: 4pt; border-bottom: 1.5px solid ${PRIMARY}; padding-bottom: 2pt; }
        h4 { font-size: 10pt; font-weight: 600; color: ${SECONDARY}; margin-top: 8pt; margin-bottom: 3pt; }
        p  { margin-bottom: 5pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; font-size: 9.5pt; }
        th { background: ${DARK}; color: #fff; padding: 5pt 7pt; text-align: left; font-weight: 600; }
        td { padding: 5pt 7pt; border-bottom: 1px solid ${BORDER}; vertical-align: top; }
        tr:nth-child(even) td { background: ${LIGHT_BG}; }
        .badge {
            display: inline-block; padding: 2pt 6pt; border-radius: 10pt;
            font-size: 8pt; font-weight: 600; line-height: 1.3;
        }
        .badge-orange  { background: ${PRIMARY}; color: #fff; }
        .badge-dark    { background: ${DARK}; color: #fff; }
        .badge-green   { background: #198754; color: #fff; }
        .badge-blue    { background: #0d6efd; color: #fff; }
        .badge-red     { background: #dc3545; color: #fff; }
        .badge-yellow  { background: #ffc107; color: #000; }
        .badge-grey    { background: #6c757d; color: #fff; }
        .badge-info    { background: #0dcaf0; color: #000; }
        .badge-light   { background: #e9ecef; color: #333; border: 1px solid #ccc; }
        .section-box {
            border: 1px solid ${BORDER}; border-radius: 6pt;
            padding: 10pt 12pt; margin-bottom: 10pt;
            break-inside: avoid;
        }
        .section-box.accent { border-left: 4px solid ${PRIMARY}; }
        .section-box.green  { border-left: 4px solid #198754; }
        .section-box.blue   { border-left: 4px solid #0d6efd; }
        .section-box.red    { border-left: 4px solid #dc3545; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
        .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }
        .kv { margin-bottom: 3pt; }
        .kv strong { color: ${SECONDARY}; }
        .empty-note { color: #aaa; font-style: italic; font-size: 9pt; }
        .pill-row { display: flex; flex-wrap: wrap; gap: 4pt; margin-top: 3pt; }
        .page-break { page-break-before: always; }
        .no-break { break-inside: avoid; }
        `;
    }

    // ─── Header banner ───────────────────────────────────────────────────────
    function _header(title, subtitle, promotionName, date) {
        return `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;
                    border-bottom: 3px solid ${PRIMARY}; padding-bottom: 10pt; margin-bottom: 14pt;">
            <div>
                <div style="font-size:8pt; color:${PRIMARY}; font-weight:700; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:4pt;">
                    Factoría F5 · Bootcamp Manager
                </div>
                <h1>${_esc(title)}</h1>
                ${subtitle ? `<div style="font-size:11pt; color:${SECONDARY}; margin-top:3pt;">${_esc(subtitle)}</div>` : ''}
                ${promotionName ? `<div style="font-size:9pt; color:#888; margin-top:3pt;">Promoción: <strong>${_esc(promotionName)}</strong></div>` : ''}
            </div>
            <div style="text-align:right; font-size:9pt; color:#888; min-width:100pt;">
                <div>${_esc(date)}</div>
                <div style="margin-top:4pt;">
                    <span style="display:inline-block; width:28pt; height:3pt; background:${PRIMARY}; border-radius:2pt;"></span>
                    <span style="display:inline-block; width:14pt; height:3pt; background:${DARK}; border-radius:2pt; margin-left:2pt;"></span>
                </div>
            </div>
        </div>`;
    }

    // ─── Footer ──────────────────────────────────────────────────────────────
    function _footer() {
        return `
        <div style="margin-top:20pt; padding-top:8pt; border-top:1px solid ${BORDER};
                    font-size:8pt; color:#aaa; display:flex; justify-content:space-between;">
            <span>Factoría F5 – Bootcamp Manager</span>
            <span>Generado el ${new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'long',year:'numeric'})}</span>
        </div>`;
    }

    // ─── Open a print window ─────────────────────────────────────────────────
    function _printWindow(htmlContent) {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) { alert('El navegador bloqueó la ventana emergente. Permite los popups para este sitio.'); return; }
        win.document.write(`<!DOCTYPE html><html lang="es"><head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Informe – Bootcamp Manager</title>
            <style>${_baseCss()}</style>
        </head><body>${htmlContent}${_footer()}</body></html>`);
        win.document.close();
        win.onload = () => { win.focus(); win.print(); };
    }

    // ─── Escape helper ───────────────────────────────────────────────────────
    function _esc(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function _fmtDate(d) {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return String(d); }
    }

    function _today() {
        return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function _levelBadge(level) {
        const map = { 0: ['grey','Sin nivel'], 1: ['red','Básico'], 2: ['yellow','Medio'], 3: ['green','Avanzado'],
                      4: ['blue','Excelente'] };
        const [cls, label] = map[level] || ['grey', `Nv.${level}`];
        return `<span class="badge badge-${cls}">Nv.${level ?? '—'} ${label}</span>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. FICHA SEGUIMIENTO TÉCNICO
    // ════════════════════════════════════════════════════════════════════════
    async function printTechnical(studentId, promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [stuRes, promoRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}`,                       { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!stuRes.ok) throw new Error('No se pudo cargar el estudiante');
            const s   = await stuRes.json();
            const promo = promoRes.ok ? await promoRes.json() : {};
            const tt  = s.technicalTracking || {};
            const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();

            let html = _header(
                'Ficha de Seguimiento Técnico',
                fullName,
                promo.name,
                _today()
            );

            // ── Datos personales resumidos ──
            html += `<div class="section-box accent row2">
                <div>
                    <div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
                    <div class="kv"><strong>Teléfono:</strong> ${_esc(s.phone || '—')}</div>
                    <div class="kv"><strong>Edad:</strong> ${_esc(s.age || '—')}</div>
                    <div class="kv"><strong>Sit. Administrativa:</strong> ${_esc(s.administrativeSituation || '—')}</div>
                </div>
                <div>
                    <div class="kv"><strong>Nacionalidad:</strong> ${_esc(s.nationality || '—')}</div>
                    <div class="kv"><strong>Nivel Inglés:</strong> ${_esc(s.englishLevel || '—')}</div>
                    <div class="kv"><strong>Nivel Educativo:</strong> ${_esc(s.educationLevel || '—')}</div>
                    <div class="kv"><strong>Profesión:</strong> ${_esc(s.profession || '—')}</div>
                </div>
            </div>`;

            // ── Notas del profesor ──
            html += `<h3><span style="color:${PRIMARY}">✦</span> Notas del Profesor</h3>`;
            const notes = tt.teacherNotes || [];
            if (notes.length) {
                html += `<table><thead><tr><th>Fecha</th><th>Nota</th></tr></thead><tbody>`;
                notes.forEach(n => {
                    html += `<tr><td style="white-space:nowrap;">${_fmtDate(n.createdAt || n.date)}</td><td>${_esc(n.note || n.text || '')}</td></tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin notas registradas.</p>`;
            }

            // ── Proyectos realizados ──
            html += `<h3><span style="color:${PRIMARY}">✦</span> Proyectos Realizados</h3>`;
            const teams = tt.teams || [];
            if (teams.length) {
                teams.forEach(t => {
                    const typeBadge = t.projectType === 'individual'
                        ? `<span class="badge badge-info">Individual</span>`
                        : `<span class="badge badge-green">Grupal</span>`;
                    const members = (t.members || []).map(m => _esc(m.name)).join(', ');
                    const comps   = t.competences || [];
                    html += `<div class="section-box green no-break">
                        <div style="display:flex; align-items:center; gap:8pt; margin-bottom:5pt;">
                            <strong style="font-size:11pt;">${_esc(t.teamName || 'Proyecto')}</strong>
                            ${typeBadge}
                        </div>
                        <div class="kv"><strong>Módulo:</strong> ${_esc(t.moduleName || '—')}</div>
                        ${members ? `<div class="kv"><strong>Compañeros:</strong> ${members}</div>` : ''}
                        ${comps.length ? `
                        <div style="margin-top:6pt;">
                            <strong style="font-size:9pt; color:${SECONDARY};">Competencias trabajadas:</strong>
                            ${comps.map(c => {
                                const tools = (c.toolsUsed || []).map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`).join(' ');
                                return `<div style="margin-top:4pt;">${_levelBadge(c.level)} <strong>${_esc(c.competenceName)}</strong>
                                    ${tools ? `<span style="margin-left:4pt;">${tools}</span>` : ''}</div>`;
                            }).join('')}
                        </div>` : ''}
                    </div>`;
                });
            } else {
                html += `<p class="empty-note">Sin proyectos registrados.</p>`;
            }

            // ── Módulos completados ──
            html += `<h3><span style="color:${PRIMARY}">✦</span> Módulos Completados</h3>`;
            const mods = tt.completedModules || [];
            if (mods.length) {
                html += `<table><thead><tr><th>Módulo</th><th>Fecha</th><th>Nota</th><th>Observaciones</th></tr></thead><tbody>`;
                mods.forEach(m => {
                    const gradeMap = { 1: 'Insuficiente', 2: 'Básico', 3: 'Competente', 4: 'Excelente' };
                    html += `<tr>
                        <td>${_esc(m.moduleName || '—')}</td>
                        <td>${_fmtDate(m.completionDate)}</td>
                        <td>${gradeMap[m.finalGrade] || m.finalGrade || '—'}</td>
                        <td>${_esc(m.notes || '')}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin módulos completados.</p>`;
            }

            // ── Píldoras presentadas ──
            html += `<h3><span style="color:${PRIMARY}">✦</span> Píldoras Presentadas</h3>`;
            const pildoras = tt.completedPildoras || [];
            if (pildoras.length) {
                html += `<table><thead><tr><th>Título</th><th>Módulo</th><th>Fecha</th></tr></thead><tbody>`;
                pildoras.forEach(p => {
                    html += `<tr>
                        <td>${_esc(p.pildoraTitle || '—')}</td>
                        <td>${_esc(p.moduleName || '—')}</td>
                        <td>${_fmtDate(p.date)}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin píldoras presentadas.</p>`;
            }

            _printWindow(html);
        } catch (e) {
            console.error('[Reports] printTechnical:', e);
            alert('Error generando el informe técnico: ' + e.message);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. FICHA SEGUIMIENTO TRANSVERSAL
    // ════════════════════════════════════════════════════════════════════════
    async function printTransversal(studentId, promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [stuRes, promoRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}`,                       { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!stuRes.ok) throw new Error('No se pudo cargar el estudiante');
            const s     = await stuRes.json();
            const promo = promoRes.ok ? await promoRes.json() : {};
            const tr    = s.transversalTracking || {};
            const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();

            let html = _header(
                'Ficha de Seguimiento Transversal',
                fullName,
                promo.name,
                _today()
            );

            // ── Datos personales resumidos ──
            html += `<div class="section-box accent row2">
                <div>
                    <div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
                    <div class="kv"><strong>Edad:</strong> ${_esc(s.age || '—')}</div>
                    <div class="kv"><strong>Género:</strong> ${_esc(s.gender || '—')}</div>
                    <div class="kv"><strong>Sit. Administrativa:</strong> ${_esc(s.administrativeSituation || '—')}</div>
                </div>
                <div>
                    <div class="kv"><strong>Nacionalidad:</strong> ${_esc(s.nationality || '—')}</div>
                    <div class="kv"><strong>Nivel Educativo:</strong> ${_esc(s.educationLevel || '—')}</div>
                    <div class="kv"><strong>Comunidad:</strong> ${_esc(s.community || '—')}</div>
                    <div class="kv"><strong>Profesión:</strong> ${_esc(s.profession || '—')}</div>
                </div>
            </div>`;

            // ── Sesiones empleabilidad ──
            html += `<h3><span style="color:${PRIMARY}">✦</span> Sesiones de Empleabilidad</h3>`;
            const empSessions = tr.employabilitySessions || [];
            if (empSessions.length) {
                html += `<table><thead><tr><th>Fecha</th><th>Tema</th><th>Notas</th></tr></thead><tbody>`;
                empSessions.forEach(s2 => {
                    html += `<tr><td>${_fmtDate(s2.date)}</td><td>${_esc(s2.topic || '—')}</td><td>${_esc(s2.notes || '')}</td></tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin sesiones de empleabilidad registradas.</p>`;
            }

            // ── Sesiones individuales ──
            html += `<h3><span style="color:${PRIMARY}">✦</span> Sesiones Individuales</h3>`;
            const indSessions = tr.individualSessions || [];
            if (indSessions.length) {
                html += `<table><thead><tr><th>Fecha</th><th>Tema</th><th>Notas</th></tr></thead><tbody>`;
                indSessions.forEach(s2 => {
                    html += `<tr><td>${_fmtDate(s2.date)}</td><td>${_esc(s2.topic || '—')}</td><td>${_esc(s2.notes || '')}</td></tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin sesiones individuales registradas.</p>`;
            }

            // ── Incidencias ──
            html += `<h3><span style="color:${PRIMARY}">✦</span> Incidencias</h3>`;
            const incidents = tr.incidents || [];
            if (incidents.length) {
                html += `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>`;
                incidents.forEach(inc => {
                    const estado = inc.resolved
                        ? `<span class="badge badge-green">Resuelta</span>`
                        : `<span class="badge badge-red">Pendiente</span>`;
                    html += `<tr>
                        <td style="white-space:nowrap;">${_fmtDate(inc.date)}</td>
                        <td>${_esc(inc.type || '—')}</td>
                        <td>${_esc(inc.description || '')}</td>
                        <td>${estado}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin incidencias registradas.</p>`;
            }

            _printWindow(html);
        } catch (e) {
            console.error('[Reports] printTransversal:', e);
            alert('Error generando el informe transversal: ' + e.message);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. ACTA DE INICIO
    // ════════════════════════════════════════════════════════════════════════
    async function printActaInicio(promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [promoRes, extRes, studentsRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`,              { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`),
                fetch(`${API_URL}/api/promotions/${promotionId}/students`,     { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!promoRes.ok) throw new Error('No se pudo cargar la promoción');
            const promo    = await promoRes.json();
            const ext      = extRes.ok ? await extRes.json() : {};
            const students = studentsRes.ok ? await studentsRes.json() : [];

            const sched = ext.schedule || {};
            const team  = ext.team || [];

            let html = _header(
                'Acta de Inicio',
                promo.name,
                null,
                _today()
            );

            // ── 1. Datos del programa ──
            html += `<h3>1. Datos del Programa</h3>
            <div class="section-box accent row3">
                <div class="kv"><strong>Nombre:</strong><br>${_esc(promo.name)}</div>
                <div class="kv"><strong>Fecha inicio:</strong><br>${_esc(promo.startDate || '—')}</div>
                <div class="kv"><strong>Fecha fin:</strong><br>${_esc(promo.endDate || '—')}</div>
                <div class="kv"><strong>Duración:</strong><br>${_esc(promo.weeks || '—')} semanas</div>
                <div class="kv"><strong>Nº de coders:</strong><br>${students.length}</div>
                <div class="kv"><strong>Módulos:</strong><br>${(promo.modules || []).length}</div>
            </div>`;

            if (promo.description) {
                html += `<div class="section-box" style="margin-top:0;"><p>${_esc(promo.description)}</p></div>`;
            }

            // ── 2. Equipo formativo ──
            html += `<h3>2. Equipo Formativo</h3>`;
            if (team.length) {
                html += `<table><thead><tr><th>Nombre</th><th>Rol</th><th>Email</th><th>LinkedIn</th></tr></thead><tbody>`;
                team.forEach(m => {
                    html += `<tr>
                        <td>${_esc(m.name || '—')}</td>
                        <td>${_esc(m.role || '—')}</td>
                        <td>${_esc(m.email || '—')}</td>
                        <td>${m.linkedin ? `<a href="${_esc(m.linkedin)}">${_esc(m.linkedin)}</a>` : '—'}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin equipo formativo registrado.</p>`;
            }

            // ── 3. Horario ──
            html += `<h3>3. Horario</h3>
            <div class="row2">
                <div class="section-box blue">
                    <h4>Días Online</h4>
                    <div class="kv"><strong>Entrada:</strong> ${_esc(sched.online?.entry || '—')}</div>
                    <div class="kv"><strong>Inicio píldoras:</strong> ${_esc(sched.online?.start || '—')}</div>
                    <div class="kv"><strong>Descanso:</strong> ${_esc(sched.online?.break || '—')}</div>
                    <div class="kv"><strong>Comida:</strong> ${_esc(sched.online?.lunch || '—')}</div>
                    <div class="kv"><strong>Salida:</strong> ${_esc(sched.online?.finish || '—')}</div>
                </div>
                <div class="section-box green">
                    <h4>Días Presenciales</h4>
                    <div class="kv"><strong>Entrada:</strong> ${_esc(sched.presential?.entry || '—')}</div>
                    <div class="kv"><strong>Inicio píldoras:</strong> ${_esc(sched.presential?.start || '—')}</div>
                    <div class="kv"><strong>Descanso:</strong> ${_esc(sched.presential?.break || '—')}</div>
                    <div class="kv"><strong>Comida:</strong> ${_esc(sched.presential?.lunch || '—')}</div>
                    <div class="kv"><strong>Salida:</strong> ${_esc(sched.presential?.finish || '—')}</div>
                </div>
            </div>`;
            if (sched.notes) {
                html += `<div class="section-box"><p><strong>Notas:</strong> ${_esc(sched.notes)}</p></div>`;
            }

            // ── 4. Lista de participantes ──
            html += `<h3>4. Lista de Participantes</h3>`;
            if (students.length) {
                html += `<table><thead><tr>
                    <th>#</th><th>Nombre completo</th><th>Email</th>
                    <th>Nacionalidad</th><th>Sit. Administrativa</th>
                    <th>Firma</th>
                </tr></thead><tbody>`;
                students.forEach((s, i) => {
                    html += `<tr>
                        <td>${i + 1}</td>
                        <td>${_esc((s.name || '') + ' ' + (s.lastname || ''))}</td>
                        <td>${_esc(s.email || '—')}</td>
                        <td>${_esc(s.nationality || '—')}</td>
                        <td>${_esc(s.administrativeSituation || '—')}</td>
                        <td style="width:80pt;"></td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin participantes registrados.</p>`;
            }

            // ── 5. Firma del equipo formativo ──
            html += `<h3 style="margin-top:14pt;">5. Firmas del Equipo Formativo</h3>
            <div style="display:grid; grid-template-columns: repeat(${Math.min(team.length || 2, 3)}, 1fr); gap:12pt; margin-top:8pt;">`;
            if (team.length) {
                team.forEach(m => {
                    html += `<div class="section-box no-break" style="min-height:60pt;">
                        <div style="font-size:9pt; color:${SECONDARY};">${_esc(m.role || '')}</div>
                        <div style="font-weight:600; margin-bottom:4pt;">${_esc(m.name || '')}</div>
                        <div style="border-bottom:1px solid #999; height:30pt; margin-top:8pt;"></div>
                        <div style="font-size:8pt; color:#aaa; margin-top:3pt;">Firma</div>
                    </div>`;
                });
            } else {
                for (let i = 0; i < 2; i++) {
                    html += `<div class="section-box no-break" style="min-height:60pt;">
                        <div style="border-bottom:1px solid #999; height:30pt; margin-top:8pt;"></div>
                        <div style="font-size:8pt; color:#aaa; margin-top:3pt;">Firma</div>
                    </div>`;
                }
            }
            html += `</div>`;

            _printWindow(html);
        } catch (e) {
            console.error('[Reports] printActaInicio:', e);
            alert('Error generando el Acta de Inicio: ' + e.message);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. DESCRIPCIÓN TÉCNICA DE FORMACIÓN
    // ════════════════════════════════════════════════════════════════════════
    async function printDescripcionTecnica(promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [promoRes, extRes, competencesRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`,              { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`),
                fetch(`${API_URL}/api/competences`,                            { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!promoRes.ok) throw new Error('No se pudo cargar la promoción');
            const promo       = await promoRes.json();
            const ext         = extRes.ok ? await extRes.json() : {};
            const allComps    = competencesRes.ok ? await competencesRes.json() : [];
            const modules     = promo.modules || [];
            const extComps    = ext.competences || [];
            const team        = ext.team || [];
            const resources   = ext.resources || [];
            const evaluation  = ext.evaluation || '';
            const sched       = ext.schedule || {};

            let html = _header(
                'Descripción Técnica de la Formación',
                promo.name,
                null,
                _today()
            );

            // ── 1. Presentación ──
            html += `<h3>1. Presentación del Programa</h3>
            <div class="section-box accent row3">
                <div class="kv"><strong>Nombre:</strong><br>${_esc(promo.name)}</div>
                <div class="kv"><strong>Inicio:</strong><br>${_esc(promo.startDate || '—')}</div>
                <div class="kv"><strong>Fin:</strong><br>${_esc(promo.endDate || '—')}</div>
                <div class="kv"><strong>Duración:</strong><br>${_esc(promo.weeks || '—')} semanas</div>
                <div class="kv"><strong>Nº módulos:</strong><br>${modules.length}</div>
                <div class="kv"><strong>Equipo:</strong><br>${team.length} persona(s)</div>
            </div>
            ${promo.description ? `<p>${_esc(promo.description)}</p>` : ''}`;

            // ── 2. Equipo formativo ──
            html += `<h3>2. Equipo Formativo</h3>`;
            if (team.length) {
                html += `<table><thead><tr><th>Nombre</th><th>Rol</th><th>Email</th></tr></thead><tbody>`;
                team.forEach(m => {
                    html += `<tr><td>${_esc(m.name || '—')}</td><td>${_esc(m.role || '—')}</td><td>${_esc(m.email || '—')}</td></tr>`;
                });
                html += `</tbody></table>`;
            } else { html += `<p class="empty-note">Sin equipo registrado.</p>`; }

            // ── 3. Horario ──
            html += `<h3>3. Horario del Programa</h3>
            <div class="row2">
                <div class="section-box blue">
                    <h4>Online</h4>
                    ${['entry','start','break','lunch','finish'].map(k =>
                        sched.online?.[k] ? `<div class="kv"><strong>${_schedLabel(k)}:</strong> ${_esc(sched.online[k])}</div>` : ''
                    ).join('')}
                </div>
                <div class="section-box green">
                    <h4>Presencial</h4>
                    ${['entry','start','break','lunch','finish'].map(k =>
                        sched.presential?.[k] ? `<div class="kv"><strong>${_schedLabel(k)}:</strong> ${_esc(sched.presential[k])}</div>` : ''
                    ).join('')}
                </div>
            </div>`;

            // ── 4. Roadmap – módulos ──
            html += `<h3>4. Roadmap – Módulos y Contenidos</h3>`;
            if (modules.length) {
                modules.forEach((mod, idx) => {
                    const courses  = mod.courses  || [];
                    const projects = mod.projects || [];
                    const pildoras = mod.pildoras || [];
                    html += `<div class="section-box no-break" style="margin-bottom:8pt;">
                        <div style="display:flex; align-items:baseline; gap:8pt; margin-bottom:6pt;">
                            <span class="badge badge-orange">Módulo ${idx + 1}</span>
                            <strong style="font-size:11pt;">${_esc(mod.name)}</strong>
                            <span style="color:#888; font-size:9pt;">${mod.duration || '?'} semana(s)</span>
                        </div>`;

                    if (courses.length) {
                        html += `<div style="margin-bottom:5pt;"><strong style="font-size:9pt; color:${SECONDARY};">Cursos / Contenidos:</strong>
                            <ul style="margin:3pt 0 0 14pt; padding:0;">
                                ${courses.map(c => `<li>${_esc(c.name || '?')}${c.duration ? ` <span style="color:#aaa;">(${c.duration}d)</span>` : ''}</li>`).join('')}
                            </ul></div>`;
                    }
                    if (projects.length) {
                        html += `<div style="margin-bottom:5pt;"><strong style="font-size:9pt; color:${SECONDARY};">Proyectos:</strong>
                            <ul style="margin:3pt 0 0 14pt; padding:0;">
                                ${projects.map(p => `<li>${_esc(p.name || '?')}</li>`).join('')}
                            </ul></div>`;
                    }
                    if (pildoras.length) {
                        html += `<div><strong style="font-size:9pt; color:${SECONDARY};">Píldoras asignadas:</strong>
                            <span style="margin-left:6pt;">
                                ${pildoras.map(p => `<span class="badge badge-dark">${_esc(p.title || '?')}</span>`).join(' ')}
                            </span></div>`;
                    }
                    html += `</div>`;
                });
            } else { html += `<p class="empty-note">Sin módulos definidos.</p>`; }

            // ── 5. Competencias del programa ──
            html += `<div class="page-break"></div><h3>5. Competencias del Programa</h3>`;
            const compsToShow = extComps.length ? extComps : allComps;
            if (compsToShow.length) {
                compsToShow.forEach(c => {
                    const areaLabel = c.area || (c.areas && c.areas[0]?.name) || '';
                    const levels = c.levels || [];
                    const tools  = c.selectedTools || c.allTools || (c.tools || []).map(t => t.name || t) || [];
                    const startMod = c.startModule?.name || '';
                    html += `<div class="section-box no-break" style="margin-bottom:8pt;">
                        <div style="display:flex; align-items:baseline; gap:8pt; margin-bottom:4pt;">
                            ${areaLabel ? `<span class="badge badge-dark">${_esc(areaLabel)}</span>` : ''}
                            <strong>${_esc(c.name)}</strong>
                            ${startMod ? `<span style="color:#888; font-size:9pt;">desde: ${_esc(startMod)}</span>` : ''}
                        </div>
                        ${c.description ? `<p style="font-size:9pt; color:${SECONDARY}; margin-bottom:4pt;">${_esc(c.description)}</p>` : ''}
                        ${levels.length ? `
                        <table style="margin-bottom:0; font-size:8.5pt;">
                            <thead><tr><th style="width:60pt;">Nivel</th><th>Descripción</th><th>Indicadores</th></tr></thead>
                            <tbody>
                            ${levels.map(lv => `<tr>
                                <td><span class="badge badge-grey">Nv.${lv.level ?? lv.levelId ?? '?'}</span></td>
                                <td>${_esc(lv.description || lv.levelDescription || '')}</td>
                                <td>${(lv.indicators || []).map(ind =>
                                    `<div>• ${_esc(typeof ind === 'string' ? ind : ind.name || '')}</div>`
                                ).join('')}</td>
                            </tr>`).join('')}
                            </tbody>
                        </table>` : ''}
                        ${tools.length ? `<div class="pill-row" style="margin-top:5pt;">
                            <strong style="font-size:8.5pt; color:${SECONDARY};">Herramientas:</strong>
                            ${tools.map(t => `<span class="badge badge-light">${_esc(t)}</span>`).join('')}
                        </div>` : ''}
                    </div>`;
                });
            } else { html += `<p class="empty-note">Sin competencias definidas en el programa.</p>`; }

            // ── 6. Sesiones de empleabilidad ──
            const empItems = (ext.pildoras || []).filter(p => p.mode === 'employability')
                .concat(promo.employability || []);
            if (empItems.length || promo.employability?.length) {
                html += `<h3>6. Sesiones de Empleabilidad</h3>`;
                const emp = promo.employability || [];
                if (emp.length) {
                    html += `<table><thead><tr><th>Nombre</th><th>Mes inicio</th><th>Duración</th></tr></thead><tbody>`;
                    emp.forEach(e => {
                        html += `<tr><td>${_esc(e.name || '—')}</td><td>Mes ${e.startMonth || '—'}</td><td>${e.duration || '—'} sem.</td></tr>`;
                    });
                    html += `</tbody></table>`;
                }
            }

            // ── 7. Recursos y materiales ──
            html += `<h3>${empItems.length ? '7' : '6'}. Recursos y Materiales</h3>`;
            if (resources.length) {
                html += `<table><thead><tr><th>Título</th><th>Categoría</th><th>URL</th></tr></thead><tbody>`;
                resources.forEach(r => {
                    html += `<tr>
                        <td>${_esc(r.title || '—')}</td>
                        <td>${_esc(r.category || '—')}</td>
                        <td>${r.url ? `<a href="${_esc(r.url)}">${_esc(r.url)}</a>` : '—'}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else { html += `<p class="empty-note">Sin recursos registrados.</p>`; }

            // ── 8. Criterios de evaluación ──
            const secNum = empItems.length ? 8 : 7;
            html += `<h3>${secNum}. Criterios de Evaluación</h3>`;
            if (evaluation) {
                html += `<div class="section-box">
                    <pre style="white-space:pre-wrap; font-family:inherit; font-size:9.5pt;">${_esc(evaluation)}</pre>
                </div>`;
            } else { html += `<p class="empty-note">Sin criterios de evaluación definidos.</p>`; }

            _printWindow(html);
        } catch (e) {
            console.error('[Reports] printDescripcionTecnica:', e);
            alert('Error generando la Descripción Técnica: ' + e.message);
        }
    }

    function _schedLabel(key) {
        return { entry: 'Entrada', start: 'Inicio Píldoras', break: 'Descanso', lunch: 'Comida', finish: 'Salida' }[key] || key;
    }

    // ─── Public API ──────────────────────────────────────────────────────────
    window.Reports = {
        printTechnical,
        printTransversal,
        printActaInicio,
        printDescripcionTecnica
    };

})(window);
