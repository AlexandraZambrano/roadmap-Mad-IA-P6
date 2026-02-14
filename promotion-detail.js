const API_URL = window.location.origin;
let promotionId = null;
let moduleModal, quickLinkModal, sectionModal, studentModal, studentSuccessModal, teamModal, resourceModal;
const userRole = localStorage.getItem('role') || 'student';
let extendedInfoData = {
    schedule: {},
    team: [],
    resources: [],
    evaluation: ''
};

// Immediate CSS injection for student view (to prevent flicker)
if (userRole === 'student') {
    const style = document.createElement('style');
    style.innerHTML = `
        .teacher-only, 
        .btn-primary:not(#login-button):not(.nav-link), 
        .btn-danger, 
        .btn-outline-danger, 
        .btn-warning,
        #students-tab-nav { display: none !important; }
        
        /* Ensure navigation to students tab is hidden */
        .nav-link[onclick*="students"] { display: none !important; }
        a[href="#students"] { display: none !important; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('student-view');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    promotionId = new URLSearchParams(window.location.search).get('id');

    if (!promotionId) {
        window.location.href = '/dashboard.html';
        return;
    }

    // Initialize modals only if elements exist (teacher view)
    const moduleModalEl = document.getElementById('moduleModal');
    if (moduleModalEl) moduleModal = new bootstrap.Modal(moduleModalEl);

    const quickLinkModalEl = document.getElementById('quickLinkModal');
    if (quickLinkModalEl) quickLinkModal = new bootstrap.Modal(quickLinkModalEl);

    const sectionModalEl = document.getElementById('sectionModal');
    if (sectionModalEl) sectionModal = new bootstrap.Modal(sectionModalEl);

    const studentModalEl = document.getElementById('studentModal');
    if (studentModalEl) studentModal = new bootstrap.Modal(studentModalEl);

    const studentSuccessModalEl = document.getElementById('studentSuccessModal');
    if (studentSuccessModalEl) studentSuccessModal = new bootstrap.Modal(studentSuccessModalEl);

    // New Modals (Teacher)
    const teamModalEl = document.getElementById('teamModal');
    if (teamModalEl) teamModal = new bootstrap.Modal(teamModalEl);

    const resourceModalEl = document.getElementById('resourceModal');
    if (resourceModalEl) resourceModal = new bootstrap.Modal(resourceModalEl);

    if (userRole === 'teacher') {
        loadStudents();
        loadExtendedInfo();
    } else {
        // Remove preview button for students
        const previewBtn = document.querySelector('button[onclick="previewPromotion()"]');
        if (previewBtn) previewBtn.remove();
    }

    loadPromotion();
    loadModules();
    loadQuickLinks();
    loadSections();
    loadCalendar();

    if (userRole === 'teacher') {
        setupForms();
    }
});

async function loadExtendedInfo() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`); // Public endpoint
        if (response.ok) {
            extendedInfoData = await response.json();

            // Populate Schedule
            const sched = extendedInfoData.schedule || {};
            if (sched.online) {
                document.getElementById('sched-online-entry').value = sched.online.entry || '';
                document.getElementById('sched-online-start').value = sched.online.start || '';
                document.getElementById('sched-online-break').value = sched.online.break || '';
                document.getElementById('sched-online-lunch').value = sched.online.lunch || '';
                document.getElementById('sched-online-finish').value = sched.online.finish || '';
            }
            if (sched.presential) {
                document.getElementById('sched-presential-entry').value = sched.presential.entry || '';
                document.getElementById('sched-presential-start').value = sched.presential.start || '';
                document.getElementById('sched-presential-break').value = sched.presential.break || '';
                document.getElementById('sched-presential-lunch').value = sched.presential.lunch || '';
                document.getElementById('sched-presential-finish').value = sched.presential.finish || '';
            }
            document.getElementById('sched-notes').value = sched.notes || '';

            // Populate Additional Lists
            displayTeam();
            displayResources();

            // Populate Evaluation
            document.getElementById('evaluation-text').value = extendedInfoData.evaluation || '';
        }
    } catch (error) {
        console.error('Error loading extended info:', error);
    }
}

