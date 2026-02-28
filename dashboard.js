// ==========================================
// DASHBOARD JAVASCRIPT
// ==========================================

let spendingChart, trendChart, incomeExpenseChart, categoryChart;
let editingTransactionId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = checkAuth();
    if (!user) return;
    
    // Update user info in UI
    updateUserInfo(user);
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const incomeDate = document.getElementById('incomeDate');
    const expenseDate = document.getElementById('expenseDate');
    if (incomeDate) incomeDate.value = today;
    if (expenseDate) expenseDate.value = today;
    
    // Load budget limits
    loadBudgetLimits();
    
    // Set up form handlers
    setupDashboardForms();
    
    // Initial display update
    updateAllDisplays();
    
    // Set up auto-save
    setupAutoSave();
});

function updateUserInfo(user) {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const settingsAvatar = document.getElementById('settingsAvatar');
    const settingsFirstName = document.getElementById('settingsFirstName');
    const settingsLastName = document.getElementById('settingsLastName');
    const settingsEmail = document.getElementById('settingsEmail');
    
    if (userName) userName.textContent = `${user.firstName} ${user.lastName}`;
    if (userAvatar) userAvatar.src = user.avatar;
    if (settingsAvatar) settingsAvatar.src = user.avatar;
    if (settingsFirstName) settingsFirstName.value = user.firstName;
    if (settingsLastName) settingsLastName.value = user.lastName;
    if (settingsEmail) settingsEmail.value = user.email;
}

function loadBudgetLimits() {
    const limits = getBudgetLimits();
    document.getElementById('foodBudget').value = limits.food;
    document.getElementById('transportBudget').value = limits.transport;
    document.getElementById('billsBudget').value = limits.bills;
    document.getElementById('shoppingBudget').value = limits.shopping;
    document.getElementById('entertainmentBudget').value = limits.entertainment;
    document.getElementById('healthBudget').value = limits.health;
    document.getElementById('othersBudget').value = limits.others;
}

