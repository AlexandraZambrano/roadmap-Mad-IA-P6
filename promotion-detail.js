const API_URL = window.location.origin;
let promotionId = null;
let moduleModal, quickLinkModal, sectionModal;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    promotionId = new URLSearchParams(window.location.search).get('id');

    if (!promotionId) {
        window.location.href = '/dashboard.html';
        return;
    }

    moduleModal = new bootstrap.Modal(document.getElementById('moduleModal'));
    quickLinkModal = new bootstrap.Modal(document.getElementById('quickLinkModal'));
    sectionModal = new bootstrap.Modal(document.getElementById('sectionModal'));

    loadPromotion();
    loadModules();
    loadQuickLinks();
    loadSections();
    loadCalendar();

    setupForms();
});

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

    // Create header with week numbers
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f8f9fa';
    const headerCell = document.createElement('th');
    headerCell.innerHTML = '<strong>Timeline</strong>';
    headerCell.style.minWidth = '200px';
    headerRow.appendChild(headerCell);

    for (let i = 1; i <= weeks; i++) {
        const th = document.createElement('th');
        th.textContent = `W${i}`;
        th.style.textAlign = 'center';
        th.style.fontSize = '0.8rem';
        th.style.padding = '8px 4px';
        th.style.width = '30px';
        headerRow.appendChild(th);
    }

    table.appendChild(headerRow);

    // Create rows for modules, courses, and projects
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
                projectRow.appendChild(cell);
            }
            table.appendChild(projectRow);
        }

        weekCounter += module.duration;
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
                    <button class="btn btn-sm btn-danger" onclick="deleteQuickLink('${link.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
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
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${escapeHtml(section.title)}</h5>
                    <div>
                        <button class="btn btn-sm btn-warning" onclick="editSection('${section.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSection('${section.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
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
        nameInput.readOnly = true;
    } else {
        nameInput.readOnly = false;
        nameInput.value = '';
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
    window.open(`/public-promotion?id=${promotionId}`, '_blank', 'width=1200,height=800');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