function displayTeam() {
    const tbody = document.getElementById('team-list-body');
    tbody.innerHTML = '';
    (extendedInfoData.team || []).forEach((member, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(member.name)}</td>
            <td>${escapeHtml(member.role)}</td>
            <td>${escapeHtml(member.email)}</td>
            <td><a href="${escapeHtml(member.linkedin)}" target="_blank"><i class="bi bi-linkedin"></i></a></td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteTeamMember(${index})"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function displayResources() {
    const tbody = document.getElementById('resources-list-body');
    tbody.innerHTML = '';
    (extendedInfoData.resources || []).forEach((res, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(res.title)}</td>
            <td><span class="badge bg-info text-dark">${escapeHtml(res.category)}</span></td>
            <td><a href="${escapeHtml(res.url)}" target="_blank" class="text-truncate d-inline-block" style="max-width: 150px;">${escapeHtml(res.url)}</a></td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteResource(${index})"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openTeamModal() {
    document.getElementById('team-form').reset();
    teamModal.show();
}

function addTeamMember() {
    const name = document.getElementById('team-name').value;
    const role = document.getElementById('team-role').value;
    const email = document.getElementById('team-email').value;
    const linkedin = document.getElementById('team-linkedin').value;

    if (!name) return;

    extendedInfoData.team.push({ name, role, email, linkedin });
    displayTeam();
    teamModal.hide();
}

function deleteTeamMember(index) {
    if (confirm('Delete this member?')) {
        extendedInfoData.team.splice(index, 1);
        displayTeam();
    }
}

function openResourceModal() {
    document.getElementById('resource-form').reset();
    resourceModal.show();
}

function addResource() {
    const title = document.getElementById('resource-title').value;
    const category = document.getElementById('resource-category').value;
    const url = document.getElementById('resource-url').value;

    if (!title || !url) return;

    extendedInfoData.resources.push({ title, category, url });
    displayResources();
    resourceModal.hide();
}

function deleteResource(index) {
    if (confirm('Delete this resource?')) {
        extendedInfoData.resources.splice(index, 1);
        displayResources();
    }
}

async function saveExtendedInfo() {
    const token = localStorage.getItem('token');

    // Gather Schedule Data
    const schedule = {
        online: {
            entry: document.getElementById('sched-online-entry').value,
            start: document.getElementById('sched-online-start').value,
            break: document.getElementById('sched-online-break').value,
            lunch: document.getElementById('sched-online-lunch').value,
            finish: document.getElementById('sched-online-finish').value
        },
        presential: {
            entry: document.getElementById('sched-presential-entry').value,
            start: document.getElementById('sched-presential-start').value,
            break: document.getElementById('sched-presential-break').value,
            lunch: document.getElementById('sched-presential-lunch').value,
            finish: document.getElementById('sched-presential-finish').value
        },
        notes: document.getElementById('sched-notes').value
    };

    // Gather Evaluation
    const evaluation = document.getElementById('evaluation-text').value;

    // Update global object
    extendedInfoData.schedule = schedule;
    extendedInfoData.evaluation = evaluation;

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(extendedInfoData)
        });

        if (response.ok) {
            alert('Program info saved successfully!');
        } else {
            try {
                const errorData = await response.json();
                alert(`Failed to save info: ${response.status} - ${errorData.error || 'Unknown error'}`);
            } catch {
                alert(`Failed to save info: ${response.status} ${response.statusText}`);
            }
        }
    } catch (error) {
        console.error('Error saving info:', error);
        alert(`Error saving info: ${error.message}`);
    }
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
    }
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.section-content').forEach(el => {
        el.classList.add('hidden');
    });

    // Show selected tab
    const tabElement = document.getElementById(tabName + '-tab');
    if (tabElement) {
        tabElement.classList.remove('hidden');
    }

    // Update active nav link
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

async function loadPromotion() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const promotion = await response.json();
            document.getElementById('promotion-title').textContent = promotion.name;
            document.getElementById('promotion-desc').textContent = promotion.description || '';
            document.getElementById('promotion-weeks').textContent = promotion.weeks || '-';
            document.getElementById('promotion-start').textContent = promotion.startDate || '-';
            document.getElementById('promotion-end').textContent = promotion.endDate || '-';
            document.getElementById('modules-count').textContent = (promotion.modules || []).length;
        }
    } catch (error) {
        console.error('Error loading promotion:', error);
    }
}

