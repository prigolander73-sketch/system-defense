// ==========================================
// LOGIN PAGE JAVASCRIPT
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const currentUser = checkAuth();
    if (currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Initialize bunny animations
    initBunnyAnimations();
    
    // Set up form handlers
    setupFormHandlers();
});

function setupFormHandlers() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const remember = document.getElementById('remember').checked;
            
            if (loginUser(email, password)) {
                // Show success modal
                document.getElementById('modal').classList.remove('hidden');
                
                // Redirect after delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            }
        });
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('regFirstName').value;
            const lastName = document.getElementById('regLastName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            if (registerUser(firstName, lastName, email, password)) {
                // Switch to login tab
                switchAuthTab('login');
                // Pre-fill email
                document.getElementById('loginEmail').value = email;
                // Clear register form
                registerForm.reset();
            }
        });
    }
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('text-pink-600', 'border-pink-600');
        loginTab.classList.remove('text-gray-400', 'border-transparent');
        registerTab.classList.remove('text-pink-600', 'border-pink-600');
        registerTab.classList.add('text-gray-400', 'border-transparent');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        registerTab.classList.add('text-pink-600', 'border-pink-600');
        registerTab.classList.remove('text-gray-400', 'border-transparent');
        loginTab.classList.remove('text-pink-600', 'border-pink-600');
        loginTab.classList.add('text-gray-400', 'border-transparent');
    }
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    window.location.href = 'dashboard.html';
}

// Bunny Animations
function initBunnyAnimations() {
    const pupils = [document.getElementById('p1'), document.getElementById('p2')];
    const lids = [document.getElementById('lid1'), document.getElementById('lid2')];
    const leftPanel = document.getElementById('left');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    
    let isPasswordActive = false;
    let isEmailActive = false;

    function updateBunnyReactions() {
        isEmailActive = loginEmail.value.trim().length > 0 || document.activeElement === loginEmail;
        isPasswordActive = loginPassword.value.trim().length > 0;
        
        leftPanel.classList.toggle('email-active', isEmailActive);
        leftPanel.classList.toggle('password-active', isPasswordActive);
        
        const closeLevel = isPasswordActive ? '78%' : '0%';
        lids.forEach(l => {
            if (l) l.style.height = closeLevel;
        });
    }

    if (loginEmail) {
        loginEmail.addEventListener('input', updateBunnyReactions);
        loginEmail.addEventListener('focus', updateBunnyReactions);
        loginEmail.addEventListener('blur', updateBunnyReactions);
    }

    if (loginPassword) {
        loginPassword.addEventListener('input', updateBunnyReactions);
        loginPassword.addEventListener('focus', updateBunnyReactions);
        loginPassword.addEventListener('blur', updateBunnyReactions);
    }

    if (leftPanel) {
        leftPanel.addEventListener('mousemove', (e) => {
            const rect = leftPanel.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            pupils.forEach((p, i) => {
                if (!p) return;
                
                const eyeRect = p.parentElement.getBoundingClientRect();
                const ex = eyeRect.left - rect.left + eyeRect.width / 2;
                const ey = eyeRect.top - rect.top + eyeRect.height / 2;
                
                let dx = mx - ex;
                let dy = my - ey;
                let dist = Math.min(Math.hypot(dx, dy) / 7.2, 14);
                const angle = Math.atan2(dy, dx);
                
                let px = Math.cos(angle) * dist;
                let py = Math.sin(angle) * dist;
                
                if (isEmailActive && !isPasswordActive) px += 11;
                if (isPasswordActive) { 
                    py += 14; 
                    px *= 0.6; 
                }
                
                p.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
            });
        });
    }

    // Random blinking
    function randomBlink() {
        if (!isPasswordActive) {
            lids.forEach(l => {
                if (l) {
                    l.style.transition = 'height 0.15s linear';
                    l.style.height = '100%';
                }
            });
            
            setTimeout(() => {
                lids.forEach(l => {
                    if (l) {
                        l.style.transition = 'height 0.15s linear';
                        l.style.height = '0%';
                    }
                });
            }, 150);
        }
        
        setTimeout(randomBlink, Math.random() * 5000 + 2000);
    }
    
    randomBlink();
}