function setupDashboardForms() {
    // Income form
    const incomeForm = document.getElementById('incomeForm');
    if (incomeForm) {
        incomeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const data = {
                category: document.getElementById('incomeSource').value,
                amount: parseFloat(document.getElementById('incomeAmount').value),
                date: document.getElementById('incomeDate').value,
                description: document.getElementById('incomeDescription').value,
                recurring: document.getElementById('incomeRecurring').checked
            };
            
            if (addTransaction('income', data)) {
                showNotification('Income added successfully!', 'success');
                this.reset();
                document.getElementById('incomeDate').valueAsDate = new Date();
                updateAllDisplays();
            }
        });
    }
    
    // Expense form
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const category = document.getElementById('expenseCategory').value;
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            
            const data = {
                category,
                amount,
                date: document.getElementById('expenseDate').value,
                description: document.getElementById('expenseDescription').value,
                recurring: document.getElementById('expenseRecurring').checked
            };
            
            if (addTransaction('expense', data)) {
                showNotification('Expense added successfully!', 'success');
                this.reset();
                document.getElementById('expenseDate').valueAsDate = new Date();
                document.getElementById('budgetWarning').classList.add('hidden');
                updateAllDisplays();
            }
        });
    }
    
    // Expense amount warning
    const expenseAmount = document.getElementById('expenseAmount');
    if (expenseAmount) {
        expenseAmount.addEventListener('input', function() {
            const category = document.getElementById('expenseCategory').value;
            const amount = parseFloat(this.value) || 0;
            const limits = getBudgetLimits();
            const limit = limits[category] || 0;
            
            if (limit > 0 && amount > 0) {
                const transactions = getTransactionsByPeriod('month').filter(t => 
                    t.type === 'expense' && t.category === category
                );
                const spent = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
                const projected = spent + amount;
                
                const warning = document.getElementById('budgetWarning');
                const warningText = document.getElementById('budgetWarningText');
                
                if (projected > limit) {
                    warning.classList.remove('hidden');
                    warningText.textContent = `This will exceed your ${categories.expense[category].label} budget by ${formatPeso(projected - limit)}`;
                } else if (projected > limit * 0.9) {
                    warning.classList.remove('hidden');
                    warningText.textContent = `Warning: You'll use ${((projected/limit)*100).toFixed(0)}% of your budget`;
                } else {
                    warning.classList.add('hidden');
                }
            }
        });
    }
    
    // Budget form
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const limits = {
                food: parseFloat(document.getElementById('foodBudget').value) || 0,
                transport: parseFloat(document.getElementById('transportBudget').value) || 0,
                bills: parseFloat(document.getElementById('billsBudget').value) || 0,
                shopping: parseFloat(document.getElementById('shoppingBudget').value) || 0,
                entertainment: parseFloat(document.getElementById('entertainmentBudget').value) || 0,
                health: parseFloat(document.getElementById('healthBudget').value) || 0,
                others: parseFloat(document.getElementById('othersBudget').value) || 0
            };
            
            if (updateBudgetLimits(limits)) {
                showNotification('Budget limits updated!', 'success');
                updateAllDisplays();
            }
        });
    }
    
    // Savings form
    const savingsForm = document.getElementById('savingsForm');
    if (savingsForm) {
        savingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const goal = {
                name: document.getElementById('goalName').value,
                target: parseFloat(document.getElementById('targetAmount').value),
                current: parseFloat(document.getElementById('currentAmount').value) || 0,
                targetDate: document.getElementById('targetDate').value
            };
            
            if (addSavingsGoal(goal)) {
                showNotification('Savings goal added!', 'success');
                this.reset();
                updateAllDisplays();
            }
        });
    }
    
    // Add savings form
    const addSavingsForm = document.getElementById('addSavingsForm');
    if (addSavingsForm) {
        addSavingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const goalId = document.getElementById('savingsGoalId').value;
            const amount = parseFloat(document.getElementById('addSavingsAmount').value);
            
            const goals = getSavingsGoals();
            const goal = goals.find(g => g.id === goalId);
            
            if (goal && updateSavingsGoal(goalId, { current: goal.current + amount })) {
                showNotification(`Added ${formatPeso(amount)} to ${goal.name}`, 'success');
                closeAddSavingsModal();
                updateAllDisplays();
            }
            
            this.reset();
        });
    }
    
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userId = getCurrentUserId();
            const updates = {
                firstName: document.getElementById('settingsFirstName').value,
                lastName: document.getElementById('settingsLastName').value,
                email: document.getElementById('settingsEmail').value
            };
            
            if (updateUserProfile(userId, updates)) {
                // Update UI
                const user = getCurrentUser();
                updateUserInfo(user);
                showNotification('Profile updated!', 'success');
            }
        });
    }
    
    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmNewPassword').value;
            
            if (changeUserPassword(current, newPass, confirm)) {
                closePasswordModal();
                this.reset();
            }
        });
    }
    
    // Edit form
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!editingTransactionId) return;
            
            const updates = {
                type: document.getElementById('editType').value,
                amount: parseFloat(document.getElementById('editAmount').value),
                category: document.getElementById('editCategory').value,
                date: document.getElementById('editDate').value,
                description: document.getElementById('editDescription').value
            };
            
            if (editTransaction(editingTransactionId, updates)) {
                showNotification('Transaction updated!', 'success');
                closeEditModal();
                updateAllDisplays();
            }
        });
    }
}

function updateAllDisplays() {
    updateDashboard();
    updateIncomeDisplay();
    updateExpenseDisplay();
    updateBudgetDisplay();
    updateSavingsDisplay();
    updateLastSyncDisplay();
}

