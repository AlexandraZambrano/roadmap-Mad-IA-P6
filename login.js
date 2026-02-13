const API_URL = window.location.origin;
let selectedRole = 'teacher';

function selectRole(role) {
    selectedRole = role;
    
    // Update UI
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-role="${role}"]`).classList.add('active');
    
    // Update help text
    const helpText = document.getElementById('help-text');
    if (role === 'student') {
        helpText.textContent = 'Use the password sent to your email';
    } else {
        helpText.textContent = 'Use your assigned password';
    }
    
    hideAlerts();
}

function showAlert(message, type = 'danger') {
    const alert = document.getElementById(`${type}-alert`);
    alert.textContent = message;
    alert.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => alert.classList.add('hidden'), 3000);
    }
}

function hideAlerts() {
    document.getElementById('error-alert').classList.add('hidden');
    document.getElementById('success-alert').classList.add('hidden');
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

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlerts();
    setLoading(true);

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: selectedRole })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', selectedRole);
            showAlert('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                if (selectedRole === 'teacher') {
                    window.location.href = '/dashboard';
                } else {
                    window.location.href = '/student-dashboard';
                }
            }, 1500);
        } else {
            showAlert(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please try again.', 'danger');
    } finally {
        setLoading(false);
    }
});