async function loadModules() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const promotion = await response.json();
            displayModules(promotion.modules || []);
            generateGanttChart(promotion);
        }
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

function displayModules(modules) {
    const list = document.getElementById('modules-list');
    list.innerHTML = '';

    if (modules.length === 0) {
        list.innerHTML = '<div class="col-12"><p class="text-muted">No modules yet</p></div>';
        return;
    }

    modules.forEach((module, index) => {
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Module ${index + 1}: ${escapeHtml(module.name)}</h5>
                    <p><strong>Duration:</strong> ${module.duration} weeks</p>
                    ${module.courses && module.courses.length > 0 ? `<p><strong>Courses:</strong> ${module.courses.join(', ')}</p>` : ''}
                    ${module.projects && module.projects.length > 0 ? `<p><strong>Projects:</strong> ${module.projects.join(', ')}</p>` : ''}
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function generateGanttChart(promotion) {
    const table = document.getElementById('gantt-table');
    table.innerHTML = '';

    const weeks = promotion.weeks || 0;
    const modules = promotion.modules || [];

    if (modules.length === 0) {
        table.innerHTML = '<tr><td class="text-muted">No modules configured</td></tr>';
        return;
    }

    // 1. Weeks Row (Top)
    const weekRow = document.createElement('tr');
    weekRow.style.backgroundColor = '#f8f9fa';
    const weekHeaderCell = document.createElement('th');
    weekHeaderCell.innerHTML = '<strong>Weeks</strong>';
    weekHeaderCell.style.minWidth = '200px';
    weekRow.appendChild(weekHeaderCell);

    for (let i = 1; i <= weeks; i++) {
        const th = document.createElement('th');
        th.textContent = i;
        th.className = 'text-center';
        th.style.width = '30px';
        th.style.fontSize = '0.8rem';
        th.style.padding = '8px 4px';
        weekRow.appendChild(th);
    }
    table.appendChild(weekRow);

    // 2. Modules Row
    let weekCounter = 0;
    const moduleColors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#feca57', '#48dbfb'];

    modules.forEach((module, index) => {
        const moduleColor = moduleColors[index % moduleColors.length];

        // Module row
        const moduleRow = document.createElement('tr');
        const moduleCell = document.createElement('td');
        moduleCell.innerHTML = `<strong style="color: ${moduleColor};">📚 Module ${index + 1}: ${escapeHtml(module.name)}</strong>`;
        moduleCell.style.minWidth = '200px';
        moduleRow.appendChild(moduleCell);

        for (let i = 0; i < weeks; i++) {
            const cell = document.createElement('td');
            cell.style.textAlign = 'center';
            cell.style.height = '35px';
            cell.style.padding = '2px';

            if (i >= weekCounter && i < weekCounter + module.duration) {
                cell.style.backgroundColor = moduleColor;
                cell.style.borderRadius = '4px';
                cell.style.opacity = '0.8';
                // Remove text from inside the bar as requested ("without text")
            }

            moduleRow.appendChild(cell);
        }
        table.appendChild(moduleRow);

        // Courses row
        if (module.courses && module.courses.length > 0) {
            const courseRow = document.createElement('tr');
            const courseCell = document.createElement('td');
            courseCell.innerHTML = `<small style="color: #666;">📖 Courses: ${module.courses.join(', ')}</small>`;
            courseCell.style.minWidth = '200px';
            courseCell.style.fontSize = '0.85rem';
            courseCell.style.paddingLeft = '30px';
            courseRow.appendChild(courseCell);

            for (let i = 0; i < weeks; i++) {
                const cell = document.createElement('td');
                cell.style.textAlign = 'center';
                cell.style.height = '25px';
                cell.style.padding = '2px';

                // Color bar for courses
                if (i >= weekCounter && i < weekCounter + module.duration) {
                    // Using a lighter version of module color or standard gray?
                    // Request: "filled"
                    cell.style.backgroundColor = '#e9ecef';
                }
                courseRow.appendChild(cell);
            }
            table.appendChild(courseRow);
        }

        // Projects row
        if (module.projects && module.projects.length > 0) {
            const projectRow = document.createElement('tr');
            const projectCell = document.createElement('td');
            projectCell.innerHTML = `<small style="color: #666;">🎯 Projects: ${module.projects.join(', ')}</small>`;
            projectCell.style.minWidth = '200px';
            projectCell.style.fontSize = '0.85rem';
            projectCell.style.paddingLeft = '30px';
            projectRow.appendChild(projectCell);

            for (let i = 0; i < weeks; i++) {
                const cell = document.createElement('td');
                cell.style.textAlign = 'center';
                cell.style.height = '25px';
                cell.style.padding = '2px';
                if (i >= weekCounter && i < weekCounter + module.duration) {
                    cell.style.backgroundColor = '#e9ecef';
                }
                projectRow.appendChild(cell);
            }
            table.appendChild(projectRow);
        }

        weekCounter += module.duration;
    });
    // We'll iterate through modules and then items

    // Helper to add a row
    const addRow = (name, type, startWeek, duration, color) => {
        const row = document.createElement('tr');
        const cellName = document.createElement('td');

        const icon = type === 'course' ? '<i class="bi bi-book me-1"></i>' : '<i class="bi bi-laptop me-1"></i>';
        cellName.innerHTML = `${icon} ${escapeHtml(name)}`;
        cellName.style.fontSize = '0.9rem';
        row.appendChild(cellName);

        for (let i = 1; i <= weeks; i++) {
            const cell = document.createElement('td');
            if (i >= startWeek && i < startWeek + duration) {
                cell.style.backgroundColor = color;
                cell.className = 'gantt-bar';
            }
            row.appendChild(cell);
        }
        table.appendChild(row);
    };

    let moduleStartWeek = 1;
    modules.forEach(module => {
        const courseColor = '#43e97b';
        const projectColor = '#fa709a';

        if (module.courses) {
            module.courses.forEach(course => {
                // Assuming items run for the module duration for simplicity, or we could split them
                // The prompt says "squares filled to visually explain where they take place".
                // Since we don't have granular start/end for courses in the data model yet (just one duration for the module),
                // we will render them spanning the module.
                addRow(course, 'course', moduleStartWeek, module.duration, courseColor);
            });
        }

        if (module.projects) {
            module.projects.forEach(project => {
                addRow(project, 'project', moduleStartWeek, module.duration, projectColor);
            });
        }
        moduleStartWeek += module.duration;
    });
}

async function loadQuickLinks() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const links = await response.json();
            displayQuickLinks(links);
            document.getElementById('quicklinks-count').textContent = links.length;
        }
    } catch (error) {
        console.error('Error loading quick links:', error);
    }
}