function updateDashboard() {
    const period = document.getElementById('dashboardPeriod').value;
    let transactions;
    
    if (period === 'custom') {
        const start = document.getElementById('dashStartDate').value;
        const end = document.getElementById('dashEndDate').value;
        if (start && end) {
            transactions = getTransactions({ startDate: start, endDate: end });
            document.getElementById('customDateRange').classList.remove('hidden');
        } else {
            transactions = getTransactionsByPeriod('month');
            document.getElementById('customDateRange').classList.add('hidden');
        }
    } else {
        transactions = getTransactionsByPeriod(period);
        document.getElementById('customDateRange').classList.add('hidden');
    }
    
    // Calculate totals
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;
    
    // Update displays
    document.getElementById('monthlyBudgetDisplay').textContent = formatPeso(income);
    document.getElementById('totalExpensesDisplay').textContent = formatPeso(expenses);
    document.getElementById('remainingDisplay').textContent = formatPeso(balance);
    document.getElementById('savingsRateDisplay').textContent = savingsRate.toFixed(1) + '%';
    
    // Update progress bars and statuses
    const expensePercent = income > 0 ? (expenses / income * 100) : 0;
    document.getElementById('expenseProgressBar').style.width = Math.min(expensePercent, 100) + '%';
    
    const remainingStatus = document.getElementById('remainingStatus');
    if (balance < 0) {
        remainingStatus.innerHTML = '<span class="text-red-600"><i class="fas fa-exclamation-triangle"></i> Over budget!</span>';
    } else {
        remainingStatus.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle"></i> On track</span>';
    }
    
    // Update transactions list
    renderTransactionsList(transactions.slice(0, 10));
    
    // Update charts
    updateCharts(transactions);
}

