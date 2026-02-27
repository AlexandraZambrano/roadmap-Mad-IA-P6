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

    // ─── html2pdf options ────────────────────────────────────────────────────
    // (kept only for _previewWindow which still uses html2pdf CDN loaded inside the popup)

    /** Wrap html in a full standalone document */
    function _wrapHtml(htmlContent) {
        return `<!DOCTYPE html><html lang="es"><head>
            <meta charset="UTF-8">
            <style>${_baseCss()}</style>
        </head><body style="margin:0;padding:12px 16px;background:#fff;">${htmlContent}${_footer()}</body></html>`;
    }

    /**
     * Core renderer: renders htmlContent inside a hidden iframe,
     * captures it with html2canvas, slices into A4 pages with jsPDF.
     * Returns Promise<jsPDF instance>.
     */
    function _renderToPdf(htmlContent, filename) {
        return new Promise((resolve, reject) => {
            if (!window.html2canvas || !window.jspdf) {
                reject(new Error('Librerías html2canvas / jsPDF no cargadas. Revisa tu conexión.'));
                return;
            }
            const { jsPDF } = window.jspdf;

            // Create a hidden iframe so the browser fully lays out the HTML
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:0;left:0;width:794px;height:1px;opacity:0;pointer-events:none;border:none;z-index:-1;';
            document.body.appendChild(iframe);

            // Write the full HTML document into the iframe
            iframe.contentDocument.open();
            iframe.contentDocument.write(_wrapHtml(htmlContent));
            iframe.contentDocument.close();

            // Give the browser time to finish layout/fonts
            const capture = () => {
                const iDoc = iframe.contentDocument;
                const body = iDoc.body;
                // Expand iframe to full content height so nothing is clipped
                const scrollH = Math.max(body.scrollHeight, body.offsetHeight, iDoc.documentElement.scrollHeight);
                iframe.style.height = scrollH + 'px';

                html2canvas(body, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 794,
                    scrollX: 0,
                    scrollY: 0,
                    width: body.scrollWidth,
                    height: scrollH
                }).then(canvas => {
                    document.body.removeChild(iframe);

                    const imgData = canvas.toDataURL('image/jpeg', 0.97);
                    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

                    const pageW  = pdf.internal.pageSize.getWidth();   // 210mm
                    const pageH  = pdf.internal.pageSize.getHeight();  // 297mm
                    const margin = 14; // mm

                    const usableW = pageW - margin * 2;
                    const usableH = pageH - margin * 2;

                    // Scale the canvas to fit the usable page width
                    const canvasMmW = usableW;
                    const canvasMmH = canvas.height * (usableW / canvas.width);

                    let yPos = 0; // position within canvas in mm
                    let firstPage = true;

                    while (yPos < canvasMmH) {
                        if (!firstPage) pdf.addPage();
                        firstPage = false;

                        // Clip: shift the image up by yPos so the current slice appears at top
                        pdf.addImage(
                            imgData, 'JPEG',
                            margin,           // x
                            margin - yPos,    // y  (negative shifts image upward)
                            canvasMmW,        // w
                            canvasMmH,        // h
                            undefined,
                            'FAST'
                        );

                        yPos += usableH;
                    }

                    pdf.setProperties({ title: filename || 'informe.pdf' });
                    resolve(pdf);
                }).catch(err => {
                    document.body.removeChild(iframe);
                    reject(err);
                });
            };

            // Wait for iframe load event, then a short extra tick for fonts
            if (iframe.contentDocument.readyState === 'complete') {
                setTimeout(capture, 300);
            } else {
                iframe.onload = () => setTimeout(capture, 300);
            }
        });
    }

    /** Directly download a single PDF. Returns a Promise. */
    async function _savePdf(htmlContent, filename) {
        const pdf = await _renderToPdf(htmlContent, filename);
        pdf.save(filename || 'informe.pdf');
    }

    /** Generate a PDF Blob without downloading it (for ZIP). Returns Promise<Blob>. */
    async function _getPdfBlob(htmlContent, filename) {
        const pdf = await _renderToPdf(htmlContent, filename);
        return pdf.output('blob');
    }

    /** Bundle multiple { blob, filename } objects into a ZIP and download it. */
    async function _zipAndDownload(files, zipName) {
        if (!window.JSZip) {
            alert('La librería JSZip no está cargada. Comprueba tu conexión a internet.');
            return;
        }
        const zip = new JSZip();
        files.forEach(({ blob, filename }) => zip.file(filename, blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = zipName || 'informes.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 1000);
    }

    /** Show a saving spinner overlay */
    function _showSaving(msg) {
        const existing = document.getElementById('_pdf-saving-overlay');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.id = '_pdf-saving-overlay';
        el.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(26,26,46,.7);z-index:99999;
                        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
                <div style="width:48px;height:48px;border:5px solid #FF6B35;border-top-color:transparent;
                            border-radius:50%;animation:spin .8s linear infinite;"></div>
                <div style="color:#fff;font-family:Inter,sans-serif;font-size:15px;">${msg || 'Generando PDF…'}</div>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            </div>`;
        document.body.appendChild(el);
    }

    function _hideSaving() {
        document.getElementById('_pdf-saving-overlay')?.remove();
    }

    // ─── Legacy preview window (kept ONLY for printProjectReport signature preview) ──
    function _previewWindow(htmlContent, filename) {
        const win = window.open('', '_blank', 'width=960,height=780');
        if (!win) { alert('El navegador bloqueó la ventana emergente. Permite los popups para este sitio.'); return; }

        const barCss = `
            #print-bar { position:fixed;top:0;left:0;right:0;z-index:9999;background:#1A1A2E;color:#fff;
                display:flex;align-items:center;justify-content:space-between;padding:10px 20px;gap:12px;
                font-family:'Inter',sans-serif;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.4); }
            .bar-logo{font-weight:700;color:#FF6B35;font-size:15px;}
            .bar-hint{color:#ccc;font-size:12px;}
            .btn-save{background:#FF6B35;color:#fff;border:none;border-radius:6px;padding:8px 20px;
                font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;}
            .btn-save:hover{background:#e05520;}
            .btn-cl{background:transparent;color:#aaa;border:1px solid #555;border-radius:6px;
                padding:7px 14px;font-size:12px;cursor:pointer;}
            .btn-cl:hover{color:#fff;border-color:#aaa;}
            @media print{#print-bar{display:none!important}}
            body{padding-top:56px;}
        `;

        // Encode filename for safe use in JS inside the popup
        const safeFilename = JSON.stringify(filename || 'informe-proyecto.pdf');

        win.document.write(`<!DOCTYPE html><html lang="es"><head>
            <meta charset="UTF-8">
            <title>Vista previa – Bootcamp Manager</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
            <style>${_baseCss()}${barCss}</style>
        </head><body>
            <div id="print-bar">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="bar-logo">Bootcamp Manager</span>
                    <span class="bar-hint">Vista previa · añade tu firma antes de guardar</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-save" onclick="savePdf()">⬇ Guardar PDF</button>
                    <button class="btn-cl" onclick="window.close()">Cerrar</button>
                </div>
            </div>
            <div id="pdf-content">${htmlContent}${_footer()}</div>
            <script>
                function savePdf(){
                    var btn=document.querySelector('.btn-save');
                    btn.disabled=true; btn.textContent='Generando…';
                    var el=document.getElementById('pdf-content');
                    html2pdf().set({
                        margin:[18,16,18,16], filename:${safeFilename},
                        image:{type:'jpeg',quality:.97},
                        html2canvas:{scale:2,useCORS:true,logging:false},
                        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
                        pagebreak:{mode:['avoid-all','css'],before:'.page-break'}
                    }).from(el).save().then(function(){ btn.disabled=false; btn.textContent='⬇ Guardar PDF'; });
                }
            <\/script>
        </body></html>`);
        win.document.close();
        win.onload = () => win.focus();
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

            const filename = `tecnico_${(fullName).replace(/\s+/g,'-')}.pdf`;
            _showSaving('Generando PDF…');
            await _savePdf(html, filename);
            _hideSaving();
        } catch (e) {
            _hideSaving();
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

            const filename = `transversal_${(fullName).replace(/\s+/g,'-')}.pdf`;
            _showSaving('Generando PDF…');
            await _savePdf(html, filename);
            _hideSaving();
        } catch (e) {
            _hideSaving();
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
        const [promoRes, extRes] = await Promise.all([
            fetch(`${API_URL}/api/promotions/${promotionId}`,              { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`)
        ]);
        if (!promoRes.ok) throw new Error('No se pudo cargar la promoción');
        const promo = await promoRes.json();
        const ext   = extRes.ok ? await extRes.json() : {};

        const sched = ext.schedule || {};
        const team  = ext.team || [];

        const style = `
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 10pt;
                    color: #1a1a1a;
                    padding: 40pt 50pt 80pt 50pt;
                }

                /* ── Título principal ── */
                .doc-title {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 6pt;
                }
                .doc-subtitle {
                    font-size: 10pt;
                    margin-bottom: 16pt;
                    color: #333;
                }

                /* ── Tabla principal de datos (2 columnas, estilo acta) ── */
                .main-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20pt;
                }
                .main-table td {
                    border: 1px solid #aaa;
                    padding: 9pt 10pt;
                    vertical-align: top;
                    line-height: 1.5;
                }
                .main-table td:first-child {
                    width: 38%;
                    font-weight: normal;
                    color: #1a1a1a;
                }
                .main-table td:last-child {
                    width: 62%;
                    color: #1a1a1a;
                }

                /* ── Nota de aprobación ── */
                .approval-note {
                    font-size: 10pt;
                    font-weight: bold;
                    margin-top: 20pt;
                    line-height: 1.6;
                }

                /* ── Pie de página con logo ── */
                .footer {
                    position: fixed;
                    bottom: 20pt;
                    right: 40pt;
                    text-align: right;
                }
                .footer-logo-text {
                    font-size: 13pt;
                    font-weight: bold;
                    color: #E85D26;
                    letter-spacing: 0.5pt;
                }
                .footer-logo-sub {
                    font-size: 7pt;
                    color: #999;
                    letter-spacing: 1pt;
                    text-transform: uppercase;
                }
                .footer-logo-badge {
                    display: inline-block;
                    background: #E85D26;
                    color: white;
                    font-size: 8pt;
                    font-weight: bold;
                    padding: 1pt 3pt;
                    margin-right: 3pt;
                    vertical-align: middle;
                }

                @media print {
                    .footer { position: fixed; bottom: 20pt; right: 40pt; }
                }
            </style>
        `;

        // ── Horario: texto único para la celda ──
        const horarioOnline = sched.online
            ? `Online — Entrada: ${_esc(sched.online.entry||'—')}, Inicio píldoras: ${_esc(sched.online.start||'—')}, Descanso: ${_esc(sched.online.break||'—')}, Comida: ${_esc(sched.online.lunch||'—')}, Salida: ${_esc(sched.online.finish||'—')}`
            : '—';
        const horarioPresencial = sched.presential
            ? `Presencial — Entrada: ${_esc(sched.presential.entry||'—')}, Inicio píldoras: ${_esc(sched.presential.start||'—')}, Descanso: ${_esc(sched.presential.break||'—')}, Comida: ${_esc(sched.presential.lunch||'—')}, Salida: ${_esc(sched.presential.finish||'—')}`
            : '—';
        const horarioCell = horarioOnline + '<br>' + horarioPresencial + (sched.notes ? `<br><em>Notas: ${_esc(sched.notes)}</em>` : '');

        // ── Equipo: texto para cada rol ──
        const getRol = (rol) => {
            const m = team.find(t => (t.role||'').toLowerCase().includes(rol));
            return m ? _esc(m.name) : '—';
        };
        const responsableProyecto   = getRol('responsable') || getRol('project') || (team[0] ? _esc(team[0].name) : '—');
        const formadorPrincipal     = getRol('formador') || (team[1] ? _esc(team[1].name) : '—');
        const coformador            = getRol('coformador') || getRol('co-formador') || (team[2] ? _esc(team[2].name) : '—');
        const responsablePromocion  = getRol('promocion') || getRol('promoción') || (team[3] ? _esc(team[3].name) : '—');

        // ── Otros roles (los que no sean los 4 principales) ──
        const mainRoles = ['responsable', 'project', 'formador', 'coformador', 'co-formador', 'promocion', 'promoción'];
        const otrosRoles = team
            .filter(m => !mainRoles.some(r => (m.role||'').toLowerCase().includes(r)))
            .map(m => `${_esc(m.role||'')}: ${_esc(m.name||'')}`)
            .join('<br>') || '—';

        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${style}</head><body>`;

        // ── Título ──
        html += `
        <div class="doc-title">Acta de inicio de proyecto formativo</div>
        <div class="doc-subtitle">
            <strong>Nombre proyecto:</strong> ${_esc(promo.name)}<br>
            <strong>Fecha de elaboración del acta:</strong> ${_today()}
        </div>`;

        // ── Tabla principal con todas las filas del acta original ──
        html += `<table class="main-table"><tbody>
            <tr>
                <td>Escuela y/o área<br>responsable del<br>proyecto formativo</td>
                <td>${_esc(ext.school || '—')}</td>
            </tr>
            <tr>
                <td>Tipo proyecto<br>formativo</td>
                <td>${_esc(ext.type || promo.type || 'Bootcamp')}</td>
            </tr>
            <tr>
                <td>Fecha de inicio de<br>proyecto formativo</td>
                <td>${_esc(promo.startDate || '—')}</td>
            </tr>
            <tr>
                <td>Fecha de fin de<br>proyecto formativo</td>
                <td>${_esc(promo.endDate || '—')}</td>
            </tr>
            <tr>
                <td>Fecha límite de<br>inscripciones abiertas</td>
                <td>${_esc(ext.inscriptionDeadline || '—')}</td>
            </tr>
            <tr>
                <td>Fecha límite de la<br>jornada de selección</td>
                <td>${_esc(ext.selectionDeadline || '—')}</td>
            </tr>
            <tr>
                <td>Fecha inicio<br>formación:</td>
                <td>${_esc(promo.startDate || '—')}</td>
            </tr>
            <tr>
                <td>Fecha de fin de<br>formación:</td>
                <td>${_esc(promo.endDate || '—')}</td>
            </tr>
            <tr>
                <td>Fecha de inicio<br>periodo salida<br>positiva:</td>
                <td>${_esc(ext.positiveExitStart || '—')}</td>
            </tr>
            <tr>
                <td>Fecha de fin de<br>periodo de salida<br>positiva:</td>
                <td>${_esc(ext.positiveExitEnd || '—')}</td>
            </tr>
            <tr>
                <td>Horas totales de<br>formación</td>
                <td>${_esc(ext.totalHours || promo.hours || '—')}</td>
            </tr>
            <tr>
                <td>Modalidad</td>
                <td>${_esc(ext.modality || promo.modality || '—')}</td>
            </tr>
            <tr>
                <td>Días presenciales y<br>lugar</td>
                <td>${_esc(ext.presentialDays || '—')}</td>
            </tr>
            <tr>
                <td>Horario</td>
                <td>${horarioCell}</td>
            </tr>
            <tr>
                <td>Responsable del<br>proyecto</td>
                <td>${responsableProyecto}</td>
            </tr>
            <tr>
                <td>Formador/a principal</td>
                <td>${formadorPrincipal}</td>
            </tr>
            <tr>
                <td>Coformador/a</td>
                <td>${coformador}</td>
            </tr>
            <tr>
                <td>Responsable de<br>promoción</td>
                <td>${responsablePromocion}</td>
            </tr>
            <tr>
                <td>Otros roles:</td>
                <td>${otrosRoles}</td>
            </tr>
            <tr>
                <td>Materiales/recursos<br>necesarios</td>
                <td>${_esc(ext.materials || '—')}</td>
            </tr>
            <tr>
                <td>Período prácticas<br>(sí/no)</td>
                <td>${_esc(ext.internships != null ? (ext.internships ? 'Sí' : 'No') : '—')}</td>
            </tr>
            <tr>
                <td>Financiadores</td>
                <td>${_esc(ext.funders || '—')}</td>
            </tr>
            <tr>
                <td>Fecha de<br>justificación a cada<br>financiador</td>
                <td>${_esc(ext.funderDeadlines || '—')}</td>
            </tr>
            <tr>
                <td>OKR y KPIs de FF5 en<br>este proyecto<br>formativo</td>
                <td>${_esc(ext.okrKpis || '—')}</td>
            </tr>
            <tr>
                <td>KPIs financiadores</td>
                <td>${_esc(ext.funderKpis || '—')}</td>
            </tr>
            <tr>
                <td>Día off formador/a</td>
                <td>${_esc(ext.trainerDayOff || '—')}</td>
            </tr>
            <tr>
                <td>Día off coformador/a</td>
                <td>${_esc(ext.cotrainerDayOff || '—')}</td>
            </tr>
            <tr>
                <td>Planificación de<br>reuniones de<br>proyecto</td>
                <td>${_esc(ext.projectMeetings || '—')}</td>
            </tr>
            <tr>
                <td>Planificación de<br>reuniones de equipo<br>(formador/a-coform<br>ador/a-responsable<br>de promoción)</td>
                <td>${_esc(ext.teamMeetings || '—')}</td>
            </tr>
        </tbody></table>`;

        // ── Nota de aprobación (tal cual en el documento original) ──
        html += `<p class="approval-note">
            Aprobación y difusión del documento a través de ASANA y solo por parte del "Responsable del proyecto" definido en este acta.
        </p>`;

        // ── Logo Factoría F5 en pie ──
        html += `
        <div class="footer">
            <div><span class="footer-logo-badge">F5</span><span class="footer-logo-text">factoría</span></div>
            <div class="footer-logo-sub">powered by simplon</div>
        </div>`;

        html += `</body></html>`;

        const filename = `acta-inicio_${(promo.name||'promo').replace(/\s+/g,'-')}.pdf`;
        _showSaving('Generando PDF…');
        await _savePdf(html, filename);
        _hideSaving();
    } catch (e) {
        _hideSaving();
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

            const filename = `descripcion-tecnica_${(promo.name||'promo').replace(/\s+/g,'-')}.pdf`;
            _showSaving('Generando PDF…');
            await _savePdf(html, filename);
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printDescripcionTecnica:', e);
            alert('Error generando la Descripción Técnica: ' + e.message);
        }
    }

    function _schedLabel(key) {
        return { entry: 'Entrada', start: 'Inicio Píldoras', break: 'Descanso', lunch: 'Comida', finish: 'Salida' }[key] || key;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. INFORME DE PROYECTO INDIVIDUAL
    // ════════════════════════════════════════════════════════════════════════
    async function printProjectReport(teamIndex, studentId, promotionId) {
        // Read data from the already-open ficha if available (no extra fetch needed)
        const st = window.StudentTracking;
        let t  = st?._getTeam(teamIndex);
        let s  = st?._getCurrentStudent();
        let promoName = window.currentPromotion?.name || '';

        // If not available in memory, fetch fresh
        if (!t || !s) {
            const token = localStorage.getItem('token');
            try {
                const [stuRes, promoRes] = await Promise.all([
                    fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/promotions/${promotionId}`,                       { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!stuRes.ok) throw new Error('No se pudo cargar el estudiante');
                s = await stuRes.json();
                const promo = promoRes.ok ? await promoRes.json() : {};
                promoName = promo.name || '';
                t = (s.technicalTracking?.teams || [])[teamIndex];
            } catch (e) {
                alert('Error cargando datos: ' + e.message);
                return;
            }
        }

        if (!t) { alert('Proyecto no encontrado.'); return; }

        const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();
        const PROJ_LEVEL_COLORS = { 0: 'grey', 1: 'red', 2: 'yellow', 3: 'green' };
        const PROJ_LEVEL_LABELS = { 0: 'Sin nivel', 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

        let html = _header(
            t.teamName || 'Proyecto',
            fullName,
            promoName,
            _today()
        );

        // ── Datos del proyecto ──
        const typeBadge = t.projectType === 'individual'
            ? `<span class="badge badge-info">Individual</span>`
            : `<span class="badge badge-green">Grupal</span>`;

        html += `<div class="section-box accent row2">
            <div>
                <div class="kv"><strong>Proyecto:</strong> ${_esc(t.teamName || '—')}</div>
                <div class="kv"><strong>Tipo:</strong> ${typeBadge}</div>
                <div class="kv"><strong>Módulo:</strong> ${_esc(t.moduleName || '—')}</div>
            </div>
            <div>
                <div class="kv"><strong>Coder:</strong> ${_esc(fullName)}</div>
                <div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
            </div>
        </div>
        ${(t.members && t.members.length && t.projectType === 'grupal')
            ? `<div class="section-box" style="margin-top:8pt;">
                <div style="font-size:10pt; font-weight:700; color:${DARK}; margin-bottom:8pt; border-bottom:1px solid #e0e0e0; padding-bottom:4pt;">
                    Integrantes del equipo
                </div>
                <ul style="margin:0; padding-left:16pt; list-style:disc;">
                    ${t.members.map(m => `<li style="padding:2pt 0; font-size:10pt;">${_esc(m.name)}</li>`).join('')}
                </ul>
            </div>`
            : ''
        }`;

        // ── Nota del profesor ──
        if (t.teacherNote) {
            html += `<h3>Nota del Profesor</h3>
            <div class="section-box" style="border-left:4px solid #0dcaf0;">
                <p style="white-space:pre-wrap; font-style:italic;">${_esc(t.teacherNote)}</p>
            </div>`;
        }

        // ── Competencias trabajadas ──
        html += `<h3>Competencias Trabajadas</h3>`;
        const comps = t.competences || [];
        if (comps.length) {
            html += `<table>
                <thead><tr><th>Competencia</th><th>Nivel alcanzado</th><th>Herramientas</th></tr></thead>
                <tbody>`;
            comps.forEach(c => {
                const lvlColor = PROJ_LEVEL_COLORS[c.level] ?? 'grey';
                const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? `Nv.${c.level}`;
                const tools = (c.toolsUsed || [])
                    .map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`)
                    .join(' ');
                html += `<tr>
                    <td><strong>${_esc(c.competenceName || '—')}</strong></td>
                    <td>${_levelBadge(c.level)}</td>
                    <td>${tools || '<span style="color:#aaa;">—</span>'}</td>
                </tr>`;
            });
            html += `</tbody></table>`;

            // Visual summary: one big card per competence with level bar
            html += `<div style="margin-top:10pt;">`;
            comps.forEach(c => {
                const pct = Math.round((c.level / 3) * 100);
                const barColor = c.level === 3 ? '#198754' : c.level === 2 ? '#ffc107' : c.level === 1 ? '#dc3545' : '#aaa';
                const tools = (c.toolsUsed || [])
                    .map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`)
                    .join(' ');
                html += `<div class="section-box no-break" style="margin-bottom:7pt;">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4pt;">
                        <strong>${_esc(c.competenceName)}</strong>
                        <span style="font-size:9pt; color:#888;">${PROJ_LEVEL_LABELS[c.level] ?? ''}</span>
                    </div>
                    <div style="background:#eee; border-radius:4pt; height:8pt; overflow:hidden; margin-bottom:5pt;">
                        <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:4pt;"></div>
                    </div>
                    ${tools ? `<div class="pill-row">${tools}</div>` : ''}
                </div>`;
            });
            html += `</div>`;
        } else {
            html += `<p class="empty-note">No se registraron competencias para este proyecto.</p>`;
        }

        // ── Firmas ──
        html += `<div style="margin-top:28pt;">
            <div class="section-box no-break" style="max-width:260pt;">
                <div style="font-size:9pt; color:${SECONDARY}; font-weight:600; margin-bottom:4pt;">Firma del/la docente</div>
                <div style="border-bottom:1.5px solid #999; height:36pt;"></div>
                <div style="font-size:8pt; color:#aaa; margin-top:4pt;">Docente responsable</div>
            </div>
        </div>`;

        const filename = `proyecto_${(t.teamName||'proyecto').replace(/\s+/g,'-')}_${(fullName).replace(/\s+/g,'-')}.pdf`;
        _previewWindow(html, filename);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. BULK REPORTS  (multi-student)
    // ════════════════════════════════════════════════════════════════════════

    // ── helpers shared by bulk functions ────────────────────────────────────

    /** Fetch one student with error-safe fallback */
    async function _fetchStudent(studentId, promotionId, token) {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`,
            { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`No se pudo cargar el estudiante ${studentId}`);
        return res.json();
    }

    /** Fetch all projects (teams) that belong to a named project across multiple students */
    function _techPageHtml(s, promo) {
        const tt = s.technicalTracking || {};
        const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();
        let html = _header('Ficha de Seguimiento Técnico', fullName, promo.name, _today());

        html += `<div class="section-box accent row2">
            <div>
                <div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
                <div class="kv"><strong>Nacionalidad:</strong> ${_esc(s.nationality || '—')}</div>
            </div>
            <div>
                <div class="kv"><strong>Edad:</strong> ${_esc(s.age || '—')}</div>
                <div class="kv"><strong>Profesión:</strong> ${_esc(s.profession || '—')}</div>
            </div>
        </div>`;

        html += `<h3>✦ Notas del Profesor</h3>`;
        const notes = tt.teacherNotes || [];
        if (notes.length) {
            html += `<table><thead><tr><th>Fecha</th><th>Nota</th></tr></thead><tbody>`;
            notes.forEach(n => {
                html += `<tr><td style="white-space:nowrap;">${_fmtDate(n.createdAt || n.date)}</td><td>${_esc(n.note || n.text || '')}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin notas registradas.</p>`; }

        html += `<h3>✦ Proyectos Realizados</h3>`;
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
                    ${t.teacherNote ? `<div class="kv" style="margin-top:4pt; font-style:italic; color:#555;">"${_esc(t.teacherNote)}"</div>` : ''}
                    ${comps.length ? `
                    <div style="margin-top:6pt;">
                        <strong style="font-size:9pt; color:${SECONDARY};">Competencias:</strong>
                        ${comps.map(c => {
                            const tools = (c.toolsUsed || []).map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`).join(' ');
                            return `<div style="margin-top:3pt;">${_levelBadge(c.level)} <strong>${_esc(c.competenceName)}</strong> ${tools}</div>`;
                        }).join('')}
                    </div>` : ''}
                </div>`;
            });
        } else { html += `<p class="empty-note">Sin proyectos registrados.</p>`; }

        html += `<h3>✦ Módulos Completados</h3>`;
        const mods = tt.completedModules || [];
        if (mods.length) {
            html += `<table><thead><tr><th>Módulo</th><th>Fecha</th><th>Nota</th></tr></thead><tbody>`;
            mods.forEach(m => {
                const gradeMap = { 1:'Insuficiente', 2:'Básico', 3:'Competente', 4:'Excelente' };
                html += `<tr><td>${_esc(m.moduleName||'—')}</td><td>${_fmtDate(m.completionDate)}</td><td>${gradeMap[m.finalGrade]||m.finalGrade||'—'}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin módulos completados.</p>`; }

        return html;
    }

    function _transPageHtml(s, promo) {
        const tr2 = s.transversalTracking || {};
        const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();
        let html = _header('Ficha de Seguimiento Transversal', fullName, promo.name, _today());

        html += `<div class="section-box accent row2">
            <div>
                <div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
                <div class="kv"><strong>Nacionalidad:</strong> ${_esc(s.nationality || '—')}</div>
            </div>
            <div>
                <div class="kv"><strong>Edad:</strong> ${_esc(s.age || '—')}</div>
                <div class="kv"><strong>Profesión:</strong> ${_esc(s.profession || '—')}</div>
            </div>
        </div>`;

        html += `<h3>✦ Sesiones de Empleabilidad</h3>`;
        const emp = tr2.employabilitySessions || [];
        if (emp.length) {
            html += `<table><thead><tr><th>Fecha</th><th>Tema</th><th>Notas</th></tr></thead><tbody>`;
            emp.forEach(e => { html += `<tr><td>${_fmtDate(e.date)}</td><td>${_esc(e.topic||'—')}</td><td>${_esc(e.notes||'')}</td></tr>`; });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin sesiones de empleabilidad.</p>`; }

        html += `<h3>✦ Sesiones Individuales</h3>`;
        const ind = tr2.individualSessions || [];
        if (ind.length) {
            html += `<table><thead><tr><th>Fecha</th><th>Tema</th><th>Notas</th></tr></thead><tbody>`;
            ind.forEach(e => { html += `<tr><td>${_fmtDate(e.date)}</td><td>${_esc(e.topic||'—')}</td><td>${_esc(e.notes||'')}</td></tr>`; });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin sesiones individuales.</p>`; }

        html += `<h3>✦ Incidencias</h3>`;
        const incs = tr2.incidents || [];
        if (incs.length) {
            html += `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>`;
            incs.forEach(i => {
                html += `<tr><td>${_fmtDate(i.date)}</td><td>${_esc(i.type||'—')}</td><td>${_esc(i.description||'')}</td>
                    <td>${i.resolved?'<span class="badge badge-green">Resuelta</span>':'<span class="badge badge-red">Pendiente</span>'}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin incidencias registradas.</p>`; }

        return html;
    }

    // ── 6a. Bulk Technical ───────────────────────────────────────────────────
    async function printBulkTechnical(studentIds, promotionId) {
        if (!studentIds?.length) { alert('Selecciona al menos un estudiante.'); return; }
        const token = localStorage.getItem('token');
        try {
            const promoRes = await fetch(`${API_URL}/api/promotions/${promotionId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const promo = promoRes.ok ? await promoRes.json() : {};
            const students = await Promise.all(studentIds.map(id => _fetchStudent(id, promotionId, token)));

            if (students.length === 1) {
                const s = students[0];
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                _showSaving('Generando PDF…');
                await _savePdf(_techPageHtml(s, promo), `tecnico_${fullName.replace(/\s+/g,'-')}.pdf`);
            } else {
                // Sequential processing — one iframe at a time
                const files = [];
                for (let i = 0; i < students.length; i++) {
                    const s = students[i];
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const fname = `tecnico_${fullName.replace(/\s+/g,'-')}.pdf`;
                    _showSaving(`Generando PDF ${i + 1} de ${students.length}: ${fullName}…`);
                    const blob = await _getPdfBlob(_techPageHtml(s, promo), fname);
                    files.push({ blob, filename: fname });
                }
                _showSaving(`Comprimiendo ${files.length} PDFs…`);
                await _zipAndDownload(files, `seguimiento-tecnico_${(promo.name||'promo').replace(/\s+/g,'-')}.zip`);
            }
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printBulkTechnical:', e);
            alert('Error generando los informes: ' + e.message);
        }
    }

    // ── 6b. Bulk Transversal ─────────────────────────────────────────────────
    async function printBulkTransversal(studentIds, promotionId) {
        if (!studentIds?.length) { alert('Selecciona al menos un estudiante.'); return; }
        const token = localStorage.getItem('token');
        try {
            const promoRes = await fetch(`${API_URL}/api/promotions/${promotionId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const promo = promoRes.ok ? await promoRes.json() : {};
            const students = await Promise.all(studentIds.map(id => _fetchStudent(id, promotionId, token)));

            if (students.length === 1) {
                const s = students[0];
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                _showSaving('Generando PDF…');
                await _savePdf(_transPageHtml(s, promo), `transversal_${fullName.replace(/\s+/g,'-')}.pdf`);
            } else {
                // Sequential processing — one iframe at a time
                const files = [];
                for (let i = 0; i < students.length; i++) {
                    const s = students[i];
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const fname = `transversal_${fullName.replace(/\s+/g,'-')}.pdf`;
                    _showSaving(`Generando PDF ${i + 1} de ${students.length}: ${fullName}…`);
                    const blob = await _getPdfBlob(_transPageHtml(s, promo), fname);
                    files.push({ blob, filename: fname });
                }
                _showSaving(`Comprimiendo ${files.length} PDFs…`);
                await _zipAndDownload(files, `seguimiento-transversal_${(promo.name||'promo').replace(/\s+/g,'-')}.zip`);
            }
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printBulkTransversal:', e);
            alert('Error generando los informes: ' + e.message);
        }
    }

    // ── 6c. Bulk by Project (all students who participated in a specific project) ──
    // studentIds: array of IDs to process, or null/undefined = all students in the promotion
    async function printBulkByProject(projectName, promotionId, studentIds) {
        if (!projectName) { alert('Especifica el nombre del proyecto.'); return; }
        const token = localStorage.getItem('token');
        try {
            const [promoRes, studentsRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`,          { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/students`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const promo       = promoRes.ok ? await promoRes.json() : {};
            const studentList = studentsRes.ok ? await studentsRes.json() : [];

            // If specific IDs were passed, restrict to those; otherwise use all
            const toFetch = studentIds?.length
                ? studentList.filter(s => studentIds.includes(s.id || s._id))
                : studentList;

            if (!toFetch.length) {
                alert('No se encontraron los estudiantes seleccionados.');
                return;
            }

            // Fetch full tracking data sequentially to avoid race conditions
            _showSaving(`Cargando datos de ${toFetch.length} coders…`);
            const fullStudents = [];
            for (const s of toFetch) {
                const sid = s.id || s._id;
                try {
                    const data = await _fetchStudent(sid, promotionId, token);
                    fullStudents.push(data);
                } catch (e) {
                    console.warn(`[Reports] No se pudo cargar el estudiante ${sid}:`, e);
                }
            }

            // Filter to those who have the project registered in their tracking
            const involved = fullStudents.filter(s =>
                (s.technicalTracking?.teams || []).some(t =>
                    (t.teamName || '').trim().toLowerCase() === projectName.trim().toLowerCase()
                )
            );

            if (!involved.length) {
                _hideSaving();
                alert(`Ninguno de los coders seleccionados tiene el proyecto "${projectName}" registrado en su seguimiento.`);
                return;
            }

            const safeProjName = projectName.replace(/\s+/g, '-');

            // Helper: build HTML for a single student's project page
            const _buildStudentProjectHtml = (s) => {
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                let sHtml = _header(`Proyecto: ${_esc(projectName)}`, fullName, promo.name, _today());
                const projectTeams = (s.technicalTracking?.teams || []).filter(t =>
                    (t.teamName || '').toLowerCase() === projectName.toLowerCase()
                );
                projectTeams.forEach(t => {
                    const typeBadge = t.projectType === 'individual'
                        ? `<span class="badge badge-info">Individual</span>`
                        : `<span class="badge badge-green">Grupal</span>`;
                    const comps = t.competences || [];
                    sHtml += `<div class="section-box accent row2" style="margin-bottom:8pt;">
                        <div>
                            <div class="kv"><strong>Tipo:</strong> ${typeBadge}</div>
                            <div class="kv"><strong>Módulo:</strong> ${_esc(t.moduleName||'—')}</div>
                        </div>
                        <div>
                            <div class="kv"><strong>Coder:</strong> ${_esc(fullName)}</div>
                            <div class="kv"><strong>Email:</strong> ${_esc(s.email||'—')}</div>
                        </div>
                    </div>`;
                    if (t.members?.length && t.projectType === 'grupal') {
                        sHtml += `<div class="section-box" style="margin-bottom:8pt;">
                            <strong style="font-size:10pt;">Integrantes del equipo</strong>
                            <ul style="margin:5pt 0 0 14pt; padding:0;">${t.members.map(m=>`<li>${_esc(m.name)}</li>`).join('')}</ul>
                        </div>`;
                    }
                    if (t.teacherNote) {
                        sHtml += `<h3>Nota del Profesor</h3>
                        <div class="section-box" style="border-left:4px solid #0dcaf0;">
                            <p style="white-space:pre-wrap; font-style:italic;">${_esc(t.teacherNote)}</p>
                        </div>`;
                    }
                    sHtml += `<h3>Competencias Trabajadas</h3>`;
                    if (comps.length) {
                        sHtml += `<table><thead><tr><th>Competencia</th><th>Nivel</th><th>Herramientas</th></tr></thead><tbody>`;
                        comps.forEach(c => {
                            const tools = (c.toolsUsed||[]).map(tl=>`<span class="badge badge-light">${_esc(tl)}</span>`).join(' ');
                            sHtml += `<tr><td><strong>${_esc(c.competenceName)}</strong></td><td>${_levelBadge(c.level)}</td><td>${tools||'—'}</td></tr>`;
                        });
                        sHtml += `</tbody></table>`;
                    } else { sHtml += `<p class="empty-note">Sin competencias evaluadas.</p>`; }
                });
                sHtml += `<div style="margin-top:28pt;"><div class="section-box no-break" style="max-width:260pt;">
                    <div style="font-size:9pt; color:${SECONDARY}; font-weight:600; margin-bottom:4pt;">Firma del/la docente</div>
                    <div style="border-bottom:1.5px solid #999; height:36pt;"></div>
                    <div style="font-size:8pt; color:#aaa; margin-top:4pt;">Docente responsable</div>
                </div></div>`;
                return sHtml;
            };

            if (involved.length === 1) {
                const s = involved[0];
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                _showSaving('Generando PDF…');
                await _savePdf(_buildStudentProjectHtml(s), `proyecto_${safeProjName}_${fullName.replace(/\s+/g,'-')}.pdf`);
            } else {
                // Process sequentially (one iframe at a time) to avoid browser rendering conflicts
                const files = [];
                for (let i = 0; i < involved.length; i++) {
                    const s = involved[i];
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const fname = `proyecto_${safeProjName}_${fullName.replace(/\s+/g,'-')}.pdf`;
                    _showSaving(`Generando PDF ${i + 1} de ${involved.length}: ${fullName}…`);
                    const blob = await _getPdfBlob(_buildStudentProjectHtml(s), fname);
                    files.push({ blob, filename: fname });
                }
                _showSaving(`Comprimiendo ${files.length} PDFs…`);
                await _zipAndDownload(files, `proyecto_${safeProjName}.zip`);
            }
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printBulkByProject:', e);
            alert('Error generando el informe por proyecto: ' + e.message);
        }
    }

    // ── 6d. All-projects summary for the whole promotion ────────────────────
    async function printAllProjectsSummary(promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [promoRes, studentsRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`,          { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/students`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const promo    = promoRes.ok ? await promoRes.json() : {};
            const students = studentsRes.ok ? await studentsRes.json() : [];

            const fullStudents = await Promise.all(
                students.map(s => _fetchStudent(s.id, promotionId, token).catch(() => null))
            );

            // Collect all unique project names
            const projectMap = new Map(); // projectName → [{ student, team }]
            fullStudents.filter(Boolean).forEach(s => {
                (s.technicalTracking?.teams || []).forEach(t => {
                    const key = (t.teamName || 'Sin nombre').trim();
                    if (!projectMap.has(key)) projectMap.set(key, []);
                    projectMap.get(key).push({ student: s, team: t });
                });
            });

            if (!projectMap.size) {
                alert('No se encontraron proyectos registrados en esta promoción.');
                return;
            }

            let html = _header(
                'Resumen de Proyectos de la Promoción',
                `${projectMap.size} proyectos · ${fullStudents.filter(Boolean).length} coders`,
                promo.name,
                _today()
            );

            // Overview table
            html += `<h3>Índice de Proyectos</h3>
            <table>
                <thead><tr><th>Proyecto</th><th>Tipo</th><th>Coders</th><th>Módulo</th></tr></thead>
                <tbody>`;
            projectMap.forEach((entries, name) => {
                const firstTeam = entries[0].team;
                const typeBadge = firstTeam.projectType === 'individual'
                    ? `<span class="badge badge-info">Individual</span>`
                    : `<span class="badge badge-green">Grupal</span>`;
                const coderList = entries.map(e => `${_esc(e.student.name||'')} ${_esc(e.student.lastname||'')}`.trim()).join(', ');
                html += `<tr>
                    <td><strong>${_esc(name)}</strong></td>
                    <td>${typeBadge}</td>
                    <td style="font-size:9pt;">${coderList}</td>
                    <td>${_esc(firstTeam.moduleName||'—')}</td>
                </tr>`;
            });
            html += `</tbody></table>`;

            // Detail section per project
            let projectIndex = 0;
            projectMap.forEach((entries, name) => {
                if (projectIndex > 0) html += `<div style="margin-top:18pt; padding-top:12pt; border-top:2px solid ${PRIMARY};"></div>`;
                html += `<h2 style="margin-top:14pt;">${_esc(name)}</h2>`;

                // Aggregate all competences across all students for this project
                const compAgg = new Map(); // competenceName → { levels:[], tools:Set }
                entries.forEach(({ team: t }) => {
                    (t.competences || []).forEach(c => {
                        if (!compAgg.has(c.competenceName)) compAgg.set(c.competenceName, { levels: [], tools: new Set() });
                        const agg = compAgg.get(c.competenceName);
                        agg.levels.push(c.level ?? 0);
                        (c.toolsUsed || []).forEach(tl => agg.tools.add(tl));
                    });
                });

                // Per-student mini cards
                html += `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8pt; margin-bottom:8pt;">`;
                entries.forEach(({ student: s, team: t }) => {
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const comps = t.competences || [];
                    html += `<div class="section-box no-break" style="font-size:9pt;">
                        <div style="font-weight:700; font-size:10pt; margin-bottom:3pt;">${_esc(fullName)}</div>
                        <div class="kv"><strong>Email:</strong> ${_esc(s.email||'—')}</div>
                        ${comps.map(c => {
                            const tools = (c.toolsUsed||[]).map(tl=>`<span class="badge badge-light">${_esc(tl)}</span>`).join(' ');
                            return `<div style="margin-top:3pt;">${_levelBadge(c.level)} ${_esc(c.competenceName)} ${tools}</div>`;
                        }).join('')}
                        ${t.teacherNote ? `<div style="margin-top:4pt; font-style:italic; color:#666; border-top:1px solid #eee; padding-top:3pt;">"${_esc(t.teacherNote)}"</div>` : ''}
                    </div>`;
                });
                html += `</div>`;

                // Aggregated competence summary for the project
                if (compAgg.size) {
                    html += `<h3>Competencias del Proyecto (resumen)</h3>
                    <table><thead><tr><th>Competencia</th><th>Nivel medio</th><th>Herramientas</th></tr></thead><tbody>`;
                    compAgg.forEach((agg, compName) => {
                        const avg = agg.levels.reduce((a, b) => a + b, 0) / agg.levels.length;
                        const roundedAvg = Math.round(avg);
                        const tools = [...agg.tools].map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`).join(' ');
                        html += `<tr>
                            <td><strong>${_esc(compName)}</strong></td>
                            <td>${_levelBadge(roundedAvg)} <span style="color:#aaa; font-size:8pt;">(media ${avg.toFixed(1)})</span></td>
                            <td>${tools || '—'}</td>
                        </tr>`;
                    });
                    html += `</tbody></table>`;
                }

                projectIndex++;
            });

            const safeProm = (promo.name||'promo').replace(/\s+/g,'-');
            _showSaving(`Generando resumen de ${projectMap.size} proyecto${projectMap.size > 1 ? 's' : ''}…`);
            await _savePdf(html, `resumen-proyectos_${safeProm}.pdf`);
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printAllProjectsSummary:', e);
            alert('Error generando el resumen de proyectos: ' + e.message);
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────────
    window.Reports = {
        printTechnical,
        printTransversal,
        printActaInicio,
        printDescripcionTecnica,
        printProjectReport,
        printBulkTechnical,
        printBulkTransversal,
        printBulkByProject,
        printAllProjectsSummary
    };

})(window);