function displayQuickLinks(links) {
    const list = document.getElementById('quick-links-list');
    list.innerHTML = '';

    if (links.length === 0) {
        list.innerHTML = '<div class="col-12"><p class="text-muted">No quick links yet</p></div>';
        return;
    }

    links.forEach(link => {
        const platform = link.platform || 'custom';
        const platformInfo = platformIcons[platform] || platformIcons['custom'];

        const deleteBtn = userRole === 'teacher' ? `
            <button class="btn btn-sm btn-danger" onclick="deleteQuickLink('${link.id}')">
                <i class="bi bi-trash"></i>
            </button>` : '';

        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="bi ${platformInfo.icon}" style="font-size: 1.3rem; color: ${platformInfo.color};"></i>
                        <h5 class="card-title" style="margin: 0;">${escapeHtml(link.name)}</h5>
                    </div>
                    <a href="${escapeHtml(link.url)}" target="_blank" class="btn btn-sm btn-primary">
                        <i class="bi bi-box-arrow-up-right me-1"></i>Open Link
                    </a>
                    ${deleteBtn}
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

async function loadSections() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/sections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const sections = await response.json();
            displaySections(sections);
            document.getElementById('sections-count').textContent = sections.length;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

function displaySections(sections) {
    const list = document.getElementById('sections-list');
    list.innerHTML = '';

    if (sections.length === 0) {
        list.innerHTML = '<p class="text-muted">No sections yet</p>';
        return;
    }

    sections.forEach(section => {
        const actionBtns = userRole === 'teacher' ? `
            <div>
                <button class="btn btn-sm btn-warning" onclick="editSection('${section.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSection('${section.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>` : '';

        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${escapeHtml(section.title)}</h5>
                    ${actionBtns}
                </div>
            </div>
            <div class="card-body">
                <p>${escapeHtml(section.content)}</p>
            </div>
        `;
        list.appendChild(card);
    });
}

async function loadCalendar() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/calendar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const calendar = await response.json();
            document.getElementById('google-calendar-id').value = calendar.googleCalendarId;
            displayCalendar(calendar.googleCalendarId);
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
    }
}

function displayCalendar(calendarId) {
    const preview = document.getElementById('calendar-preview');
    const iframe = document.getElementById('calendar-iframe');

    if (calendarId) {
        iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Europe/Madrid`;
        preview.classList.remove('hidden');
    }
}

function setupForms() {
    // Module form
    document.getElementById('module-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('module-name').value;
        const duration = parseInt(document.getElementById('module-duration').value);
        const coursesStr = document.getElementById('module-courses').value;
        const projectsStr = document.getElementById('module-projects').value;

        const courses = coursesStr.split(',').map(c => c.trim()).filter(c => c);
        const projects = projectsStr.split(',').map(p => p.trim()).filter(p => p);

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/modules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, duration, courses, projects })
            });

            if (response.ok) {
                moduleModal.hide();
                document.getElementById('module-form').reset();
                loadModules();
                loadPromotion();
            }
        } catch (error) {
            console.error('Error adding module:', error);
        }
    });

    // Quick link form
    document.getElementById('quick-link-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('link-name').value;
        const url = document.getElementById('link-url').value;
        const platform = document.getElementById('link-platform').value || 'custom';

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, url, platform })
            });

            if (response.ok) {
                quickLinkModal.hide();
                document.getElementById('quick-link-form').reset();
                loadQuickLinks();
            }
        } catch (error) {
            console.error('Error adding quick link:', error);
        }
    });

    // Section form
    document.getElementById('section-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('section-title').value;
        const content = document.getElementById('section-content').value;

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/sections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content })
            });

            if (response.ok) {
                sectionModal.hide();
                document.getElementById('section-form').reset();
                loadSections();
                loadPromotion();
            }
        } catch (error) {
            console.error('Error adding section:', error);
        }
    });

    // Calendar form
    document.getElementById('calendar-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const googleCalendarId = document.getElementById('google-calendar-id').value;

        if (!googleCalendarId) {
            alert('Please enter a Google Calendar ID');
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/calendar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ googleCalendarId })
            });

            if (response.ok) {
                displayCalendar(googleCalendarId);
                alert('Calendar saved successfully!');
            }
        } catch (error) {
            console.error('Error saving calendar:', error);
        }
    });

    // Student form
    document.getElementById('student-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('student-email').value;
        const name = document.getElementById('student-name').value;
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, name })
            });

            if (response.ok) {
                const data = await response.json();
                studentModal.hide();
                document.getElementById('student-form').reset();
                loadStudents();

                // Show success modal with temp password
                document.getElementById('new-student-email').textContent = data.student.email;
                document.getElementById('new-student-password').textContent = data.tempPassword || 'Error';
                studentSuccessModal.show();
            } else {
                alert('Error adding student');
            }
        } catch (error) {
            console.error('Error adding student:', error);
        }
    });
}

