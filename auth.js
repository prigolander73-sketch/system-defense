// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================

// Simple password hash function (for demo - use bcrypt in production)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Register new user
function registerUser(firstName, lastName, email, password) {
    // Validate inputs
    if (!firstName || !lastName || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return false;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return false;
    }
    
    // Check if email already exists
    const existingUser = getUserByEmail(email);
    if (existingUser) {
        showNotification('Email already registered. Please log in.', 'error');
        return false;
    }
    
    // Create new user with isolated data
    const newUser = createUser({
        firstName,
        lastName,
        email,
        passwordHash: hashPassword(password)
    });
    
    if (newUser) {
        showNotification('Account created successfully! Please log in.', 'success');
        return true;
    }
    
    showNotification('Failed to create account. Please try again.', 'error');
    return false;
}

// Login user
function loginUser(email, password) {
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return false;
    }
    
    const user = getUserByEmail(email);
    if (!user) {
        showNotification('User not found. Please check your email or register.', 'error');
        return false;
    }
    
    if (user.passwordHash !== hashPassword(password)) {
        showNotification('Incorrect password. Please try again.', 'error');
        return false;
    }
    
    // Set current user session
    setCurrentUserId(user.id);
    
    // Update last login
    updateUserProfile(user.id, { lastLogin: new Date().toISOString() });
    
    return true;
}

// Logout user
function logoutUser() {
    clearCurrentUser();
    showNotification('Logged out successfully', 'info');
    window.location.href = 'index.html';
}

// Check if user is logged in
function checkAuth() {
    const userId = getCurrentUserId();
    if (!userId) {
        window.location.href = 'index.html';
        return false;
    }
    
    const user = getUserById(userId);
    if (!user) {
        clearCurrentUser();
        window.location.href = 'index.html';
        return false;
    }
    
    return user;
}

// Get current user info
function getCurrentUser() {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return getUserById(userId);
}

// Change password
function changeUserPassword(currentPassword, newPassword, confirmPassword) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const user = getUserById(userId);
    if (!user) return false;
    
    // Verify current password
    if (user.passwordHash !== hashPassword(currentPassword)) {
        showNotification('Current password is incorrect', 'error');
        return false;
    }
    
    // Validate new password
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters', 'error');
        return false;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return false;
    }
    
    // Update password
    const success = updateUserProfile(userId, {
        passwordHash: hashPassword(newPassword)
    });
    
    if (success) {
        showNotification('Password changed successfully', 'success');
        return true;
    }
    
    showNotification('Failed to change password', 'error');
    return false;
}

// Fake Google login for demo
function fakeGoogleLogin() {
    // Check if demo user exists
    let user = getUserByEmail('demo@example.com');
    
    if (!user) {
        // Create demo user
        user = createUser({
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@example.com',
            passwordHash: hashPassword('demo123')
        });
        
        if (!user) {
            showNotification('Failed to create demo account', 'error');
            return;
        }
        
        // Add some sample data for demo
        const sampleTransactions = [
            { type: 'income', category: 'salary', amount: 50000, date: new Date().toISOString().split('T')[0], description: 'Monthly Salary' },
            { type: 'expense', category: 'food', amount: 3500, date: new Date().toISOString().split('T')[0], description: 'Groceries' },
            { type: 'expense', category: 'bills', amount: 4500, date: new Date().toISOString().split('T')[0], description: 'Electric Bill' },
            { type: 'expense', category: 'transport', amount: 2000, date: new Date().toISOString().split('T')[0], description: 'Gas' }
        ];
        
        sampleTransactions.forEach(t => addTransaction(t.type, t));
    } else {
        setCurrentUserId(user.id);
    }
    
    showNotification('🐰 Google login successful!', 'success');
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// Forgot password
function showForgotPassword() {
    const email = prompt('Enter your email to reset password:');
    if (email) {
        const user = getUserByEmail(email);
        if (user) {
            showNotification('Password reset link sent to ' + email, 'success');
        } else {
            showNotification('Email not found', 'error');
        }
    }
}

// Delete account
function deleteUserAccount() {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    if (!confirm('Are you sure you want to delete your account? All data will be permanently lost.')) {
        return;
    }
    
    if (!confirm('This action cannot be undone. Click OK to confirm deletion.')) {
        return;
    }
    
    if (deleteUser(userId)) {
        clearCurrentUser();
        showNotification('Account deleted successfully', 'info');
        window.location.href = 'index.html';
    } else {
        showNotification('Failed to delete account', 'error');
    }
}
