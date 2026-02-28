// ==========================================
// DATA MANAGEMENT WITH USER ISOLATION
// ==========================================

const APP_KEY = 'pinoyBudgetTracker_v2';

// Default data structure for new users
const defaultUserData = {
    transactions: [],
    savingsGoals: [],
    budgetLimits: {
        food: 6000,
        transport: 3000,
        bills: 5000,
        shopping: 2000,
        entertainment: 1500,
        health: 1000,
        others: 2000
    },
    settings: {
        currency: 'PHP',
        language: 'en',
        dateFormat: 'YYYY-MM-DD',
        notifications: {
            budget: true,
            transaction: true,
            monthly: true,
            goals: false
        }
    },
    createdAt: null,
    lastSync: null
};

// Category definitions
const categories = {
    income: {
        salary: { label: 'Salary', icon: '💼', color: '#10b981' },
        freelance: { label: 'Freelance', icon: '💻', color: '#3b82f6' },
        business: { label: 'Business', icon: '🏪', color: '#f59e0b' },
        investment: { label: 'Investment', icon: '📈', color: '#8b5cf6' },
        gift: { label: 'Gift', icon: '🎁', color: '#ec4899' },
        others: { label: 'Others', icon: '📦', color: '#6b7280' }
    },
    expense: {
        food: { label: 'Food & Dining', icon: '🍔', color: '#f59e0b' },
        transport: { label: 'Transportation', icon: '🚗', color: '#8b5cf6' },
        bills: { label: 'Bills & Utilities', icon: '💡', color: '#3b82f6' },
        shopping: { label: 'Shopping', icon: '🛍️', color: '#ec4899' },
        entertainment: { label: 'Entertainment', icon: '🎬', color: '#f97316' },
        health: { label: 'Healthcare', icon: '⚕️', color: '#ef4444' },
        education: { label: 'Education', icon: '📚', color: '#14b8a6' },
        others: { label: 'Others', icon: '📦', color: '#6b7280' }
    }
};