const platformIcons = {
    'zoom': { name: 'Zoom', icon: 'bi-camera-video', color: '#2D8CFF' },
    'discord': { name: 'Discord', icon: 'bi-discord', color: '#5865F2' },
    'classroom': { name: 'Google Classroom', icon: 'bi-google', color: '#EA4335' },
    'github': { name: 'GitHub', icon: 'bi-github', color: '#333' },
    'custom': { name: 'Link', icon: 'bi-link', color: '#667eea' }
};

function updateLinkName() {
    const platform = document.getElementById('link-platform').value;
    const nameInput = document.getElementById('link-name');

    if (platform && platform !== 'custom' && platformIcons[platform]) {
        nameInput.value = platformIcons[platform].name;
        // nameInput.readOnly = true; // User requested ability to change name
    } else {
        // nameInput.readOnly = false;
        if (platform === 'custom') {
            nameInput.value = '';
        }
    }
}

function openModuleModal() {
    document.getElementById('module-form').reset();
    moduleModal.show();
}

function openQuickLinkModal() {
    document.getElementById('quick-link-form').reset();
    document.getElementById('link-platform').value = '';
    document.getElementById('link-name').readOnly = false;
    quickLinkModal.show();
}

function openSectionModal() {
    document.getElementById('section-form').reset();
    sectionModal.show();
}

