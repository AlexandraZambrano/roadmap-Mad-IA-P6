const API_URL = "http://127.0.0.1:8000/infouser" || window.location.origin;

function showAlert(message, type = 'danger') {
    const alert = document.getElementById(`${type}-alert`);
    alert.textContent = message;
    alert.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => alert.classList.add('hidden'), 3000);
    }
}

function hideAlerts() {
    const danger = document.getElementById('danger-alert');
    if (danger) danger.classList.add('hidden');

    const success = document.getElementById('success-alert');
    if (success) success.classList.add('hidden');

    const error = document.getElementById('error-alert');
    if (error) error.classList.add('hidden');
}

function setLoading(isLoading) {
    const spinner = document.querySelector('.spinner-sm');
    const button = document.querySelector('.btn-login');

    if (isLoading) {
        spinner.style.display = 'inline-block';
        button.disabled = true;
    } else {
        spinner.style.display = 'none';
        button.disabled = false;
    }
}

// Expose to window for direct onclick access
window.handleLogin = async function () {
    console.log('handleLogin called');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showAlert('Please enter both email and password', 'danger');
        return;
    }

    hideAlerts();
    setLoading(true);

    console.log(`Attempting login for: ${email}`);

    try {
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Login response:', data);

        if (response.ok && data.success && data.data?.token) {
            const token = data.data.token;
            const roles = Array.isArray(data.data.roles) ? data.data.roles : [];
            console.log('roles:', roles);

            // Role mapping from external API:
            // ROLE_USER + ROLE_ADMIN together = superadmin (full platform admin)
            // ROLE_ADMIN alone = teacher/coordinator
            // ROLE_STUDENT = student
            // ROLE_SUPER_ADMIN = superadmin
            let role = 'teacher';
            if (roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_SUPERADMIN')) {
                role = 'superadmin';
            } else if (roles.includes('ROLE_USER') && roles.includes('ROLE_ADMIN')) {
                role = 'superadmin';
            } else if (roles.includes('ROLE_ADMIN')) {
                role = 'teacher';
            }

            console.log('Mapped role:', role);

            const user = {
                id: data.data.userId || '',
                name: data.data.name || data.data.email || '',
                email: data.data.email || '',
                role
            };

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('role', role);
            showAlert('Login successful! Redirecting...', 'success');

            setTimeout(() => {
                // All roles go to dashboard; superadmin has Admin Panel button in navbar
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showAlert(data.message || data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please try again.', 'danger');
    } finally {
        setLoading(false);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
});