// Get all app data from localStorage
function getAllData() {
    try {
        const saved = localStorage.getItem(APP_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }
    return { users: [] };
}

// Save all app data to localStorage
function saveAllData(data) {
    try {
        localStorage.setItem(APP_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Failed to save data:', e);
        showNotification('Failed to save data. Storage might be full.', 'error');
        return false;
    }
}

// Get current user ID from session
function getCurrentUserId() {
    return sessionStorage.getItem('currentUserId');
}

// Set current user ID in session
function setCurrentUserId(userId) {
    sessionStorage.setItem('currentUserId', userId);
}

// Clear current user session
function clearCurrentUser() {
    sessionStorage.removeItem('currentUserId');
}

// Get user-specific data
function getUserData(userId) {
    const allData = getAllData();
    const user = allData.users.find(u => u.id === userId);
    if (user && user.data) {
        return { ...defaultUserData, ...user.data };
    }
    return { ...defaultUserData };
}

// Save user-specific data
function saveUserData(userId, userData) {
    const allData = getAllData();
    const userIndex = allData.users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        allData.users[userIndex].data = {
            ...userData,
            lastSync: new Date().toISOString()
        };
        return saveAllData(allData);
    }
    return false;
}

// Create new user with isolated data
function createUser(userInfo) {
    const allData = getAllData();
    
    // Check if email exists
    if (allData.users.find(u => u.email === userInfo.email)) {
        return null;
    }
    
    const newUser = {
        id: generateId(),
        ...userInfo,
        createdAt: new Date().toISOString(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.firstName + ' ' + userInfo.lastName)}&background=10b981&color=fff`,
        data: {
            ...defaultUserData,
            createdAt: new Date().toISOString()
        }
    };
    
    allData.users.push(newUser);
    if (saveAllData(allData)) {
        return newUser;
    }
    return null;
}

// Get user by email
function getUserByEmail(email) {
    const allData = getAllData();
    return allData.users.find(u => u.email === email);
}

// Get user by ID
function getUserById(userId) {
    const allData = getAllData();
    return allData.users.find(u => u.id === userId);
}

// Update user profile
function updateUserProfile(userId, updates) {
    const allData = getAllData();
    const userIndex = allData.users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        allData.users[userIndex] = {
            ...allData.users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return saveAllData(allData);
    }
    return false;
}

// Delete user and all their data
function deleteUser(userId) {
    const allData = getAllData();
    allData.users = allData.users.filter(u => u.id !== userId);
    return saveAllData(allData);
}

// Transaction functions for current user
function addTransaction(type, data) {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    const userData = getUserData(userId);
    const transaction = {
        id: generateId(),
        type,
        ...data,
        createdAt: new Date().toISOString()
    };
    
    userData.transactions.push(transaction);
    
    if (saveUserData(userId, userData)) {
        return transaction;
    }
    return null;
}

function editTransaction(transactionId, updates) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const userData = getUserData(userId);
    const index = userData.transactions.findIndex(t => t.id === transactionId);
    
    if (index !== -1) {
        userData.transactions[index] = {
            ...userData.transactions[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return saveUserData(userId, userData);
    }
    return false;
}

function deleteTransaction(transactionId) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const userData = getUserData(userId);
    userData.transactions = userData.transactions.filter(t => t.id !== transactionId);
    return saveUserData(userId, userData);
}

function getTransactions(filters = {}) {
    const userId = getCurrentUserId();
    if (!userId) return [];
    
    const userData = getUserData(userId);
    let transactions = [...userData.transactions];
    
    // Apply filters
    if (filters.type) {
        transactions = transactions.filter(t => t.type === filters.type);
    }
    
    if (filters.startDate) {
        transactions = transactions.filter(t => t.date >= filters.startDate);
    }
    
    if (filters.endDate) {
        transactions = transactions.filter(t => t.date <= filters.endDate);
    }
    
    if (filters.category) {
        transactions = transactions.filter(t => t.category === filters.category);
    }
    
    if (filters.search) {
        const search = filters.search.toLowerCase();
        transactions = transactions.filter(t => 
            (t.description && t.description.toLowerCase().includes(search)) ||
            categories[t.type][t.category]?.label.toLowerCase().includes(search)
        );
    }
    
    // Sort by date descending
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getTransactionsByPeriod(period) {
    const now = new Date();
    let startDate, endDate;
    
    switch(period) {
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
            endDate = new Date().toISOString().split('T')[0];
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date().toISOString().split('T')[0];
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDate = new Date().toISOString().split('T')[0];
            break;
        default:
            startDate = null;
            endDate = null;
    }
    
    return getTransactions({ startDate, endDate });
}

// Savings goals functions
function addSavingsGoal(goal) {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    const userData = getUserData(userId);
    const newGoal = {
        id: generateId(),
        ...goal,
        createdAt: new Date().toISOString()
    };
    
    userData.savingsGoals.push(newGoal);
    
    if (saveUserData(userId, userData)) {
        return newGoal;
    }
    return null;
}

function updateSavingsGoal(goalId, updates) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const userData = getUserData(userId);
    const index = userData.savingsGoals.findIndex(g => g.id === goalId);
    
    if (index !== -1) {
        userData.savingsGoals[index] = {
            ...userData.savingsGoals[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return saveUserData(userId, userData);
    }
    return false;
}

function deleteSavingsGoal(goalId) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const userData = getUserData(userId);
    userData.savingsGoals = userData.savingsGoals.filter(g => g.id !== goalId);
    return saveUserData(userId, userData);
}

function getSavingsGoals() {
    const userId = getCurrentUserId();
    if (!userId) return [];
    
    const userData = getUserData(userId);
    return userData.savingsGoals || [];
}

// Budget functions
function updateBudgetLimits(limits) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const userData = getUserData(userId);
    userData.budgetLimits = { ...userData.budgetLimits, ...limits };
    return saveUserData(userId, userData);
}

function getBudgetLimits() {
    const userId = getCurrentUserId();
    if (!userId) return defaultUserData.budgetLimits;
    
    const userData = getUserData(userId);
    return userData.budgetLimits || defaultUserData.budgetLimits;
}

// Settings functions
function updateSettings(settings) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const userData = getUserData(userId);
    userData.settings = { ...userData.settings, ...settings };
    return saveUserData(userId, userData);
}

function getSettings() {
    const userId = getCurrentUserId();
    if (!userId) return defaultUserData.settings;
    
    const userData = getUserData(userId);
    return userData.settings || defaultUserData.settings;
}

// Export/Import functions
function exportUserData(userId, format = 'json') {
    const user = getUserById(userId);
    if (!user) return null;
    
    const exportData = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            data: user.data
        }
    };
    
    if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
    }
    
    return null;
}

function importUserData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.version && data.user) {
            return data.user;
        }
    } catch (e) {
        console.error('Invalid import data:', e);
    }
    return null;
}

// Clear all data for current user
function clearUserData() {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    const userData = {
        ...defaultUserData,
        createdAt: new Date().toISOString()
    };
    
    return saveUserData(userId, userData);
}