function renderTransactionsList(transactions) {
    const tbody = document.getElementById('transactionsList');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    if (transactions.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    tbody.innerHTML = transactions.map(t => {
        const cat = categories[t.type][t.category];
        const amountClass = t.type === 'income' ? 'text-green-600' : 'text-red-600';
        const sign = t.type === 'income' ? '+' : '-';
        
        return `
            <tr class="border-b hover:bg-gray-50 group">
                <td class="py-3">${formatDate(t.date)}</td>
                <td class="py-3">
                    <div class="font-medium">${t.description || cat.label}</div>
                    ${t.recurring ? '<span class="text-xs text-blue-500"><i class="fas fa-sync"></i> Recurring</span>' : ''}
                </td>
                <td class="py-3">
                    <span class="bg-gray-100 px-2 py-1 rounded text-sm">
                        ${cat.icon} ${cat.label}
                    </span>
                </td>
                <td class="py-3 text-right font-medium ${amountClass}">
                    ${sign}${formatPeso(t.amount)}
                </td>
                <td class="py-3 text-center">
                    <div class="transaction-actions space-x-2">
                        <button onclick="openEditModal('${t.id}')" class="text-blue-600 hover:text-blue-800" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteTransaction('${t.id}')" class="text-red-600 hover:text-red-800" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateIncomeDisplay() {
    const transactions = getTransactionsByPeriod('month').filter(t => t.type === 'income');
    const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalIncomeDisplay = document.getElementById('totalIncomeDisplay');
    if (totalIncomeDisplay) totalIncomeDisplay.textContent = formatPeso(total);
    
    // Breakdown by source
    const breakdown = {};
    transactions.forEach(t => {
        breakdown[t.category] = (breakdown[t.category] || 0) + parseFloat(t.amount);
    });
    
    const breakdownHtml = Object.entries(breakdown).map(([cat, amount]) => {
        const info = categories.income[cat];
        const percent = total > 0 ? (amount / total * 100).toFixed(1) : 0;
        return `
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span class="text-gray-600">${info.icon} ${info.label}</span>
                <div class="text-right">
                    <div class="font-medium">${formatPeso(amount)}</div>
                    <div class="text-xs text-gray-500">${percent}%</div>
                </div>
            </div>
        `;
    }).join('');
    
    const incomeBreakdown = document.getElementById('incomeBreakdown');
    if (incomeBreakdown) {
        incomeBreakdown.innerHTML = breakdownHtml || '<p class="text-gray-500 text-center py-4">No income recorded</p>';
    }
    
    // Recent list
    const recentHtml = transactions.slice(0, 5).map(t => `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
                <p class="font-medium">${t.description || categories.income[t.category].label}</p>
                <p class="text-xs text-gray-500">${formatDate(t.date)}</p>
            </div>
            <span class="text-green-600 font-medium">+${formatPeso(t.amount)}</span>
        </div>
    `).join('');
    
    const recentIncomeList = document.getElementById('recentIncomeList');
    if (recentIncomeList) {
        recentIncomeList.innerHTML = recentHtml || '<p class="text-gray-500 text-center py-4">No recent income</p>';
    }
}

function updateExpenseDisplay() {
    const transactions = getTransactionsByPeriod('month').filter(t => t.type === 'expense');
    const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpensesBreakdown = document.getElementById('totalExpensesBreakdown');
    if (totalExpensesBreakdown) totalExpensesBreakdown.textContent = formatPeso(total);
    
    // Breakdown by category
    const breakdown = {};
    transactions.forEach(t => {
        breakdown[t.category] = (breakdown[t.category] || 0) + parseFloat(t.amount);
    });
    
    const breakdownHtml = Object.entries(breakdown).map(([cat, amount]) => {
        const info = categories.expense[cat];
        const percent = total > 0 ? (amount / total * 100).toFixed(1) : 0;
        return `
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span class="text-gray-600">${info.icon} ${info.label}</span>
                <div class="text-right">
                    <div class="font-medium">${formatPeso(amount)}</div>
                    <div class="text-xs text-gray-500">${percent}%</div>
                </div>
            </div>
        `;
    }).join('');
    
    const expenseBreakdown = document.getElementById('expenseBreakdown');
    if (expenseBreakdown) {
        expenseBreakdown.innerHTML = breakdownHtml || '<p class="text-gray-500 text-center py-4">No expenses recorded</p>';
    }
    
    // Recent list
    const recentHtml = transactions.slice(0, 5).map(t => `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
                <p class="font-medium">${t.description || categories.expense[t.category].label}</p>
                <p class="text-xs text-gray-500">${formatDate(t.date)}</p>
            </div>
            <span class="text-red-600 font-medium">-${formatPeso(t.amount)}</span>
        </div>
    `).join('');
    
    const recentExpensesList = document.getElementById('recentExpensesList');
    if (recentExpensesList) {
        recentExpensesList.innerHTML = recentHtml || '<p class="text-gray-500 text-center py-4">No recent expenses</p>';
    }
}

function updateBudgetDisplay() {
    const transactions = getTransactionsByPeriod('month').filter(t => t.type === 'expense');
    const limits = getBudgetLimits();
    
    const spent = {};
    transactions.forEach(t => {
        spent[t.category] = (spent[t.category] || 0) + parseFloat(t.amount);
    });
    
    let html = '';
    Object.entries(limits).forEach(([category, limit]) => {
        if (limit === 0) return;
        
        const current = spent[category] || 0;
        const percent = limit > 0 ? (current / limit * 100) : 0;
        let colorClass = 'bg-green-600';
        let statusIcon = '✓';
        
        if (percent >= 100) {
            colorClass = 'bg-red-600';
            statusIcon = '⚠️';
        } else if (percent >= 90) {
            colorClass = 'bg-yellow-500';
            statusIcon = '⚡';
        } else if (percent >= 75) {
            colorClass = 'bg-blue-500';
            statusIcon = 'ℹ️';
        }
        
        const catInfo = categories.expense[category];
        
        html += `
            <div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-700 font-medium">${catInfo?.icon || ''} ${catInfo?.label || category}</span>
                    <span class="text-sm text-gray-600">${formatPeso(current)} / ${formatPeso(limit)} ${statusIcon}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="${colorClass} h-3 rounded-full transition-all" style="width: ${Math.min(percent, 100)}%"></div>
                </div>
                <div class="text-xs text-gray-500 mt-1">${percent.toFixed(1)}% used</div>
            </div>
        `;
    });
    
    const budgetStatusList = document.getElementById('budgetStatusList');
    if (budgetStatusList) {
        budgetStatusList.innerHTML = html || '<p class="text-gray-500">No budget limits set</p>';
    }
}

function updateSavingsDisplay() {
    const goals = getSavingsGoals();
    const totalSavings = goals.reduce((sum, g) => sum + (g.current || 0), 0);
    
    const totalSavingsDisplay = document.getElementById('totalSavingsDisplay');
    if (totalSavingsDisplay) totalSavingsDisplay.textContent = formatPeso(totalSavings);
    
    const monthlyIncome = getTransactionsByPeriod('month')
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const rate = monthlyIncome > 0 ? (totalSavings / monthlyIncome * 100) : 0;
    const savingsRateText = document.getElementById('savingsRateText');
    if (savingsRateText) savingsRateText.textContent = `${rate.toFixed(1)}% of monthly income`;
    
    // Goals list
    const html = goals.map(goal => {
        const percent = goal.target > 0 ? (goal.current / goal.target * 100) : 0;
        const isComplete = percent >= 100;
        
        return `
            <div class="border rounded-lg p-3 ${isComplete ? 'bg-green-50 border-green-200' : ''}">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="font-medium ${isComplete ? 'text-green-700' : ''}">${goal.name}</span>
                        ${isComplete ? '<span class="ml-2 text-green-600 text-sm">✓ Complete!</span>' : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="openAddSavingsModal('${goal.id}')" class="text-purple-600 hover:text-purple-800 text-sm" title="Add funds">
                            <i class="fas fa-plus-circle"></i>
                        </button>
                        <button onclick="deleteSavingsGoalItem('${goal.id}')" class="text-red-600 hover:text-red-800 text-sm" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="flex justify-between text-sm text-gray-600 mb-2">
                    <span>${formatPeso(goal.current)} / ${formatPeso(goal.target)}</span>
                    <span>${percent.toFixed(1)}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-purple-600 h-2 rounded-full transition-all" style="width: ${Math.min(percent, 100)}%"></div>
                </div>
                ${goal.targetDate ? `<div class="text-xs text-gray-500 mt-1">Target: ${formatDate(goal.targetDate)}</div>` : ''}
            </div>
        `;
    }).join('');
    
    const savingsGoalsList = document.getElementById('savingsGoalsList');
    if (savingsGoalsList) {
        savingsGoalsList.innerHTML = html || '<p class="text-gray-500 text-center py-4">No savings goals yet</p>';
    }
}

function updateLastSyncDisplay() {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    const userData = getUserData(userId);
    const lastSync = document.getElementById('lastSync');
    if (lastSync && userData.lastSync) {
        const date = new Date(userData.lastSync);
        lastSync.textContent = date.toLocaleString('en-PH');
    }
}

function setupAutoSave() {
    // Auto-save every 30 seconds
    setInterval(() => {
        const userId = getCurrentUserId();
        if (userId) {
            const userData = getUserData(userId);
            saveUserData(userId, userData);
        }
    }, 30000);
    
    // Save on page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            const userId = getCurrentUserId();
            if (userId) {
                const userData = getUserData(userId);
                saveUserData(userId, userData);
            }
        }
    });
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-green-500', 'text-green-600');
        btn.classList.add('border-transparent', 'text-gray-600');
    });
    
    if (event && event.target) {
        event.target.classList.remove('border-transparent', 'text-gray-600');
        event.target.classList.add('border-green-500', 'text-green-600');
    }
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(`${tabName}-content`);
    if (selectedContent) selectedContent.classList.add('active');
    
    // Initialize charts if reports tab
    if (tabName === 'reports') {
        setTimeout(() => generateReport('month'), 100);
    }
    
    // Update displays
    updateAllDisplays();
}

// Transaction actions
function openEditModal(id) {
    const transactions = getTransactions();
    const t = transactions.find(tr => tr.id === id);
    if (!t) return;
    
    editingTransactionId = id;
    document.getElementById('editId').value = id;
    document.getElementById('editType').value = t.type;
    document.getElementById('editAmount').value = t.amount;
    document.getElementById('editDate').value = t.date;
    document.getElementById('editDescription').value = t.description || '';
    
    updateEditCategories();
    document.getElementById('editCategory').value = t.category;
    
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingTransactionId = null;
}

function updateEditCategories() {
    const type = document.getElementById('editType').value;
    const select = document.getElementById('editCategory');
    select.innerHTML = Object.entries(categories[type]).map(([key, info]) => 
        `<option value="${key}">${info.icon} ${info.label}</option>`
    ).join('');
}

document.getElementById('editType')?.addEventListener('change', updateEditCategories);

function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    if (deleteTransaction(id)) {
        showNotification('Transaction deleted', 'warning');
        updateAllDisplays();
    }
}

// Savings actions
function openAddSavingsModal(goalId) {
    const goals = getSavingsGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    document.getElementById('savingsGoalId').value = goalId;
    document.getElementById('savingsGoalName').textContent = goal.name;
    document.getElementById('savingsCurrentDisplay').textContent = `Current: ${formatPeso(goal.current)} / ${formatPeso(goal.target)}`;
    document.getElementById('addSavingsModal').classList.add('active');
}

function closeAddSavingsModal() {
    document.getElementById('addSavingsModal').classList.remove('active');
}

function deleteSavingsGoalItem(id) {
    if (!confirm('Delete this savings goal?')) return;
    
    if (deleteSavingsGoal(id)) {
        showNotification('Savings goal deleted', 'warning');
        updateAllDisplays();
    }
}

// Password modal
function changePassword() {
    document.getElementById('passwordModal').classList.add('active');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

// Other actions
function filterTransactions() {
    const search = document.getElementById('transactionSearch').value;
    const type = document.getElementById('transactionFilter').value;
    
    const filters = {};
    if (search) filters.search = search;
    if (type !== 'all') filters.type = type;
    
    const transactions = getTransactions(filters).slice(0, 10);
    renderTransactionsList(transactions);
}

function viewAllTransactions() {
    showNotification('View all transactions - Feature coming soon!', 'info');
}

function sortTransactions(field) {
    showNotification(`Sorting by ${field}...`, 'info');
}

function refreshData() {
    updateAllDisplays();
    showNotification('Data refreshed!', 'success');
}

function syncNow() {
    const userId = getCurrentUserId();
    if (userId) {
        const userData = getUserData(userId);
        if (saveUserData(userId, userData)) {
            showNotification('Data synced successfully!', 'success');
            updateLastSyncDisplay();
        }
    }
}

function changeAvatar() {
    showNotification('Avatar upload coming soon!', 'info');
}

function toggle2FA() {
    const status = document.getElementById('2faStatus');
    if (status.textContent === 'Off') {
        status.textContent = 'On';
        status.classList.remove('bg-gray-200');
        status.classList.add('bg-green-200', 'text-green-800');
        showNotification('2FA enabled (demo)', 'success');
    } else {
        status.textContent = 'Off';
        status.classList.add('bg-gray-200');
        status.classList.remove('bg-green-200', 'text-green-800');
        showNotification('2FA disabled', 'info');
    }
}

function deleteAccount() {
    deleteUserAccount();
}

// Export/Import
function exportData(format) {
    const userId = getCurrentUserId();
    const data = exportUserData(userId, format);
    
    if (format === 'json' && data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Data exported as JSON', 'success');
    } else if (format === 'csv') {
        // Export transactions as CSV
        const transactions = getTransactions();
        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
        const rows = transactions.map(t => [
            t.date,
            t.type,
            categories[t.type][t.category]?.label || t.category,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            t.amount
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Transactions exported as CSV', 'success');
    }
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            if (file.name.endsWith('.json')) {
                const imported = importUserData(e.target.result);
                if (imported) {
                    if (confirm('This will replace all current data. Continue?')) {
                        const userId = getCurrentUserId();
                        if (saveUserData(userId, imported.data)) {
                            updateAllDisplays();
                            showNotification('Data imported successfully!', 'success');
                        }
                    }
                }
            } else if (file.name.endsWith('.csv')) {
                // Parse CSV
                const lines = e.target.result.split('\n');
                let count = 0;
                
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    const cols = lines[i].split(',');
                    if (cols.length >= 5) {
                        const catLabel = cols[2].trim();
                        let catKey = 'others';
                        
                        Object.entries(categories.income).forEach(([k, v]) => {
                            if (v.label === catLabel) catKey = k;
                        });
                        Object.entries(categories.expense).forEach(([k, v]) => {
                            if (v.label === catLabel) catKey = k;
                        });
                        
                        addTransaction(cols[1].trim(), {
                            date: cols[0].trim(),
                            category: catKey,
                            description: cols[3].replace(/"/g, '').trim(),
                            amount: parseFloat(cols[4])
                        });
                        count++;
                    }
                }
                showNotification(`Imported ${count} transactions`, 'success');
                updateAllDisplays();
            }
        } catch (err) {
            showNotification('Failed to import file', 'error');
            console.error(err);
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function clearAllData() {
    if (!confirm('WARNING: This will delete ALL your data permanently. This cannot be undone!\n\nAre you absolutely sure?')) return;
    
    if (!confirm('Last chance! All transactions, goals, and settings will be lost.\n\nClick OK to confirm:')) return;
    
    if (clearUserData()) {
        updateAllDisplays();
        showNotification('All data cleared', 'warning');
    }
}