function openStudentModal() {
    document.getElementById('student-form').reset();
    studentModal.show();
}

async function deleteQuickLink(linkId) {
    if (!confirm('Are you sure?')) return;

    const token = localStorage.getItem('token');

    try {
        await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links/${linkId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadQuickLinks();
    } catch (error) {
        console.error('Error deleting link:', error);
    }
}

async function deleteSection(sectionId) {
    if (!confirm('Are you sure?')) return;

    const token = localStorage.getItem('token');

    try {
        await fetch(`${API_URL}/api/promotions/${promotionId}/sections/${sectionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadSections();
        loadPromotion();
    } catch (error) {
        console.error('Error deleting section:', error);
    }
}

function previewPromotion() {
    const isPreview = document.body.classList.toggle('preview-mode');
    const btn = document.querySelector('button[onclick="previewPromotion()"]');

    if (isPreview) {
        btn.innerHTML = '<i class="bi bi-eye-slash me-2"></i>Exit Preview';
        btn.classList.replace('btn-info', 'btn-warning');

        // Hide teacher-only elements
        document.querySelectorAll('.btn-primary, .btn-danger, .btn-outline-danger').forEach(el => el.classList.add('d-none'));
        // Also hide the students tab link
        const studentsLink = document.querySelector('a[href="#students"]');
        if (studentsLink) studentsLink.parentElement.classList.add('d-none');

        alert('You are now viewing this page as a student.');

    } else {
        btn.innerHTML = '<i class="bi bi-eye me-2"></i>Preview';
        btn.classList.replace('btn-warning', 'btn-info');

        // Show teacher-only elements
        document.querySelectorAll('.btn-primary, .btn-danger, .btn-outline-danger').forEach(el => el.classList.remove('d-none'));
        const studentsLink = document.querySelector('a[href="#students"]');
        if (studentsLink) studentsLink.parentElement.classList.remove('d-none');
    }
}

// Check role on load to hide elements if actual student
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const role = localStorage.getItem('role');
        if (role === 'student') {
            document.body.classList.add('student-view');
            // Remove the preview button
            const previewBtn = document.querySelector('button[onclick="previewPromotion()"]');
            if (previewBtn) previewBtn.remove();

            // Hide Add buttons and Students tab via CSS
            const style = document.createElement('style');
            style.innerHTML = `
                .btn-primary, .btn-danger, .btn-outline-danger, 
                a[href="#students"] { display: none !important; }
                #students-tab { display: none !important; } 
            `;
            document.head.appendChild(style);

            // Hide the students nav item specifically
            const studentsLink = document.querySelector('a[href="#students"]');
            if (studentsLink && studentsLink.parentElement) {
                studentsLink.parentElement.style.display = 'none';
            }
        }
    }, 100);
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Student Management Functions
async function loadStudents() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const students = await response.json();
            displayStudents(students);
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function displayStudents(students) {
    const list = document.getElementById('students-list');
    list.innerHTML = '';

    if (students.length === 0) {
        list.innerHTML = '<div class="col-12"><p class="text-muted">No students enrolled yet</p></div>';
        return;
    }

    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        card.innerHTML = `
            <div class="card">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="card-title mb-1">${escapeHtml(student.name)}</h5>
                        <p class="card-text text-muted mb-0">${escapeHtml(student.email)}</p>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${student.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to remove this student?')) return;

    const token = localStorage.getItem('token');
    try {
        await fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadStudents();
    } catch (error) {
        console.error('Error deleting student:', error);
    }
}
